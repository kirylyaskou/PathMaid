import type { Rarity as EngineRarity } from '@engine'
import type { DisplaySize } from '@/shared/lib/size-map'
import type { SpellcastingSection } from '@/entities/spell'
import type { CreatureItemRow } from '@/shared/api'

export type { Rarity, CreatureSize, ActionCost, WeakEliteTier } from '@engine'
export type { DisplaySize } from '@/shared/lib/size-map'

// UI action cost — includes reaction/free/0 for display (engine ActionCost is 1|2|3|null)
export type DisplayActionCost = 0 | 1 | 2 | 3 | 'reaction' | 'free'

// Phase 59 (D-08): ability modifiers block for creatures built with the builder.
// Foundry bestiary stat blocks populate this from `system.abilities.{ability}.mod`.
export interface AbilityMods {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

// Phase 59 (D-08): structured IWR shape. `ImmunityEntry` keeps legacy `string`
// form in the union so Foundry raw data can be stored verbatim — the normalizer
// in `iwr-normalize.ts` wraps strings at read time for uniform UI consumption.
export type ImmunityEntry = string | { type: string; exceptions?: string[] }
export interface WeaknessEntry {
  type: string
  value: number
  exceptions?: string[]
}
export interface ResistanceEntry {
  type: string
  value: number
  exceptions?: string[]
}

export interface AuraEntry {
  name: string
  radius: number // feet
  traits: string[]
  effect: string // free-form description
}

export interface RitualEntry {
  name: string
  tradition: string // 'arcane' | 'divine' | 'occult' | 'primal' — left as string for free-form
  rank: number // 1..10
}

export interface CreatureStatBlockData extends Creature {
  immunities: ImmunityEntry[]
  weaknesses: WeaknessEntry[]
  resistances: ResistanceEntry[]
  speeds: Record<string, number | null>
  strikes: {
    name: string
    modifier: number
    damage: { formula: string; type: string }[]
    traits: string[]
    group?: string
    additionalDamage?: { formula: string; type: string; label?: string }[]
    // v1.4.1 UAT BUG-Z: reach (feet) for melee strikes; `range` (feet) for
    // ranged strikes. Both optional; when absent the UI falls back to the
    // creature's base reach.
    reach?: number
    range?: number
  }[]
  abilities: { name: string; actionCost?: DisplayActionCost; description: string; traits?: string[] }[]
  skills: { name: string; modifier: number; calculated?: boolean }[]
  languages: string[]
  senses: string[]
  description?: string
  source: string
  spellDC?: number
  classDC?: number
  spellcasting?: SpellcastingSection[]
  equipment?: CreatureItemRow[]

  // Phase 59 (D-08): new fields introduced for the custom creature builder.
  abilityMods: AbilityMods
  auras?: AuraEntry[]
  rituals?: RitualEntry[]
}

// Serializable creature entity for display and SQLite persistence.
// Engine Creature has non-serializable ConditionManager and nested hp/saves —
// Phase 7 maps Foundry VTT data → this interface.
export interface Creature {
  id: string
  name: string
  level: number
  hp: number
  ac: number
  fort: number
  ref: number
  will: number
  perception: number
  traits: string[]
  rarity: EngineRarity
  size: DisplaySize
  type: string
}
