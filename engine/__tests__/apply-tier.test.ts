import { describe, it, expect } from 'vitest'
import {
  applyTierToStatBlock,
  shiftDamageFormulaConstant,
  type TierAdjustableStatBlock,
} from '../encounter/apply-tier'

function makeBlock(overrides: Partial<TierAdjustableStatBlock> = {}): TierAdjustableStatBlock {
  return {
    hp: 56,
    level: 5,
    ac: 20,
    fort: 8,
    ref: 6,
    will: 10,
    perception: 9,
    strikes: [
      {
        name: 'Jaws',
        modifier: 12,
        damage: [{ formula: '2d8+4', type: 'piercing' }],
        traits: [],
      },
    ],
    skills: [
      { name: 'Athletics', modifier: 10, calculated: false },
      { name: 'Stealth', modifier: 4, calculated: false },
    ],
    ...overrides,
  }
}

describe('shiftDamageFormulaConstant', () => {
  it('delta 0 returns formula unchanged', () => {
    expect(shiftDamageFormulaConstant('2d8+4', 0)).toBe('2d8+4')
  })

  it('dice+positive const, +2 delta → increases const', () => {
    expect(shiftDamageFormulaConstant('2d8+4', 2)).toBe('2d8+6')
  })

  it('dice-only, +2 delta → appends +2', () => {
    expect(shiftDamageFormulaConstant('1d6', 2)).toBe('1d6+2')
  })

  it('dice+negative const, +2 delta → 1d10-1 + 2 → 1d10+1', () => {
    expect(shiftDamageFormulaConstant('1d10-1', 2)).toBe('1d10+1')
  })

  it('dice+positive const, -2 delta → decreases const', () => {
    expect(shiftDamageFormulaConstant('2d8+4', -2)).toBe('2d8+2')
  })

  // v1.4.1 UAT Round-5 BUG-B: negative constants are now preserved verbatim
  // so the displayed Weak-tier formula matches the tier adjustment. The
  // dice roller enforces PF2e's min-1 damage floor at roll time.
  it('dice-only, -2 delta → emits negative constant', () => {
    expect(shiftDamageFormulaConstant('1d4', -2)).toBe('1d4-2')
  })

  it('dice+const, -2 delta, result becomes 0 → drops constant', () => {
    expect(shiftDamageFormulaConstant('2d6+2', -2)).toBe('2d6')
  })

  it('dice+const, -4 delta, result becomes negative → emits negative constant', () => {
    expect(shiftDamageFormulaConstant('2d6+2', -4)).toBe('2d6-2')
  })

  it('dice+positive const, -2 delta, result goes below 0 → preserves sign', () => {
    expect(shiftDamageFormulaConstant('2d6+1', -2)).toBe('2d6-1')
  })

  it('unparseable formula returns unchanged', () => {
    expect(shiftDamageFormulaConstant('flat 3', 2)).toBe('flat 3')
  })
})

describe('applyTierToStatBlock', () => {
  it('normal tier returns input unchanged (same reference)', () => {
    const block = makeBlock()
    expect(applyTierToStatBlock(block, 'normal')).toBe(block)
  })

  it('elite: AC +2', () => {
    const out = applyTierToStatBlock(makeBlock(), 'elite')
    expect(out.ac).toBe(22)
  })

  it('elite: saves +2', () => {
    const out = applyTierToStatBlock(makeBlock(), 'elite')
    expect(out.fort).toBe(10)
    expect(out.ref).toBe(8)
    expect(out.will).toBe(12)
  })

  it('elite: perception +2', () => {
    const out = applyTierToStatBlock(makeBlock(), 'elite')
    expect(out.perception).toBe(11)
  })

  it('elite: skill mods +2', () => {
    const out = applyTierToStatBlock(makeBlock(), 'elite')
    expect(out.skills[0].modifier).toBe(12)
    expect(out.skills[1].modifier).toBe(6)
  })

  it('elite: strike attack mod +2', () => {
    const out = applyTierToStatBlock(makeBlock(), 'elite')
    expect(out.strikes[0].modifier).toBe(14)
  })

  it('elite: strike damage constant +2', () => {
    const out = applyTierToStatBlock(makeBlock(), 'elite')
    expect(out.strikes[0].damage[0].formula).toBe('2d8+6')
  })

  it('weak: AC -2, strike mod -2, damage -2', () => {
    const out = applyTierToStatBlock(makeBlock(), 'weak')
    expect(out.ac).toBe(18)
    expect(out.strikes[0].modifier).toBe(10)
    expect(out.strikes[0].damage[0].formula).toBe('2d8+2')
  })

  // v1.4.1 UAT Round-5 BUG-B: Weak-tier damage preserves the negative
  // constant rather than silently clamping — the dice roller enforces the
  // PF2e min-1 floor at roll time. Showing "1d4" would under-report the
  // tier adjustment to the GM.
  it('weak: emits negative damage constant when starting dice-only', () => {
    const block = makeBlock({
      strikes: [
        {
          name: 'Puny Bite',
          modifier: 3,
          damage: [{ formula: '1d4', type: 'piercing' }],
          traits: [],
        },
      ],
    })
    const out = applyTierToStatBlock(block, 'weak')
    expect(out.strikes[0].damage[0].formula).toBe('1d4-2')
  })

  it('weak: shifts a +1 damage constant to -1 (Fumbus Dogslicer regression)', () => {
    const block = makeBlock({
      strikes: [
        {
          name: 'Dogslicer',
          modifier: 4,
          damage: [{ formula: '2d6+1', type: 'slashing' }],
          traits: ['agile', 'finesse'],
        },
      ],
    })
    const weak = applyTierToStatBlock(block, 'weak')
    expect(weak.strikes[0].damage[0].formula).toBe('2d6-1')
    const elite = applyTierToStatBlock(block, 'elite')
    expect(elite.strikes[0].damage[0].formula).toBe('2d6+3')
  })

  it('spell DC / class DC shift by ±2 when present', () => {
    const block = makeBlock({ spellDC: 22, classDC: 24 })
    const elite = applyTierToStatBlock(block, 'elite')
    expect(elite.spellDC).toBe(24)
    expect(elite.classDC).toBe(26)
    const weak = applyTierToStatBlock(block, 'weak')
    expect(weak.spellDC).toBe(20)
    expect(weak.classDC).toBe(22)
  })

  it('undefined spellDC/classDC stays undefined', () => {
    const out = applyTierToStatBlock(makeBlock(), 'elite')
    expect(out.spellDC).toBeUndefined()
    expect(out.classDC).toBeUndefined()
  })

  it('spellcasting attack/dc shift by ±2', () => {
    const block = makeBlock({
      spellcasting: [
        { entryId: 'e1', attack: 14, dc: 24 },
        { entryId: 'e2', attack: null, dc: 22 },
      ],
    })
    const out = applyTierToStatBlock(block, 'elite')
    expect(out.spellcasting?.[0].attack).toBe(16)
    expect(out.spellcasting?.[0].dc).toBe(26)
    expect(out.spellcasting?.[1].attack).toBeNull()
    expect(out.spellcasting?.[1].dc).toBe(24)
  })

  it('additional damage entries on strikes are untouched', () => {
    const block = makeBlock({
      strikes: [
        {
          name: 'Fiery Bite',
          modifier: 10,
          damage: [{ formula: '2d8+4', type: 'piercing' }],
          additionalDamage: [{ formula: '1d6', type: 'fire', label: 'persistent' }],
          traits: [],
        },
      ],
    })
    const out = applyTierToStatBlock(block, 'elite')
    expect(out.strikes[0].damage[0].formula).toBe('2d8+6')
    expect(out.strikes[0].additionalDamage?.[0].formula).toBe('1d6')
  })

  it('does not mutate input', () => {
    const block = makeBlock()
    const original = JSON.parse(JSON.stringify(block))
    applyTierToStatBlock(block, 'elite')
    expect(block).toEqual(original)
  })

  // v1.4.1 tier polish: HP is now tier-adjusted so the right-pane
  // CreatureStatBlock matches the combatant pane's baked-in hpMax.
  // Table from Monster Core pg. 6-7 via getHpAdjustment:
  //   Elite: L≤1 +10, L2–4 +15, L5–19 +20, L20+ +30
  //   Weak:  L≤0  0,  L1–2 -10, L3–5 -15,  L6–20 -20, L21+ -30
  describe('HP tier adjustment', () => {
    it('elite L5: hp +20 (Fumbus regression — base 56 → 76)', () => {
      const out = applyTierToStatBlock(makeBlock({ hp: 56, level: 5 }), 'elite')
      expect(out.hp).toBe(76)
    })

    it('weak L5: hp -15 (Fumbus Weak — base 56 → 41)', () => {
      const out = applyTierToStatBlock(makeBlock({ hp: 56, level: 5 }), 'weak')
      expect(out.hp).toBe(41)
    })

    it('elite L1: hp +10', () => {
      const out = applyTierToStatBlock(makeBlock({ hp: 20, level: 1 }), 'elite')
      expect(out.hp).toBe(30)
    })

    it('elite L3: hp +15', () => {
      const out = applyTierToStatBlock(makeBlock({ hp: 40, level: 3 }), 'elite')
      expect(out.hp).toBe(55)
    })

    it('weak L0: hp unchanged (weak floor for L≤0)', () => {
      const out = applyTierToStatBlock(makeBlock({ hp: 8, level: 0 }), 'weak')
      expect(out.hp).toBe(8)
    })

    it('weak: hp clamped to 1 when delta would drive it to 0 or below', () => {
      const out = applyTierToStatBlock(makeBlock({ hp: 5, level: 2 }), 'weak')
      expect(out.hp).toBe(1)
    })

    it('normal tier does not touch hp', () => {
      const block = makeBlock({ hp: 56, level: 5 })
      expect(applyTierToStatBlock(block, 'normal').hp).toBe(56)
    })
  })
})
