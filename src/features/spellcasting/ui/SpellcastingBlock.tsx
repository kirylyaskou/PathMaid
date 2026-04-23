import { useState } from 'react'
import { toast } from 'sonner'
import { useRoll } from '@/shared/hooks'
import { formatModifier, formatRollFormula } from '@/shared/lib/format'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import { cn } from '@/shared/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { ChevronDown, HelpCircle, Pencil, Check } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import type { SpellcastingSection } from '@/entities/spell'
import { traditionColor } from '@/entities/creature'
import { useSpellcasting } from '../model/use-spellcasting'
import { SpellSearchDialog } from './SpellSearchDialog'
import { SpellcastingEditor } from '@/features/spellcasting-editor'
import {
  TargetPickerDialog,
  getMaxTargets,
  type TargetPickerEffect,
} from '@/features/cast-apply'
import { applyEffectToCombatant, applyGrantedEffects } from '@/shared/api/effects'
import { useEffectStore, durationToRounds } from '@/entities/spell-effect'

interface EncounterContext {
  encounterId: string
  combatantId: string
  onInventoryChanged?: () => void
}

// ephemeral Cast request in flight (picker is open).
interface PendingCast {
  castType: 'prepared' | 'spontaneous' | 'innate'
  spellName: string
  rank: number
  slotKey: string | null  // null for spontaneous
  totalSlots: number
  effect: TargetPickerEffect
  effectRulesJson: string
  effectDurationJson: string
  effectDescription: string | null
  // cast rank — feeds encounter_combatant_effects.cast_at_rank and
  // ActiveEffect.level so engine @item.level math reflects the slot the
  // spell was cast from (heightened = cast rank, base = listed rank).
  castAtRank: number
  maxTargets: number
}

export function SpellcastingBlock({ section, creatureLevel, encounterContext, creatureName }: {
  section: SpellcastingSection
  creatureLevel: number
  encounterContext?: EncounterContext
  creatureName?: string
}) {
  const handleSpellRoll = useRoll(creatureName, encounterContext?.encounterId)
  const {
    usedSlots, slotDeltas,
    spellDialogOpen, setSpellDialogOpen, spellDialogRank, setSpellDialogRank,
    selectedSlotLevel, setSelectedSlotLevel,
    spellMod, modifiedSpellAttack, modifiedSpellDc, spellModColor,
    progression, recommendedMaxRank,
    handleTogglePip, handleSlotDelta, handleAddRank, handleAddSpell, handleRemoveSpell,
    removedSpells, addedByRank, isFocus, traditionFilter,
    rankWarning, minAvailableRank, filteredRanks,
    preparedCasts, handleCastPreparedSpell, handleCastInnateSpell, handleCastSpontaneousSpell,
    sectionWithLinkFlags, hasLinkedEffectForAdded, getCastEffect, ensureSpellRow,
  } = useSpellcasting(section, creatureLevel, encounterContext)
  const { encounterId, combatantId } = encounterContext ?? {}

  // mode toggle — view default, edit unlocks +/-, add/remove spell, pip click.
  // Mode is per-component; not persisted. Only relevant when combat-backed.
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const isEdit = mode === 'edit' && !!encounterId
  const editorMode: 'view' | 'edit' = isEdit ? 'edit' : 'view'

  // target picker wiring.
  const [pendingCast, setPendingCast] = useState<PendingCast | null>(null)

  const dcCol = spellMod.netModifier < 0 ? 'text-pf-blood' : spellMod.netModifier > 0 ? 'text-pf-threat-low' : 'text-primary'

  // helper — opens the picker for a cast request, or no-ops
  // if no linked effect is known for the spell.
  async function openPicker(
    castType: 'prepared' | 'spontaneous' | 'innate',
    spellName: string,
    rank: number,
    slotKey: string | null,
    totalSlots: number,
  ) {
    const effectRow = getCastEffect(spellName)
    if (!effectRow) {
      // Defensive — editor should already have hidden the Flame. Fall back to
      // plain mark-cast so users don't get a silent dead button.
      if (castType === 'prepared' && slotKey !== null) {
        await handleCastPreparedSpell(rank, slotKey, totalSlots)
      } else if (castType === 'innate' && slotKey !== null) {
        await handleCastInnateSpell(rank, slotKey, totalSlots)
      } else if (castType === 'spontaneous') {
        await handleCastSpontaneousSpell(rank, totalSlots)
      }
      return
    }
    const spellRow = await ensureSpellRow(spellName)
    const maxTargets = spellRow
      ? getMaxTargets({ action_cost: spellRow.action_cost, description: spellRow.description })
      : 1

    setPendingCast({
      castType,
      spellName,
      rank,
      slotKey,
      totalSlots,
      effect: {
        id: effectRow.id,
        name: effectRow.name,
        rulesJson: effectRow.rules_json,
      },
      effectRulesJson: effectRow.rules_json,
      effectDurationJson: effectRow.duration_json,
      effectDescription: effectRow.description,
      castAtRank: rank,
      maxTargets,
    })
  }

  const handleEditorCastPrepared = encounterId
    ? (spellName: string, _foundryId: string | null, rank: number, slotKey: string, total: number) => {
        void openPicker('prepared', spellName, rank, slotKey, total)
      }
    : undefined

  const handleEditorCastInnate = encounterId
    ? (spellName: string, _foundryId: string | null, rank: number, slotKey: string, total: number) => {
        void openPicker('innate', spellName, rank, slotKey, total)
      }
    : undefined

  const handleEditorCastSpontaneous = encounterId
    ? (spellName: string, _foundryId: string | null, rank: number, total: number) => {
        void openPicker('spontaneous', spellName, rank, null, total)
      }
    : undefined

  // commit — for each selected target, apply effect + any
  // same-pack granted children, then consume the caster's slot once.
  async function handlePickerApply(targetIds: string[]) {
    if (!encounterId || !pendingCast) return
    const { effect, effectRulesJson, effectDurationJson, effectDescription, castAtRank } = pendingCast
    const remainingTurns = durationToRounds(effectDurationJson)

    try {
      for (const targetId of targetIds) {
        const newId = await applyEffectToCombatant(
          encounterId,
          targetId,
          effect.id,
          remainingTurns,
          null,
          castAtRank,
        )
        useEffectStore.getState().addEffect({
          id: newId,
          combatantId: targetId,
          effectId: effect.id,
          effectName: effect.name,
          remainingTurns,
          rulesJson: effectRulesJson,
          durationJson: effectDurationJson,
          description: effectDescription,
          level: castAtRank,
          castAtRank,
        })

        // same-pack GrantItem children cascade to the same combatant; they
        // inherit castAtRank so engine @item.level is consistent across
        // the parent/child chain (Spiritual Weapon → strike effect).
        const granted = await applyGrantedEffects(
          encounterId,
          targetId,
          newId,
          effectRulesJson,
          remainingTurns,
          castAtRank,
        )
        for (const g of granted) {
          useEffectStore.getState().addEffect({
            id: g.id,
            combatantId: targetId,
            effectId: g.effectId,
            effectName: g.name,
            remainingTurns: g.remainingTurns,
            rulesJson: g.rulesJson,
            durationJson: g.durationJson,
            description: g.description,
            level: g.level,
            castAtRank: g.castAtRank,
          })
        }
      }

      // Slot consumption — one slot per Cast regardless of target count.
      if (pendingCast.castType === 'prepared' && pendingCast.slotKey !== null) {
        await handleCastPreparedSpell(pendingCast.rank, pendingCast.slotKey, pendingCast.totalSlots)
      } else if (pendingCast.castType === 'innate' && pendingCast.slotKey !== null) {
        await handleCastInnateSpell(pendingCast.rank, pendingCast.slotKey, pendingCast.totalSlots)
      } else if (pendingCast.castType === 'spontaneous') {
        await handleCastSpontaneousSpell(pendingCast.rank, pendingCast.totalSlots)
      }

      const n = targetIds.length
      toast.success(`Applied ${effect.name} to ${n} target${n === 1 ? '' : 's'}`)
    } catch {
      toast.error(`Failed to apply ${effect.name}`)
    } finally {
      setPendingCast(null)
    }
  }

  return (
    <Collapsible defaultOpen>
      <div className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40">
        <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-semibold text-sm text-foreground">Spellcasting</span>
          <span className={cn("px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold", traditionColor(section.tradition))}>
            {section.tradition} {section.castType}
          </span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <div className="flex items-center gap-1">
          {encounterId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setMode((m) => (m === 'view' ? 'edit' : 'view'))}
                  className={cn(
                    'p-1 rounded transition-colors',
                    isEdit
                      ? 'text-primary bg-primary/10 hover:bg-primary/20'
                      : 'text-muted-foreground hover:text-primary hover:bg-accent/30'
                  )}
                  aria-label={isEdit ? 'Exit edit mode' : 'Edit spellcasting'}
                >
                  {isEdit ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {isEdit ? 'Done — exit edit mode' : 'Edit slots and spell list'}
              </TooltipContent>
            </Tooltip>
          )}
          {encounterId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-0.5" type="button">
                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {progression === 'unknown'
                  ? `Custom progression — max rank ${recommendedMaxRank} at level ${creatureLevel}`
                  : `${progression === 'full' ? 'Full' : 'Bounded'} caster (${section.tradition} ${section.castType}) — max rank ${recommendedMaxRank} at level ${creatureLevel}`
                }
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-4 pb-3 pt-2 space-y-3">
          {/* DC + Attack */}
          <div className="flex gap-4 text-sm">
            {section.spellDc > 0 && (
              <span className="text-muted-foreground">DC{' '}
                <ModifierTooltip modifiers={spellMod.modifiers} netModifier={spellMod.netModifier} finalDisplay={String(modifiedSpellDc)}>
                  <span className={cn('font-mono font-bold', dcCol)}>{modifiedSpellDc}</span>
                </ModifierTooltip>
              </span>
            )}
            {section.spellAttack !== 0 && (
              <span className="text-muted-foreground">Attack{' '}
                <ModifierTooltip modifiers={spellMod.modifiers} netModifier={spellMod.netModifier} finalDisplay={formatModifier(modifiedSpellAttack)}>
                  <button
                    onClick={() => handleSpellRoll(formatRollFormula(modifiedSpellAttack), `${section.tradition} spell attack`)}
                    title={`Roll spell attack ${formatRollFormula(modifiedSpellAttack)}`}
                    className={cn(
                      'font-mono font-bold cursor-pointer underline decoration-dotted underline-offset-2 hover:text-pf-gold transition-colors duration-100',
                      spellModColor || 'text-primary decoration-primary/50',
                    )}
                  >
                    {formatModifier(modifiedSpellAttack)}
                  </button>
                </ModifierTooltip>
              </span>
            )}
          </div>
          {/* Shared editor body — rank pills + per-rank slot pips + spell cards. */}
          <SpellcastingEditor
            entry={sectionWithLinkFlags}
            creatureLevel={creatureLevel}
            mode={editorMode}
            usedSlots={usedSlots}
            slotDeltas={slotDeltas}
            preparedCasts={preparedCasts}
            removedSpells={removedSpells}
            addedByRank={addedByRank}
            onTogglePip={encounterId ? handleTogglePip : undefined}
            onSlotDelta={encounterId ? handleSlotDelta : undefined}
            onAddRank={encounterId ? handleAddRank : undefined}
            onRemoveSpell={encounterId ? handleRemoveSpell : undefined}
            onCastPrepared={handleEditorCastPrepared}
            onCastInnate={handleEditorCastInnate}
            onCastSpontaneous={handleEditorCastSpontaneous}
            hasLinkedEffectForAdded={encounterId ? hasLinkedEffectForAdded : undefined}
            onOpenSpellSearch={encounterId ? (rank) => { setSpellDialogRank(rank); setSpellDialogOpen(true) } : undefined}
            selectedSlotLevel={selectedSlotLevel}
            onSelectSlotLevel={setSelectedSlotLevel}
            minAvailableRank={minAvailableRank}
            filteredRanks={filteredRanks}
            rankWarning={encounterId ? rankWarning : undefined}
            sourceName={creatureName}
            combatId={encounterContext?.encounterId}
          />
        </div>
      </CollapsibleContent>

      {/* Spell search dialog */}
      {encounterId && (
        <SpellSearchDialog
          open={spellDialogOpen}
          onOpenChange={setSpellDialogOpen}
          defaultRank={spellDialogRank}
          defaultTradition={traditionFilter}
          focusOnly={isFocus}
          onAdd={(name, rank, _foundryId, heightenedFromRank) => handleAddSpell(name, rank, heightenedFromRank)}
        />
      )}

      {/* target picker dialog */}
      {pendingCast && combatantId && (
        <TargetPickerDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setPendingCast(null)
          }}
          spellName={pendingCast.spellName}
          effect={pendingCast.effect}
          casterId={combatantId}
          maxTargets={pendingCast.maxTargets}
          onApply={handlePickerApply}
        />
      )}
    </Collapsible>
  )
}
