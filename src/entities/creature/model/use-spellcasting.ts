import { useState, useEffect, useCallback, useMemo } from 'react'
import { detectCasterProgression, getMaxRecommendedRank } from '@engine'
import {
  saveSpellSlotUsage,
  loadSpellSlots,
  loadSpellOverrides,
  upsertSpellOverride,
  deleteSpellOverride,
  saveSlotOverride,
  loadSlotOverrides,
} from '@/shared/api'
import type { SpellOverrideRow } from '@/shared/api'
import type { SpellcastingSection } from '@/entities/spell'
import { useSpellModifiers } from './use-modified-stats'
import { RANK_WARNINGS } from '../lib/spellcasting-helpers'

interface EncounterContext {
  encounterId: string
  combatantId: string
}

export function useSpellcasting(
  section: SpellcastingSection,
  creatureLevel: number,
  encounterContext?: EncounterContext,
) {
  // State
  const [usedSlots, setUsedSlots] = useState<Record<number, number>>({})
  const [overrides, setOverrides] = useState<SpellOverrideRow[]>([])
  const [slotDeltas, setSlotDeltas] = useState<Record<number, number>>({})
  const [spellDialogOpen, setSpellDialogOpen] = useState(false)
  const [spellDialogRank, setSpellDialogRank] = useState(0)
  const [selectedSlotLevel, setSelectedSlotLevel] = useState<number | null>(null)

  const { encounterId, combatantId } = encounterContext ?? {}

  // Condition modifiers for spell attack/DC
  const spellMod = useSpellModifiers(combatantId, section.tradition)
  const modifiedSpellAttack = section.spellAttack + spellMod.netModifier
  const modifiedSpellDc = section.spellDc + spellMod.netModifier
  const spellModColor = spellMod.netModifier < 0
    ? 'text-pf-blood decoration-pf-blood/50'
    : spellMod.netModifier > 0
      ? 'text-pf-threat-low decoration-pf-threat-low/50'
      : ''

  // Caster progression
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

  // Load effects
  const loadSlotState = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSpellSlots(encounterId, combatantId)
    const byRank: Record<number, number> = {}
    for (const r of rows) {
      if (r.entryId === section.entryId) byRank[r.rank] = r.usedCount
    }
    setUsedSlots(byRank)
  }, [encounterId, combatantId, section.entryId])

  const loadOverrideState = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSpellOverrides(encounterId, combatantId)
    setOverrides(rows.filter((r) => r.entryId === section.entryId))
  }, [encounterId, combatantId, section.entryId])

  const loadSlotOverrideState = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSlotOverrides(encounterId, combatantId)
    const byRank: Record<number, number> = {}
    for (const r of rows) {
      if (r.entryId === section.entryId) byRank[r.rank] = r.slotDelta
    }
    setSlotDeltas(byRank)
  }, [encounterId, combatantId, section.entryId])

  useEffect(() => {
    loadSlotState()
    loadOverrideState()
    loadSlotOverrideState()
  }, [loadSlotState, loadOverrideState, loadSlotOverrideState])

  // Handlers
  async function handleTogglePip(rank: number, idx: number, total: number) {
    if (!encounterId || !combatantId) return
    const current = usedSlots[rank] ?? 0
    const newUsed = idx < current ? idx : Math.min(idx + 1, total)
    setUsedSlots((prev) => ({ ...prev, [rank]: newUsed }))
    await saveSpellSlotUsage(encounterId, combatantId, section.entryId, rank, newUsed)
  }

  async function handleSlotDelta(rank: number, change: 1 | -1) {
    if (!encounterId || !combatantId) return
    const currentDelta = slotDeltas[rank] ?? 0
    const newDelta = currentDelta + change
    setSlotDeltas((prev) => ({ ...prev, [rank]: newDelta }))
    await saveSlotOverride(encounterId, combatantId, section.entryId, rank, newDelta)

    if (change === 1 && section.castType === 'prepared') {
      setSpellDialogRank(rank)
      setSpellDialogOpen(true)
    }
  }

  async function handleAddRank(newRank: number) {
    if (!encounterId || !combatantId) return
    setSlotDeltas((prev) => ({ ...prev, [newRank]: 1 }))
    await saveSlotOverride(encounterId, combatantId, section.entryId, newRank, 1)
  }

  async function handleAddSpell(name: string, rank: number) {
    if (!encounterId || !combatantId) return
    const id = `${combatantId}:${section.entryId}:add:${name}:${rank}`
    const override: SpellOverrideRow = {
      id, encounterId, combatantId, entryId: section.entryId,
      spellName: name, rank, isRemoved: false, sortOrder: Date.now(),
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

  // Derived
  const removedSpells = new Set(
    overrides.filter((o) => o.isRemoved).map((o) => `${o.rank}:${o.spellName}`)
  )
  const addedByRank = overrides
    .filter((o) => !o.isRemoved)
    .reduce<Record<number, string[]>>((acc, o) => {
      if (!acc[o.rank]) acc[o.rank] = []
      acc[o.rank].push(o.spellName)
      return acc
    }, {})

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

  const isFocus = section.castType === 'focus'
  const traditionFilter = (section.castType === 'innate' || isFocus) ? undefined : section.tradition

  function rankWarning(rank: number): string | null {
    if (rank <= 0 || rank <= recommendedMaxRank) return null
    return RANK_WARNINGS[rank] ?? RANK_WARNINGS[10]!
  }

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
    // State
    usedSlots,
    overrides,
    slotDeltas,
    spellDialogOpen,
    setSpellDialogOpen,
    spellDialogRank,
    setSpellDialogRank,
    selectedSlotLevel,
    setSelectedSlotLevel,
    // Condition modifiers
    spellMod,
    modifiedSpellAttack,
    modifiedSpellDc,
    spellModColor,
    // Progression
    progression,
    recommendedMaxRank,
    // Handlers
    handleTogglePip,
    handleSlotDelta,
    handleAddRank,
    handleAddSpell,
    handleRemoveSpell,
    // Derived
    removedSpells,
    addedByRank,
    effectiveRanks,
    nextRank,
    isFocus,
    traditionFilter,
    rankWarning,
    minAvailableRank,
    effectiveSelectedSlotLevel,
    filteredRanks,
  }
}
