import { describe, it, expect } from 'vitest'
import { classifyEffectKind } from '../default-selection'

describe('classifyEffectKind', () => {
  it('returns self for malformed JSON', () => {
    expect(classifyEffectKind('not json')).toBe('self')
  })

  it('returns self when rules_json is empty array', () => {
    expect(classifyEffectKind('[]')).toBe('self')
  })

  it('buff: positive FlatModifier value, no target predicate', () => {
    const rules = JSON.stringify([
      { key: 'FlatModifier', selector: 'ac', type: 'status', value: 1 },
    ])
    expect(classifyEffectKind(rules)).toBe('buff')
  })

  it('buff: string value (expression) with no target predicate treated as positive', () => {
    const rules = JSON.stringify([
      {
        key: 'FlatModifier',
        selector: 'attack',
        type: 'status',
        value: 'ternary(gte(@item.level,9),3,1)',
      },
    ])
    expect(classifyEffectKind(rules)).toBe('buff')
  })

  it('debuff: negative FlatModifier value', () => {
    const rules = JSON.stringify([
      { key: 'FlatModifier', selector: 'ac', type: 'status', value: -2 },
    ])
    expect(classifyEffectKind(rules)).toBe('debuff')
  })

  it('debuff: positive value but predicate targets target:*', () => {
    const rules = JSON.stringify([
      {
        key: 'FlatModifier',
        selector: 'attack-roll',
        type: 'circumstance',
        value: 1,
        predicate: ['target:condition:frightened'],
      },
    ])
    expect(classifyEffectKind(rules)).toBe('debuff')
  })

  it('debuff: predicate target:* nested inside {and}', () => {
    const rules = JSON.stringify([
      {
        key: 'FlatModifier',
        selector: 'ac',
        type: 'status',
        value: 1,
        predicate: [{ and: ['target:condition:flat-footed', 'self:condition:raging'] }],
      },
    ])
    expect(classifyEffectKind(rules)).toBe('debuff')
  })

  it('self: no FlatModifier rule entries (only notes / other rule keys)', () => {
    const rules = JSON.stringify([
      { key: 'Note', selector: 'attack-roll', text: 'hello' },
      { key: 'RollOption', option: 'foo' },
    ])
    expect(classifyEffectKind(rules)).toBe('self')
  })

  it('mix: any negative entry wins over positives → debuff', () => {
    const rules = JSON.stringify([
      { key: 'FlatModifier', selector: 'ac', type: 'status', value: 1 },
      { key: 'FlatModifier', selector: 'speed', type: 'status', value: -10 },
    ])
    expect(classifyEffectKind(rules)).toBe('debuff')
  })
})
