import { describe, it, expect } from 'vitest'
import { getMaxTargets } from '../get-max-targets'

describe('getMaxTargets', () => {
  it('returns N for 3-action spell with "up to N" prose (heal-style)', () => {
    expect(
      getMaxTargets({
        action_cost: '3',
        description: 'You attempt to heal up to 6 willing creatures within 30 feet.',
      }),
    ).toBe(6)
  })

  it('accepts the [three-actions] literal form too', () => {
    expect(
      getMaxTargets({
        action_cost: '[three-actions]',
        description: 'Your magic spreads to up to 10 creatures within 60 feet.',
      }),
    ).toBe(10)
  })

  it('honors generic "N willing creatures" outside 3-action cost', () => {
    expect(
      getMaxTargets({
        action_cost: '2',
        description: 'Target 4 willing creatures within range.',
      }),
    ).toBe(4)
  })

  it('honors generic "N allies" phrasing', () => {
    expect(
      getMaxTargets({
        action_cost: '1',
        description: 'Up to 3 allies in 30 feet gain the bonus.',
      }),
    ).toBe(3)
  })

  it('honors generic "N targets" phrasing', () => {
    expect(
      getMaxTargets({
        action_cost: '2',
        description: 'Pick 2 targets within 60 feet.',
      }),
    ).toBe(2)
  })

  it('defaults to 1 when no match', () => {
    expect(
      getMaxTargets({
        action_cost: '2',
        description: 'You deal 3d6 fire damage to one target.',
      }),
    ).toBe(1)
  })

  it('defaults to 1 on null description', () => {
    expect(getMaxTargets({ action_cost: '2', description: null })).toBe(1)
  })

  it('defaults to 1 on null cost and description', () => {
    expect(getMaxTargets({ action_cost: null, description: null })).toBe(1)
  })

  it('ignores "up to N" when cost is not 3-action (falls through to generic)', () => {
    // 2-action spell mentioning "up to 5 creatures" — the generic pattern catches it.
    expect(
      getMaxTargets({
        action_cost: '2',
        description: 'Choose up to 5 creatures within 30 feet.',
      }),
    ).toBe(5)
  })

  it('picks first match when multiple numbers appear', () => {
    expect(
      getMaxTargets({
        action_cost: '3',
        description: 'Heal up to 6 willing creatures. You restore 2d8 HP per target.',
      }),
    ).toBe(6)
  })
})
