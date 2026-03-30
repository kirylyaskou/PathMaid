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

/** All valid immunity targets: damage types, damage categories, plus special cases. */
export const IMMUNITY_TYPES = [
  ...DAMAGE_TYPES,
  ...DAMAGE_CATEGORIES,
  'critical-hits',
  'precision',
] as const
export type ImmunityType = (typeof IMMUNITY_TYPES)[number]

/** All valid weakness targets: damage types and damage categories. */
export const WEAKNESS_TYPES = [
  ...DAMAGE_TYPES,
  ...DAMAGE_CATEGORIES,
] as const
export type WeaknessType = (typeof WEAKNESS_TYPES)[number]

/** All valid resistance targets: damage types and damage categories. */
export const RESISTANCE_TYPES = [
  ...DAMAGE_TYPES,
  ...DAMAGE_CATEGORIES,
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

/** A resistance entry on a creature. Reduces matched damage (minimum 0). */
export interface Resistance {
  readonly type: ResistanceType
  readonly value: number
  readonly exceptions: DamageType[]
}

/** Detailed result from applyIWR for UI display and diagnostic use. */
export interface IWRApplicationResult {
  finalDamage: number
  appliedImmunities: Immunity[]
  appliedWeaknesses: Weakness[]
  appliedResistances: Resistance[]
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

/** Creates a Resistance entry with optional exceptions. */
export function createResistance(
  type: ResistanceType,
  value: number,
  exceptions: DamageType[] = [],
): Resistance {
  return { type, value, exceptions }
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Returns true if the IWR entry's type matches the damage instance
 * (either by exact damage type or by category-level match).
 */
function typeMatches(iwrType: ImmunityType | WeaknessType | ResistanceType, instance: DamageInstance): boolean {
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
    }
  }

  // ── Step 3: Resistances ───────────────────────────────────────────────────
  // Source: AON Rules.aspx?ID=2318 — "reduce damage to a minimum of 0"
  // Resistances always apply, even if a weakness was already added
  const matchingResistances = resistances.filter(r =>
    !isExcepted(r.exceptions, instance) && typeMatches(r.type, instance),
  )

  if (matchingResistances.length > 0) {
    // Select the highest resistance value (only the highest applies)
    const highestResistance = matchingResistances.reduce(
      (best, r) => (r.value > best.value ? r : best),
      matchingResistances[0],
    )

    // Clamp to 0 minimum — resistance cannot make damage negative
    adjustedAmount = Math.max(0, adjustedAmount - highestResistance.value)
    appliedResistances.push(highestResistance)
  }

  return {
    finalDamage: adjustedAmount,
    appliedImmunities,
    appliedWeaknesses,
    appliedResistances,
  }
}
