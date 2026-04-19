// 65-05: Note rule parser + selector lookup coverage.

import { describe, it, expect } from 'vitest'
import {
  parseSpellEffectNotes,
  getActiveRollNotes,
  collectActiveNotesForCombatant,
} from '../notes'

describe('parseSpellEffectNotes', () => {
  it('extracts Note with selector + text + title + outcome', () => {
    const json = JSON.stringify([
      {
        key: 'Note',
        selector: 'longsword-attack',
        text: 'PF2E.SpecificRule.X.Note.Failure',
        title: 'Blink Charge',
        outcome: ['failure'],
      },
    ])
    const notes = parseSpellEffectNotes(json, 'eff', 'Eff')
    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({
      effectId: 'eff',
      effectName: 'Eff',
      selector: 'longsword-attack',
      text: 'PF2E.SpecificRule.X.Note.Failure',
      title: 'Blink Charge',
      outcome: ['failure'],
    })
  })

  it('drops rules missing text or selector', () => {
    const json = JSON.stringify([
      { key: 'Note', text: 'no selector' },
      { key: 'Note', selector: 'x' }, // no text
      { key: 'FlatModifier', selector: 'x', value: 1 },
    ])
    expect(parseSpellEffectNotes(json, 'e', 'E')).toEqual([])
  })

  it('preserves predicate for Phase 66 evaluator', () => {
    const json = JSON.stringify([
      {
        key: 'Note',
        selector: 'claw-damage',
        text: 'Grab on hit',
        predicate: ['self:trait:grab'],
      },
    ])
    const notes = parseSpellEffectNotes(json, 'e', 'E')
    expect(notes[0].predicate).toEqual(['self:trait:grab'])
  })
})

describe('getActiveRollNotes', () => {
  const notes = parseSpellEffectNotes(
    JSON.stringify([
      { key: 'Note', selector: 'attack-roll', text: 'A' },
      { key: 'Note', selector: ['attack-roll', 'saving-throw'], text: 'B' },
      { key: 'Note', selector: 'saving-throw', text: 'Crit fail only', outcome: ['criticalFailure'] },
    ]),
    'e',
    'E',
  )

  it('string selector matches', () => {
    const hits = getActiveRollNotes(notes, 'attack-roll')
    const texts = hits.map((n) => n.text)
    expect(texts).toEqual(['A', 'B'])
  })

  it('array selector matches any element', () => {
    const hits = getActiveRollNotes(notes, 'saving-throw')
    expect(hits.map((n) => n.text)).toContain('B')
  })

  it('outcome filter excludes notes not matching realized outcome', () => {
    const hits = getActiveRollNotes(notes, 'saving-throw', 'success')
    expect(hits.map((n) => n.text)).toEqual(['B']) // crit-fail note filtered out
  })

  it('outcome filter includes notes when outcome matches', () => {
    const hits = getActiveRollNotes(notes, 'saving-throw', 'criticalFailure')
    const texts = hits.map((n) => n.text)
    expect(texts).toContain('Crit fail only')
  })
})

describe('collectActiveNotesForCombatant', () => {
  it('walks multiple active effects and merges their notes', () => {
    const effects = [
      {
        id: 'e1',
        effectName: 'Effect 1',
        rulesJson: JSON.stringify([
          { key: 'Note', selector: 'attack-roll', text: 'One' },
        ]),
      },
      {
        id: 'e2',
        effectName: 'Effect 2',
        rulesJson: JSON.stringify([
          { key: 'Note', selector: 'saving-throw', text: 'Two' },
          { key: 'FlatModifier', selector: 'ac', value: 1 },
        ]),
      },
    ]
    const all = collectActiveNotesForCombatant(effects)
    expect(all).toHaveLength(2)
    expect(all.map((n) => n.text).sort()).toEqual(['One', 'Two'])
    expect(all.every((n) => ['e1', 'e2'].includes(n.effectId))).toBe(true)
  })
})
