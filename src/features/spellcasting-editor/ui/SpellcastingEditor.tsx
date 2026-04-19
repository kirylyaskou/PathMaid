import { useMemo } from 'react'
import { Plus, Minus, X, Flame } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { IconButton } from '@/shared/ui/icon-button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import { rankLabel } from '@/shared/lib/pf2e-display'
import { SlotPips, SpellCard } from '@/entities/creature'
import type { SpellcastingEditorProps } from '../model/types'

/**
 * Pure presentation component for a single SpellcastingSection.
 *
 * Rendering scope (per 67-UI-SPEC.md):
 *   - optional rank-filter pills
 *   - per-rank blocks (rank label + slot pips +/- + spell cards + add-spell)
 *   - optional "add rank" footer
 *
 * **Excluded** (stays with caller):
 *   - entry header (tradition pill / DC+Attack / mode toggle)
 *   - SpellSearchDialog — caller owns open state; trigger via `onOpenSpellSearch`
 *
 * Zero persistence surface: no DB calls, no Zustand imports, no store writes —
 * all state & actions arrive via props/callbacks (D-67-05).
 */
export function SpellcastingEditor(props: SpellcastingEditorProps) {
  const {
    entry,
    mode,
    usedSlots,
    slotDeltas,
    preparedCasts,
    removedSpells,
    addedByRank,
    onTogglePip,
    onSlotDelta,
    onAddRank,
    onRemoveSpell,
    onCastPrepared,
    onCastSpontaneous,
    onOpenSpellSearch,
    filteredRanks: filteredRanksProp,
    onSelectSlotLevel,
    selectedSlotLevel = null,
    minAvailableRank: minAvailableRankProp = null,
    rankWarning,
    sourceName,
    combatId,
  } = props

  const isEdit = mode === 'edit'
  const isPrepared = entry.castType === 'prepared'
  const isSpontaneous = entry.castType === 'spontaneous'

  // Derived: full set of ranks present either in the section or via positive slot delta.
  const effectiveRanks = useMemo(() => {
    const baseRanks = entry.spellsByRank.map((br) => br.rank)
    const customRanks = Object.entries(slotDeltas)
      .filter(([r, d]) => !baseRanks.includes(Number(r)) && d > 0)
      .map(([r]) => Number(r))
    return [...baseRanks, ...customRanks].sort((a, b) => a - b)
  }, [entry.spellsByRank, slotDeltas])

  const nextRank = useMemo(() => {
    if (effectiveRanks.length === 0) return 1
    const max = Math.max(...effectiveRanks.filter((r) => r > 0), 0)
    return max + 1
  }, [effectiveRanks])

  const minAvailableRank = minAvailableRankProp ?? (effectiveRanks.length > 0 ? Math.min(...effectiveRanks) : null)
  const effectiveSelectedSlotLevel = selectedSlotLevel ?? minAvailableRank
  const filteredRanks = filteredRanksProp ?? (
    effectiveSelectedSlotLevel === null
      ? effectiveRanks
      : effectiveRanks.filter((r) => r === effectiveSelectedSlotLevel)
  )

  return (
    <div className="space-y-3">
      {/* Rank filter pills */}
      {effectiveRanks.length > 1 && onSelectSlotLevel && (
        <div className="flex flex-wrap gap-1 pb-1" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={selectedSlotLevel === null && minAvailableRank === null}
            onClick={() => onSelectSlotLevel(null)}
            className={cn(
              'px-1.5 py-0.5 text-[10px] rounded uppercase tracking-wider transition-colors border',
              selectedSlotLevel === null && minAvailableRank === null
                ? 'bg-primary/20 text-primary border-primary/30'
                : 'bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50',
            )}
          >
            All
          </button>
          {effectiveRanks.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={effectiveSelectedSlotLevel === r && selectedSlotLevel !== null}
              onClick={() => onSelectSlotLevel(r)}
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

      {/* Per-rank blocks */}
      {filteredRanks.map((rank) => {
        const byRank = entry.spellsByRank.find((br) => br.rank === rank)
        const baseSlots = byRank?.slots ?? 0
        const delta = slotDeltas[rank] ?? 0
        const totalSlots = Math.max(0, baseSlots + delta)
        const used = usedSlots[rank] ?? 0
        const visibleSpells = byRank
          ? byRank.spells.filter((s) => !removedSpells.has(`${rank}:${s.name}`))
          : []
        const added = addedByRank[rank] ?? []
        const warn = rankWarning ? rankWarning(rank) : null

        // Per-rank occurrence counter so duplicate prepared spells get unique slot keys.
        const occurrenceCount = new Map<string, number>()
        const takeSlotKey = (spellName: string) => {
          const seen = occurrenceCount.get(spellName) ?? 0
          occurrenceCount.set(spellName, seen + 1)
          return `${spellName}#${seen}`
        }

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
              {rank === 0 ? null : totalSlots > 0 ? (
                <div className="flex items-center gap-1.5">
                  {isEdit && onSlotDelta && (
                    <IconButton
                      intent="danger"
                      onClick={() => onSlotDelta(rank, -1)}
                      disabled={totalSlots <= 0}
                      title="Remove slot"
                    >
                      <Minus className="w-3 h-3" />
                    </IconButton>
                  )}
                  <div className={cn(!isEdit && 'pointer-events-none select-none')}>
                    <SlotPips
                      total={totalSlots}
                      used={used}
                      baseSlots={baseSlots}
                      tradition={entry.tradition}
                      onToggle={(idx) => onTogglePip?.(rank, idx, totalSlots)}
                    />
                  </div>
                  {isEdit && onSlotDelta && (
                    <IconButton
                      intent="primary"
                      onClick={() => onSlotDelta(rank, 1)}
                      title="Add slot"
                    >
                      <Plus className="w-3 h-3" />
                    </IconButton>
                  )}
                </div>
              ) : totalSlots === 0 && isEdit && onSlotDelta ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">(0 slots)</span>
                  <IconButton
                    intent="primary"
                    onClick={() => onSlotDelta(rank, 1)}
                    title="Add slot"
                  >
                    <Plus className="w-3 h-3" />
                  </IconButton>
                </div>
              ) : !isEdit && baseSlots > 0 && !onTogglePip ? (
                <span className="text-xs text-muted-foreground">({baseSlots} slots)</span>
              ) : null}
            </div>

            {/* Default spells for this rank */}
            <div className="space-y-1">
              {visibleSpells.map((spell, i) => {
                const slotKey = takeSlotKey(spell.name)
                const cast = isPrepared && preparedCasts.has(`${rank}:${slotKey}`)
                const showCastButton = !isEdit && rank > 0 && (!!onCastPrepared || !!onCastSpontaneous)
                const canSpontCast = isSpontaneous && used < totalSlots
                return (
                  <div key={`def-${i}`} className="flex items-center gap-1 group">
                    {showCastButton && (isPrepared || canSpontCast) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() =>
                              isPrepared
                                ? onCastPrepared?.(rank, slotKey, totalSlots)
                                : onCastSpontaneous?.(rank, totalSlots)
                            }
                            className={cn(
                              'p-1 rounded shrink-0 transition-colors',
                              cast
                                ? 'text-primary bg-primary/10'
                                : 'text-muted-foreground/70 hover:text-primary hover:bg-accent/30',
                            )}
                            aria-label={`Cast ${spell.name} at rank ${rank}`}
                          >
                            <Flame className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          {cast ? 'Mark uncast' : 'Mark cast'}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    <div className="flex-1">
                      <SpellCard
                        name={spell.name}
                        foundryId={spell.foundryId}
                        source={sourceName}
                        combatId={combatId}
                        castRank={rank}
                        castConsumed={cast}
                      />
                    </div>
                    {isEdit && onRemoveSpell && (
                      <IconButton
                        intent="danger"
                        showOnHover
                        onClick={() => onRemoveSpell(spell.name, rank, true)}
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </IconButton>
                    )}
                  </div>
                )
              })}

              {/* Added spells (from caller-provided addedByRank) */}
              {added.map((name, i) => {
                const slotKey = takeSlotKey(name)
                const cast = isPrepared && preparedCasts.has(`${rank}:${slotKey}`)
                const showCastButton = !isEdit && rank > 0 && (!!onCastPrepared || !!onCastSpontaneous)
                const canSpontCast = isSpontaneous && used < totalSlots
                return (
                  <div key={`add-${i}`} className="flex items-center gap-1 group">
                    {showCastButton && (isPrepared || canSpontCast) && (
                      <button
                        type="button"
                        onClick={() =>
                          isPrepared
                            ? onCastPrepared?.(rank, slotKey, totalSlots)
                            : onCastSpontaneous?.(rank, totalSlots)
                        }
                        className={cn(
                          'p-1 rounded shrink-0 transition-colors',
                          cast
                            ? 'text-primary bg-primary/10'
                            : 'text-muted-foreground/70 hover:text-primary hover:bg-accent/30',
                        )}
                        aria-label={`Cast ${name} at rank ${rank}`}
                      >
                        <Flame className="w-3 h-3" />
                      </button>
                    )}
                    <div className="flex-1">
                      <SpellCard
                        name={name}
                        foundryId={null}
                        source={sourceName}
                        combatId={combatId}
                        castRank={rank}
                        castConsumed={cast}
                      />
                    </div>
                    {isEdit && onRemoveSpell && (
                      <IconButton
                        intent="danger"
                        showOnHover
                        onClick={() => onRemoveSpell(name, rank, false)}
                        title="Remove added spell"
                      >
                        <X className="w-3 h-3" />
                      </IconButton>
                    )}
                  </div>
                )
              })}

              {/* Add-spell button */}
              {isEdit && onOpenSpellSearch && (
                <button
                  type="button"
                  onClick={() => onOpenSpellSearch(rank)}
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
      {isEdit && onAddRank && nextRank <= 10 && (
        <button
          type="button"
          onClick={() => onAddRank(nextRank)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Add rank {nextRank}</span>
        </button>
      )}
    </div>
  )
}
