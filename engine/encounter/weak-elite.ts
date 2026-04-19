import type { WeakEliteTier } from '../types'

// Source: Monster Core pg. 6-7
// https://2e.aonprd.com/Rules.aspx?ID=3264 (Elite)
// https://2e.aonprd.com/Rules.aspx?ID=3265 (Weak)

// Elite: starting level → HP increase
const ELITE_HP: Array<{ maxLevel: number; delta: number }> = [
  { maxLevel: 1,  delta: 10 },  // 1 or lower
  { maxLevel: 4,  delta: 15 },  // 2–4
  { maxLevel: 19, delta: 20 },  // 5–19
]
const ELITE_HP_HIGH = 30  // 20+

// Weak: starting level → HP decrease (stored as positive, negated on return)
const WEAK_HP: Array<{ maxLevel: number; delta: number }> = [
  { maxLevel: 2,  delta: 10 },  // 1–2
  { maxLevel: 5,  delta: 15 },  // 3–5
  { maxLevel: 20, delta: 20 },  // 6–20
]
const WEAK_HP_HIGH = 30  // 21+

/**
 * Returns the HP delta for a weak or elite creature adjustment.
 * Positive for elite, negative for weak, zero for normal.
 *
 * Tables are asymmetric per official rules (Monster Core pg. 6-7).
 */
export function getHpAdjustment(tier: WeakEliteTier, level: number): number {
  if (tier === 'normal') return 0

  if (tier === 'elite') {
    const bracket = ELITE_HP.find(b => level <= b.maxLevel)
    return bracket ? bracket.delta : ELITE_HP_HIGH
  }

  // weak — level 0 or lower has no weak adjustment per rules
  if (level <= 0) return 0
  const bracket = WEAK_HP.find(b => level <= b.maxLevel)
  return -(bracket ? bracket.delta : WEAK_HP_HIGH)
}

/**
 * Returns the display level for a weak or elite creature.
 *
 * Special cases:
 * - elite on level -1 or 0: +2 instead of +1 (rule: minimum displayed level is 1)
 * - weak on level 1: -2 instead of -1 (rule: minimum displayed level is -1)
 * - weak on level <= 0: undefined in rules — no change applied
 *
 * Also used for encounter XP budget calculations (tier-shifted level).
 */
export function getAdjustedLevel(tier: WeakEliteTier, level: number): number {
  if (tier === 'normal') return level

  if (tier === 'elite') {
    if (level === -1 || level === 0) return level + 2
    return level + 1
  }

  // weak
  if (level <= 0) return level
  if (level === 1) return -1
  return level - 1
}

/**
 * Returns the stat adjustment for Weak/Elite creatures.
 * PF2e rules: Elite +2 to AC, attacks, DCs, saves, skills, perception.
 * Weak: -2 to the same.
 */
export function getStatAdjustment(tier: WeakEliteTier): number {
  if (tier === 'elite') return 2
  if (tier === 'weak') return -2
  return 0
}

/**
 * Returns the damage adjustment for Weak/Elite creatures (Monster Core pg. 6-7).
 *
 * - Elite: +2 damage on Strikes and offensive abilities (+4 on limited-use abilities).
 * - Weak:  -2 damage on Strikes and offensive abilities (-4 on limited-use abilities).
 * - Normal: 0.
 *
 * "Limited-use" = abilities with a Frequency entry (e.g. "once per encounter",
 * "once per day"). Automatic detection of limited-use is not yet implemented
 * (v1.5 follow-up) — callers currently always pass `isLimitedUse=false`.
 */
export function getDamageAdjustment(tier: WeakEliteTier, isLimitedUse: boolean = false): number {
  if (tier === 'normal') return 0
  const magnitude = isLimitedUse ? 4 : 2
  return tier === 'elite' ? magnitude : -magnitude
}

/**
 * Returns the level shift used by encounter XP budget calculations.
 *
 * Elite +1, Weak -1, Normal 0. Does NOT apply the display-level clamps
 * `getAdjustedLevel` uses for level -1/0/1 (those exist so the stat block
 * never shows a nonsense level). For XP purposes the raw delta is always
 * applied — see Monster Core pg. 6-7 ("Increase/Decrease its level by 1
 * when using its level to calculate DCs and for determining its XP").
 */
export function getXpLevelDelta(tier: WeakEliteTier): number {
  if (tier === 'elite') return 1
  if (tier === 'weak') return -1
  return 0
}
