// ─── IWR Engine (IWR-01 through IWR-04) ──────────────────────────────────────
// Source: PF2e CRB — Immunity (ID 2312), Weakness (ID 2317), Resistance (ID 2318)
// Processing order: Immunities → Weaknesses → Resistances (official CRB order)

import {
  DAMAGE_TYPES,
  DAMAGE_CATEGORIES,
} from './damage'
import type { DamageType, DamageCategory, MaterialEffect } from './damage'
import { DamageCategorization } from './damage-helpers'

// ─── IWR Type Constants ───────────────────────────────────────────────────────

// Source: Foundry VTT PF2e refs/pf2e/conditions/*.json (condition immunities found in content)
// D-20: Add ~50 missing immunity types split into condition and effect sub-arrays
export const CONDITION_IMMUNITY_TYPES = [
  'blinded', 'clumsy', 'confused', 'controlled', 'dazzled', 'deafened',
  'doomed', 'drained', 'enfeebled', 'fascinated', 'fatigued', 'grabbed',
  'immobilized', 'off-guard', 'paralyzed', 'persistent-damage', 'petrified',
  'prone', 'restrained', 'sickened', 'slowed', 'stunned', 'stupefied', 'unconscious',
] as const
export type ConditionImmunityType = (typeof CONDITION_IMMUNITY_TYPES)[number]

// Source: Foundry VTT PF2e refs/pf2e/bestiary/ (effect immunity types in creature stat blocks)
export const EFFECT_IMMUNITY_TYPES = [
  'auditory', 'curse', 'death-effects', 'disease', 'emotion', 'fear-effects',
  'fortune-effects', 'healing', 'illusion', 'inhaled', 'light', 'magic',
  'misfortune-effects', 'nonlethal-attacks', 'object-immunities', 'olfactory',
  'polymorph', 'possession', 'radiation', 'scrying', 'sleep', 'spell-deflection',
  'swarm-attacks', 'swarm-mind', 'visual',
] as const
export type EffectImmunityType = (typeof EFFECT_IMMUNITY_TYPES)[number]

/** All valid immunity targets: damage types, damage categories, special cases, condition types, and effect types. */
export const IMMUNITY_TYPES = [
  ...DAMAGE_TYPES,
  ...DAMAGE_CATEGORIES,
  'critical-hits',
  'precision',
  ...CONDITION_IMMUNITY_TYPES,
  ...EFFECT_IMMUNITY_TYPES,
] as const
export type ImmunityType = (typeof IMMUNITY_TYPES)[number]

// Source: Foundry VTT PF2e refs/pf2e/bestiary/ (weakness types in creature stat blocks)
// D-21: Add ~17 missing weakness type strings; holy/unholy flow in via DAMAGE_TYPES spread
/** All valid weakness targets: damage types, damage categories, and material/special weaknesses. */
export const WEAKNESS_TYPES = [
  ...DAMAGE_TYPES,
  ...DAMAGE_CATEGORIES,
  'alchemical', 'area-damage', 'axe-vulnerability', 'cold-iron', 'earth',
  'orichalcum', 'peachwood', 'salt', 'salt-water', 'silver', 'splash-damage',
  'vorpal', 'vulnerable-to-sunlight', 'water', 'air',
] as const
export type WeaknessType = (typeof WEAKNESS_TYPES)[number]

// Source: Foundry VTT PF2e refs/pf2e/bestiary/ (resistance types in creature stat blocks)
// D-22: Add ~14 missing resistance type strings; unholy flows in via DAMAGE_TYPES spread
/** All valid resistance targets: damage types, damage categories, and special resistances including all-damage. */
export const RESISTANCE_TYPES = [
  ...DAMAGE_TYPES,
  ...DAMAGE_CATEGORIES,
  'all-damage', 'critical-hits', 'earth', 'metal', 'mythic', 'plant',
  'precision', 'protean-anatomy', 'silver', 'spells', 'water', 'wood', 'air',
] as const
export type ResistanceType = (typeof RESISTANCE_TYPES)[number]

/** Closed set of conditions that can trigger doubleVs on a Weakness. */
export const DOUBLE_VS_CONDITIONS = ['critical'] as const
export type DoubleVsCondition = (typeof DOUBLE_VS_CONDITIONS)[number]

// ─── Interfaces ───────────────────────────────────────────────────────────────

/** A single resolved damage instance to be processed by applyIWR. */
export interface DamageInstance {
  type: DamageType
  amount: number
  category?: DamageCategory
  critical?: boolean
  precision?: boolean
  materials?: MaterialEffect[]
  /** True when the damage originates from a magical source (spell, magic weapon, etc). */
  magical?: boolean
}

/** An immunity entry on a creature. Zeroes matched damage entirely (or halves for critical-hits). */
export interface Immunity {
  readonly type: ImmunityType
  readonly exceptions: DamageType[]
}

/**
 * A weakness entry on a creature. Adds to matched damage.
 * applyOnce is caller-enforced: callers iterating multiple instances must skip
 * already-applied applyOnce weaknesses. applyIWR itself does not enforce it.
 */
export interface Weakness {
  readonly type: WeaknessType
  readonly value: number
  readonly exceptions: DamageType[]
  readonly doubleVs?: DoubleVsCondition[]
  readonly applyOnce: boolean
}

/**
 * A resistance entry on a creature. Reduces matched damage (minimum 0).
 * doubleVs conditions (e.g. "non-magical") double the resistance value when matched.
 */
export interface Resistance {
  readonly type: ResistanceType
  readonly value: number
  readonly exceptions: DamageType[]
  readonly doubleVs?: string[]
}

/** Detailed result from applyIWR for UI display and diagnostic use. */
export interface IWRApplicationResult {
  finalDamage: number
  appliedImmunities: Immunity[]
  appliedWeaknesses: Weakness[]
  appliedResistances: Resistance[]
  /** Effective weakness amount actually added (after doubleVs). 0 if no weakness applied. */
  weaknessTotal: number
  /** True when the applied weakness fired its doubleVs (e.g. crit). */
  weaknessDoubled: boolean
  /** Effective resistance amount actually subtracted (after doubleVs, before clamp). 0 if no resistance applied. */
  resistanceTotal: number
  /** True when the applied resistance fired its doubleVs (e.g. non-magical). */
  resistanceDoubled: boolean
}

// ─── Factory Functions ────────────────────────────────────────────────────────

/** Creates an Immunity entry with optional exceptions. */
export function createImmunity(type: ImmunityType, exceptions: DamageType[] = []): Immunity {
  return { type, exceptions }
}

/** Creates a Weakness entry with optional configuration. */
export function createWeakness(
  type: WeaknessType,
  value: number,
  options?: {
    exceptions?: DamageType[]
    doubleVs?: DoubleVsCondition[]
    applyOnce?: boolean
  },
): Weakness {
  return {
    type,
    value,
    exceptions: options?.exceptions ?? [],
    doubleVs: options?.doubleVs,
    applyOnce: options?.applyOnce ?? false,
  }
}

/** Creates a Resistance entry with optional exceptions and doubleVs conditions. */
export function createResistance(
  type: ResistanceType,
  value: number,
  exceptions: DamageType[] = [],
  doubleVs?: string[],
): Resistance {
  return doubleVs && doubleVs.length > 0 ? { type, value, exceptions, doubleVs } : { type, value, exceptions }
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Returns true if the IWR entry's type matches the damage instance
 * (either by exact damage type or by category-level match).
 */
function typeMatches(iwrType: ImmunityType | WeaknessType | ResistanceType, instance: DamageInstance): boolean {
  // D-24: all-damage resistance matches any damage type (special case, must be first)
  if (iwrType === 'all-damage') return true
  return (
    iwrType === instance.type ||
    iwrType === DamageCategorization.getCategory(instance.type)
  )
}

/**
 * Returns true if the damage instance's type or materials are listed in the exceptions array,
 * meaning this IWR entry should NOT apply.
 */
function isExcepted(exceptions: DamageType[], instance: DamageInstance): boolean {
  if (exceptions.includes(instance.type)) return true
  if (instance.materials?.some(m => exceptions.includes(m as unknown as DamageType))) return true
  return false
}

/**
 * Computes the effective weakness value, doubling it when the instance satisfies
 * a doubleVs condition (e.g., critical hit).
 * Source: Foundry VTT PF2e doubleVs Rule Element data model.
 */
function effectiveWeaknessValue(weakness: Weakness, instance: DamageInstance): number {
  const shouldDouble = weakness.doubleVs?.some(
    condition => condition === 'critical' && instance.critical === true,
  ) ?? false
  return shouldDouble ? weakness.value * 2 : weakness.value
}

/**
 * Checks whether a doubleVs condition string is satisfied by the damage instance.
 * "non-magical" doubles resistance when the source is not magical.
 */
function doubleVsMatches(condition: string, instance: DamageInstance): boolean {
  if (condition === 'non-magical') return instance.magical !== true
  return false
}

/**
 * Computes the effective resistance value, doubling it when a doubleVs condition is met.
 * Source: Foundry VTT PF2e doubleVs on resistance entries (e.g. ghost all-damage 5 doubles vs non-magical).
 */
function effectiveResistanceValue(resistance: Resistance, instance: DamageInstance): number {
  if (!resistance.doubleVs || resistance.doubleVs.length === 0) return resistance.value
  const shouldDouble = resistance.doubleVs.some(cond => doubleVsMatches(cond, instance))
  return shouldDouble ? resistance.value * 2 : resistance.value
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

/**
 * Applies a creature's IWR entries to a single damage instance.
 *
 * Processing order per official PF2e CRB (AON Rules.aspx?ID=2309):
 *   1. Immunities — zero (or halve for critical-hits) matched damage
 *   2. Weaknesses — add to damage (highest matching value only)
 *   3. Resistances — reduce damage (highest matching value only, clamped to 0)
 *
 * @param instance   The resolved damage instance to process
 * @param immunities The creature's immunity entries
 * @param weaknesses The creature's weakness entries
 * @param resistances The creature's resistance entries
 */
export function applyIWR(
  instance: DamageInstance,
  immunities: Immunity[],
  weaknesses: Weakness[],
  resistances: Resistance[],
): IWRApplicationResult {
  let adjustedAmount = instance.amount
  const appliedImmunities: Immunity[] = []
  const appliedWeaknesses: Weakness[] = []
  const appliedResistances: Resistance[] = []
  let weaknessTotal = 0
  let weaknessDoubled = false
  let resistanceTotal = 0
  let resistanceDoubled = false

  // ── Step 1: Immunities ────────────────────────────────────────────────────
  // Source: AON Rules.aspx?ID=2312, 2314
  for (const immunity of immunities) {
    if (isExcepted(immunity.exceptions, instance)) continue

    if (immunity.type === 'critical-hits') {
      // Critical-hit immunity halves crit damage (un-doubles via Math.floor)
      // Source: AON Rules.aspx?ID=2314 — "takes normal damage instead of double damage"
      if (instance.critical === true) {
        adjustedAmount = Math.floor(adjustedAmount / 2)
        appliedImmunities.push(immunity)
      }
    } else if (immunity.type === 'precision') {
      // Precision immunity zeroes the full precision-tagged amount
      // Source: Foundry VTT PF2e issue #19318 — zero full (post-doubling) precision amount
      if (instance.precision === true) {
        adjustedAmount = 0
        appliedImmunities.push(immunity)
      }
    } else if (typeMatches(immunity.type, instance)) {
      // Standard type/category immunity — zero all damage
      adjustedAmount = 0
      appliedImmunities.push(immunity)
    }
  }

  // ── Step 2: Weaknesses ────────────────────────────────────────────────────
  // Source: AON Rules.aspx?ID=2317 — "use only the highest applicable weakness value"
  // Only applied when there is damage remaining after immunities
  if (adjustedAmount > 0) {
    const matchingWeaknesses = weaknesses.filter(w =>
      !isExcepted(w.exceptions, instance) && typeMatches(w.type, instance),
    )

    if (matchingWeaknesses.length > 0) {
      // Select the highest effective value (accounting for doubleVs)
      let highestWeakness = matchingWeaknesses[0]
      let highestValue = effectiveWeaknessValue(matchingWeaknesses[0], instance)

      for (let i = 1; i < matchingWeaknesses.length; i++) {
        const candidateValue = effectiveWeaknessValue(matchingWeaknesses[i], instance)
        if (candidateValue > highestValue) {
          highestValue = candidateValue
          highestWeakness = matchingWeaknesses[i]
        }
      }

      adjustedAmount += highestValue
      appliedWeaknesses.push(highestWeakness)
      weaknessTotal = highestValue
      weaknessDoubled = highestValue > highestWeakness.value
    }
  }

  // ── Step 3: Resistances ───────────────────────────────────────────────────
  // Source: AON Rules.aspx?ID=2318 — "reduce damage to a minimum of 0"
  // Resistances always apply, even if a weakness was already added
  const matchingResistances = resistances.filter(r =>
    !isExcepted(r.exceptions, instance) && typeMatches(r.type, instance),
  )

  if (matchingResistances.length > 0) {
    // Select the highest effective resistance value (accounting for doubleVs)
    let highestResistance = matchingResistances[0]
    let highestValue = effectiveResistanceValue(matchingResistances[0], instance)

    for (let i = 1; i < matchingResistances.length; i++) {
      const candidateValue = effectiveResistanceValue(matchingResistances[i], instance)
      if (candidateValue > highestValue) {
        highestValue = candidateValue
        highestResistance = matchingResistances[i]
      }
    }

    // Clamp to 0 minimum — resistance cannot make damage negative
    adjustedAmount = Math.max(0, adjustedAmount - highestValue)
    appliedResistances.push(highestResistance)
    resistanceTotal = highestValue
    resistanceDoubled = highestValue > highestResistance.value
  }

  return {
    finalDamage: adjustedAmount,
    appliedImmunities,
    appliedWeaknesses,
    appliedResistances,
    weaknessTotal,
    weaknessDoubled,
    resistanceTotal,
    resistanceDoubled,
  }
}
