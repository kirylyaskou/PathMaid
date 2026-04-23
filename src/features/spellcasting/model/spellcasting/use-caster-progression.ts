import { useMemo } from 'react'
import { detectCasterProgression, getMaxRecommendedRank } from '@engine'
import type { SpellcastingSection } from '@/entities/spell'
import { RANK_WARNINGS } from '@/entities/creature'

export function useCasterProgression(section: SpellcastingSection, creatureLevel: number) {
  const maxSlotRank = useMemo(() => {
    let max = 0
    for (const byRank of section.spellsByRank) {
      if (byRank.rank > 0 && byRank.slots > 0 && byRank.rank > max) max = byRank.rank
    }
    return max
  }, [section.spellsByRank])

  const progression = useMemo(
    () => detectCasterProgression(creatureLevel, maxSlotRank),
    [creatureLevel, maxSlotRank],
  )
  const recommendedMaxRank = useMemo(
    () => getMaxRecommendedRank(creatureLevel, progression),
    [creatureLevel, progression],
  )

  function rankWarning(rank: number): string | null {
    if (rank <= 0 || rank <= recommendedMaxRank) return null
    return RANK_WARNINGS[rank] ?? RANK_WARNINGS[10]!
  }

  return { progression, recommendedMaxRank, rankWarning }
}
