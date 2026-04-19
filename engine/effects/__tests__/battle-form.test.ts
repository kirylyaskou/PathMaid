// 65-04: BattleForm / CreatureSize parser coverage.
// Literal-value CreatureSize rules yield a size override.
// BattleForm `overrides` block yields size + optional numeric AC + strikes.
// Dynamic `{item|flags…}` references and non-numeric AC expressions are dropped.

import { describe, it, expect } from 'vitest'
import {
  parseSpellEffectBattleForm,
  parseSpellEffectCreatureSize,
  parseSpellEffectSizeShift,
} from '../battle-form'

describe('parseSpellEffectCreatureSize', () => {
  it('literal value "large" → size "lg"', () => {
    const json = JSON.stringify([{ key: 'CreatureSize', value: 'large' }])
    expect(parseSpellEffectCreatureSize(json, 'e', 'E')).toEqual([
      { effectId: 'e', effectName: 'E', size: 'lg' },
    ])
  })

  it('Foundry shorthand "huge" passes through', () => {
    const json = JSON.stringify([{ key: 'CreatureSize', value: 'huge' }])
    expect(parseSpellEffectCreatureSize(json, 'e', 'E')[0].size).toBe('huge')
  })

  it('drops dynamic reference values', () => {
    const json = JSON.stringify([
      { key: 'CreatureSize', value: '{item|flags.system.rulesSelections.enlarge.size}' },
    ])
    expect(parseSpellEffectCreatureSize(json, 'e', 'E')).toEqual([])
  })

  it('drops rules of other keys', () => {
    const json = JSON.stringify([
      { key: 'FlatModifier', selector: 'ac', value: 1 },
      { key: 'Resistance', type: 'fire', value: 5 },
    ])
    expect(parseSpellEffectCreatureSize(json, 'e', 'E')).toEqual([])
  })
})

describe('parseSpellEffectBattleForm', () => {
  it('extracts size + numeric AC + strikes', () => {
    const json = JSON.stringify([
      {
        key: 'BattleForm',
        overrides: {
          size: 'huge',
          armorClass: { modifier: 21 },
          strikes: {
            claw: { damage: { die: 'd10', dice: 3, damageType: 'slashing' } },
            jaws: { damage: { die: 'd12', dice: 2, damageType: 'piercing' } },
          },
        },
      },
    ])
    const form = parseSpellEffectBattleForm(json, 'dragon', 'Dragon Form')
    expect(form).not.toBeNull()
    expect(form!.size).toBe('huge')
    expect(form!.ac).toBe(21)
    expect(form!.strikes).toHaveLength(2)
    expect(form!.strikes!.find((s) => s.name === 'claw')).toMatchObject({
      dieSize: 'd10',
      diceNumber: 3,
      damageType: 'slashing',
    })
  })

  it('skips AC when armorClass.modifier is an expression string', () => {
    const json = JSON.stringify([
      {
        key: 'BattleForm',
        overrides: {
          size: 'lg',
          armorClass: { modifier: '18 + @actor.level' },
        },
      },
    ])
    const form = parseSpellEffectBattleForm(json, 'x', 'X')
    expect(form).not.toBeNull()
    expect(form!.size).toBe('lg')
    expect(form!.ac).toBeUndefined()
  })

  it('returns null when no BattleForm rule present', () => {
    const json = JSON.stringify([{ key: 'FlatModifier', selector: 'ac', value: 1 }])
    expect(parseSpellEffectBattleForm(json, 'x', 'X')).toBeNull()
  })

  it('drops strikes with non-standard die values', () => {
    const json = JSON.stringify([
      {
        key: 'BattleForm',
        overrides: {
          strikes: {
            weird: { damage: { die: 'd7', dice: 1, damageType: 'x' } },
          },
        },
      },
    ])
    const form = parseSpellEffectBattleForm(json, 'x', 'X')
    expect(form!.strikes).toBeUndefined()
  })
})

describe('parseSpellEffectSizeShift — Enlarge-class (v1.4 UAT BUG-A)', () => {
  // Parser contract: surface the Foundry-encoded values `{size, meleeDamageBonus,
  // resizeEquipment}`. Consumers decide how to interpret them.
  //
  // Important consumer note (per PF2e Player Core pg. 329): Enlarge does NOT
  // step weapon damage dice even though Foundry sets `resizeEquipment: true`.
  // Enlarge's only melee effect is a +2/+4 status bonus to damage. The
  // CreatureStatBlock consumer intentionally ignores `resizeEquipment` for the
  // Enlarge pattern. Legitimate die-step-up effects (Giant Instinct, etc.)
  // emit AdjustStrike rules and are handled by parseSpellEffectAdjustStrikes.
  //
  // Real-world Foundry rules block from spell-effect-enlarge.json.
  const enlargeRules = JSON.stringify([
    {
      key: 'ChoiceSet',
      flag: 'enlarge',
      choices: [
        {
          predicate: [{ gte: ['parent:level', 4] }],
          value: { size: 'huge', damage: 4, reach: 15 },
        },
        {
          predicate: [
            {
              or: [
                { lte: ['parent:level', 3] },
                { gte: ['parent:level', 6] },
              ],
            },
          ],
          value: { size: 'large', damage: 2, reach: 10 },
        },
      ],
    },
    {
      key: 'CreatureSize',
      value: '{item|flags.system.rulesSelections.enlarge.size}',
      resizeEquipment: true,
    },
    {
      key: 'FlatModifier',
      selector: ['melee-strike-damage'],
      type: 'status',
      value: '{item|flags.system.rulesSelections.enlarge.damage}',
    },
  ])

  it('level 2 → size large, +2 damage, +5 reach, resizeEquipment', () => {
    const shift = parseSpellEffectSizeShift(enlargeRules, 2)
    expect(shift).toEqual({
      size: 'lg',
      meleeDamageBonus: 2,
      reachBonus: 5,
      resizeEquipment: true,
    })
  })

  it('level 4 → size huge, +4 damage, +10 reach (heightened branch)', () => {
    const shift = parseSpellEffectSizeShift(enlargeRules, 4)
    expect(shift).toEqual({
      size: 'huge',
      meleeDamageBonus: 4,
      reachBonus: 10,
      resizeEquipment: true,
    })
  })

  it('level 6 → size large (2nd-rank branch re-selected via gte 6)', () => {
    // At level 6 BOTH predicates match. First matching choice (huge) wins.
    const shift = parseSpellEffectSizeShift(enlargeRules, 6)
    expect(shift).toEqual({
      size: 'huge',
      meleeDamageBonus: 4,
      reachBonus: 10,
      resizeEquipment: true,
    })
  })

  it('literal size rule without ChoiceSet still resolves', () => {
    const json = JSON.stringify([
      { key: 'CreatureSize', value: 'large', resizeEquipment: true },
    ])
    const shift = parseSpellEffectSizeShift(json, 1)
    expect(shift).toEqual({
      size: 'lg',
      meleeDamageBonus: 0,
      reachBonus: 0,
      resizeEquipment: true,
    })
  })

  it('numeric FlatModifier without CreatureSize still surfaces bonus', () => {
    const json = JSON.stringify([
      { key: 'FlatModifier', selector: ['melee-strike-damage'], value: 3 },
    ])
    const shift = parseSpellEffectSizeShift(json, 1)
    expect(shift).toEqual({
      size: 'med',
      meleeDamageBonus: 3,
      reachBonus: 0,
      resizeEquipment: false,
    })
  })

  it('FlatModifier damage +2 → reachBonus 5 via fallback mapping', () => {
    // No ChoiceSet, no CreatureSize.reach override — derive reach from
    // Enlarge's damage→reach table (damage 2 ⇒ reach +5).
    const json = JSON.stringify([
      { key: 'CreatureSize', value: 'large' },
      { key: 'FlatModifier', selector: ['melee-strike-damage'], value: 2 },
    ])
    const shift = parseSpellEffectSizeShift(json, 1)
    expect(shift).toEqual({
      size: 'lg',
      meleeDamageBonus: 2,
      reachBonus: 5,
      resizeEquipment: false,
    })
  })

  it('FlatModifier damage +4 → reachBonus 10 via fallback mapping', () => {
    const json = JSON.stringify([
      { key: 'CreatureSize', value: 'huge' },
      { key: 'FlatModifier', selector: ['melee-strike-damage'], value: 4 },
    ])
    const shift = parseSpellEffectSizeShift(json, 1)
    expect(shift).toEqual({
      size: 'huge',
      meleeDamageBonus: 4,
      reachBonus: 10,
      resizeEquipment: false,
    })
  })

  it('returns null when no size/damage rules present', () => {
    const json = JSON.stringify([{ key: 'FlatModifier', selector: 'ac', value: 1 }])
    expect(parseSpellEffectSizeShift(json, 1)).toBeNull()
  })

  it('returns null on malformed JSON', () => {
    expect(parseSpellEffectSizeShift('not json', 1)).toBeNull()
  })
})
