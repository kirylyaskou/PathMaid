import { useMemo, useState } from 'react'
import type { SpellcastingSection } from '@/entities/spell'

export function useRankFilter(section: SpellcastingSection, slotDeltas: Record<number, number>) {
  const [selectedSlotLevel, setSelectedSlotLevel] = useState<number | null>(null)

  const effectiveRanks = useMemo(() => {
    const baseRanks = section.spellsByRank.map((br) => br.rank)
    const customRanks = Object.entries(slotDeltas)
      .filter(([r, d]) => !baseRanks.includes(Number(r)) && d > 0)
      .map(([r]) => Number(r))
    return [...baseRanks, ...customRanks].sort((a, b) => a - b)
  }, [section.spellsByRank, slotDeltas])

  const nextRank = useMemo(() => {
    if (effectiveRanks.length === 0) return 1
    const max = Math.max(...effectiveRanks.filter((r) => r > 0))
    return max + 1
  }, [effectiveRanks])

  const minAvailableRank = useMemo(
    () => (effectiveRanks.length > 0 ? Math.min(...effectiveRanks) : null),
    [effectiveRanks],
  )

  const effectiveSelectedSlotLevel = selectedSlotLevel ?? minAvailableRank
  const filteredRanks = useMemo(
    () =>
      effectiveSelectedSlotLevel === null
        ? effectiveRanks
        : effectiveRanks.filter((r) => r === effectiveSelectedSlotLevel),
    [effectiveRanks, effectiveSelectedSlotLevel],
  )

  return {
    effectiveRanks,
    nextRank,
    minAvailableRank,
    selectedSlotLevel,
    setSelectedSlotLevel,
    effectiveSelectedSlotLevel,
    filteredRanks,
  }
}
