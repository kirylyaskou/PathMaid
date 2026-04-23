import { useCallback, useEffect, useState } from 'react'
import {
  saveSpellSlotUsage,
  loadSpellSlots,
  saveSlotOverride,
  loadSlotOverrides,
} from '@/shared/api'
import type { SpellcastingSection } from '@/entities/spell'

interface EncounterContext {
  encounterId: string
  combatantId: string
}

export function usePooledSlots(section: SpellcastingSection, ctx?: EncounterContext) {
  const [usedSlots, setUsedSlots] = useState<Record<number, number>>({})
  const [slotDeltas, setSlotDeltas] = useState<Record<number, number>>({})
  const { encounterId, combatantId } = ctx ?? {}

  const loadUsed = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSpellSlots(encounterId, combatantId)
    const byRank: Record<number, number> = {}
    for (const r of rows) {
      if (r.entryId === section.entryId) byRank[r.rank] = r.usedCount
    }
    setUsedSlots(byRank)
  }, [encounterId, combatantId, section.entryId])

  const loadDeltas = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSlotOverrides(encounterId, combatantId)
    const byRank: Record<number, number> = {}
    for (const r of rows) {
      if (r.entryId === section.entryId) byRank[r.rank] = r.slotDelta
    }
    setSlotDeltas(byRank)
  }, [encounterId, combatantId, section.entryId])

  useEffect(() => {
    loadUsed()
    loadDeltas()
  }, [loadUsed, loadDeltas])

  async function handleTogglePip(rank: number, idx: number, total: number) {
    if (!encounterId || !combatantId) return
    const current = usedSlots[rank] ?? 0
    const newUsed = idx < current ? idx : Math.min(idx + 1, total)
    setUsedSlots((prev) => ({ ...prev, [rank]: newUsed }))
    await saveSpellSlotUsage(encounterId, combatantId, section.entryId, rank, newUsed)
  }

  async function handleSlotDelta(
    rank: number,
    change: 1 | -1,
    onIncremented?: (rank: number) => void,
  ) {
    if (!encounterId || !combatantId) return
    const currentDelta = slotDeltas[rank] ?? 0
    const newDelta = currentDelta + change
    setSlotDeltas((prev) => ({ ...prev, [rank]: newDelta }))
    await saveSlotOverride(encounterId, combatantId, section.entryId, rank, newDelta)

    if (change === 1) onIncremented?.(rank)
  }

  async function handleAddRank(newRank: number) {
    if (!encounterId || !combatantId) return
    setSlotDeltas((prev) => ({ ...prev, [newRank]: 1 }))
    await saveSlotOverride(encounterId, combatantId, section.entryId, newRank, 1)
  }

  async function handleCastSpontaneousSpell(rank: number, totalSlots: number) {
    if (!encounterId || !combatantId) return
    const currentUsed = usedSlots[rank] ?? 0
    if (currentUsed >= totalSlots) return
    const nextUsed = currentUsed + 1
    setUsedSlots((prev) => ({ ...prev, [rank]: nextUsed }))
    await saveSpellSlotUsage(encounterId, combatantId, section.entryId, rank, nextUsed)
  }

  /**
   * Adjust usedSlots for a rank by a delta (positive = consume more; negative
   * = release). Used by consumable-copies to keep pool pips in sync with
   * strike-through state when a prepared/innate cast toggles. Write-through
   * to DB preserves durability across reloads.
   */
  async function adjustUsedSlots(rank: number, delta: number, totalSlots: number) {
    if (!encounterId || !combatantId) return
    const current = usedSlots[rank] ?? 0
    const next = Math.max(0, Math.min(totalSlots, current + delta))
    if (next === current) return
    setUsedSlots((prev) => ({ ...prev, [rank]: next }))
    await saveSpellSlotUsage(encounterId, combatantId, section.entryId, rank, next)
  }

  return {
    usedSlots,
    slotDeltas,
    handleTogglePip,
    handleSlotDelta,
    handleAddRank,
    handleCastSpontaneousSpell,
    adjustUsedSlots,
  }
}
