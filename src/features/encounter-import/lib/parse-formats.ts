import type { ImportFormat, ParsedEncounter, ParsedCombatant } from './types'

// 64-01: format detection + parsing. Pure functions; no DB access.

interface DashboardEntry {
  name?: string
  combatants?: Array<{
    name?: string
    displayName?: string
    originalCreature?: { name?: string; level?: number; hp?: number; hazardType?: string }
    type?: string
    level?: number
    hp?: number
    initiative?: number
  }>
  partyLevel?: number
  partySize?: number
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
      level?: number
      isHazard?: boolean
      weakEliteTier?: 'normal' | 'weak' | 'elite'
      hp?: number
      initiative?: number
    }>
  }
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
      const rawName = c.originalCreature?.name ?? c.displayName ?? c.name
      if (!rawName || typeof rawName !== 'string') continue
      const typeStr = (c.type ?? '').toLowerCase()
      const isHazard =
        typeStr === 'hazard' ||
        (c.originalCreature?.hazardType != null && typeStr !== 'creature')
      combatants.push({
        name: rawName,
        level: c.originalCreature?.level ?? c.level,
        isHazard,
        hp: c.hp ?? c.originalCreature?.hp,
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
  const combatants: ParsedCombatant[] = []
  for (const c of enc.combatants ?? []) {
    if (!c?.name || typeof c.name !== 'string') continue
    combatants.push({
      name: c.name,
      level: c.level,
      isHazard: c.isHazard === true,
      weakEliteTier: c.weakEliteTier,
      hp: c.hp,
      initiative: c.initiative,
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

/** Dispatch parse by detected format. Returns empty array on unknown. */
export function parseEncounterJson(json: unknown): ParsedEncounter[] {
  const fmt = detectFormat(json)
  if (fmt === 'dashboard') return parseDashboard(json)
  if (fmt === 'pathmaiden') return parsePathmaiden(json)
  return []
}
