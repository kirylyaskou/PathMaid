import {
  createEncounter,
  createImportedCustomCreature,
  saveEncounterCombatants,
  listEncounters,
} from '@/shared/api'
import type { EncounterCombatantRow } from '@/shared/api'
import type { EmbeddedCustomCreature, MatchStatus, MatchedEncounter } from './types'

// commit a matched encounter to DB. Creates a new encounter row with
// a fresh UUID and persists matched combatants only (skipped ones are dropped).
// Name-collision: append "(2)", "(3)", ... until unused (case-sensitive).

/** Resolve name collision by appending "(2)", "(3)", ... until unused.
 *  Names are compared case-sensitive against the provided Set. */
function deriveUniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) return name
  let i = 2
  while (used.has(`${name} (${i})`)) i += 1
  return `${name} (${i})`
}

export interface ImportResult {
  encounterId: string
  name: string
  importedCount: number
  skippedCount: number
}

async function resolveEmbeddedCustomCreature(
  embedded: EmbeddedCustomCreature,
  importedCustomIds: Map<string, MatchStatus>
): Promise<MatchStatus> {
  const cached = importedCustomIds.get(embedded.sourceId)
  if (cached) return cached
  const { id } = await createImportedCustomCreature(embedded.statBlock)
  const match: MatchStatus = {
    status: 'custom',
    id,
    level: embedded.statBlock.level ?? embedded.level,
  }
  importedCustomIds.set(embedded.sourceId, match)
  return match
}

export async function commitMatchedEncounter(
  matched: MatchedEncounter,
  partyLevel: number,
  partySize: number,
  usedNames?: Set<string>,
): Promise<ImportResult> {
  const used = usedNames ?? new Set((await listEncounters()).map((e) => e.name))
  const encounterId = crypto.randomUUID()
  const encounterName = deriveUniqueName(matched.parsed.name, used)
  used.add(encounterName)
  const effPartyLevel = matched.parsed.partyLevel ?? partyLevel
  const effPartySize = matched.parsed.partySize ?? partySize

  await createEncounter(encounterId, encounterName, effPartyLevel, effPartySize)

  const rows: EncounterCombatantRow[] = []
  const importedCustomIds = new Map<string, MatchStatus>()
  let sortIdx = 0
  let skipped = 0
  for (const mc of matched.combatants) {
    const match = mc.parsed.embeddedCustomCreature
      ? await resolveEmbeddedCustomCreature(mc.parsed.embeddedCustomCreature, importedCustomIds)
      : mc.match

    if (match.status === 'skipped') {
      skipped += 1
      continue
    }
    const isHazard = match.status === 'hazard'
    // Prefer source-declared HP; fall back to matched bestiary HP. maxHp tracks
    // separately when the source provides it (Dashboard hp.max).
    const sourceMatchedHp = match.status === 'custom' ? 0 : (match.hp ?? 0)
    const maxHp = mc.parsed.hpMax ?? sourceMatchedHp
    const hp = mc.parsed.hp ?? maxHp
    rows.push({
      id: crypto.randomUUID(),
      encounterId,
      creatureRef: match.status === 'hazard' ? '' : match.id,
      displayName: mc.parsed.displayName,
      initiative: mc.parsed.initiative ?? 0,
      hp,
      maxHp,
      tempHp: 0,
      isNPC: !isHazard,
      weakEliteTier: (mc.parsed.weakEliteTier ?? 'normal'),
      creatureLevel: match.level,
      sortOrder: sortIdx,
      isHazard,
      hazardRef: isHazard ? match.id : null,
      hazardType: isHazard ? 'simple' : undefined,
      side: mc.parsed.side ?? 'enemy',
    })
    sortIdx += 1
  }

  if (rows.length > 0) {
    await saveEncounterCombatants(encounterId, rows)
  }

  return {
    encounterId,
    name: encounterName,
    importedCount: rows.length,
    skippedCount: skipped,
  }
}
