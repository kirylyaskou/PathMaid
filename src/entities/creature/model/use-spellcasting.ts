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
  loadPreparedCasts,
  markPreparedSpellCast,
  unmarkPreparedSpellCast,
  getSpellByName,
} from '@/shared/api'
import { getSpellEffectsForSpells } from '@/shared/api/effects'
import type { SpellOverrideRow, SpellRow } from '@/shared/api'
import type { SpellEffectRow } from '@/entities/spell-effect'
import type { SpellcastingSection, AddedSpellRef } from '@/entities/spell'
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
  // set of `${rank}:${spell_slot_key}` for this entry — prepared spells marked cast
  const [preparedCasts, setPreparedCasts] = useState<Set<string>>(new Set())
  // precomputed effect-link lookup keyed by lowercase name.
  // Populated once at section-load time so the Cast flame can render without
  // per-row async lookups. `null` values mean "checked, no link found".
  const [effectByName, setEffectByName] = useState<Map<string, SpellEffectRow>>(new Map())
  // Cache of resolved SpellRow (for getMaxTargets). Keyed by name lowercase.
  const [spellByName, setSpellByName] = useState<Map<string, SpellRow>>(new Map())

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

  const loadPreparedCastsState = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadPreparedCasts(encounterId, combatantId)
    const next = new Set<string>()
    for (const r of rows) {
      if (r.entryId === section.entryId) next.add(`${r.rank}:${r.spellSlotKey}`)
    }
    setPreparedCasts(next)
  }, [encounterId, combatantId, section.entryId])

  useEffect(() => {
    loadSlotState()
    loadOverrideState()
    loadSlotOverrideState()
    loadPreparedCastsState()
  }, [loadSlotState, loadOverrideState, loadSlotOverrideState, loadPreparedCastsState])

  // batch-resolve spell_effects links for every spell in this
  // entry. Runs whenever the entry's spell list changes (including overrides).
  // Result feeds the Flame-button gate + the TargetPickerDialog's effect prop.
  useEffect(() => {
    if (!encounterId) return
    const refs: Array<{ foundryId: string | null; name: string }> = []
    for (const byRank of section.spellsByRank) {
      for (const s of byRank.spells) {
        refs.push({ foundryId: s.foundryId, name: s.name })
      }
    }
    // Include added-by-rank overrides too (no foundryId for added spells).
    for (const o of overrides) {
      if (!o.isRemoved) refs.push({ foundryId: null, name: o.spellName })
    }
    if (refs.length === 0) {
      setEffectByName(new Map())
      return
    }
    let cancelled = false
    getSpellEffectsForSpells(refs).then((map) => {
      if (!cancelled) setEffectByName(map)
    })
    return () => {
      cancelled = true
    }
  }, [encounterId, section.spellsByRank, overrides])

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

  // toggle cast mark on a specific prepared spell instance and bump
  // used_count for the rank so slot pip dims. Unmarking reverses both.
  async function handleCastPreparedSpell(rank: number, spellSlotKey: string, totalSlots: number) {
    if (!encounterId || !combatantId) return
    const key = `${rank}:${spellSlotKey}`
    const wasCast = preparedCasts.has(key)
    const currentUsed = usedSlots[rank] ?? 0
    if (wasCast) {
      await unmarkPreparedSpellCast(encounterId, combatantId, section.entryId, rank, spellSlotKey)
      const nextUsed = Math.max(0, currentUsed - 1)
      await saveSpellSlotUsage(encounterId, combatantId, section.entryId, rank, nextUsed)
      setPreparedCasts((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      setUsedSlots((prev) => ({ ...prev, [rank]: nextUsed }))
    } else {
      await markPreparedSpellCast(encounterId, combatantId, section.entryId, rank, spellSlotKey)
      const nextUsed = Math.min(totalSlots, currentUsed + 1)
      await saveSpellSlotUsage(encounterId, combatantId, section.entryId, rank, nextUsed)
      setPreparedCasts((prev) => {
        const next = new Set(prev)
        next.add(key)
        return next
      })
      setUsedSlots((prev) => ({ ...prev, [rank]: nextUsed }))
    }
  }

  // innate cast = same consumable-copy semantics as prepared. PF2e RAW treats
  // innate spells as N copies (where N = frequency.max); strike-through per
  // cast. encounter_prepared_casts keys by entry_id, so prepared/innate
  // entries never conflict even when the caster has both.
  const handleCastInnateSpell = handleCastPreparedSpell

  // spontaneous cast = bump used_count by one (no strike-through).
  async function handleCastSpontaneousSpell(rank: number, totalSlots: number) {
    if (!encounterId || !combatantId) return
    const currentUsed = usedSlots[rank] ?? 0
    if (currentUsed >= totalSlots) return
    const nextUsed = currentUsed + 1
    setUsedSlots((prev) => ({ ...prev, [rank]: nextUsed }))
    await saveSpellSlotUsage(encounterId, combatantId, section.entryId, rank, nextUsed)
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
    .reduce<Record<number, AddedSpellRef[]>>((acc, o) => {
      if (!acc[o.rank]) acc[o.rank] = []
      acc[o.rank].push({
        name: o.spellName,
        heightenedFromRank: o.heightenedFromRank,
      })
      return acc
    }, {})

  // patched section where every listed spell carries a
  // concrete `hasLinkedEffect` flag based on the precomputed effectByName map.
  // Runs cheaply — one shallow copy per render when effects map updates.
  const sectionWithLinkFlags = useMemo<SpellcastingSection>(() => {
    if (!encounterId || effectByName.size === 0 && section.spellsByRank.every((r) => r.spells.every((s) => s.hasLinkedEffect === undefined))) {
      // No encounter context OR no effects loaded yet — mark everything as
      // unknown (`undefined`) so Flame renders only if the caller explicitly
      // wires cast callbacks. The editor treats `undefined` as "show".
      return section
    }
    return {
      ...section,
      spellsByRank: section.spellsByRank.map((byRank) => ({
        ...byRank,
        spells: byRank.spells.map((s) => ({
          ...s,
          hasLinkedEffect: effectByName.has(s.name.trim().toLowerCase()),
        })),
      })),
    }
  }, [section, effectByName, encounterId])

  const hasLinkedEffectForAdded = useCallback(
    (name: string): boolean => effectByName.has(name.trim().toLowerCase()),
    [effectByName],
  )

  // load the spell row lazily on demand so
  // getMaxTargets can read action_cost + description. Memoised per name.
  const ensureSpellRow = useCallback(
    async (name: string): Promise<SpellRow | null> => {
      const key = name.trim().toLowerCase()
      const cached = spellByName.get(key)
      if (cached) return cached
      const row = await getSpellByName(name)
      if (row) {
        setSpellByName((prev) => {
          const next = new Map(prev)
          next.set(key, row)
          return next
        })
      }
      return row
    },
    [spellByName],
  )

  const getCastEffect = useCallback(
    (name: string): SpellEffectRow | null => {
      return effectByName.get(name.trim().toLowerCase()) ?? null
    },
    [effectByName],
  )

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
    preparedCasts,
    handleCastPreparedSpell,
    handleCastInnateSpell,
    handleCastSpontaneousSpell,
    // cast-apply helpers
    sectionWithLinkFlags,
    hasLinkedEffectForAdded,
    getCastEffect,
    ensureSpellRow,
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
