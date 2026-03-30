import type { WeakEliteTier } from '@/types/entity'

// Source: PF2e Monster Core — Archives of Nethys IDs 3264/3265
// https://2e.aonprd.com/Rules.aspx?ID=3264 (Elite)
// https://2e.aonprd.com/Rules.aspx?ID=3265 (Weak)
const HP_TABLE: Array<{ maxLevel: number; delta: number }> = [
  { maxLevel: 2,  delta: 10  },
  { maxLevel: 4,  delta: 15  },
  { maxLevel: 6,  delta: 20  },
  { maxLevel: 8,  delta: 30  },
  { maxLevel: 10, delta: 40  },
  { maxLevel: 12, delta: 55  },
  { maxLevel: 14, delta: 70  },
  { maxLevel: 16, delta: 90  },
  { maxLevel: 18, delta: 110 },
  { maxLevel: 20, delta: 135 },
  { maxLevel: 22, delta: 160 },
  { maxLevel: 24, delta: 185 },
]

/**
 * Returns the HP delta for a weak or elite creature adjustment.
 * Positive for elite, negative for weak, zero for normal.
 *
 * Special cases:
 * - weak on level <= 0: not applicable per rules — returns 0
 * - elite/weak on level < 1: clamped to level 1 bracket minimum
 * - level above 24: uses the highest bracket (185)
 */
export function getHpAdjustment(tier: WeakEliteTier, level: number): number {
  if (tier === 'normal') return 0
  if (tier === 'weak' && level <= 0) return 0

  const lookupLevel = Math.max(level, 1)
  const bracket = HP_TABLE.find(b => lookupLevel <= b.maxLevel) ?? HP_TABLE[HP_TABLE.length - 1]

  if (tier === 'elite') return bracket.delta
  return -bracket.delta
}

/**
 * Returns the display level for a weak or elite creature.
 *
 * Special cases:
 * - elite on level -1 or 0: +2 instead of +1 (rule: minimum displayed level is 1)
 * - weak on level 1: -2 instead of -1 (rule: minimum displayed level is -1)
 * - weak on level <= 0: undefined in rules — no change applied
 */
function getAdjustedLevel(tier: WeakEliteTier, level: number): number {
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

// Test-only export — not part of public API
export const __testing = { getAdjustedLevel }
