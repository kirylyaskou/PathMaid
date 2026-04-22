// engine/creature-building/recall-knowledge.ts
//
// PF2e Recall Knowledge DC tables and creature-type → skill mapping.
// Sources:
//   - CRB Table 10-5 "Level-Based DCs" (Core Rulebook pg. 503)
//   - CRB Chapter 10 / GMC creature-type Recall Knowledge skill assignments
//   - Archives of Nethys stat block conventions for ambiguous type cases

import type { Rarity } from '../types'

// ── DC table (CRB Table 10-5) ─────────────────────────────────────────────────
// Keys: PF2e creature level (-1 through 25)
// Values: base difficulty class before rarity adjustment
export const RECALL_KNOWLEDGE_DC_TABLE: Record<number, number> = {
  [-1]: 14,
  [0]:  15,
  [1]:  16,
  [2]:  17,
  [3]:  18,
  [4]:  19,
  [5]:  20,
  [6]:  21,
  [7]:  22,
  [8]:  23,
  [9]:  24,
  [10]: 25,
  [11]: 26,
  [12]: 27,
  [13]: 28,
  [14]: 29,
  [15]: 30,
  [16]: 31,
  [17]: 32,
  [18]: 33,
  [19]: 34,
  [20]: 35,
  [21]: 36,
  [22]: 38,
  [23]: 39,
  [24]: 40,
  [25]: 42,
}

// ── Rarity adjustments (CRB Table 10-5 footnotes) ────────────────────────────
export const RARITY_DC_ADJUSTMENT: Record<Rarity, number> = {
  common:   0,
  uncommon: 2,
  rare:     5,
  unique:   10,
}

// ── Creature type → Recall Knowledge skills ──────────────────────────────────
// Source: AoN Skills.aspx?ID=24 (Recall Knowledge general skill rules).
// Some creature types map to multiple skills — different skills reveal different
// aspects (e.g. Construct: Arcana for magical nature, Crafting for construction).
// Additional types not listed on the general skill page (Humanoid, Dragon, Monitor,
// Astral, Ethereal, Dream, Fungus, Spirit, Time) are derived from Monster Core /
// NPC Core stat block conventions.
export const CREATURE_TYPE_TO_SKILLS: Record<string, readonly string[]> = {
  aberration:  ['occultism'],
  animal:      ['nature'],
  astral:      ['occultism'],
  beast:       ['arcana', 'nature'],
  celestial:   ['religion'],
  construct:   ['arcana', 'crafting'],
  dragon:      ['arcana'],
  dream:       ['occultism'],
  elemental:   ['arcana', 'nature'],
  ethereal:    ['occultism'],
  fey:         ['nature'],
  fiend:       ['religion'],
  fungus:      ['nature'],
  humanoid:    ['society'],
  monitor:     ['religion'],
  ooze:        ['occultism'],
  plant:       ['nature'],
  spirit:      ['occultism'],
  time:        ['occultism'],
  undead:      ['religion'],
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Compute the Recall Knowledge DC for a creature.
 * Clamps level to the [-1, 25] table range, then adds the rarity adjustment.
 */
export function computeRecallKnowledgeDC(level: number, rarity: Rarity): number {
  const clampedLevel = Math.max(-1, Math.min(25, Math.trunc(level)))
  const baseDc = RECALL_KNOWLEDGE_DC_TABLE[clampedLevel]!
  return baseDc + (RARITY_DC_ADJUSTMENT[rarity] ?? 0)
}

/**
 * Resolve the primary creature-type identifier for display.
 * The `type` field on creature data is often a generic catalog label ("npc",
 * "monster") — the real creature-type trait lives in `traits`. This helper
 * returns the first trait that matches a known creature type, falling back
 * to `type` (or '' if both are blank) when no trait matches.
 *
 * Gold Defender (type="npc", traits=["construct","golem","mindless"]) → "construct"
 * Ancient Red Dragon (type="dragon", traits=["dragon","fire"]) → "dragon"
 */
export function getPrimaryCreatureType(
  creatureType: string,
  traits: readonly string[],
): string {
  const normalizedType = creatureType.toLowerCase().trim()
  if (normalizedType && normalizedType in CREATURE_TYPE_TO_SKILLS) {
    return normalizedType
  }
  for (const trait of traits) {
    const normalized = trait.toLowerCase().trim()
    if (normalized in CREATURE_TYPE_TO_SKILLS) {
      return normalized
    }
  }
  return normalizedType
}

/**
 * Determine the Recall Knowledge skills for a creature.
 * Returns every skill that matches the creature's type or any of its traits.
 * A Gold Defender with traits ["construct", "golem", "mindless"] returns
 * ["arcana", "crafting"] (from "construct"); "golem"/"mindless" don't add skills.
 * Returns [] if no type/trait matches.
 */
export function getRecallKnowledgeSkills(
  creatureType: string,
  traits: readonly string[],
): string[] {
  const matches = new Set<string>()

  const normalizedType = creatureType.toLowerCase().trim()
  if (normalizedType && normalizedType in CREATURE_TYPE_TO_SKILLS) {
    for (const skill of CREATURE_TYPE_TO_SKILLS[normalizedType]!) matches.add(skill)
  }

  for (const trait of traits) {
    const normalized = trait.toLowerCase().trim()
    if (normalized in CREATURE_TYPE_TO_SKILLS) {
      for (const skill of CREATURE_TYPE_TO_SKILLS[normalized]!) matches.add(skill)
    }
  }

  return [...matches]
}

/**
 * Aggregate Recall Knowledge info for a creature.
 * Returns `{ dc, type, skills }` — `type` is the resolved primary creature-type
 * (e.g. "construct" for a Gold Defender even if raw `type` is "npc"). `skills`
 * is an array (possibly empty) of lowercase skill names. UI is responsible for
 * capitalization and formatting.
 */
export function getRecallKnowledgeInfo(creature: {
  level: number
  rarity: Rarity
  type: string
  traits: readonly string[]
}): { dc: number; type: string; skills: string[] } {
  return {
    dc:     computeRecallKnowledgeDC(creature.level, creature.rarity),
    type:   getPrimaryCreatureType(creature.type, creature.traits),
    skills: getRecallKnowledgeSkills(creature.type, creature.traits),
  }
}
