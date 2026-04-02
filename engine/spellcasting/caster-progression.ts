export type CasterProgression = 'full' | 'bounded' | 'unknown'

/**
 * Detect whether an NPC follows full-caster or bounded-caster slot progression.
 * - Full caster: max rank ~ ceil(level / 2)
 * - Bounded caster: max rank ~ min(5, ceil(level / 4))
 * - Unknown: neither formula matches (homebrew / unique)
 */
export function detectCasterProgression(
  creatureLevel: number,
  maxSlotRank: number
): CasterProgression {
  if (maxSlotRank <= 0) return 'unknown'

  const fullExpected = Math.ceil(creatureLevel / 2)
  if (Math.abs(maxSlotRank - fullExpected) <= 1) return 'full'

  const boundedExpected = Math.min(5, Math.ceil(creatureLevel / 4))
  if (maxSlotRank === boundedExpected) return 'bounded'

  return 'unknown'
}

/** Returns the recommended max spell rank for a given level and progression. */
export function getMaxRecommendedRank(
  creatureLevel: number,
  progression: CasterProgression
): number {
  switch (progression) {
    case 'full':
      return Math.min(10, Math.ceil(creatureLevel / 2))
    case 'bounded':
      return Math.min(5, Math.ceil(creatureLevel / 4))
    case 'unknown':
      return Math.min(10, Math.ceil(creatureLevel / 2)) // default to full
  }
}
