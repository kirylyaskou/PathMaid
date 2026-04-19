// 65-06: GrantItem parser coverage — narrow v1.4 scope.
// Resolves only same-pack grants (spell-effects / equipment-effects /
// boons-and-curses). Grants into conditionitems or other compendia are
// dropped.

import { describe, it, expect } from 'vitest'
import { parseSpellEffectGrantItems, SAME_PACK_EFFECT_PACKS } from '../grant-item'

describe('parseSpellEffectGrantItems', () => {
  it('accepts grants into spell-effects with a plain effect name', () => {
    const json = JSON.stringify([
      {
        key: 'GrantItem',
        uuid: 'Compendium.pf2e.spell-effects.Item.Spell Effect: Sure Strike',
      },
    ])
    const out = parseSpellEffectGrantItems(json)
    expect(out).toEqual([
      {
        granteeName: 'Sure Strike',
        pack: 'spell-effects',
        uuid: 'Compendium.pf2e.spell-effects.Item.Spell Effect: Sure Strike',
      },
    ])
  })

  it('accepts grants into equipment-effects with "Effect:" prefix stripped', () => {
    const json = JSON.stringify([
      {
        key: 'GrantItem',
        uuid: 'Compendium.pf2e.equipment-effects.Item.Effect: Mutagen Major',
      },
    ])
    const out = parseSpellEffectGrantItems(json)
    expect(out[0].granteeName).toBe('Mutagen Major')
    expect(out[0].pack).toBe('equipment-effects')
  })

  it('accepts grants into boons-and-curses', () => {
    const json = JSON.stringify([
      {
        key: 'GrantItem',
        uuid: 'Compendium.pf2e.boons-and-curses.Item.Asmodeus Major Curse',
      },
    ])
    const out = parseSpellEffectGrantItems(json)
    expect(out[0].pack).toBe('boons-and-curses')
    expect(out[0].granteeName).toBe('Asmodeus Major Curse')
  })

  it('drops grants into conditionitems (out-of-scope for Phase 65)', () => {
    const json = JSON.stringify([
      { key: 'GrantItem', uuid: 'Compendium.pf2e.conditionitems.Item.Clumsy' },
    ])
    expect(parseSpellEffectGrantItems(json)).toEqual([])
  })

  it('drops grants into unrelated compendia (feats, spells, bestiary)', () => {
    const json = JSON.stringify([
      { key: 'GrantItem', uuid: 'Compendium.pf2e.feats-srd.Item.Power Attack' },
      { key: 'GrantItem', uuid: 'Compendium.pf2e.spells-srd.Item.Fireball' },
      { key: 'GrantItem', uuid: 'Compendium.pf2e.bestiary-effects.Item.Grab' },
    ])
    expect(parseSpellEffectGrantItems(json)).toEqual([])
  })

  it('drops malformed UUIDs and non-GrantItem keys', () => {
    const json = JSON.stringify([
      { key: 'GrantItem', uuid: 'nope' },
      { key: 'GrantItem' }, // missing uuid
      { key: 'FlatModifier', selector: 'ac', value: 1 },
    ])
    expect(parseSpellEffectGrantItems(json)).toEqual([])
  })

  it('exposes the three allow-listed packs as a frozen tuple', () => {
    expect([...SAME_PACK_EFFECT_PACKS]).toEqual([
      'spell-effects',
      'equipment-effects',
      'boons-and-curses',
    ])
  })
})
