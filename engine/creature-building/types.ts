// engine/creature-building/types.ts
//
// Public type surface for the creature-building engine module.
// Consumed by the builder UI, validator, role-apply feature, and
// BenchmarkHint component. Pure types, no runtime code.

export type Tier = 'extreme' | 'high' | 'moderate' | 'low' | 'terrible'

export type StatKind =
  | 'abilityMod'
  | 'perception'
  | 'skill'
  | 'ac'
  | 'save'
  | 'hp'
  | 'attackBonus'
  | 'strikeDamage'
  | 'spellDC'
  | 'spellAttack'
  | 'resistanceWeakness'
  | 'areaDamage'

export type RoleId =
  | 'brute'
  | 'soldier'
  | 'skirmisher'
  | 'sniper'
  | 'spellcaster'
  | 'skillParagon'
  | 'magicalStriker'

export interface DamageBenchmark {
  formula: string        // e.g. "2d8+5"
  expected: number       // e.g. 16
}

// D-29: per-save / per-ability granularity. Missing keys = "role has no opinion".
export interface RolePreset {
  abilities?: Partial<Record<'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha', Tier>>
  saves?: Partial<Record<'fort' | 'ref' | 'will', Tier>>
  perception?: Tier
  ac?: Tier
  hp?: Tier
  strikeAttackBonus?: Tier
  strikeDamage?: Tier
  spellDC?: Tier
  spellAttack?: Tier
  skill?: Tier
}

// D-05: union return type. Use discriminated access via overload in getBenchmark.
export type BenchmarkValue = number | DamageBenchmark

export type SanityIssueSeverity = 'warn' | 'info'

export interface SanityIssue {
  severity: SanityIssueSeverity
  stat: StatKind | 'role' | 'general'
  message: string                // human-readable, shown as-is in Design Review
  level?: number                 // for "out-of-tier" issues
  value?: number                 // offending value
  closestTier?: Tier             // for out-of-tier messages
}
