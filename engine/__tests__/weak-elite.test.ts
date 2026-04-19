import { describe, it, expect } from 'vitest'
import {
  getHpAdjustment,
  getStatAdjustment,
  getAdjustedLevel,
  getDamageAdjustment,
  getXpLevelDelta,
} from '../encounter/weak-elite'

describe('getHpAdjustment', () => {
  it('normal tier → 0', () => {
    expect(getHpAdjustment('normal', 5)).toBe(0)
  })

  it('elite level 1 → +10', () => {
    expect(getHpAdjustment('elite', 1)).toBe(10)
  })

  it('elite level 3 → +15', () => {
    expect(getHpAdjustment('elite', 3)).toBe(15)
  })

  it('elite level 10 → +20', () => {
    expect(getHpAdjustment('elite', 10)).toBe(20)
  })

  it('elite level 21 → +30', () => {
    expect(getHpAdjustment('elite', 21)).toBe(30)
  })

  it('weak level 0 → 0 (no adjustment below level 1)', () => {
    expect(getHpAdjustment('weak', 0)).toBe(0)
  })

  it('weak level 2 → -10', () => {
    expect(getHpAdjustment('weak', 2)).toBe(-10)
  })

  it('weak level 4 → -15', () => {
    expect(getHpAdjustment('weak', 4)).toBe(-15)
  })

  it('weak level 10 → -20', () => {
    expect(getHpAdjustment('weak', 10)).toBe(-20)
  })

  it('weak level 22 → -30', () => {
    expect(getHpAdjustment('weak', 22)).toBe(-30)
  })
})

describe('getStatAdjustment', () => {
  it('elite → +2', () => {
    expect(getStatAdjustment('elite')).toBe(2)
  })
  it('weak → -2', () => {
    expect(getStatAdjustment('weak')).toBe(-2)
  })
  it('normal → 0', () => {
    expect(getStatAdjustment('normal')).toBe(0)
  })
})

describe('getAdjustedLevel', () => {
  it('normal returns level unchanged', () => {
    expect(getAdjustedLevel('normal', 5)).toBe(5)
    expect(getAdjustedLevel('normal', 0)).toBe(0)
    expect(getAdjustedLevel('normal', -1)).toBe(-1)
  })

  it('elite level 5 → 6', () => {
    expect(getAdjustedLevel('elite', 5)).toBe(6)
  })

  it('elite level 0 → +2 (display clamp)', () => {
    expect(getAdjustedLevel('elite', 0)).toBe(2)
  })

  it('elite level -1 → +1 (display clamp)', () => {
    expect(getAdjustedLevel('elite', -1)).toBe(1)
  })

  it('weak level 5 → 4', () => {
    expect(getAdjustedLevel('weak', 5)).toBe(4)
  })

  it('weak level 1 → -1 (display clamp)', () => {
    expect(getAdjustedLevel('weak', 1)).toBe(-1)
  })

  it('weak level 0 → 0 (no change below 1)', () => {
    expect(getAdjustedLevel('weak', 0)).toBe(0)
  })

  it('weak level -1 → -1 (no change below 1)', () => {
    expect(getAdjustedLevel('weak', -1)).toBe(-1)
  })
})

describe('getDamageAdjustment', () => {
  it('normal → 0 regardless of isLimitedUse', () => {
    expect(getDamageAdjustment('normal')).toBe(0)
    expect(getDamageAdjustment('normal', true)).toBe(0)
  })

  it('elite normal-use → +2', () => {
    expect(getDamageAdjustment('elite')).toBe(2)
    expect(getDamageAdjustment('elite', false)).toBe(2)
  })

  it('elite limited-use → +4', () => {
    expect(getDamageAdjustment('elite', true)).toBe(4)
  })

  it('weak normal-use → -2', () => {
    expect(getDamageAdjustment('weak')).toBe(-2)
    expect(getDamageAdjustment('weak', false)).toBe(-2)
  })

  it('weak limited-use → -4', () => {
    expect(getDamageAdjustment('weak', true)).toBe(-4)
  })
})

describe('getXpLevelDelta', () => {
  it('elite → +1', () => {
    expect(getXpLevelDelta('elite')).toBe(1)
  })
  it('weak → -1', () => {
    expect(getXpLevelDelta('weak')).toBe(-1)
  })
  it('normal → 0', () => {
    expect(getXpLevelDelta('normal')).toBe(0)
  })
})
