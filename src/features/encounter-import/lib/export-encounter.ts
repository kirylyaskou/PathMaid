import { getDb } from '@/shared/db'
import { listEncounters, loadEncounterCombatants } from '@/shared/api'

// 69-01/02: export an encounter as a pathmaiden-v1 JSON payload that round-trips
// through parseEncounterJson → matchEncounter → commitMatchedEncounter. The
// `lookupName` field is the canonical bestiary / custom-creature / hazard row
// name used by the matcher; `name` is the GM's local moniker (`displayName`).
// Schema is locked; see the project planning notes for the frozen contract.

export interface PathmaidenV1Combatant {
  name: string
  lookupName: string
  level: number
  isHazard: boolean
  weakEliteTier: 'normal' | 'weak' | 'elite'
  hp: number
  hpMax: number
  initiative: number
}

export interface PathmaidenV1Encounter {
  name: string
  partyLevel: number
  partySize: number
  combatants: PathmaidenV1Combatant[]
}

export interface PathmaidenV1Export {
  version: 'pathmaiden-v1'
  exportedAt: string
  encounter: PathmaidenV1Encounter
}

/** Build the filename used by the Download flow. Preserves non-latin characters
 *  (Cyrillic, etc.) and replaces only path separators + Windows-illegal chars
 *  (`<>:"/\|?*`) plus ASCII control codes with `-`. Collapses whitespace and
 *  repeated dashes. Empty or all-stripped names fall back to `encounter`. */
export function slugifyEncounterName(name: string): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return 'encounter.pathmaiden'
  // Replace illegal path / FS chars and ASCII control codes with a dash.
  const cleaned = trimmed
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  const slug = cleaned.length > 0 ? cleaned : 'encounter'
  return `${slug}.pathmaiden`
}

async function lookupCanonicalName(
  creatureRef: string,
  isHazard: boolean,
  hazardRef: string | null
): Promise<string | null> {
  const db = await getDb()
  if (isHazard) {
    const id = hazardRef ?? creatureRef
    if (!id) return null
    const rows = await db.select<Array<{ name: string }>>(
      `SELECT name FROM hazards WHERE id = ? LIMIT 1`,
      [id]
    )
    return rows[0]?.name ?? null
  }
  if (!creatureRef) return null
  const bestiary = await db.select<Array<{ name: string }>>(
    `SELECT name FROM entities WHERE id = ? AND type = 'npc' LIMIT 1`,
    [creatureRef]
  )
  if (bestiary[0]?.name) return bestiary[0].name
  const custom = await db.select<Array<{ name: string }>>(
    `SELECT name FROM custom_creatures WHERE id = ? LIMIT 1`,
    [creatureRef]
  )
  return custom[0]?.name ?? null
}

export async function exportEncounter(
  encounterId: string
): Promise<{ filename: string; content: string }> {
  const encounters = await listEncounters()
  const header = encounters.find((e) => e.id === encounterId)
  if (!header) throw new Error(`Encounter ${encounterId} not found`)

  const combatants = await loadEncounterCombatants(encounterId)
  const exported: PathmaidenV1Combatant[] = []
  for (const c of combatants) {
    const canonical = await lookupCanonicalName(c.creatureRef, c.isHazard, c.hazardRef)
    // Fallback: if no matching row (orphaned ref), reuse the displayName so
    // the import step still has something to match on.
    const lookupName = canonical ?? c.displayName
    exported.push({
      name: c.displayName,
      lookupName,
      level: c.creatureLevel,
      isHazard: c.isHazard,
      weakEliteTier: c.weakEliteTier,
      hp: c.hp,
      hpMax: c.maxHp,
      initiative: c.initiative,
    })
  }

  const payload: PathmaidenV1Export = {
    version: 'pathmaiden-v1',
    exportedAt: new Date().toISOString(),
    encounter: {
      name: header.name,
      partyLevel: header.partyLevel,
      partySize: header.partySize,
      combatants: exported,
    },
  }

  return {
    filename: slugifyEncounterName(header.name),
    content: JSON.stringify(payload, null, 2),
  }
}
