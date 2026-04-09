// ─── Death Progression ────────────────────────────────────────────────────────
// Source: PF2e Player Core — Recovery Checks (D-13, D-14, D-15)
// Delegates degree calculation to centralized degree-of-success module (Pitfall 4).

import { calculateDegreeOfSuccess } from '../degree-of-success/degree-of-success'
import type { DegreeOfSuccess } from '../degree-of-success/degree-of-success'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecoveryCheckOutcome = DegreeOfSuccess

export interface RecoveryCheckResult {
  /** The degree of success achieved on the flat check */
  outcome: RecoveryCheckOutcome
  /** The d20 roll value (1-20) */
  roll: number
  /** The DC of the flat check (10 + dying value) */
  dc: number
  /** The resulting dying value after the check. -1 means creature is dead. */
  newDyingValue: number
  /** Whether the creature stabilized (dying dropped to 0) */
  stabilized: boolean
}

// ─── Recovery Check ──────────────────────────────────────────────────────────

/**
 * Performs a recovery check for a dying creature.
 *
 * DC = 10 + current dying value.
 * Degree of success:
 *   - Critical success (roll >= DC + 10): dying value decreases by 2
 *   - Success (roll >= DC): dying value decreases by 1
 *   - Failure (roll < DC and roll > DC - 10): dying value increases by 1
 *   - Critical failure (roll <= DC - 10 OR natural 1): dying value increases by 2
 *
 * Death occurs when dying value reaches deathThreshold (4 - doomedValue).
 * Stabilization occurs when dying value drops to 0.
 * Stabilized creatures remain unconscious (D-15).
 *
 * @param dyingValue - Current dying condition value (1-3 typically)
 * @param doomedValue - Current doomed condition value (0-3 typically)
 * @param rollOverride - Optional fixed d20 roll for deterministic testing; omit for random
 * @returns RecoveryCheckResult with outcome, roll, dc, new dying value, and stabilization status
 */
export function performRecoveryCheck(
  dyingValue: number,
  doomedValue: number,
  rollOverride?: number,
): RecoveryCheckResult {
  const dc = 10 + dyingValue
  const deathThreshold = 4 - doomedValue
  const roll = rollOverride ?? Math.ceil(Math.random() * 20)

  // Delegate degree calculation to centralized module (Pitfall 4 — single source of truth).
  // Recovery checks are flat checks: totalModifier = 0, roll is the raw d20.
  const outcome: RecoveryCheckOutcome = calculateDegreeOfSuccess(roll, 0, dc)

  // Apply dying value change based on outcome
  let newDying = dyingValue
  switch (outcome) {
    case 'criticalSuccess':
      newDying = Math.max(0, dyingValue - 2)
      break
    case 'success':
      newDying = Math.max(0, dyingValue - 1)
      break
    case 'failure':
      newDying = dyingValue + 1
      break
    case 'criticalFailure':
      newDying = dyingValue + 2
      break
  }

  // Check death threshold (D-13): dying >= (4 - doomed) = dead
  const dead = newDying >= deathThreshold

  // Stabilization (D-15): dying drops to 0, creature remains unconscious
  const stabilized = newDying === 0 && !dead

  return {
    outcome,
    roll,
    dc,
    newDyingValue: dead ? -1 : newDying,
    stabilized,
  }
}

// ─── Wounded Rule (CRB pg. 460) ──────────────────────────────────────────────

/**
 * CRB pg. 460: When a creature loses the dying condition (stabilizes or is healed),
 * it gains the Wounded condition:
 * - If not already Wounded: Wounded 1
 * - If already Wounded: Wounded value +1
 *
 * @param currentWounded - Current Wounded value (0 if not wounded)
 * @returns New Wounded value to set
 */
export function getWoundedValueAfterStabilize(currentWounded: number): number {
  return currentWounded + 1
}

/**
 * CRB pg. 460: When a creature with the Wounded condition is knocked out again,
 * its dying value starts at (1 + wounded value) instead of 1.
 *
 * @param woundedValue - Current Wounded value (0 if not wounded)
 * @returns Initial dying value to assign
 */
export function getDyingValueOnKnockout(woundedValue: number): number {
  return 1 + woundedValue
}
