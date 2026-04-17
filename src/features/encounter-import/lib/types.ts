// 64-01: shared types for the import pipeline.

export type ImportFormat = 'dashboard' | 'pathmaiden' | 'unknown'

export interface ParsedCombatant {
  /** Raw display name from the source file — used for name matching + fallback display. */
  name: string
  /** If the source declares creature level; omitted when absent. */
  level?: number
  /** Dashboard source may classify entries as "hazard" vs "Creature". */
  isHazard: boolean
  /** Pathmaiden export preserves weak/elite tiering. Dashboard doesn't expose it. */
  weakEliteTier?: 'normal' | 'weak' | 'elite'
  /** Optional HP overrides. If omitted, commit layer uses matched bestiary HP. */
  hp?: number
  initiative?: number
}

export interface ParsedEncounter {
  name: string
  partyLevel?: number
  partySize?: number
  combatants: ParsedCombatant[]
}

export type MatchStatus =
  | { status: 'bestiary'; id: string; level: number; hp: number }
  | { status: 'custom'; id: string; level: number }
  | { status: 'hazard'; id: string; level: number; hp: number }
  | { status: 'skipped'; reason: 'no-match' | 'missing-name' }

export interface MatchedCombatant {
  parsed: ParsedCombatant
  match: MatchStatus
}

export interface MatchedEncounter {
  parsed: ParsedEncounter
  combatants: MatchedCombatant[]
}
