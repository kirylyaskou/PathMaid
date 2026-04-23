import { useState } from 'react'
import type { SpellcastingSection } from '@/entities/spell'
import { useSpellModifiers } from '@/entities/creature'
import { useCasterProgression } from './spellcasting/use-caster-progression'
import { useRankFilter } from './spellcasting/use-rank-filter'
import { useSpellOverrides } from './spellcasting/use-spell-overrides'
import { useSpellLinkMap } from './spellcasting/use-spell-link-map'
import { usePooledSlots } from './spellcasting/use-pooled-slots'
import { useConsumableCopies } from './spellcasting/use-consumable-copies'

interface EncounterContext {
  encounterId: string
  combatantId: string
}

/**
 * Facade composing six focused spellcasting sub-hooks. Each sub-hook owns a
 * single concern (DB-backed table or derived state). Return shape is
 * preserved for backward compatibility with existing consumers.
 */
export function useSpellcasting(
  section: SpellcastingSection,
  creatureLevel: number,
  encounterContext?: EncounterContext,
) {
  const { encounterId, combatantId } = encounterContext ?? {}

  // Condition modifiers
  const spellMod = useSpellModifiers(combatantId, section.tradition)
  const modifiedSpellAttack = section.spellAttack + spellMod.netModifier
  const modifiedSpellDc = section.spellDc + spellMod.netModifier
  const spellModColor = spellMod.netModifier < 0
    ? 'text-pf-blood decoration-pf-blood/50'
    : spellMod.netModifier > 0
      ? 'text-pf-threat-low decoration-pf-threat-low/50'
      : ''

  const progression = useCasterProgression(section, creatureLevel)
  const overrides = useSpellOverrides(section, encounterContext)
  const links = useSpellLinkMap(section, overrides.overrides, encounterId)
  const pooled = usePooledSlots(section, encounterContext)
  const rankFilter = useRankFilter(section, pooled.slotDeltas)
  const copies = useConsumableCopies(
    section,
    encounterContext,
    (rank, delta, total) => pooled.adjustUsedSlots(rank, delta, total),
  )

  // Spell-search dialog local UI state
  const [spellDialogOpen, setSpellDialogOpen] = useState(false)
  const [spellDialogRank, setSpellDialogRank] = useState(0)

  // handleSlotDelta side-effect: auto-open spell search when a prepared caster
  // expands a rank. Wired here so pooled-slots stays UI-agnostic.
  async function handleSlotDelta(rank: number, change: 1 | -1) {
    await pooled.handleSlotDelta(rank, change, (r) => {
      if (section.castType === 'prepared') {
        setSpellDialogRank(r)
        setSpellDialogOpen(true)
      }
    })
  }

  const isFocus = section.castType === 'focus'
  const traditionFilter = (section.castType === 'innate' || isFocus) ? undefined : section.tradition

  return {
    // Pooled slot state
    usedSlots: pooled.usedSlots,
    slotDeltas: pooled.slotDeltas,
    // Overrides
    overrides: overrides.overrides,
    removedSpells: overrides.removedSpells,
    addedByRank: overrides.addedByRank,
    // Dialog state
    spellDialogOpen,
    setSpellDialogOpen,
    spellDialogRank,
    setSpellDialogRank,
    // Rank filter state
    selectedSlotLevel: rankFilter.selectedSlotLevel,
    setSelectedSlotLevel: rankFilter.setSelectedSlotLevel,
    effectiveRanks: rankFilter.effectiveRanks,
    nextRank: rankFilter.nextRank,
    minAvailableRank: rankFilter.minAvailableRank,
    effectiveSelectedSlotLevel: rankFilter.effectiveSelectedSlotLevel,
    filteredRanks: rankFilter.filteredRanks,
    // Condition modifiers
    spellMod,
    modifiedSpellAttack,
    modifiedSpellDc,
    spellModColor,
    // Progression
    progression: progression.progression,
    recommendedMaxRank: progression.recommendedMaxRank,
    rankWarning: progression.rankWarning,
    // Handlers
    handleTogglePip: pooled.handleTogglePip,
    handleSlotDelta,
    handleAddRank: pooled.handleAddRank,
    handleAddSpell: overrides.handleAddSpell,
    handleRemoveSpell: overrides.handleRemoveSpell,
    // Cast handlers
    preparedCasts: copies.preparedCasts,
    handleCastPreparedSpell: copies.handleCastPreparedSpell,
    handleCastInnateSpell: copies.handleCastInnateSpell,
    handleCastSpontaneousSpell: pooled.handleCastSpontaneousSpell,
    // Cast-apply helpers
    sectionWithLinkFlags: links.sectionWithLinkFlags,
    hasLinkedEffectForAdded: links.hasLinkedEffectForAdded,
    getCastEffect: links.getCastEffect,
    ensureSpellRow: links.ensureSpellRow,
    // Derived
    isFocus,
    traditionFilter,
  }
}

export { useSpellModifiers } from '@/entities/creature'
