import type { Rarity as EngineRarity } from '@engine'

export type { Rarity, CreatureSize, ActionCost, WeakEliteTier } from '@engine'

// Display-oriented size labels for UI components (TraitList, stat blocks).
// Engine uses short codes (CreatureSize: 'tiny'|'sm'|'med'|...) — these are display names.
export type DisplaySize = 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan'

// UI action cost — includes reaction/free/0 for display (engine ActionCost is 1|2|3|null)
export type DisplayActionCost = 0 | 1 | 2 | 3 | 'reaction' | 'free'

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
