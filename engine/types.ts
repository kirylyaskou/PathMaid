import type { Immunity } from './damage/iwr'
import type { ConditionManager } from './conditions/conditions'
import type { StatisticModifier } from './modifiers/modifiers'

// ─── Shared Engine Types ──────────────────────────────────────────────────────

/** Weak/Elite creature adjustment tier per PF2e Monster Core */
export type WeakEliteTier = 'normal' | 'weak' | 'elite'

// ─── Ability / Size / Rarity Types (Phase 4, D-12) ──────────────────────────

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type CreatureSize = 'tiny' | 'sm' | 'med' | 'lg' | 'huge' | 'grg'
export type Rarity = 'common' | 'uncommon' | 'rare' | 'unique'

// ─── Creature Sub-Interfaces (Phase 4, D-12, D-13, D-14) ────────────────────

export interface CreatureSense {
  type: string       // e.g., 'darkvision', 'scent', 'tremorsense'
  acuity?: string    // e.g., 'precise', 'imprecise', 'vague'
  range?: number     // in feet, e.g., 30, 60
}

export interface CreatureSpeed {
  land: number
  other: Array<{ type: string; value: number }>  // fly, swim, burrow, climb
}

export interface DamageRoll {
  damage: string       // formula like "1d6+6"
  damageType: string   // "slashing", "piercing", etc.
}

export interface CreatureAttack {
  name: string
  attackType: 'melee' | 'ranged'
  bonus: number         // base attack bonus (pre-calculated)
  damageRolls: DamageRoll[]
  traits: string[]      // includes 'agile' for agile weapons
  range?: { increment: number; max: number | null }  // ranged only
  /** Pre-computed MAP modifier sets for attack positions 1/2/3 (per D-14, D-05).
   *  Optional because raw Creature data from Foundry JSON won't have it —
   *  it's computed by CreatureStatistics in Plan 03. */
  mapSets?: [StatisticModifier, StatisticModifier, StatisticModifier]
}

// ─── Creature Interface (Phase 3 + Phase 4) ──────────────────────────────────
// Source: D-17 (Phase 3 minimal), D-12/D-13/D-14 (Phase 4 full NPC stat block)
// Phase 3 fields preserved. Phase 4 adds abilities, AC, saves, attacks, etc.

export interface Creature {
  // ── Phase 3 fields (DO NOT REMOVE) ──────────────────────────────────────
  immunities: Immunity[]
  conditions: ConditionManager
  hp: {
    current: number
    max: number
    temp: number
  }
  level: number
  deathDoor: boolean

  // ── Phase 4 additions (D-12) ────────────────────────────────────────────
  name: string
  slug: string
  abilities: Record<AbilityKey, number>  // mod values, e.g., { str: 4, dex: 3, ... }
  ac: number                              // pre-calculated AC base value
  saves: { fortitude: number; reflex: number; will: number }
  perception: number                      // pre-calculated perception mod
  skills: Record<string, number>          // sparse — only skills present on creature
  speed: CreatureSpeed
  senses: CreatureSense[]
  traits: string[]                        // creature type tags, e.g., ["humanoid", "serpentfolk"]
  size: CreatureSize
  rarity: Rarity
  languages: string[]
  initiative: number                      // typically equals perception mod for NPCs

  // ── Phase 4 additions (D-13, D-14) ──────────────────────────────────────
  attacks: CreatureAttack[]               // melee and ranged attacks (mapSets populated by CreatureStatistics)
}
