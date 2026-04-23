import { useCallback, useEffect, useState } from 'react'
import {
  loadSpellOverrides,
  upsertSpellOverride,
  deleteSpellOverride,
} from '@/shared/api'
import type { SpellOverrideRow } from '@/shared/api'
import type { SpellcastingSection, AddedSpellRef } from '@/entities/spell'

interface EncounterContext {
  encounterId: string
  combatantId: string
}

export function useSpellOverrides(section: SpellcastingSection, ctx?: EncounterContext) {
  const [overrides, setOverrides] = useState<SpellOverrideRow[]>([])
  const { encounterId, combatantId } = ctx ?? {}

  const load = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSpellOverrides(encounterId, combatantId)
    setOverrides(rows.filter((r) => r.entryId === section.entryId))
  }, [encounterId, combatantId, section.entryId])

  useEffect(() => {
    load()
  }, [load])

  async function handleAddSpell(
    name: string,
    rank: number,
    heightenedFromRank?: number,
  ) {
    if (!encounterId || !combatantId) return
    const id = `${combatantId}:${section.entryId}:add:${name}:${rank}`
    const override: SpellOverrideRow = {
      id, encounterId, combatantId, entryId: section.entryId,
      spellName: name, rank, isRemoved: false, sortOrder: Date.now(),
      heightenedFromRank,
    }
    await upsertSpellOverride(override)
    setOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
  }

  async function handleRemoveSpell(spellName: string, rank: number, isDefault: boolean) {
    if (!encounterId || !combatantId) return
    if (isDefault) {
      const id = `${combatantId}:${section.entryId}:rm:${spellName}:${rank}`
      const override: SpellOverrideRow = {
        id, encounterId, combatantId, entryId: section.entryId,
        spellName, rank, isRemoved: true, sortOrder: 0,
      }
      await upsertSpellOverride(override)
      setOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
    } else {
      const id = `${combatantId}:${section.entryId}:add:${spellName}:${rank}`
      await deleteSpellOverride(id)
      setOverrides((prev) => prev.filter((o) => o.id !== id))
    }
  }

  const removedSpells = new Set(
    overrides.filter((o) => o.isRemoved).map((o) => `${o.rank}:${o.spellName}`)
  )
  const addedByRank = overrides
    .filter((o) => !o.isRemoved)
    .reduce<Record<number, AddedSpellRef[]>>((acc, o) => {
      if (!acc[o.rank]) acc[o.rank] = []
      acc[o.rank].push({ name: o.spellName, heightenedFromRank: o.heightenedFromRank })
      return acc
    }, {})

  return {
    overrides,
    removedSpells,
    addedByRank,
    handleAddSpell,
    handleRemoveSpell,
  }
}
