// 66-05: Predicate evaluator + context-builder tests.
// Pure-function coverage; no store / IPC dependencies.

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  evaluatePredicate,
  __resetPredicateWarnCache,
} from '../predicate-evaluator'
import {
  buildPredicateContext,
  emptyPredicateContext,
  slugifyEffectName,
  type PredicateContext,
} from '../predicate-context'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ctxWith(overrides: {
  conditions?: { slug: string; value?: number }[]
  effects?: { effectName: string; slug?: string }[]
  traits?: string[]
  target?: {
    conditions?: { slug: string; value?: number }[]
    effects?: { effectName: string; slug?: string }[]
    traits?: string[]
  }
}): PredicateContext {
  return buildPredicateContext(
    {
      conditions: overrides.conditions,
      effects: overrides.effects,
      traits: overrides.traits,
    },
    overrides.target,
  )
}

beforeEach(() => {
  __resetPredicateWarnCache()
})

// ─── Context Builder ─────────────────────────────────────────────────────────

describe('buildPredicateContext', () => {
  it('empty snapshots produce empty sets', () => {
    const ctx = buildPredicateContext({})
    expect(ctx.self.conditions.size).toBe(0)
    expect(ctx.self.effects.size).toBe(0)
    expect(ctx.self.traits.size).toBe(0)
    expect(ctx.self.persistentDamage.size).toBe(0)
    expect(ctx.target).toBeUndefined()
  })

  it('persistent-damage-<type> conditions also populate persistentDamage', () => {
    const ctx = ctxWith({
      conditions: [{ slug: 'persistent-damage-acid' }],
    })
    expect(ctx.self.conditions.has('persistent-damage-acid')).toBe(true)
    expect(ctx.self.persistentDamage.has('acid')).toBe(true)
  })

  it('condition values default to 1 when omitted', () => {
    const ctx = ctxWith({ conditions: [{ slug: 'off-guard' }] })
    expect(ctx.self.conditionValues.get('off-guard')).toBe(1)
  })

  it('effect names are slugified when no explicit slug is supplied', () => {
    const ctx = ctxWith({ effects: [{ effectName: 'Spell Effect: Rage' }] })
    expect(ctx.self.effects.has('rage')).toBe(true)
  })

  it('explicit effect slug wins over derived slug', () => {
    const ctx = ctxWith({
      effects: [{ effectName: 'irrelevant display', slug: 'bane' }],
    })
    expect(ctx.self.effects.has('bane')).toBe(true)
  })
})

describe('slugifyEffectName', () => {
  it('strips prefix and lowercases', () => {
    expect(slugifyEffectName('Spell Effect: Heroism')).toBe('heroism')
    expect(slugifyEffectName('Effect: Bless')).toBe('bless')
  })

  it('converts whitespace to hyphens', () => {
    expect(slugifyEffectName('Acid Grip')).toBe('acid-grip')
  })
})

// ─── Evaluator: Basic Branches ───────────────────────────────────────────────

describe('evaluatePredicate — empty / missing', () => {
  it('missing predicate evaluates true (no-predicate = always active)', () => {
    expect(evaluatePredicate(undefined, emptyPredicateContext())).toBe(true)
  })

  it('empty array evaluates true (implicit AND of zero terms)', () => {
    expect(evaluatePredicate([], emptyPredicateContext())).toBe(true)
  })
})

// ─── Evaluator: Condition Atoms ──────────────────────────────────────────────

describe('evaluatePredicate — self:condition atoms', () => {
  it('matches active condition on self', () => {
    const ctx = ctxWith({ conditions: [{ slug: 'frightened', value: 2 }] })
    expect(evaluatePredicate(['self:condition:frightened'], ctx)).toBe(true)
  })

  it('condition absent → false', () => {
    const ctx = emptyPredicateContext()
    expect(evaluatePredicate(['self:condition:frightened'], ctx)).toBe(false)
  })

  it('threshold atom — passes when value ≥ N', () => {
    const ctx = ctxWith({ conditions: [{ slug: 'frightened', value: 3 }] })
    expect(evaluatePredicate(['self:condition:frightened:2'], ctx)).toBe(true)
  })

  it('threshold atom — fails when value < N', () => {
    const ctx = ctxWith({ conditions: [{ slug: 'frightened', value: 1 }] })
    expect(evaluatePredicate(['self:condition:frightened:3'], ctx)).toBe(false)
  })

  it('persistent-damage atom — type matches', () => {
    const ctx = ctxWith({
      conditions: [{ slug: 'persistent-damage-acid' }],
    })
    expect(
      evaluatePredicate(['self:condition:persistent-damage:acid'], ctx),
    ).toBe(true)
  })

  it('persistent-damage atom — wrong type fails', () => {
    const ctx = ctxWith({
      conditions: [{ slug: 'persistent-damage-fire' }],
    })
    expect(
      evaluatePredicate(['self:condition:persistent-damage:acid'], ctx),
    ).toBe(false)
  })
})

// ─── Evaluator: Effect + Trait Atoms ─────────────────────────────────────────

describe('evaluatePredicate — self:effect / self:trait', () => {
  it('effect slug present → true', () => {
    const ctx = ctxWith({ effects: [{ effectName: 'Spell Effect: Rage' }] })
    expect(evaluatePredicate(['self:effect:rage'], ctx)).toBe(true)
  })

  it('trait present → true', () => {
    const ctx = ctxWith({ traits: ['undead'] })
    expect(evaluatePredicate(['self:trait:undead'], ctx)).toBe(true)
  })

  it('trait absent → false', () => {
    const ctx = ctxWith({ traits: ['animal'] })
    expect(evaluatePredicate(['self:trait:undead'], ctx)).toBe(false)
  })
})

// ─── Evaluator: Target Scope ─────────────────────────────────────────────────

describe('evaluatePredicate — target scope', () => {
  it('target:condition resolves against target facts', () => {
    const ctx = ctxWith({
      target: { conditions: [{ slug: 'frightened', value: 1 }] },
    })
    expect(evaluatePredicate(['target:condition:frightened'], ctx)).toBe(true)
  })

  it('target:* without target yields false (no warn, legitimate false)', () => {
    const ctx = emptyPredicateContext()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(evaluatePredicate(['target:condition:frightened'], ctx)).toBe(false)
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})

// ─── Evaluator: Boolean Combinators ──────────────────────────────────────────

describe('evaluatePredicate — boolean nodes', () => {
  const ctx = ctxWith({
    conditions: [{ slug: 'frightened', value: 1 }],
    effects: [{ effectName: 'Rage' }],
    traits: ['undead'],
  })

  it('and passes only when every child passes', () => {
    expect(
      evaluatePredicate(
        [{ and: ['self:condition:frightened', 'self:effect:rage'] }],
        ctx,
      ),
    ).toBe(true)
    expect(
      evaluatePredicate(
        [{ and: ['self:condition:frightened', 'self:effect:bane'] }],
        ctx,
      ),
    ).toBe(false)
  })

  it('or passes when at least one child passes', () => {
    expect(
      evaluatePredicate(
        [{ or: ['self:effect:bane', 'self:effect:rage'] }],
        ctx,
      ),
    ).toBe(true)
  })

  it('not inverts its single child', () => {
    expect(evaluatePredicate([{ not: 'self:effect:bane' }], ctx)).toBe(true)
    expect(evaluatePredicate([{ not: 'self:effect:rage' }], ctx)).toBe(false)
  })

  it('nand = NOT(AND); nor = NOT(OR)', () => {
    expect(
      evaluatePredicate(
        [{ nand: ['self:effect:rage', 'self:effect:bane'] }],
        ctx,
      ),
    ).toBe(true)
    expect(
      evaluatePredicate(
        [{ nor: ['self:effect:bane', 'self:effect:heroism'] }],
        ctx,
      ),
    ).toBe(true)
  })

  it('composite {and:[{or:[a,b]},{not:c}]} truth-table', () => {
    const ctxA = ctxWith({
      traits: ['undead'],
      effects: [{ effectName: 'Rage' }],
    })
    // or:[trait:undead,trait:animal] → true; not:effect:bane → true → and → true
    expect(
      evaluatePredicate(
        [
          {
            and: [
              { or: ['self:trait:undead', 'self:trait:animal'] },
              { not: 'self:effect:bane' },
            ],
          },
        ],
        ctxA,
      ),
    ).toBe(true)

    // Flip c to satisfied → outer and fails.
    const ctxB = ctxWith({
      traits: ['undead'],
      effects: [{ effectName: 'Bane' }],
    })
    expect(
      evaluatePredicate(
        [
          {
            and: [
              { or: ['self:trait:undead', 'self:trait:animal'] },
              { not: 'self:effect:bane' },
            ],
          },
        ],
        ctxB,
      ),
    ).toBe(false)
  })

  it('alias `all` behaves like `and`', () => {
    expect(
      evaluatePredicate(
        [{ all: ['self:effect:rage', 'self:condition:frightened'] }],
        ctx,
      ),
    ).toBe(true)
  })

  it('aliases `any` / `some` behave like `or`', () => {
    expect(
      evaluatePredicate(
        [{ any: ['self:effect:bane', 'self:effect:rage'] }],
        ctx,
      ),
    ).toBe(true)
    expect(
      evaluatePredicate(
        [{ some: ['self:effect:bane', 'self:effect:rage'] }],
        ctx,
      ),
    ).toBe(true)
  })
})

// ─── Evaluator: Top-level AND ────────────────────────────────────────────────

describe('evaluatePredicate — top-level array is implicit AND', () => {
  it('multiple atoms must all match', () => {
    const ctx = ctxWith({
      conditions: [{ slug: 'frightened', value: 2 }],
      effects: [{ effectName: 'Rage' }],
    })
    expect(
      evaluatePredicate(
        ['self:condition:frightened', 'self:effect:rage'],
        ctx,
      ),
    ).toBe(true)
    expect(
      evaluatePredicate(
        ['self:condition:frightened', 'self:effect:bless'],
        ctx,
      ),
    ).toBe(false)
  })
})

// ─── Fail-closed / warn-once ─────────────────────────────────────────────────

describe('evaluatePredicate — unknown atoms fail-closed', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('unknown atom `target:flanked` → false, warning fired once', () => {
    const ctx = ctxWith({ target: {} })
    expect(evaluatePredicate(['target:flanked'], ctx)).toBe(false)
    // Second call must reuse the dedup cache — still exactly one warning.
    expect(evaluatePredicate(['target:flanked'], ctx)).toBe(false)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('unknown scope warns and returns false', () => {
    const ctx = emptyPredicateContext()
    expect(evaluatePredicate(['weather:raining'], ctx)).toBe(false)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('unknown kind under known scope warns and returns false', () => {
    const ctx = emptyPredicateContext()
    expect(evaluatePredicate(['self:mood:happy'], ctx)).toBe(false)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('non-string non-object term → false', () => {
    const ctx = emptyPredicateContext()
    // @ts-expect-error — deliberately malformed to cover defensive branch.
    expect(evaluatePredicate([42], ctx)).toBe(false)
    // @ts-expect-error — same as above.
    expect(evaluatePredicate([null], ctx)).toBe(false)
  })

  it('unknown combinator node → false', () => {
    const ctx = emptyPredicateContext()
    // @ts-expect-error — `xor` is not a supported combinator.
    expect(evaluatePredicate([{ xor: ['a', 'b'] }], ctx)).toBe(false)
  })
})

// ─── Regression: Acid Grip speed penalty ─────────────────────────────────────

describe('PRED-04 regression — Acid Grip speed penalty', () => {
  const acidGripPredicate = ['self:condition:persistent-damage:acid']

  it('predicate true while persistent acid damage is present', () => {
    const ctx = ctxWith({
      conditions: [{ slug: 'persistent-damage-acid' }],
    })
    expect(evaluatePredicate(acidGripPredicate, ctx)).toBe(true)
  })

  it('predicate false once persistent acid damage clears', () => {
    const ctx = emptyPredicateContext()
    expect(evaluatePredicate(acidGripPredicate, ctx)).toBe(false)
  })

  it('fire persistent damage does not satisfy acid predicate', () => {
    const ctx = ctxWith({
      conditions: [{ slug: 'persistent-damage-fire' }],
    })
    expect(evaluatePredicate(acidGripPredicate, ctx)).toBe(false)
  })
})

// ─── Regression: Bane (no predicate) ─────────────────────────────────────────

describe('Bane — no predicate means always active', () => {
  it('returns true for empty context', () => {
    expect(evaluatePredicate(undefined, emptyPredicateContext())).toBe(true)
  })

  it('returns true regardless of conditions', () => {
    const ctx = ctxWith({ conditions: [{ slug: 'frightened', value: 4 }] })
    expect(evaluatePredicate(undefined, ctx)).toBe(true)
  })
})
