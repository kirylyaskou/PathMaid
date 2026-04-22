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

export {
  getHpAdjustment,
  getStatAdjustment,
  getAdjustedLevel,
  getDamageAdjustment,
  getXpLevelDelta,
} from './encounter/weak-elite'
export {
  applyTierToStatBlock,
  shiftDamageFormulaConstant,
} from './encounter/apply-tier'
export type { TierAdjustableStatBlock } from './encounter/apply-tier'

// ── Spellcasting ────────────────────────────────────────────────────────────
export { detectCasterProgression, getMaxRecommendedRank } from './spellcasting/caster-progression'
export type { CasterProgression } from './spellcasting/caster-progression'

// ── Statistics ───────────────────────────────────────────────────────────────
export { Statistic } from './statistics/statistic'
export { resolveSelector } from './statistics/selector-resolver'
export { CreatureStatistics, buildAttackModifierSets } from './statistics/creature-statistics'
export { computeStatModifier } from './statistics/compute-stat-modifiers'
export type {
  ConditionInput,
  StatModifierResult,
  InactiveModifier,
} from './statistics/compute-stat-modifiers'

// ── Spell Effects ──────────────────────────────────────────────────────────
export {
  parseSpellEffectModifiers,
  parseSpellEffectResistances,
  parseSpellEffectRollOptions,
  parseSpellEffectRollTwice,
} from './effects/spell-effect-modifiers'
export type {
  SpellEffectModifierInput,
  SpellEffectRollOption,
  SpellEffectRollTwice,
} from './effects/spell-effect-modifiers'

export { planFortuneRoll } from './effects/fortune'
export type {
  RollContext,
  FortuneInputs,
  FortuneRollPlan,
} from './effects/fortune'

export {
  parseSpellEffectAdjustStrikes,
  applyAdjustStrikes,
} from './effects/adjust-strike'
export type {
  AdjustStrikeInput,
  StrikeDamage,
} from './effects/adjust-strike'

export {
  parseSpellEffectCreatureSize,
  parseSpellEffectBattleForm,
  parseSpellEffectSizeShift,
} from './effects/battle-form'
export type {
  CreatureSizeInput,
  BattleFormInput,
  SpellEffectSizeShift,
} from './effects/battle-form'

// v1.4.1 UAT BUG-5: BaseSpeed rule parser + land-speed-aware resolver.
export {
  parseBaseSpeedRules,
  resolveBaseSpeedValue,
} from './effects/base-speed'
export type { BaseSpeedInput, SpeedType } from './effects/base-speed'
export type { BattleFormStrikeOverride } from './effects/battle-form-types'

export {
  parseSpellEffectNotes,
  getActiveRollNotes,
  collectActiveNotesForCombatant,
} from './effects/notes'
export type { NoteInput } from './effects/notes'

export {
  parseSpellEffectGrantItems,
  SAME_PACK_EFFECT_PACKS,
} from './effects/grant-item'
export type {
  GrantItemInput,
  SamePackEffectPack,
} from './effects/grant-item'

export {
  evaluatePredicate,
  __resetPredicateWarnCache,
} from './effects/predicate-evaluator'
export type {
  PredicateTerm,
  PredicateNode,
} from './effects/predicate-evaluator'

export {
  buildPredicateContext,
  buildActorFacts,
  emptyPredicateContext,
  slugifyEffectName,
} from './effects/predicate-context'
export type {
  PredicateContext,
  PredicateActorFacts,
  RawActorSnapshot,
  RawConditionInput,
  RawEffectInput,
} from './effects/predicate-context'

// -- Dice ────────────────────────────────────────────────────────────────────
export { parseFormula, rollDice, heightenFormula } from './dice/dice'
export type {
  Roll,
  DiceEntry,
  ParsedFormula,
  FortuneRollDisplay,
  FortuneRollEntry,
} from './dice/dice'

// ── PC ────────────────────────────────────────────────────────────────────────
export type {
  PathbuilderAbilities,
  PathbuilderAttributes,
  PathbuilderProficiencies,
  PathbuilderSpellEntry,
  PathbuilderWeapon,
  PathbuilderArmor,
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
export {
  RECALL_KNOWLEDGE_DC_TABLE,
  RARITY_DC_ADJUSTMENT,
  CREATURE_TYPE_TO_SKILLS,
  computeRecallKnowledgeDC,
  getRecallKnowledgeSkills,
  getRecallKnowledgeInfo,
} from './creature-building/recall-knowledge'
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
