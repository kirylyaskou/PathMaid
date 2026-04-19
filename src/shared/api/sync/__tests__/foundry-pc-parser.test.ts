// v1.4.1 UAT: Amiri Level 1 iconic as ground truth for the shared
// Foundry-PC parser. Verifies every derived stat (abilities, HP, AC, saves,
// perception, skills, strikes) matches Pathfinder 2e Player Core rules.
//
// Skips gracefully when D:/parse_data is absent so CI without the external
// PAKS fixture doesn't trip.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import {
  parseFoundryCharacterDoc,
  getStrikeReach,
  abilityMod,
  profMod,
} from '../foundry-pc-parser'

const AMIRI_L1_PATH =
  'D:/parse_data/PAKS/pf2e/packs/pf2e/iconics/amiri/amiri-level-1.json'

describe('foundry-pc-parser — math helpers', () => {
  it('abilityMod: floor((score-10)/2)', () => {
    expect(abilityMod(10)).toBe(0)
    expect(abilityMod(11)).toBe(0)
    expect(abilityMod(12)).toBe(1)
    expect(abilityMod(18)).toBe(4)
    expect(abilityMod(8)).toBe(-1)
  })

  it('profMod: 0 when untrained, else level + rank*2', () => {
    expect(profMod(0, 5)).toBe(0)
    expect(profMod(1, 1)).toBe(3) // trained at L1
    expect(profMod(2, 1)).toBe(5) // expert at L1
    expect(profMod(3, 10)).toBe(16) // master at L10
    expect(profMod(4, 20)).toBe(28) // legendary at L20
  })

  it('getStrikeReach: 0 for ranged, reach-N absolute, "reach" adds +5, else base', () => {
    expect(getStrikeReach([], true, 5)).toBe(0)
    expect(getStrikeReach(['reach-15'], false, 5)).toBe(15)
    expect(getStrikeReach(['reach-20'], false, 10)).toBe(20)
    expect(getStrikeReach(['reach'], false, 5)).toBe(10)
    expect(getStrikeReach(['reach'], false, 10)).toBe(15)
    expect(getStrikeReach([], false, 5)).toBe(5)
  })

  it('getStrikeReach: ground-truth scenarios (whip / claw / bastard sword, Enlarge)', () => {
    // Whip (martial, medium wielder, traits=["disarm","finesse","nonlethal","reach","trip"])
    const whip = ['disarm', 'finesse', 'nonlethal', 'reach', 'trip']
    // Medium base reach = 5, whip "reach" trait +5 → 10 ft
    expect(getStrikeReach(whip, false, 5)).toBe(10)
    // Whip + Enlarge rank 2 (reachBonus +5) → 15 ft
    expect(getStrikeReach(whip, false, 5, 5)).toBe(15)
    // Whip + Enlarge rank 4 (reachBonus +10) → 20 ft
    expect(getStrikeReach(whip, false, 5, 10)).toBe(20)

    // Umbral dragon claw (huge, traits=["agile","magical","reach-10"])
    // "reach-10" is absolute — 10 ft regardless of creature size default
    const claw = ['agile', 'magical', 'reach-10']
    expect(getStrikeReach(claw, false, 15)).toBe(10)
    // Claw + Enlarge rank 2 → 10 + 5 = 15 ft (per ground-truth spec: additive)
    expect(getStrikeReach(claw, false, 15, 5)).toBe(15)
    // Claw + Enlarge rank 4 → 10 + 10 = 20 ft
    expect(getStrikeReach(claw, false, 15, 10)).toBe(20)

    // Bastard sword (martial, traits=["two-hand-d12"]) — no reach trait,
    // falls back to creature default.
    const bastard = ['two-hand-d12']
    expect(getStrikeReach(bastard, false, 5)).toBe(5) // medium wielder
    expect(getStrikeReach(bastard, false, 5, 5)).toBe(10) // +Enlarge r2
    expect(getStrikeReach(bastard, false, 10, 10)).toBe(20) // large wielder + r4

    // Ranged weapons ignore reachBonus (always 0)
    expect(getStrikeReach(['thrown-30'], true, 5, 5)).toBe(0)
  })
})

describe('parseFoundryCharacterDoc — Amiri Level 1 ground truth', () => {
  const rawLoad = () => {
    if (!existsSync(AMIRI_L1_PATH)) return null
    return readFileSync(AMIRI_L1_PATH, 'utf-8')
  }

  it('returns null for non-character docs', () => {
    expect(parseFoundryCharacterDoc({ type: 'npc', name: 'Goblin' })).toBeNull()
    expect(parseFoundryCharacterDoc(null)).toBeNull()
    expect(parseFoundryCharacterDoc({})).toBeNull()
  })

  it('parses Amiri L1 into expected PF2e values', () => {
    const raw = rawLoad()
    if (!raw) {
      console.warn('[pc-parser] Amiri L1 fixture missing — skipping')
      return
    }
    const doc = JSON.parse(raw)
    const parsed = parseFoundryCharacterDoc(doc)
    expect(parsed).not.toBeNull()
    if (!parsed) return

    // ── Identity ──
    expect(parsed.name).toBe('Amiri (Level 1)')
    expect(parsed.level).toBe(1)
    expect(parsed.className).toBe('Barbarian')
    expect(parsed.ancestryName).toBe('Human')
    expect(parsed.backgroundName).toBe('Hunter')
    expect(parsed.classKeyAbility).toBe('str')

    // ── Ability scores (boost replay, ×2 diminishing after 18) ──
    // Ancestry: str(selected) + con(selected) + 1 free(unselected) → str/con.
    // Background: dex + str (free).
    // Class key: str.
    // Free boosts L1: cha, dex, con, str.
    // STR: +2 anc +2 bg(free) +2 class +2 free = 18, mod +4.
    // DEX: +2 bg +2 free = 14, mod +2.
    // CON: +2 anc +2 free = 14, mod +2.
    // CHA: +2 free = 12, mod +1.
    // INT/WIS: 10, mod 0.
    expect(parsed.abilities).toEqual({
      str: 18,
      dex: 14,
      con: 14,
      int: 10,
      wis: 10,
      cha: 12,
    })

    // ── HP ──
    // Authored: system.attributes.hp.value = 22.
    expect(parsed.hp).toBe(22)

    // ── AC ──
    // Hide (medium), acBonus 3, dexCap 2. Medium rank = 1 (trained).
    // 10 + min(+2, 2) + 3 + (1 + 1*2) = 10 + 2 + 3 + 3 = 18.
    expect(parsed.ac).toBe(18)
    expect(parsed.acBreakdown).toEqual({
      profBonus: 3,
      abilityBonus: 2,
      itemBonus: 3,
    })

    // ── Saves + Perception ──
    // Fort: expert(2) at L1 → 1+4=5 + CON(+2) = +7.
    // Ref: trained(1) at L1 → 1+2=3 + DEX(+2) = +5.
    // Will: expert(2) at L1 → 5 + WIS(0) = +5.
    // Perception: expert(2) at L1 → 5 + WIS(0) = +5.
    expect(parsed.fortitude).toBe(7)
    expect(parsed.reflex).toBe(5)
    expect(parsed.will).toBe(5)
    expect(parsed.perception).toBe(5)

    // ── Speed / Size / Reach / Languages ──
    expect(parsed.speed).toBe(25)
    expect(parsed.size).toBe('med')
    expect(parsed.reach).toBe(5)
    expect(parsed.languages.sort()).toEqual(['common', 'hallit'])

    // ── Skills ──
    // acrobatics: rank 1 (system.skills).
    // athletics: class-trained → rank 1.
    // intimidation: rank 1.
    // nature: rank 1.
    // survival: background-trained → rank 1.
    expect(parsed.skills.acrobatics).toBe(1)
    expect(parsed.skills.athletics).toBe(1)
    expect(parsed.skills.intimidation).toBe(1)
    expect(parsed.skills.nature).toBe(1)
    expect(parsed.skills.survival).toBe(1)
    expect(parsed.skills.arcana).toBe(0)
    expect(parsed.skills.stealth).toBe(0)

    // Background lore
    expect(parsed.backgroundLoreSkills).toContain('Tanning Lore')

    // ── Proficiencies ──
    expect(parsed.proficiencies.fortitude).toBe(2)
    expect(parsed.proficiencies.reflex).toBe(1)
    expect(parsed.proficiencies.will).toBe(2)
    expect(parsed.proficiencies.perception).toBe(2)
    expect(parsed.proficiencies.simple).toBe(1)
    expect(parsed.proficiencies.martial).toBe(1)
    expect(parsed.proficiencies.advanced).toBe(0)
    expect(parsed.proficiencies.unarmed).toBe(1)
    expect(parsed.proficiencies.light).toBe(1)
    expect(parsed.proficiencies.medium).toBe(1)
    expect(parsed.proficiencies.heavy).toBe(0)
    expect(parsed.proficiencies.unarmored).toBe(1)

    // ── Strikes ──
    // Bastard Sword (martial, melee): attack = STR(+4) + prof(martial trained L1=3) + potency(0) = +7.
    //    damage = 1d8 + STR(+4) = 1d8+4 slashing. Reach = 5 (ancestry).
    // Javelin (simple, thrown, range 30): attack = DEX(+2) + prof(simple trained L1=3) = +5.
    //    damage = 1d6 + STR(+4) = 1d6+4 piercing (thrown uses STR damage).
    const bastard = parsed.strikes.find((s) => s.name === 'Bastard Sword')
    const javelin = parsed.strikes.find((s) => s.name === 'Javelin')
    expect(bastard).toBeDefined()
    expect(javelin).toBeDefined()
    if (bastard) {
      expect(bastard.attackMod).toBe(7)
      expect(bastard.damageFormula).toBe('1d8+4')
      expect(bastard.damageType).toBe('slashing')
      expect(bastard.isRanged).toBe(false)
      expect(bastard.reach).toBe(5)
    }
    if (javelin) {
      expect(javelin.attackMod).toBe(5)
      expect(javelin.damageFormula).toBe('1d6+4')
      expect(javelin.damageType).toBe('piercing')
      expect(javelin.isRanged).toBe(true)
      expect(javelin.range).toBe(30)
      expect(javelin.reach).toBe(0)
    }

    // ── Equipped armor ──
    expect(parsed.equippedArmor?.name).toBe('Hide Armor')
    expect(parsed.equippedArmor?.acBonus).toBe(3)
    expect(parsed.equippedArmor?.dexCap).toBe(2)
  })
})
