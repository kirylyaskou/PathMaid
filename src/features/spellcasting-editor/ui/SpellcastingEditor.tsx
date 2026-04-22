import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { rankLabel } from '@/shared/lib/pf2e-display'
import { SpellRankBlock } from './SpellRankBlock'
import type { SpellcastingEditorProps } from '../model/types'

/**
 * Pure presentation component for a single SpellcastingSection.
 *
 * Rendering scope:
 *   - optional rank-filter pills
 *   - per-rank blocks (rank label + slot pips +/- + spell cards + add-spell)
 *   - optional "add rank" footer
 *
 * **Excluded** (stays with caller):
 *   - entry header (tradition pill / DC+Attack / mode toggle)
 *   - SpellSearchDialog — caller owns open state; trigger via `onOpenSpellSearch`
 *
 * Zero persistence surface: no DB calls, no Zustand imports, no store writes.
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

      {filteredRanks.map((rank) => (
        <SpellRankBlock
          key={rank}
          rank={rank}
          byRank={entry.spellsByRank.find((br) => br.rank === rank)}
          slotDelta={slotDeltas[rank] ?? 0}
          used={usedSlots[rank] ?? 0}
          warn={rankWarning ? rankWarning(rank) : null}
          addedSpells={addedByRank[rank] ?? []}
          removedSpells={removedSpells}
          preparedCasts={preparedCasts}
          mode={mode}
          castType={entry.castType}
          tradition={entry.tradition}
          sourceName={sourceName}
          combatId={combatId}
          onTogglePip={onTogglePip}
          onSlotDelta={onSlotDelta}
          onRemoveSpell={onRemoveSpell}
          onCastPrepared={onCastPrepared}
          onCastSpontaneous={onCastSpontaneous}
          onOpenSpellSearch={onOpenSpellSearch}
        />
      ))}

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
