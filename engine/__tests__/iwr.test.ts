import { describe, it, expect } from 'vitest'
import {
  applyIWR,
  createImmunity,
  createWeakness,
  createResistance,
} from '../damage/iwr'
import type { DamageInstance } from '../damage/iwr'

function fire(amount: number, overrides?: Partial<DamageInstance>): DamageInstance {
  return { type: 'fire', amount, ...overrides }
}

function cold(amount: number, overrides?: Partial<DamageInstance>): DamageInstance {
  return { type: 'cold', amount, ...overrides }
}

describe('applyIWR — Immunity', () => {
  it('exact type immunity zeroes damage', () => {
    const result = applyIWR(fire(20), [createImmunity('fire')], [], [])
    expect(result.finalDamage).toBe(0)
    expect(result.appliedImmunities).toHaveLength(1)
  })

  it('non-matching immunity has no effect', () => {
    const result = applyIWR(fire(20), [createImmunity('cold')], [], [])
    expect(result.finalDamage).toBe(20)
    expect(result.appliedImmunities).toHaveLength(0)
  })

  it('exception bypasses immunity', () => {
    const immunity = createImmunity('fire', ['fire']) // fire excepted
    const result = applyIWR(fire(20), [immunity], [], [])
    expect(result.finalDamage).toBe(20)
    expect(result.appliedImmunities).toHaveLength(0)
  })

  it('critical-hit immunity halves critical damage', () => {
    const instance: DamageInstance = { type: 'slashing', amount: 30, critical: true }
    const result = applyIWR(instance, [createImmunity('critical-hits')], [], [])
    expect(result.finalDamage).toBe(15)
    expect(result.appliedImmunities).toHaveLength(1)
  })

  it('critical-hit immunity has no effect on non-critical', () => {
    const instance: DamageInstance = { type: 'slashing', amount: 30, critical: false }
    const result = applyIWR(instance, [createImmunity('critical-hits')], [], [])
    expect(result.finalDamage).toBe(30)
  })

  it('precision immunity zeroes precision damage', () => {
    const instance: DamageInstance = { type: 'piercing', amount: 10, precision: true }
    const result = applyIWR(instance, [createImmunity('precision')], [], [])
    expect(result.finalDamage).toBe(0)
    expect(result.appliedImmunities).toHaveLength(1)
  })
})

describe('applyIWR — Weakness', () => {
  it('matching weakness adds to damage', () => {
    const result = applyIWR(fire(10), [], [createWeakness('fire', 5)], [])
    expect(result.finalDamage).toBe(15)
    expect(result.appliedWeaknesses).toHaveLength(1)
  })

  it('only highest weakness applies when multiple match', () => {
    const result = applyIWR(
      fire(10),
      [],
      [createWeakness('fire', 3), createWeakness('fire', 7)],
      [],
    )
    expect(result.finalDamage).toBe(17) // 10 + 7
    expect(result.appliedWeaknesses).toHaveLength(1)
    expect(result.appliedWeaknesses[0].value).toBe(7)
  })

  it('weakness skipped if damage was zeroed by immunity', () => {
    const result = applyIWR(
      fire(10),
      [createImmunity('fire')],
      [createWeakness('fire', 5)],
      [],
    )
    expect(result.finalDamage).toBe(0)
    expect(result.appliedWeaknesses).toHaveLength(0)
  })

  it('doubleVs doubles weakness on critical', () => {
    const weakness = createWeakness('slashing', 5, { doubleVs: ['critical'] })
    const instance: DamageInstance = { type: 'slashing', amount: 10, critical: true }
    const result = applyIWR(instance, [], [weakness], [])
    expect(result.finalDamage).toBe(20) // 10 + 10 (5*2)
  })

  it('doubleVs does not trigger on non-critical', () => {
    const weakness = createWeakness('slashing', 5, { doubleVs: ['critical'] })
    const instance: DamageInstance = { type: 'slashing', amount: 10, critical: false }
    const result = applyIWR(instance, [], [weakness], [])
    expect(result.finalDamage).toBe(15) // 10 + 5
  })
})

describe('applyIWR — Resistance', () => {
  it('matching resistance reduces damage', () => {
    const result = applyIWR(fire(20), [], [], [createResistance('fire', 5)])
    expect(result.finalDamage).toBe(15)
    expect(result.appliedResistances).toHaveLength(1)
  })

  it('resistance cannot reduce below 0', () => {
    const result = applyIWR(fire(5), [], [], [createResistance('fire', 10)])
    expect(result.finalDamage).toBe(0)
  })

  it('only highest resistance applies when multiple match', () => {
    const result = applyIWR(
      fire(20),
      [],
      [],
      [createResistance('fire', 3), createResistance('fire', 8)],
    )
    expect(result.finalDamage).toBe(12) // 20 - 8
  })

  it('all-damage resistance matches any type', () => {
    const result = applyIWR(cold(20), [], [], [createResistance('all-damage', 5)])
    expect(result.finalDamage).toBe(15)
  })
})

describe('applyIWR — Processing order', () => {
  it('immunity → weakness → resistance: immune kills damage, no weakness applied, resistance moot', () => {
    const result = applyIWR(
      fire(20),
      [createImmunity('fire')],
      [createWeakness('fire', 10)],
      [createResistance('fire', 3)],
    )
    expect(result.finalDamage).toBe(0)
    expect(result.appliedImmunities).toHaveLength(1)
    expect(result.appliedWeaknesses).toHaveLength(0) // skipped
    expect(result.appliedResistances).toHaveLength(0) // would reduce 0 further
  })

  it('weakness added before resistance applied', () => {
    // 10 fire + weakness 5 = 15, then resistance 3 = 12
    const result = applyIWR(
      fire(10),
      [],
      [createWeakness('fire', 5)],
      [createResistance('fire', 3)],
    )
    expect(result.finalDamage).toBe(12)
  })
})
