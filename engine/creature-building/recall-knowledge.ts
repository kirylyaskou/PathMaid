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

// ── Creature type → primary Recall Knowledge skill ────────────────────────────
// Lowercase keys and lowercase values, matching engine/pc/skills.ts convention.
// Ambiguous types resolved per AoN stat block majority usage:
//   beast → nature  (vs arcana — nature is more common on AoN)
//   elemental → arcana  (vs nature — arcana is more common on AoN)
//   construct → arcana  (vs crafting — arcana is more common on AoN)
export const CREATURE_TYPE_TO_SKILL: Record<string, string> = {
  aberration:  'occultism',
  animal:      'nature',
  astral:      'occultism',
  beast:       'nature',
  celestial:   'religion',
  construct:   'arcana',
  dragon:      'arcana',
  dream:       'occultism',
  elemental:   'arcana',
  ethereal:    'occultism',
  fey:         'nature',
  fiend:       'religion',
  fungus:      'nature',
  humanoid:    'society',
  monitor:     'religion',
  ooze:        'occultism',
  plant:       'nature',
  spirit:      'occultism',
  time:        'occultism',
  undead:      'religion',
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
 * Determine the primary Recall Knowledge skill for a creature.
 * Looks up `creatureType` (case-insensitive) in CREATURE_TYPE_TO_SKILL first.
 * Falls back to scanning `traits` (expected lowercase) for the first match.
 * Returns 'arcana' as the catch-all if nothing matches.
 */
export function getRecallKnowledgeSkill(
  creatureType: string,
  traits: readonly string[],
): string {
  const normalizedType = creatureType.toLowerCase().trim()
  if (normalizedType && normalizedType in CREATURE_TYPE_TO_SKILL) {
    return CREATURE_TYPE_TO_SKILL[normalizedType]!
  }
  for (const trait of traits) {
    if (trait in CREATURE_TYPE_TO_SKILL) {
      return CREATURE_TYPE_TO_SKILL[trait]!
    }
  }
  return 'arcana'
}

/**
 * Aggregate Recall Knowledge info for a creature.
 * Returns `{ dc, type, skill }` — all inputs are already on CreatureStatBlockData.
 */
export function getRecallKnowledgeInfo(creature: {
  level: number
  rarity: Rarity
  type: string
  traits: readonly string[]
}): { dc: number; type: string; skill: string } {
  return {
    dc:    computeRecallKnowledgeDC(creature.level, creature.rarity),
    type:  creature.type,
    skill: getRecallKnowledgeSkill(creature.type, creature.traits),
  }
}
