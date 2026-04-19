// v1.4 UAT BUG-B regression — iconic-as-NPC stat mapping.
// Walks the real Amiri level-1 iconic doc (if PAKS is available) through
// toCreatureStatBlockData and asserts the derived base stats + strikes are
// non-zero where the Rust-side sync would otherwise leave them as null → 0.
// The test skips gracefully when D:/parse_data is absent (developers without
// the external PAKS fixture) so CI without the external dataset doesn't trip.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import type { CreatureRow } from '@/shared/api'
import { toCreatureStatBlockData } from '../mappers'

const AMIRI_L1_PATH = 'D:/parse_data/PAKS/pf2e/packs/pf2e/iconics/amiri/amiri-level-1.json'

function makeRow(rawJson: string): CreatureRow {
  return {
    id: 'test-amiri',
    name: 'Amiri (Level 1)',
    type: 'npc',
    // All stat columns null — mirrors what the Rust sync path writes for a
    // character-type Foundry doc.
    level: null,
    hp: null,
    ac: null,
    fort: null,
    ref: null,
    will: null,
    perception: null,
    traits: null,
    rarity: null,
    size: null,
    source_pack: 'iconics',
    raw_json: rawJson,
    source_name: null,
    source_adventure: '__iconics__',
  }
}

describe('toCreatureStatBlockData — iconic-as-NPC derivation (BUG-B)', () => {
  it('derives non-zero stats from a character-type doc when row columns are null', () => {
    if (!existsSync(AMIRI_L1_PATH)) {
      console.warn('[bug-b] PAKS fixture missing, skipping.')
      return
    }
    const rawJson = readFileSync(AMIRI_L1_PATH, 'utf-8')
    const row = makeRow(rawJson)
    const sb = toCreatureStatBlockData(row)

    // Level overlay from system.details.level.value.
    expect(sb.level).toBe(1)

    // HP comes from system.attributes.hp.value (author-provided).
    expect(sb.hp).toBeGreaterThan(0)

    // AC > 10 — derived from 10 + dex + armor.acBonus + prof.
    expect(sb.ac).toBeGreaterThan(10)

    // Saves / Perception should be positive at L1 for a trained class.
    expect(sb.fort).toBeGreaterThan(0)
    expect(sb.ref).toBeGreaterThan(0)
    expect(sb.will).toBeGreaterThan(0)
    expect(sb.perception).toBeGreaterThan(0)

    // Ability mods replayed from boosts — at least one stat above 0.
    const mods = sb.abilityMods
    expect(mods.str + mods.dex + mods.con + mods.int + mods.wis + mods.cha).toBeGreaterThan(0)

    // Strikes synthesized from items[].type === 'weapon'.
    expect(sb.strikes.length).toBeGreaterThan(0)
    for (const s of sb.strikes) {
      expect(s.name).toBeTruthy()
      expect(s.damage.length).toBeGreaterThan(0)
      expect(s.damage[0].formula).toMatch(/^\d+d\d+/)
    }
  })

  it('leaves NPC-type docs unchanged', () => {
    // Minimal NPC doc: Rust already populated the columns from NPC paths.
    const npcDoc = {
      type: 'npc',
      name: 'Test Goblin',
      system: {
        details: { level: { value: 1 } },
        attributes: { hp: { max: 20 }, ac: { value: 16 } },
        saves: { fortitude: { value: 5 }, reflex: { value: 7 }, will: { value: 3 } },
        perception: { mod: 4 },
        abilities: {
          str: { mod: 1 },
          dex: { mod: 3 },
          con: { mod: 2 },
          int: { mod: 0 },
          wis: { mod: 0 },
          cha: { mod: 0 },
        },
      },
      items: [],
    }
    const row: CreatureRow = {
      id: 'gob',
      name: 'Test Goblin',
      type: 'npc',
      level: 1,
      hp: 20,
      ac: 16,
      fort: 5,
      ref: 7,
      will: 3,
      perception: 4,
      traits: '[]',
      rarity: 'common',
      size: 'sm',
      source_pack: 'pathfinder-bestiary',
      raw_json: JSON.stringify(npcDoc),
      source_name: null,
      source_adventure: null,
    }
    const sb = toCreatureStatBlockData(row)
    // Columns are preserved verbatim — derivation does not run for type='npc' docs.
    expect(sb.hp).toBe(20)
    expect(sb.ac).toBe(16)
    expect(sb.fort).toBe(5)
    expect(sb.ref).toBe(7)
    expect(sb.will).toBe(3)
    expect(sb.perception).toBe(4)
    expect(sb.abilityMods.dex).toBe(3)
  })
})
