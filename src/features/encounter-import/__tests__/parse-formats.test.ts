// 64-fix: regression test for the Dashboard parser. The .pfdashencounters
// shape uses nested {value, max, modifications, note} for hp/level/perception
// and reserves `name` for a per-encounter local moniker, with the canonical
// bestiary identity living under `originalCreature.name`. The earlier parser
// passed these objects straight through and the import wrote them verbatim
// into displayName / hp columns — producing rows like
//   "40 {\"max\":290,\"value\":290,...}/{\"max\":290,\"value\":290,...}"
// in the initiative list.

import { describe, it, expect } from 'vitest'
import {
  parseDashboard,
  parsePathmaiden,
  detectFormat,
} from '../lib/parse-formats'

const DASHBOARD_FIXTURE = [
  {
    name: 'Братья дварфы',
    combatants: [
      {
        initiative: 40,
        name: 'Огрек',
        type: 'Creature',
        level: 13,
        hp: { value: 290, max: 290, modifications: [], note: '' },
        originalCreature: {
          initiative: 0,
          name: 'Urnak Lostwind',
          type: 'Creature',
          level: 14,
          hp: { value: 310, max: 310, modifications: [], note: '' },
        },
      },
      {
        initiative: 26,
        name: 'Костовос',
        type: 'Creature',
        level: 9,
        hp: { value: 200, max: 200, modifications: [], note: 'void healing' },
        originalCreature: {
          name: 'Skeletal Champion',
          type: 'Creature',
          level: 9,
          hp: { value: 200, max: 200 },
        },
      },
      {
        initiative: 0,
        name: 'Old Trap',
        type: 'Hazard',
        level: 8,
        hp: { value: 60, max: 60 },
        originalCreature: {
          name: 'Bloodthirsty Urge Trap',
          type: 'Hazard',
          level: 8,
          hp: { value: 60, max: 60 },
        },
      },
    ],
    partyLevel: 12,
    partySize: 4,
  },
]

describe('parseDashboard — Pathfinder Dashboard .pfdashencounters', () => {
  it('detects the format', () => {
    expect(detectFormat(DASHBOARD_FIXTURE)).toBe('dashboard')
  })

  it('produces ParsedEncounter with three combatants', () => {
    const out = parseDashboard(DASHBOARD_FIXTURE)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Братья дварфы')
    expect(out[0].combatants).toHaveLength(3)
  })

  it('keeps local moniker as displayName, canonical name as lookupName', () => {
    const c = parseDashboard(DASHBOARD_FIXTURE)[0].combatants[0]
    expect(c.displayName).toBe('Огрек')
    expect(c.lookupName).toBe('Urnak Lostwind')
  })

  it('extracts hp.value and hp.max as numbers (not the wrapping object)', () => {
    const c = parseDashboard(DASHBOARD_FIXTURE)[0].combatants[0]
    expect(c.hp).toBe(290)
    expect(c.hpMax).toBe(290)
    // Sanity: no JSON-shaped fields leaking through.
    expect(typeof c.hp).toBe('number')
    expect(typeof c.hpMax).toBe('number')
  })

  it('uses the originalCreature level when both are present', () => {
    const c = parseDashboard(DASHBOARD_FIXTURE)[0].combatants[0]
    expect(c.level).toBe(14) // originalCreature wins over the local 13
  })

  it('detects hazards via type or originalCreature.type', () => {
    const out = parseDashboard(DASHBOARD_FIXTURE)[0].combatants
    expect(out[2].isHazard).toBe(true)
    expect(out[0].isHazard).toBe(false)
    expect(out[1].isHazard).toBe(false)
  })

  it('preserves initiative as a bare number', () => {
    const out = parseDashboard(DASHBOARD_FIXTURE)[0].combatants
    expect(out[0].initiative).toBe(40)
    expect(out[1].initiative).toBe(26)
  })

  it('falls back to originalCreature.name when no local name is present', () => {
    const fixture = [
      {
        name: 'X',
        combatants: [
          {
            initiative: 5,
            type: 'Creature',
            originalCreature: { name: 'Goblin Warrior', level: -1 },
            hp: 10,
          },
        ],
      },
    ]
    const c = parseDashboard(fixture)[0].combatants[0]
    expect(c.displayName).toBe('Goblin Warrior')
    expect(c.lookupName).toBe('Goblin Warrior')
    expect(c.hp).toBe(10)
  })

  it('drops combatants with no usable name', () => {
    const fixture = [{ name: 'X', combatants: [{ initiative: 1, hp: 5 }] }]
    expect(parseDashboard(fixture)[0].combatants).toHaveLength(0)
  })
})

describe('parsePathmaiden — own export format', () => {
  const PATHMAIDEN_FIXTURE = {
    version: 'pathmaiden-v1' as const,
    encounter: {
      name: 'Test',
      combatants: [
        { name: 'Goblin Warrior', isHazard: false, hp: 12, level: -1 },
        { name: 'Pit Trap', isHazard: true },
      ],
    },
  }

  it('detects the format', () => {
    expect(detectFormat(PATHMAIDEN_FIXTURE)).toBe('pathmaiden')
  })

  it('uses the same string for displayName and lookupName', () => {
    const c = parsePathmaiden(PATHMAIDEN_FIXTURE)[0].combatants[0]
    expect(c.displayName).toBe('Goblin Warrior')
    expect(c.lookupName).toBe('Goblin Warrior')
    expect(c.hp).toBe(12)
    expect(c.level).toBe(-1)
  })

  it('reports isHazard from the explicit flag', () => {
    const out = parsePathmaiden(PATHMAIDEN_FIXTURE)[0].combatants
    expect(out[0].isHazard).toBe(false)
    expect(out[1].isHazard).toBe(true)
  })

  // 69-03: pathmaiden-v1 exports since Phase 69 carry a separate `lookupName`
  // so GM-renamed combatants still match canonical bestiary rows on re-import.
  it('honors a separate lookupName field when present (Phase 69 exports)', () => {
    const fixture = {
      version: 'pathmaiden-v1' as const,
      encounter: {
        name: 'Renamed',
        combatants: [
          { name: 'Огрек', lookupName: 'Urnak Lostwind', isHazard: false, hp: 280, hpMax: 290 },
        ],
      },
    }
    const c = parsePathmaiden(fixture)[0].combatants[0]
    expect(c.displayName).toBe('Огрек')
    expect(c.lookupName).toBe('Urnak Lostwind')
    expect(c.hp).toBe(280)
    expect(c.hpMax).toBe(290)
  })

  it('falls back to name when lookupName is empty/missing (legacy pre-69 exports)', () => {
    const fixture = {
      version: 'pathmaiden-v1' as const,
      encounter: {
        name: 'Legacy',
        combatants: [
          { name: 'Goblin Warrior', isHazard: false },
          { name: 'Zombie Brute', lookupName: '', isHazard: false },
        ],
      },
    }
    const out = parsePathmaiden(fixture)[0].combatants
    expect(out[0].lookupName).toBe('Goblin Warrior')
    expect(out[1].lookupName).toBe('Zombie Brute')
  })
})
