// v1.4.1 UAT round 6 — Acid Grip inactive speed modifier pipeline regression.
//
// Pre-fix symptom: applying Acid Grip to a combatant WITHOUT a matching
// persistent-acid condition produced no visible indication in the Speed row
// (no active −10, no struck-out placeholder, no tooltip). Root cause was
// the Speed row passing inactiveModifiers to ModifierTooltip WITHOUT the
// `showInactive` flag, so ModifierTooltip early-returned unwrapped children
// whenever activeModifiers was empty.
//
// This test verifies the engine pipeline that feeds `modStats.get('land-speed')`:
// parse rules_json → predicate evaluation → selector resolution → inactive
// bucket population. Combined with the CreatureStatBlock.tsx `showInactive`
// prop fix, the Speed tooltip now surfaces the struck-out −10 with a
// `requires: condition:persistent-damage:acid` hint until the persistent
// acid condition fires.

import { describe, it, expect } from 'vitest'
import {
  parseSpellEffectModifiers,
  buildPredicateContext,
  evaluatePredicate,
  resolveSelector,
  type PredicateTerm,
  type SpellEffectModifierInput,
} from '@engine'

// Real Acid Grip rules_json shape (matches
// D:/parse_data/PAKS/pf2e/packs/pf2e/spell-effects/spell-effect-acid-grip.json).
const ACID_GRIP_RULES_JSON = JSON.stringify([
  {
    key: 'FlatModifier',
    predicate: ['self:condition:persistent-damage:acid'],
    selector: 'all-speeds',
    type: 'status',
    value: -10,
  },
])

// Stat slug universe that CreatureStatBlock.allStatSlugs produces for a
// typical NPC with a single land speed.
const STAT_SLUGS = [
  'ac', 'fortitude', 'reflex', 'will', 'perception',
  'strike-attack', 'melee-strike-attack', 'spell-attack', 'spell-dc',
  'land-speed',
]

describe('Acid Grip — speed modifier pipeline', () => {
  it('parses the FlatModifier rule from the real rules_json shape', () => {
    const mods = parseSpellEffectModifiers(
      ACID_GRIP_RULES_JSON,
      'effect-acid-grip',
      'Acid Grip',
      1,
    )

    expect(mods).toHaveLength(1)
    expect(mods[0]).toMatchObject({
      effectId: 'effect-acid-grip',
      effectName: 'Acid Grip',
      selector: 'all-speeds',
      modifierType: 'status',
      value: -10,
    })
    expect(mods[0].predicate).toEqual(['self:condition:persistent-damage:acid'])
  })

  it('predicate is FALSE when persistent-acid is absent → modifier is inactive', () => {
    const mods = parseSpellEffectModifiers(
      ACID_GRIP_RULES_JSON,
      'effect-acid-grip',
      'Acid Grip',
      1,
    )
    const ctx = buildPredicateContext({
      conditions: [], // no persistent-acid
      effects: [{ effectName: 'Acid Grip' }],
    })

    for (const m of mods) {
      expect(
        evaluatePredicate(m.predicate as PredicateTerm[], ctx),
      ).toBe(false)
    }
  })

  it('predicate is TRUE with persistent-damage-acid (long Foundry form)', () => {
    const ctx = buildPredicateContext({
      conditions: [{ slug: 'persistent-damage-acid' }],
      effects: [{ effectName: 'Acid Grip' }],
    })

    expect(
      evaluatePredicate(
        ['self:condition:persistent-damage:acid'] as PredicateTerm[],
        ctx,
      ),
    ).toBe(true)
  })

  it('predicate is TRUE with persistent-acid (UI short slug, round-5 fix)', () => {
    const ctx = buildPredicateContext({
      conditions: [{ slug: 'persistent-acid' }],
      effects: [{ effectName: 'Acid Grip' }],
    })

    expect(
      evaluatePredicate(
        ['self:condition:persistent-damage:acid'] as PredicateTerm[],
        ctx,
      ),
    ).toBe(true)
  })

  it('resolveSelector(all-speeds, statSlugs) includes land-speed', () => {
    const resolved = resolveSelector('all-speeds', STAT_SLUGS)
    expect(resolved).toContain('land-speed')
  })

  it('full pipeline: no-acid context → land-speed gets inactive modifier', () => {
    // Simulates the exact logic used inside useModifiedStats so we catch
    // regressions before they hit the CreatureStatBlock render path.
    const mods = parseSpellEffectModifiers(
      ACID_GRIP_RULES_JSON,
      'effect-acid-grip',
      'Acid Grip',
      1,
    )
    const ctx = buildPredicateContext({
      conditions: [],
      effects: [{ effectName: 'Acid Grip' }],
    })

    const active: SpellEffectModifierInput[] = []
    const inactive: Array<SpellEffectModifierInput & { requires: string }> = []
    for (const m of mods) {
      if (!m.predicate || m.predicate.length === 0) {
        active.push(m)
        continue
      }
      if (evaluatePredicate(m.predicate as PredicateTerm[], ctx)) {
        active.push(m)
      } else {
        inactive.push({ ...m, requires: 'condition:persistent-damage:acid' })
      }
    }

    expect(active).toHaveLength(0)
    expect(inactive).toHaveLength(1)

    // Now verify that land-speed picks up the inactive entry via selector resolution.
    const inactiveForLandSpeed = inactive.filter((im) =>
      resolveSelector(im.selector, STAT_SLUGS).includes('land-speed'),
    )
    expect(inactiveForLandSpeed).toHaveLength(1)
    expect(inactiveForLandSpeed[0].value).toBe(-10)
    expect(inactiveForLandSpeed[0].modifierType).toBe('status')
  })

  it('full pipeline: persistent-acid context → modifier flips to active', () => {
    const mods = parseSpellEffectModifiers(
      ACID_GRIP_RULES_JSON,
      'effect-acid-grip',
      'Acid Grip',
      1,
    )
    const ctx = buildPredicateContext({
      conditions: [{ slug: 'persistent-acid' }], // UI short form
      effects: [{ effectName: 'Acid Grip' }],
    })

    const active: SpellEffectModifierInput[] = []
    const inactive: SpellEffectModifierInput[] = []
    for (const m of mods) {
      if (!m.predicate || m.predicate.length === 0) {
        active.push(m)
        continue
      }
      if (evaluatePredicate(m.predicate as PredicateTerm[], ctx)) {
        active.push(m)
      } else {
        inactive.push(m)
      }
    }

    expect(active).toHaveLength(1)
    expect(inactive).toHaveLength(0)
    expect(active[0].value).toBe(-10)
  })
})
