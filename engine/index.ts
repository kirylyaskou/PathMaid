// ─── Engine Barrel Export ──────────────────────────────────────────────────────
// Single public API for all PF2e engine logic.
// Consumers import from '@engine' or './engine'.
// No per-subdirectory index.ts files (D-02).

// ── Types ─────────────────────────────────────────────────────────────────────
export type { WeakEliteTier, Creature, AbilityKey, CreatureSize, Rarity, CreatureSense, CreatureSpeed, DamageRoll, CreatureAttack } from './types'

// ── Conditions ────────────────────────────────────────────────────────────────
export {
  CONDITION_SLUGS,
  VALUED_CONDITIONS,
  CONDITION_GROUPS,
  ConditionManager,
} from './conditions/conditions'
export type { ConditionSlug, ValuedCondition } from './conditions/conditions'

export {
  CONDITION_EFFECTS,
  CONDITION_OVERRIDES,
  CONDITION_GROUPS_EXTENDED,
  EXCLUSIVE_GROUPS,
} from './conditions/condition-effects'
export type {
  ConditionSelector,
  ConditionModifierEffect,
  ConditionGrantEffect,
  ConditionDrainedHpEffect,
  ConditionEffect,
} from './conditions/condition-effects'

export {
  performRecoveryCheck,
  getWoundedValueAfterStabilize,
  getDyingValueOnKnockout,
} from './conditions/death-progression'
export type {
  RecoveryCheckOutcome,
  RecoveryCheckResult,
} from './conditions/death-progression'

// ── Damage ────────────────────────────────────────────────────────────────────
export {
  DAMAGE_CATEGORIES,
  PHYSICAL_DAMAGE_TYPES,
  ENERGY_DAMAGE_TYPES,
  OTHER_DAMAGE_TYPES,
  DAMAGE_TYPES,
  DAMAGE_TYPE_CATEGORY,
  MATERIAL_EFFECTS,
  DIE_SIZES,
  DIE_FACES,
} from './damage/damage'
export type {
  DamageCategory,
  PhysicalDamageType,
  EnergyDamageType,
  OtherDamageType,
  DamageType,
  MaterialEffect,
  DieSize,
  DieFace,
  CriticalInclusion,
  DamageFormula,
  BaseDamage,
  IWRBypass,
} from './damage/damage'

export { DamageCategorization, nextDamageDieSize } from './damage/damage-helpers'

export {
  IMMUNITY_TYPES,
  WEAKNESS_TYPES,
  RESISTANCE_TYPES,
  DOUBLE_VS_CONDITIONS,
  CONDITION_IMMUNITY_TYPES,
  EFFECT_IMMUNITY_TYPES,
  createImmunity,
  createWeakness,
  createResistance,
  applyIWR,
} from './damage/iwr'
export type {
  ImmunityType,
  WeaknessType,
  ResistanceType,
  DoubleVsCondition,
  ConditionImmunityType,
  EffectImmunityType,
  DamageInstance,
  Immunity,
  Weakness,
  Resistance,
  IWRApplicationResult,
} from './damage/iwr'

export { parseIwrData, formatIwrType } from './damage/iwr-utils'
export type { IwrData } from './damage/iwr-utils'

// ── Modifiers ─────────────────────────────────────────────────────────────────
export {
  MODIFIER_TYPES,
  Modifier,
  applyStackingRules,
  StatisticModifier,
  DamageDicePF2e,
} from './modifiers/modifiers'
export type { ModifierType } from './modifiers/modifiers'

// ── Actions ──────────────────────────────────────────────────────────────────
export { ACTIONS } from './actions/action-data'
export { ACTION_OUTCOMES } from './actions/action-outcomes'
export type {
  ActionType,
  ActionCost,
  ActionCategory,
  DegreeKey,
  ActionOutcome,
  ActionOutcomeMap,
  Action,
} from './actions/types'

// ── Degree of Success ────────────────────────────────────────────────────────
export {
  calculateDegreeOfSuccess,
  upgradeDegree,
  downgradeDegree,
  INCAPACITATION_ADJUSTMENT,
  basicSaveDamageMultiplier,
} from './degree-of-success/degree-of-success'
export type {
  DegreeOfSuccess,
  DegreeAdjustment,
} from './degree-of-success/degree-of-success'

// ── Encounter ─────────────────────────────────────────────────────────────────
export {
  calculateCreatureXP,
  getHazardXp,
  generateEncounterBudgets,
  calculateEncounterRating,
  calculateXP,
} from './encounter/xp'
export type {
  XpResult,
  HazardType,
  ThreatRating,
  EncounterResult,
  EncounterCreatureEntry,
  EncounterHazardEntry,
  OutOfRangeWarning,
} from './encounter/xp'

export { getHpAdjustment, getStatAdjustment } from './encounter/weak-elite'

// ── Spellcasting ────────────────────────────────────────────────────────────
export { detectCasterProgression, getMaxRecommendedRank } from './spellcasting/caster-progression'
export type { CasterProgression } from './spellcasting/caster-progression'

// ── Statistics ───────────────────────────────────────────────────────────────
export { Statistic } from './statistics/statistic'
export { resolveSelector } from './statistics/selector-resolver'
export { CreatureStatistics, buildAttackModifierSets } from './statistics/creature-statistics'
export { computeStatModifier } from './statistics/compute-stat-modifiers'
export type { ConditionInput, StatModifierResult } from './statistics/compute-stat-modifiers'

// ── Spell Effects ──────────────────────────────────────────────────────────
export {
  parseSpellEffectModifiers,
  parseSpellEffectResistances,
} from './effects/spell-effect-modifiers'
export type { SpellEffectModifierInput } from './effects/spell-effect-modifiers'

// -- Dice ────────────────────────────────────────────────────────────────────
export { parseFormula, rollDice, heightenFormula } from './dice/dice'
export type { Roll, DiceEntry, ParsedFormula } from './dice/dice'

// ── PC ────────────────────────────────────────────────────────────────────────
export type {
  PathbuilderAbilities,
  PathbuilderAttributes,
  PathbuilderProficiencies,
  PathbuilderSpellEntry,
  PathbuilderBuild,
  PathbuilderExport,
} from './pc/types'
export { calculatePCMaxHP } from './pc/hp'
export { abilityModifier, proficiencyModifier } from './pc/math'
export { SKILL_ABILITY } from './pc/skills'

// ── Creature Building ─────────────────────────────────────────────────────
export { getBenchmark, classifyStat, BENCHMARK_TABLES, SAFE_ITEM_LEVEL_TABLE } from './creature-building/getBenchmark'
export { ROLE_PRESETS, applyRole } from './creature-building/roles'
export type { AppliedRoleValues } from './creature-building/roles'
export { runSanityChecks } from './creature-building/sanity'
export type { CreatureStatsForSanity } from './creature-building/sanity'
export type {
  Tier,
  StatKind,
  RoleId,
  RolePreset,
  BenchmarkValue,
  DamageBenchmark,
  SanityIssue,
  SanityIssueSeverity,
} from './creature-building/types'
