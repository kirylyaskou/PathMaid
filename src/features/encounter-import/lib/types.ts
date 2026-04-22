// shared types for the import pipeline.

export type ImportFormat = 'dashboard' | 'pathmaiden' | 'unknown'

export interface ParsedCombatant {
  /** What appears in the initiative list — preserves the GM's local moniker
   *  (e.g. "Огрек" for an Urnak Lostwind reskin). Falls back to lookupName
   *  when the source has no separate display name. */
  displayName: string
  /** Used by the matcher to find the underlying bestiary/custom/hazard row.
   *  In Dashboard format this is `originalCreature.name`. In Pathmaiden
   *  format it equals `displayName`. */
  lookupName: string
  /** Bestiary level if the source declares one (used as fallback when match returns no level). */
  level?: number
  /** Dashboard source may classify entries as "hazard" vs "Creature". */
  isHazard: boolean
  /** Pathmaiden export preserves weak/elite tiering. Dashboard doesn't expose it. */
  weakEliteTier?: 'normal' | 'weak' | 'elite'
  /** Current HP from the source. Extracted from `hp.value` when source uses
   *  the Dashboard `{value, max, modifications, note}` shape; otherwise the
   *  raw number. */
  hp?: number
  /** Max HP from the source (Dashboard `hp.max`). When omitted, commit layer
   *  falls back to matched bestiary HP. */
  hpMax?: number
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
