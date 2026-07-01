import type { EmbeddedCustomCreature, ImportFormat, ParsedEncounter, ParsedCombatant } from './types'
import type { EncounterSide } from '@engine'

// format detection + parsing. Pure functions; no DB access.

// Dashboard combatant fields. Note that hp / level / perception arrive as
// nested {value, max, modifications, note} objects, not bare numbers.
interface DashboardHpField {
  value?: number
  max?: number
}
interface DashboardCombatant {
  name?: string
  displayName?: string
  originalCreature?: {
    name?: string
    level?: number | DashboardHpField
    hp?: number | DashboardHpField
    type?: string
    hazardType?: string
  }
  type?: string
  level?: number | DashboardHpField
  hp?: number | DashboardHpField
  initiative?: number
}
interface DashboardEntry {
  name?: string
  combatants?: DashboardCombatant[]
  partyLevel?: number
  partySize?: number
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'value' in (v as object)) {
    const x = (v as DashboardHpField).value
    if (typeof x === 'number') return x
  }
  return undefined
}
function asMax(v: unknown): number | undefined {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && 'max' in (v as object)) {
    const x = (v as DashboardHpField).max
    if (typeof x === 'number') return x
  }
  return undefined
}

interface PathmaidenExport {
  version: 'pathmaiden-v1'
  exportedAt?: string
  encounter: {
    name: string
    partyLevel?: number
    partySize?: number
    combatants: Array<{
      name: string
      /** Canonical bestiary/custom/hazard name used by the matcher.
       *  Falls back to `name` when absent (legacy exports without lookupName). */
      lookupName?: string
      customCreatureId?: string
      level?: number
      isHazard?: boolean
      weakEliteTier?: 'normal' | 'weak' | 'elite'
      hp?: number
      hpMax?: number
      initiative?: number
      side?: EncounterSide
    }>
    customCreatures?: EmbeddedCustomCreature[]
  }
}

interface PathmaidBundleExport {
  version: 'pathmaid-bundle-v1'
  exportedAt?: string
  encounters: PathmaidenExport['encounter'][]
  customCreatures?: EmbeddedCustomCreature[]
}

function customCreatureMap(customCreatures: EmbeddedCustomCreature[] | undefined): Map<string, EmbeddedCustomCreature> {
  const map = new Map<string, EmbeddedCustomCreature>()
  for (const creature of customCreatures ?? []) {
    if (creature?.sourceId && creature.statBlock) {
      map.set(creature.sourceId, creature)
    }
  }
  return map
}

function parseSide(value: unknown): EncounterSide | undefined {
  return value === 'enemy' || value === 'ally' ? value : undefined
}

export function detectFormat(json: unknown): ImportFormat {
  if (Array.isArray(json) && json.length > 0) {
    const first = json[0] as Record<string, unknown> | undefined
    if (first && typeof first === 'object' && Array.isArray((first as DashboardEntry).combatants)) {
      return 'dashboard'
    }
  }
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const obj = json as Record<string, unknown>
    if (obj.version === 'pathmaid-bundle-v1' && Array.isArray(obj.encounters)) {
      return 'pathmaid-bundle'
    }
    if (obj.version === 'pathmaiden-v1' && typeof obj.encounter === 'object' && obj.encounter) {
      return 'pathmaiden'
    }
  }
  return 'unknown'
}

export function parseDashboard(json: unknown): ParsedEncounter[] {
  if (!Array.isArray(json)) return []
  const out: ParsedEncounter[] = []
  for (const entry of json as DashboardEntry[]) {
    if (!entry || typeof entry !== 'object') continue
    const combatants: ParsedCombatant[] = []
    for (const c of entry.combatants ?? []) {
      // Local moniker takes priority for displayName ("Огрек"). Fall back to
      // originalCreature.name when no local name is set.
      const localName = (typeof c.name === 'string' && c.name) ? c.name : undefined
      const origName = (typeof c.originalCreature?.name === 'string' && c.originalCreature.name)
        ? c.originalCreature.name
        : undefined
      const explicitDisplay =
        (typeof c.displayName === 'string' && c.displayName) ? c.displayName : undefined
      const displayName = explicitDisplay ?? localName ?? origName
      if (!displayName) continue

      // Lookup against bestiary uses the canonical (originalCreature) name when
      // present, falling back to the local name.
      const lookupName = origName ?? localName ?? displayName

      const localType = (c.type ?? '').toLowerCase()
      const origType = (c.originalCreature?.type ?? '').toLowerCase()
      const isHazard =
        localType === 'hazard' ||
        origType === 'hazard' ||
        (c.originalCreature?.hazardType != null && localType !== 'creature')

      combatants.push({
        displayName,
        lookupName,
        level: asNumber(c.originalCreature?.level) ?? asNumber(c.level),
        isHazard,
        hp: asNumber(c.hp) ?? asNumber(c.originalCreature?.hp),
        hpMax: asMax(c.hp) ?? asMax(c.originalCreature?.hp),
        initiative: c.initiative,
      })
    }
    out.push({
      name: entry.name ?? 'Imported Encounter',
      partyLevel: entry.partyLevel,
      partySize: entry.partySize,
      combatants,
    })
  }
  return out
}

export function parsePathmaiden(json: unknown): ParsedEncounter[] {
  if (!json || typeof json !== 'object') return []
  const raw = json as PathmaidenExport
  if (raw.version !== 'pathmaiden-v1' || !raw.encounter) return []
  const enc = raw.encounter
  const embeddedById = customCreatureMap(enc.customCreatures)
  const combatants: ParsedCombatant[] = []
  for (const c of enc.combatants ?? []) {
    if (!c?.name || typeof c.name !== 'string') continue
    // pathmaiden-v1 exports carry a separate lookupName
    // (canonical bestiary name) so GM-renamed combatants still match on
    // re-import. Legacy exports omitted it; fall back to the display name.
    const lookupName =
      typeof c.lookupName === 'string' && c.lookupName.trim() ? c.lookupName : c.name
    const embeddedCustomCreature =
      typeof c.customCreatureId === 'string' ? embeddedById.get(c.customCreatureId) : undefined
    combatants.push({
      displayName: c.name,
      lookupName,
      level: c.level,
      isHazard: c.isHazard === true,
      weakEliteTier: c.weakEliteTier,
      hp: c.hp,
      hpMax: c.hpMax,
      initiative: c.initiative,
      side: parseSide(c.side),
      embeddedCustomCreature,
    })
  }
  return [
    {
      name: enc.name ?? 'Imported Encounter',
      partyLevel: enc.partyLevel,
      partySize: enc.partySize,
      combatants,
    },
  ]
}

export function parsePathmaidBundle(json: unknown): ParsedEncounter[] {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return []
  const raw = json as PathmaidBundleExport
  if (raw.version !== 'pathmaid-bundle-v1' || !Array.isArray(raw.encounters)) return []
  const bundleEmbeddedById = customCreatureMap(raw.customCreatures)
  const out: ParsedEncounter[] = []
  for (const enc of raw.encounters) {
    if (!enc || typeof enc !== 'object') continue
    const encounterEmbeddedById = customCreatureMap(enc.customCreatures)
    const combatants: ParsedCombatant[] = []
    for (const c of enc.combatants ?? []) {
      if (!c?.name || typeof c.name !== 'string') continue
      const lookupName =
        typeof c.lookupName === 'string' && c.lookupName.trim() ? c.lookupName : c.name
      const embeddedCustomCreature =
        typeof c.customCreatureId === 'string'
          ? encounterEmbeddedById.get(c.customCreatureId) ?? bundleEmbeddedById.get(c.customCreatureId)
          : undefined
      combatants.push({
        displayName: c.name,
        lookupName,
        level: c.level,
        isHazard: c.isHazard === true,
        weakEliteTier: c.weakEliteTier,
        hp: c.hp,
        hpMax: c.hpMax,
        initiative: c.initiative,
        side: parseSide(c.side),
        embeddedCustomCreature,
      })
    }
    out.push({
      name: enc.name ?? 'Imported Encounter',
      partyLevel: enc.partyLevel,
      partySize: enc.partySize,
      combatants,
    })
  }
  return out
}

/** Dispatch parse by detected format. Returns empty array on unknown. */
export function parseEncounterJson(json: unknown): ParsedEncounter[] {
  const fmt = detectFormat(json)
  if (fmt === 'dashboard') return parseDashboard(json)
  if (fmt === 'pathmaiden') return parsePathmaiden(json)
  if (fmt === 'pathmaid-bundle') return parsePathmaidBundle(json)
  return []
}
