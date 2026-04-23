import { useCallback, useEffect, useState } from 'react'
import {
  loadPreparedCasts,
  markPreparedSpellCast,
  unmarkPreparedSpellCast,
} from '@/shared/api'
import type { SpellcastingSection } from '@/entities/spell'

interface EncounterContext {
  encounterId: string
  combatantId: string
}

/**
 * Prepared & innate "consumable copy" state: per-slot-instance strike-through
 * flag, persisted in `encounter_prepared_casts`. Slot consumption is
 * delegated to the caller via `onSlotConsumed` — the pooled-slots hook owns
 * `usedSlots` and we surface deltas so the two stay in sync without
 * cross-hook writes.
 */
export function useConsumableCopies(
  section: SpellcastingSection,
  ctx: EncounterContext | undefined,
  onSlotConsumed: (rank: number, delta: 1 | -1, totalSlots: number) => Promise<void>,
) {
  const [preparedCasts, setPreparedCasts] = useState<Set<string>>(new Set())
  const { encounterId, combatantId } = ctx ?? {}

  const load = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadPreparedCasts(encounterId, combatantId)
    const next = new Set<string>()
    for (const r of rows) {
      if (r.entryId === section.entryId) next.add(`${r.rank}:${r.spellSlotKey}`)
    }
    setPreparedCasts(next)
  }, [encounterId, combatantId, section.entryId])

  useEffect(() => {
    load()
  }, [load])

  async function handleCastPreparedSpell(rank: number, spellSlotKey: string, totalSlots: number) {
    if (!encounterId || !combatantId) return
    const key = `${rank}:${spellSlotKey}`
    const wasCast = preparedCasts.has(key)
    if (wasCast) {
      await unmarkPreparedSpellCast(encounterId, combatantId, section.entryId, rank, spellSlotKey)
      setPreparedCasts((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      await onSlotConsumed(rank, -1, totalSlots)
    } else {
      await markPreparedSpellCast(encounterId, combatantId, section.entryId, rank, spellSlotKey)
      setPreparedCasts((prev) => {
        const next = new Set(prev)
        next.add(key)
        return next
      })
      await onSlotConsumed(rank, 1, totalSlots)
    }
  }

  // Innate = same consumable-copy semantics; encounter_prepared_casts is
  // segregated by entry_id so prepared/innate entries never collide.
  const handleCastInnateSpell = handleCastPreparedSpell

  return {
    preparedCasts,
    handleCastPreparedSpell,
    handleCastInnateSpell,
  }
}
