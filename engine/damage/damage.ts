// ─── Damage Categories ───────────────────────────────────────────────────────
export const DAMAGE_CATEGORIES = ['physical', 'energy', 'other'] as const
export type DamageCategory = (typeof DAMAGE_CATEGORIES)[number]

// ─── Damage Types by Category ────────────────────────────────────────────────
// Source: PF2e GM Core / Player Core (https://2e.aonprd.com/Rules.aspx?ID=2308)
export const PHYSICAL_DAMAGE_TYPES = ['bludgeoning', 'piercing', 'slashing', 'bleed'] as const
export type PhysicalDamageType = (typeof PHYSICAL_DAMAGE_TYPES)[number]

// Source: PF2e Player Core (Remaster) — vitality/void replace positive/negative energy
export const ENERGY_DAMAGE_TYPES = ['fire', 'cold', 'electricity', 'acid', 'sonic', 'force', 'vitality', 'void'] as const
export type EnergyDamageType = (typeof ENERGY_DAMAGE_TYPES)[number]

export const OTHER_DAMAGE_TYPES = ['spirit', 'mental', 'poison', 'untyped', 'holy', 'unholy'] as const
export type OtherDamageType = (typeof OTHER_DAMAGE_TYPES)[number]

export const DAMAGE_TYPES = [...PHYSICAL_DAMAGE_TYPES, ...ENERGY_DAMAGE_TYPES, ...OTHER_DAMAGE_TYPES] as const
export type DamageType = PhysicalDamageType | EnergyDamageType | OtherDamageType

// ─── Category Mapping ────────────────────────────────────────────────────────
export const DAMAGE_TYPE_CATEGORY: Record<DamageType, DamageCategory> = {
  bludgeoning: 'physical', piercing: 'physical', slashing: 'physical', bleed: 'physical',
  fire: 'energy', cold: 'energy', electricity: 'energy', acid: 'energy',
  sonic: 'energy', force: 'energy', vitality: 'energy', void: 'energy',
  spirit: 'other', mental: 'other', poison: 'other', untyped: 'other',
  holy: 'other', unholy: 'other',
}

// ─── Material Effects ────────────────────────────────────────────────────────
// Source: PF2e GM Core precious materials (https://2e.aonprd.com/Equipment.aspx?Category=22)
export const MATERIAL_EFFECTS = [
  'adamantine', 'cold-iron', 'mithral', 'orichalcum',
  'silver', 'sisterstone-dusk', 'sisterstone-scarlet',
] as const
export type MaterialEffect = (typeof MATERIAL_EFFECTS)[number]

// ─── Die Sizes ───────────────────────────────────────────────────────────────
// Source: PF2e GM Core damage tables — d4/d6/d8/d10/d12 progression
// Order is load-bearing: Phase 04 nextDamageDieSize uses array index arithmetic
export const DIE_SIZES = [4, 6, 8, 10, 12] as const
export type DieSize = (typeof DIE_SIZES)[number]

export const DIE_FACES = ['d4', 'd6', 'd8', 'd10', 'd12'] as const
export type DieFace = (typeof DIE_FACES)[number]

// ─── Interfaces (DMG-03) ─────────────────────────────────────────────────────

/** Controls whether a damage component applies only on critical hits, only on non-crits, or always (null). */
export type CriticalInclusion = 'critical-only' | 'non-critical-only' | null

/** A dice expression representing unresolved damage before rolling. */
export interface DamageFormula {
  diceNumber: number
  dieSize: DieFace
  modifier: number
  damageType: DamageType
  category: DamageCategory
  persistent: boolean
}

/** A resolved damage instance after dice have been rolled and damage type determined. */
export interface BaseDamage {
  damageType: DamageType
  category: DamageCategory
  total: number
  isCritical: boolean
}

/** Describes which IWR entry to bypass and why (e.g., silver bypasses devil resistance). */
export interface IWRBypass {
  type: DamageType | MaterialEffect
  reason: string
}
