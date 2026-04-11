import { describe, it, expect } from 'vitest'
import {
  performRecoveryCheck,
  getWoundedValueAfterStabilize,
  getDyingValueOnKnockout,
} from '../conditions/death-progression'

describe('performRecoveryCheck', () => {
  // DC = 10 + dyingValue. All tests use rollOverride for determinism.

  // ── Critical success: roll >= dc+10 → dying -2 ───────────────────────────────
  it('critical success: dying decreases by 2', () => {
    // dying=1, dc=11, critSuccess threshold=21 → need roll+modifier >= 21
    // Roll 20 (nat 20) → upgrades numeric failure/success. Let's use a result where
    // roll=20 with dying=1 (dc=11): 20 >= 21? No, 20 < 21. But nat 20 upgrades.
    // Actually: roll=20, dc=11 → checkResult=20 >= dc+10=21? No. → numeric success(20>=11).
    // Nat 20 upgrades success → criticalSuccess.
    const result = performRecoveryCheck(1, 0, 20)
    expect(result.outcome).toBe('criticalSuccess')
    expect(result.newDyingValue).toBe(0) // 1 - 2 = 0, clamped to 0
    expect(result.stabilized).toBe(true)
    expect(result.dc).toBe(11)
  })

  // ── Success: roll >= dc → dying -1 ──────────────────────────────────────────
  it('success: dying decreases by 1', () => {
    // dying=2, dc=12, success: roll in [12..21]
    const result = performRecoveryCheck(2, 0, 15)
    expect(result.outcome).toBe('success')
    expect(result.newDyingValue).toBe(1) // 2 - 1 = 1
    expect(result.stabilized).toBe(false)
    expect(result.dc).toBe(12)
  })

  it('success stabilizes when dying was 1', () => {
    // dying=1, dc=11, roll=11 → success
    const result = performRecoveryCheck(1, 0, 11)
    expect(result.outcome).toBe('success')
    expect(result.newDyingValue).toBe(0)
    expect(result.stabilized).toBe(true)
  })

  // ── Failure: roll < dc but > dc-10 → dying +1 ───────────────────────────────
  it('failure: dying increases by 1', () => {
    // dying=1, dc=11, failure: roll in [2..10]
    const result = performRecoveryCheck(1, 0, 8)
    expect(result.outcome).toBe('failure')
    expect(result.newDyingValue).toBe(2) // 1 + 1
    expect(result.stabilized).toBe(false)
  })

  // ── Critical failure: roll <= dc-10 → dying +2 ──────────────────────────────
  it('critical failure: dying increases by 2', () => {
    // dying=1, dc=11, critFail: roll <= 1
    const result = performRecoveryCheck(1, 0, 1)
    expect(result.outcome).toBe('criticalFailure')
    expect(result.newDyingValue).toBe(3) // 1 + 2
    expect(result.stabilized).toBe(false)
  })

  // ── Death threshold ──────────────────────────────────────────────────────────
  it('dying reaching deathThreshold returns -1 (dead)', () => {
    // dying=3, doomedValue=0 → deathThreshold=4
    // failure: 3+1=4 >= 4 → dead
    const result = performRecoveryCheck(3, 0, 5)
    expect(result.outcome).toBe('failure')
    expect(result.newDyingValue).toBe(-1)
    expect(result.stabilized).toBe(false)
  })

  it('doomed lowers death threshold', () => {
    // dying=2, doomedValue=1 → deathThreshold=3
    // failure: 2+1=3 >= 3 → dead
    const result = performRecoveryCheck(2, 1, 5)
    expect(result.newDyingValue).toBe(-1)
  })

  // ── Roll tracking ────────────────────────────────────────────────────────────
  it('returns the roll used', () => {
    const result = performRecoveryCheck(1, 0, 15)
    expect(result.roll).toBe(15)
  })
})

describe('getWoundedValueAfterStabilize', () => {
  it('unwounded → wounded 1', () => {
    expect(getWoundedValueAfterStabilize(0)).toBe(1)
  })

  it('wounded 1 → wounded 2', () => {
    expect(getWoundedValueAfterStabilize(1)).toBe(2)
  })

  it('wounded 3 → wounded 4', () => {
    expect(getWoundedValueAfterStabilize(3)).toBe(4)
  })
})

describe('getDyingValueOnKnockout', () => {
  it('no wounded → dying 1', () => {
    expect(getDyingValueOnKnockout(0)).toBe(1)
  })

  it('wounded 1 → dying 2', () => {
    expect(getDyingValueOnKnockout(1)).toBe(2)
  })

  it('wounded 3 → dying 4', () => {
    expect(getDyingValueOnKnockout(3)).toBe(4)
  })
})
