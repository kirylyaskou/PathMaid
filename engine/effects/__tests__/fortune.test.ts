// 65-02: Fortune / Misfortune / Assurance — engine helper tests.
// Pure-function coverage; no store / IPC dependencies.

import { describe, it, expect } from 'vitest'
import { applyFortuneToRoll } from '../fortune'

describe('applyFortuneToRoll', () => {
  const ctx = { type: 'attack' as const }

  it('no-op passthrough when no fortune flags set', () => {
    expect(applyFortuneToRoll('1d20+7', 'c1', ctx)).toEqual({ formula: '1d20+7' })
  })

  it('fortune rewrites leading d20 to 2d20kh1 and labels it', () => {
    const r = applyFortuneToRoll('1d20+7', 'c1', ctx, { fortune: true })
    expect(r.formula).toBe('2d20kh1+7')
    expect(r.label).toBe('Sure Strike (fortune)')
  })

  it('misfortune rewrites leading d20 to 2d20kl1', () => {
    const r = applyFortuneToRoll('1d20-1', 'c1', ctx, { misfortune: true })
    expect(r.formula).toBe('2d20kl1-1')
    expect(r.label).toBe('Misfortune (keep lower)')
  })

  it('fortune + misfortune on the same roll cancel — returns base formula', () => {
    const r = applyFortuneToRoll('1d20+7', 'c1', ctx, {
      fortune: true,
      misfortune: true,
    })
    expect(r).toEqual({ formula: '1d20+7' })
  })

  it('assurance short-circuits — returns flat 10+prof regardless of fortune flags', () => {
    const r = applyFortuneToRoll('1d20+9', 'c1', ctx, {
      fortune: true, // should be ignored under assurance
      assurance: { proficiencyBonus: 9 },
    })
    expect(r.formula).toBe('10+9')
    expect(r.label).toBe('Assurance (flat)')
  })

  it('assurance handles negative proficiency (untrained-ish edge)', () => {
    const r = applyFortuneToRoll('1d20-2', 'c1', ctx, {
      assurance: { proficiencyBonus: -2 },
    })
    expect(r.formula).toBe('10-2')
  })

  it('non-d20 base formula passes through on fortune (fortune only targets d20)', () => {
    const r = applyFortuneToRoll('2d6+4', 'c1', ctx, { fortune: true })
    // implementation leaves non-d20 formulas alone even when fortune is true
    expect(r.formula).toBe('2d6+4')
  })

  it('handles bare "d20" (no leading count)', () => {
    const r = applyFortuneToRoll('d20+5', 'c1', ctx, { fortune: true })
    expect(r.formula).toBe('2d20kh1+5')
  })
})
