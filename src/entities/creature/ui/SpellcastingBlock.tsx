import { useRoll } from '@/shared/hooks'
import { formatModifier, formatRollFormula } from '@/shared/lib/format'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import { cn } from '@/shared/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { ChevronDown, Plus, Minus, X, HelpCircle } from 'lucide-react'
import { IconButton } from '@/shared/ui/icon-button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import type { SpellcastingSection } from '@/entities/spell'
import { traditionColor } from '../lib/spellcasting-helpers'
import { rankLabel } from '@/shared/lib/pf2e-display'
import { useSpellcasting } from '../model/use-spellcasting'
import { SlotPips } from './SlotPips'
import { SpellCard } from './SpellCard'
import { SpellSearchDialog } from './SpellSearchDialog'

interface EncounterContext {
  encounterId: string
  combatantId: string
  onInventoryChanged?: () => void
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
    removedSpells, addedByRank, effectiveRanks, nextRank, isFocus, traditionFilter,
    rankWarning, minAvailableRank, effectiveSelectedSlotLevel, filteredRanks,
  } = useSpellcasting(section, creatureLevel, encounterContext)
  const { encounterId } = encounterContext ?? {}
  const dcCol = spellMod.netModifier < 0 ? 'text-pf-blood' : spellMod.netModifier > 0 ? 'text-pf-threat-low' : 'text-primary'

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
          {/* FEAT-13: slot-level filter pills — tap a rank to focus, All to show everything */}
          {effectiveRanks.length > 1 && (
            <div className="flex flex-wrap gap-1 pb-1">
              <button
                type="button"
                onClick={() => setSelectedSlotLevel(null)}
                className={cn(
                  'px-1.5 py-0.5 text-[10px] rounded uppercase tracking-wider transition-colors border',
                  selectedSlotLevel === null && minAvailableRank === null
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : selectedSlotLevel === null
                      ? 'bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50'
                      : 'bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50',
                )}
              >
                All
              </button>
              {effectiveRanks.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedSlotLevel(r)}
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] rounded uppercase tracking-wider transition-colors border',
                    effectiveSelectedSlotLevel === r && selectedSlotLevel !== null
                      ? 'bg-primary/20 text-primary border-primary/30 font-semibold'
                      : effectiveSelectedSlotLevel === r
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50',
                  )}
                >
                  {rankLabel(r)}
                </button>
              ))}
            </div>
          )}
          {/* Spells by rank (filtered) */}
          {filteredRanks.map((rank) => {
            const byRank = section.spellsByRank.find((br) => br.rank === rank)
            const baseSlots = byRank?.slots ?? 0
            const delta = slotDeltas[rank] ?? 0
            const totalSlots = Math.max(0, baseSlots + delta)
            const used = usedSlots[rank] ?? 0
            const visibleSpells = byRank
              ? byRank.spells.filter((s) => !removedSpells.has(`${rank}:${s.name}`))
              : []
            const added = addedByRank[rank] ?? []
            const warn = encounterId ? rankWarning(rank) : null
            return (
              <div key={rank}>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {warn ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider cursor-help">
                          {rankLabel(rank)} ⚠
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-amber-300 bg-amber-950 border-amber-500/40">
                        {warn}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {rankLabel(rank)}
                    </span>
                  )}
                  {rank === 0 ? null
                    : encounterId && totalSlots > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <IconButton
                          intent="danger"
                          onClick={() => handleSlotDelta(rank, -1)}
                          disabled={totalSlots <= 0}
                          title="Remove slot"
                        >
                          <Minus className="w-3 h-3" />
                        </IconButton>
                        <SlotPips
                          total={totalSlots}
                          used={used}
                          baseSlots={baseSlots}
                          tradition={section.tradition}
                          onToggle={(idx) => handleTogglePip(rank, idx, totalSlots)}
                        />
                        <IconButton
                          intent="primary"
                          onClick={() => handleSlotDelta(rank, 1)}
                          title="Add slot"
                        >
                          <Plus className="w-3 h-3" />
                        </IconButton>
                      </div>
                    ) : encounterId && totalSlots === 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">(0 slots)</span>
                        <IconButton
                          intent="primary"
                          onClick={() => handleSlotDelta(rank, 1)}
                          title="Add slot"
                        >
                          <Plus className="w-3 h-3" />
                        </IconButton>
                      </div>
                    ) : !encounterId && baseSlots > 0 ? (
                      <span className="text-xs text-muted-foreground">({baseSlots} slots)</span>
                    ) : null}
                </div>
                <div className="space-y-1">
                  {visibleSpells.map((spell, i) => (
                    <div key={i} className="flex items-center gap-1 group">
                      <div className="flex-1">
                        <SpellCard name={spell.name} foundryId={spell.foundryId} source={creatureName} combatId={encounterContext?.encounterId} castRank={rank} />
                      </div>
                      {encounterId && (
                        <IconButton
                          intent="danger"
                          showOnHover
                          onClick={() => handleRemoveSpell(spell.name, rank, true)}
                          title="Remove for this encounter"
                        >
                          <X className="w-3 h-3" />
                        </IconButton>
                      )}
                    </div>
                  ))}
                  {added.map((name, i) => (
                    <div key={`added-${i}`} className="flex items-center gap-1 group">
                      <div className="flex-1">
                        <SpellCard name={name} foundryId={null} source={creatureName} combatId={encounterContext?.encounterId} castRank={rank} />
                      </div>
                      {encounterId && (
                        <IconButton
                          intent="danger"
                          showOnHover
                          onClick={() => handleRemoveSpell(name, rank, false)}
                          title="Remove added spell"
                        >
                          <X className="w-3 h-3" />
                        </IconButton>
                      )}
                    </div>
                  ))}
                  {encounterId && (
                    <button
                      onClick={() => { setSpellDialogRank(rank); setSpellDialogOpen(true) }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add spell…</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {/* Add new rank button */}
          {encounterId && nextRank <= 10 && (
            <button
              onClick={() => handleAddRank(nextRank)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add rank {nextRank}</span>
            </button>
          )}
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
          onAdd={(name, rank) => handleAddSpell(name, rank)}
        />
      )}
    </Collapsible>
  )
}
