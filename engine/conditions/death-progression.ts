// ─── Death Progression ────────────────────────────────────────────────────────
// Source: PF2e Player Core — Recovery Checks (D-13, D-14, D-15)
// Self-contained flat check implementation. Phase 4 adds full degree-of-success system.

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecoveryCheckOutcome = 'criticalSuccess' | 'success' | 'failure' | 'criticalFailure'

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

  // Determine degree of success per PF2e flat check rules
  // Natural 20 is always at least a success (upgrade one step)
  // Natural 1 is always at most a failure (downgrade one step)
  let outcome: RecoveryCheckOutcome

  if (roll === 20) {
    // Natural 20: at least a success, upgrade by one step
    // If roll >= DC, that's a success -> upgraded to crit success
    // If roll < DC, that's a failure -> upgraded to success
    outcome = roll >= dc ? 'criticalSuccess' : 'success'
  } else if (roll === 1) {
    // Natural 1: at most a failure, downgrade by one step
    // If roll >= DC, that's a success -> downgraded to failure
    // If roll < DC, that's a failure -> downgraded to crit failure
    outcome = roll >= dc ? 'failure' : 'criticalFailure'
  } else if (roll >= dc + 10) {
    outcome = 'criticalSuccess'
  } else if (roll >= dc) {
    outcome = 'success'
  } else if (roll <= dc - 10) {
    outcome = 'criticalFailure'
  } else {
    outcome = 'failure'
  }

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
