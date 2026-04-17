// engine/creature-building/sanity.ts
//
// Non-blocking sanity checks for the creature builder Design Review panel (D-23).
// Runs on debounced form state; emits warn / info items.

import { classifyStat } from './getBenchmark'
import type { SanityIssue, StatKind } from './types'

export interface CreatureStatsForSanity {
  level: number
  ac: number
  hp: number
  fort: number
  ref: number
  will: number
  perception: number
  abilityMods: { str: number; dex: number; con: number; int: number; wis: number; cha: number }
  strikeAttackBonus?: number
  strikeDamageExpected?: number
  spellDC?: number
  spellAttack?: number
}

export function runSanityChecks(stats: CreatureStatsForSanity): SanityIssue[] {
  const issues: SanityIssue[] = []
  const { level } = stats

  // Helper — returns the tier classifyStat picked for a given stat+value.
  const checkStat = (
    stat: Exclude<StatKind, 'strikeDamage' | 'areaDamage'>,
    value: number
  ) => classifyStat(stat, level, value)

  // AC
  const acTier = checkStat('ac', stats.ac)
  if (acTier === 'terrible') {
    issues.push({
      severity: 'warn',
      stat: 'ac',
      level,
      value: stats.ac,
      closestTier: acTier,
      message: `AC ${stats.ac} is below the Low tier for level ${level} — consider raising it.`,
    })
  }

  // HP
  const hpTier = checkStat('hp', stats.hp)
  if (hpTier === 'terrible') {
    issues.push({
      severity: 'warn',
      stat: 'hp',
      level,
      value: stats.hp,
      closestTier: hpTier,
      message: `HP ${stats.hp} is below the Low tier for level ${level}.`,
    })
  }

  // Saves
  for (const saveKey of ['fort', 'ref', 'will'] as const) {
    const tier = checkStat('save', stats[saveKey])
    if (tier === 'terrible') {
      issues.push({
        severity: 'info',
        stat: 'save',
        level,
        value: stats[saveKey],
        closestTier: tier,
        message: `${saveKey.toUpperCase()} save ${stats[saveKey]} is at Terrible tier for level ${level}.`,
      })
    }
  }

  // Perception
  const percTier = checkStat('perception', stats.perception)
  if (percTier === 'terrible') {
    issues.push({
      severity: 'info',
      stat: 'perception',
      level,
      value: stats.perception,
      closestTier: percTier,
      message: `Perception ${stats.perception} is at Terrible tier for level ${level}.`,
    })
  }

  return issues
}
