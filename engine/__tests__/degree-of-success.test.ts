import { describe, it, expect } from 'vitest'
import {
  calculateDegreeOfSuccess,
  upgradeDegree,
  downgradeDegree,
  basicSaveDamageMultiplier,
  INCAPACITATION_ADJUSTMENT,
} from '../degree-of-success/degree-of-success'

describe('calculateDegreeOfSuccess', () => {
  // ── Basic numeric thresholds ─────────────────────────────────────────────────
  it('critical success: roll+mod >= dc+10', () => {
    expect(calculateDegreeOfSuccess(20, 5, 15)).toBe('criticalSuccess') // 25 >= 25
  })

  it('success: roll+mod >= dc but < dc+10', () => {
    expect(calculateDegreeOfSuccess(15, 0, 15)).toBe('success') // 15 >= 15
    expect(calculateDegreeOfSuccess(10, 0, 15)).toBe('failure') // 10 < 15 but > 5
  })

  it('failure: roll+mod < dc but > dc-10', () => {
    expect(calculateDegreeOfSuccess(10, 0, 15)).toBe('failure') // 10 in range [6..14]
  })

  it('critical failure: roll+mod <= dc-10', () => {
    expect(calculateDegreeOfSuccess(5, 0, 16)).toBe('criticalFailure') // 5 <= 6
    expect(calculateDegreeOfSuccess(1, 0, 20)).toBe('criticalFailure') // 1 <= 10
  })

  // ── Natural 20 upgrade ───────────────────────────────────────────────────────
  it('natural 20 upgrades degree by 1', () => {
    // Roll 20, modifier 0, dc 25 → numeric failure, but nat 20 upgrades to success
    expect(calculateDegreeOfSuccess(20, 0, 25)).toBe('success')
  })

  it('natural 20 cannot go above criticalSuccess', () => {
    // Already critical success numerically — stays criticalSuccess
    expect(calculateDegreeOfSuccess(20, 10, 15)).toBe('criticalSuccess')
  })

  // ── Natural 1 downgrade ──────────────────────────────────────────────────────
  it('natural 1 downgrades degree by 1', () => {
    // Roll 1, modifier 0, dc 1 → numeric success, but nat 1 downgrades to failure
    expect(calculateDegreeOfSuccess(1, 0, 1)).toBe('failure')
  })

  it('natural 1 cannot go below criticalFailure', () => {
    // Roll 1, far below dc — already criticalFailure
    expect(calculateDegreeOfSuccess(1, 0, 30)).toBe('criticalFailure')
  })

  // ── Adjustment pipeline ──────────────────────────────────────────────────────
  it('incapacitation adjustment downgrades criticalSuccess → success', () => {
    const result = calculateDegreeOfSuccess(20, 5, 15, [INCAPACITATION_ADJUSTMENT])
    expect(result).toBe('success')
  })

  it('multiple adjustments chain correctly', () => {
    // Start: criticalSuccess → downgrade × 2 = failure
    const result = calculateDegreeOfSuccess(20, 5, 15, [
      INCAPACITATION_ADJUSTMENT,
      INCAPACITATION_ADJUSTMENT,
    ])
    expect(result).toBe('failure')
  })
})

describe('upgradeDegree / downgradeDegree', () => {
  it('upgrades through the full chain', () => {
    expect(upgradeDegree('criticalFailure', 1)).toBe('failure')
    expect(upgradeDegree('failure', 1)).toBe('success')
    expect(upgradeDegree('success', 1)).toBe('criticalSuccess')
    expect(upgradeDegree('criticalSuccess', 1)).toBe('criticalSuccess') // capped
  })

  it('downgrades through the full chain', () => {
    expect(downgradeDegree('criticalSuccess', 1)).toBe('success')
    expect(downgradeDegree('success', 1)).toBe('failure')
    expect(downgradeDegree('failure', 1)).toBe('criticalFailure')
    expect(downgradeDegree('criticalFailure', 1)).toBe('criticalFailure') // capped
  })

  it('upgrades by 2 steps at once', () => {
    expect(upgradeDegree('criticalFailure', 2)).toBe('success')
  })
})

describe('basicSaveDamageMultiplier', () => {
  it('criticalSuccess → 0 (no damage)', () => {
    expect(basicSaveDamageMultiplier('criticalSuccess')).toBe(0)
  })

  it('success → 0.5 (half damage)', () => {
    expect(basicSaveDamageMultiplier('success')).toBe(0.5)
  })

  it('failure → 1 (full damage)', () => {
    expect(basicSaveDamageMultiplier('failure')).toBe(1)
  })

  it('criticalFailure → 2 (double damage)', () => {
    expect(basicSaveDamageMultiplier('criticalFailure')).toBe(2)
  })
})
