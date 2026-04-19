// 65-03: AdjustStrike / DamageDice parser + applicator coverage.
// Step-up / step-down progression d4→d6→d8→d10→d12, caps at boundaries,
// direct die-size override, and idempotency per effectId.

import { describe, it, expect } from 'vitest'
import {
  parseSpellEffectAdjustStrikes,
  applyAdjustStrikes,
  type StrikeDamage,
} from '../adjust-strike'

const baseStrike = (dieSize: StrikeDamage['dieSize']): StrikeDamage => ({
  selectors: ['strike-damage', 'longsword-damage'],
  dieSize,
})

describe('parseSpellEffectAdjustStrikes', () => {
  it('AdjustStrike damage-die-size + mode:upgrade → step-up', () => {
    const json = JSON.stringify([
      {
        key: 'AdjustStrike',
        property: 'damage-die-size',
        mode: 'upgrade',
        selector: 'strike-damage',
      },
    ])
    const res = parseSpellEffectAdjustStrikes(json, 'enlarge', 'Enlarge')
    expect(res).toEqual([
      {
        effectId: 'enlarge',
        effectName: 'Enlarge',
        selector: 'strike-damage',
        damageDie: 'step-up',
      },
    ])
  })

  it('DamageDice with override.upgrade=true → step-up', () => {
    const json = JSON.stringify([
      {
        key: 'DamageDice',
        selector: 'longsword-damage',
        override: { upgrade: true },
      },
    ])
    const res = parseSpellEffectAdjustStrikes(json, 'eff', 'Eff')
    expect(res).toHaveLength(1)
    expect(res[0].damageDie).toBe('step-up')
  })

  it('DamageDice with override.dieSize → direct die override', () => {
    const json = JSON.stringify([
      {
        key: 'DamageDice',
        selector: 'claw-damage',
        override: { dieSize: 'd10' },
      },
    ])
    const res = parseSpellEffectAdjustStrikes(json, 'eff', 'Eff')
    expect(res[0].damageDie).toBe('d10')
  })

  it('drops non-die-size AdjustStrike rules (traits, property-runes, materials)', () => {
    const json = JSON.stringify([
      { key: 'AdjustStrike', property: 'traits', mode: 'add', value: 'holy', selector: 'strike-damage' },
      { key: 'AdjustStrike', property: 'property-runes', mode: 'add', value: 'ghost-touch', selector: 'strike-damage' },
      { key: 'AdjustStrike', property: 'materials', mode: 'add', value: 'silver', selector: 'strike-damage' },
    ])
    expect(parseSpellEffectAdjustStrikes(json, 'eff', 'Eff')).toEqual([])
  })

  it('drops malformed override.dieSize silently', () => {
    const json = JSON.stringify([
      { key: 'DamageDice', selector: 'x', override: { dieSize: 'd7' } },
      { key: 'DamageDice', selector: 'x', override: { dieSize: 42 } },
    ])
    expect(parseSpellEffectAdjustStrikes(json, 'e', 'E')).toEqual([])
  })

  it('returns [] on malformed rules JSON', () => {
    expect(parseSpellEffectAdjustStrikes('{not-array:true}', 'e', 'E')).toEqual([])
    expect(parseSpellEffectAdjustStrikes('[[invalid]]', 'e', 'E')).toEqual([])
  })
})

describe('applyAdjustStrikes — step-up progression', () => {
  it('d4 → d6', () => {
    const out = applyAdjustStrikes(baseStrike('d4'), [
      { effectId: 'e', effectName: 'E', selector: 'strike-damage', damageDie: 'step-up' },
    ])
    expect(out.dieSize).toBe('d6')
    expect(out.appliedAdjustments).toEqual([{ effectId: 'e', from: 'd4', to: 'd6' }])
  })

  it('d6 → d8 → d10 → d12 (chained)', () => {
    const s1 = applyAdjustStrikes(baseStrike('d6'), [
      { effectId: 'a', effectName: 'A', selector: 'strike-damage', damageDie: 'step-up' },
    ])
    expect(s1.dieSize).toBe('d8')
    const s2 = applyAdjustStrikes(s1, [
      { effectId: 'b', effectName: 'B', selector: 'strike-damage', damageDie: 'step-up' },
    ])
    expect(s2.dieSize).toBe('d10')
    const s3 = applyAdjustStrikes(s2, [
      { effectId: 'c', effectName: 'C', selector: 'strike-damage', damageDie: 'step-up' },
    ])
    expect(s3.dieSize).toBe('d12')
  })

  it('step-up from d12 caps at d12', () => {
    const out = applyAdjustStrikes(baseStrike('d12'), [
      { effectId: 'e', effectName: 'E', selector: 'strike-damage', damageDie: 'step-up' },
    ])
    expect(out.dieSize).toBe('d12')
    expect(out.appliedAdjustments ?? []).toEqual([])
  })

  it('step-down from d4 caps at d4', () => {
    const out = applyAdjustStrikes(baseStrike('d4'), [
      { effectId: 'e', effectName: 'E', selector: 'strike-damage', damageDie: 'step-down' },
    ])
    expect(out.dieSize).toBe('d4')
  })
})

describe('applyAdjustStrikes — direct override + selector matching', () => {
  it('direct die-size override assigns outright', () => {
    const out = applyAdjustStrikes(baseStrike('d6'), [
      { effectId: 'e', effectName: 'E', selector: 'strike-damage', damageDie: 'd10' },
    ])
    expect(out.dieSize).toBe('d10')
  })

  it('selector that does not match is ignored', () => {
    const out = applyAdjustStrikes(baseStrike('d6'), [
      { effectId: 'e', effectName: 'E', selector: 'stinger-damage', damageDie: 'step-up' },
    ])
    expect(out.dieSize).toBe('d6')
  })

  it('array selector matches any element', () => {
    const out = applyAdjustStrikes(baseStrike('d6'), [
      {
        effectId: 'e',
        effectName: 'E',
        selector: ['stinger-damage', 'longsword-damage'],
        damageDie: 'step-up',
      },
    ])
    expect(out.dieSize).toBe('d8')
  })

  it('idempotent per (effectId, selector) — re-applied the same effect once', () => {
    const inputs = [
      { effectId: 'dup', effectName: 'Dup', selector: 'strike-damage', damageDie: 'step-up' as const },
      { effectId: 'dup', effectName: 'Dup', selector: 'strike-damage', damageDie: 'step-up' as const },
    ]
    const out = applyAdjustStrikes(baseStrike('d6'), inputs)
    expect(out.dieSize).toBe('d8') // only one step
  })
})
