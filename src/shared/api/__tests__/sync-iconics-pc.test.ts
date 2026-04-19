// Phase 70 / D-70-07 — unit test for buildPathbuilderFromFoundryPC.
// The fixture is a trimmed, hand-constructed Foundry character actor shaped
// like the real Amiri level-1 iconic (see
// D:/parse_data/PAKS/pf2e/packs/pf2e/iconics/amiri/amiri-level-1.json):
//   - top-level `type: "character"`
//   - `system.details.level.value: 1`
//   - `system.abilities: null` (iconics never ship resolved abilities)
//   - class/ancestry/heritage/background live inside items[]
//   - at least one weapon and one armor child item
//
// The test must stay independent of the on-disk fixture so CI can run
// wherever the parse_data directory is absent.

import { describe, it, expect } from 'vitest'
import { buildPathbuilderFromFoundryPC } from '../sync/sync-iconics-pc'

const AMIRI_LIKE_FIXTURE = {
  _id: 'Ykt9Ke7RWg5NoXMV',
  name: 'Amiri',
  type: 'character',
  items: [
    {
      _id: 'class-id',
      name: 'Barbarian',
      type: 'class',
      system: {},
    },
    {
      _id: 'ancestry-id',
      name: 'Human',
      type: 'ancestry',
      system: {},
    },
    {
      _id: 'heritage-id',
      name: 'Versatile Heritage',
      type: 'heritage',
      system: {},
    },
    {
      _id: 'background-id',
      name: 'Hunter',
      type: 'background',
      system: {},
    },
    {
      _id: 'weapon-1',
      name: 'Bastard Sword',
      type: 'weapon',
      system: {
        category: 'martial',
        damage: { damageType: 'slashing', die: 'd8' },
        quantity: 1,
        runes: { potency: 0, property: [] },
        traits: { str: '' },
      },
    },
    {
      _id: 'weapon-2',
      name: 'Javelin',
      type: 'weapon',
      system: {
        category: 'simple',
        damage: { damageType: 'piercing', die: 'd6' },
        quantity: 4,
        runes: { potency: 0, property: [] },
      },
    },
    {
      _id: 'armor-1',
      name: 'Studded Leather',
      type: 'armor',
      system: {
        category: 'light',
        quantity: 1,
        runes: { potency: 0, resilient: '', property: [] },
      },
    },
    {
      _id: 'consumable-1',
      name: "Healer's Kit",
      type: 'consumable',
      system: { quantity: 1 },
    },
  ],
  system: {
    abilities: null,
    attributes: { hp: { temp: 0, value: 22 } },
    details: {
      level: { value: 1 },
      deity: { value: '' },
      gender: { value: 'F/She/Her' },
      age: { value: '' },
      languages: { value: ['hallit'] },
    },
  },
}

describe('buildPathbuilderFromFoundryPC', () => {
  it('returns a PathbuilderBuild for an Amiri-shaped iconic', () => {
    const build = buildPathbuilderFromFoundryPC(AMIRI_LIKE_FIXTURE)
    expect(build).not.toBeNull()
    if (!build) return

    expect(build.name).toBe('Amiri')
    expect(build.level).toBe(1)
    expect(build.class).toBe('Barbarian')
    expect(build.ancestry).toBe('Human')
    expect(build.heritage).toBe('Versatile Heritage')
    expect(build.background).toBe('Hunter')
    expect(build.gender).toBe('F/She/Her')
    expect(build.languages).toEqual(['hallit'])
  })

  it('defaults ability scores to 10 when Foundry ships abilities=null', () => {
    const build = buildPathbuilderFromFoundryPC(AMIRI_LIKE_FIXTURE)
    expect(build?.abilities).toEqual({
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    })
  })

  it('maps weapons from items[] (type=weapon)', () => {
    const build = buildPathbuilderFromFoundryPC(AMIRI_LIKE_FIXTURE)
    expect(build?.weapons).toHaveLength(2)
    const bastard = build?.weapons.find((w) => w.name === 'Bastard Sword')
    expect(bastard).toBeDefined()
    expect(bastard?.die).toBe('d8')
    expect(bastard?.damageType).toBe('slashing')
    expect(bastard?.prof).toBe('martial')
    expect(bastard?.qty).toBe(1)
  })

  it('maps armor from items[] (type=armor)', () => {
    const build = buildPathbuilderFromFoundryPC(AMIRI_LIKE_FIXTURE)
    expect(build?.armor).toHaveLength(1)
    expect(build?.armor[0]?.name).toBe('Studded Leather')
    expect(build?.armor[0]?.prof).toBe('light')
  })

  it('collects consumables into equipment[]', () => {
    const build = buildPathbuilderFromFoundryPC(AMIRI_LIKE_FIXTURE)
    const names = (build?.equipment ?? []).map((e) => e[0])
    expect(names).toContain("Healer's Kit")
  })

  it('rejects non-character records', () => {
    expect(buildPathbuilderFromFoundryPC({ type: 'npc', name: 'Goblin' })).toBeNull()
    expect(buildPathbuilderFromFoundryPC({ type: 'character', name: '' })).toBeNull()
    expect(buildPathbuilderFromFoundryPC(null)).toBeNull()
    expect(buildPathbuilderFromFoundryPC(undefined)).toBeNull()
    expect(buildPathbuilderFromFoundryPC('not-an-object')).toBeNull()
  })

  it('survives a minimal character doc with only name and type', () => {
    const build = buildPathbuilderFromFoundryPC({
      type: 'character',
      name: 'Stubby',
    })
    expect(build).not.toBeNull()
    expect(build?.name).toBe('Stubby')
    expect(build?.level).toBe(1)
    expect(build?.weapons).toEqual([])
    expect(build?.armor).toEqual([])
  })

  it('reads ability mods when system.abilities is a proper shape', () => {
    const build = buildPathbuilderFromFoundryPC({
      type: 'character',
      name: 'ModdedPC',
      items: [],
      system: {
        details: { level: { value: 5 } },
        abilities: {
          str: { mod: 4 },
          dex: { mod: 2 },
          con: { mod: 3 },
          int: { mod: 0 },
          wis: { mod: 1 },
          cha: { mod: -1 },
        },
      },
    })
    expect(build?.abilities).toEqual({
      str: 18,
      dex: 14,
      con: 16,
      int: 10,
      wis: 12,
      cha: 8,
    })
  })
})
