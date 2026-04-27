import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { rankLabel } from '@/shared/lib/pf2e-display'
import { CantripSection } from './sections/CantripSection'
import { ConsumableCopiesView } from './sections/ConsumableCopiesView'
import { PooledSpellsView } from './sections/PooledSpellsView'
import { FocusPoolView } from './sections/FocusPoolView'
import { resolveCastMode } from '../model/types'
import type { SlotInstance, SpellcastingEditorProps } from '../model/types'

/**
 * Pure presentation component for a single SpellcastingSection.
 *
 * Dispatches to per-castType views:
 *   - rank 0 → CantripSection (unlimited casts, no pips)
 *   - prepared → ConsumableCopiesView (strike-through per slot)
 *   - innate → ConsumableCopiesView (strike-through per copy, PF2e-correct)
 *   - spontaneous → PooledSpellsView (shared pool, pips deplete on cast)
 *   - focus → FocusPoolView (cards only, pool rendered separately)
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
    onCastInnate,
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

  const { t } = useTranslation('common')
  const isEdit = mode === 'edit'
  const castMode = resolveCastMode(entry.castType)
  // PF2e RAW: cantrips heighten to ceil(casterLevel / 2), clamped 1..10.
  const autoCantripRank = Math.min(10, Math.max(1, Math.ceil(props.creatureLevel / 2)))

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
  // Only apply rank-filter when caller wires onSelectSlotLevel (combat stat
  // block). For builders and previews — no filter callback → show all ranks
  // so the user can edit every rank at once.
  const filteredRanks = filteredRanksProp ?? (
    !onSelectSlotLevel || effectiveSelectedSlotLevel === null
      ? effectiveRanks
      : effectiveRanks.filter((r) => r === effectiveSelectedSlotLevel)
  )

  // Pre-compute slot instances per rank so duplicate spell names get stable,
  // unique slotKeys without mutating closure state during render.
  //
  // Innate-specific expansion: `sys.frequency` controls consumable-copy count:
  //   - at-will → 1 nonConsumable slot (badge "At will", no cast/strike)
  //   - N/day → N slots, each consumable with unique slotKey
  //   - undefined → legacy behavior (1 slot per entry in byRank.spells)
  const slotsByRank = useMemo(() => {
    const result = new Map<number, { defaultSlots: SlotInstance[]; addedSlots: SlotInstance[] }>()
    const isInnate = castMode === 'innate'
    for (const rank of effectiveRanks) {
      const byRank = entry.spellsByRank.find((br) => br.rank === rank)
      const visible = byRank
        ? byRank.spells.filter((s) => !removedSpells.has(`${rank}:${s.name}`))
        : []
      const occ = new Map<string, number>()
      const take = (name: string) => {
        const seen = occ.get(name) ?? 0
        occ.set(name, seen + 1)
        return `${name}#${seen}`
      }
      const defaultSlots: SlotInstance[] = []
      for (const s of visible) {
        if (isInnate && s.frequency?.kind === 'at-will') {
          defaultSlots.push({
            kind: 'default',
            name: s.name,
            foundryId: s.foundryId,
            slotKey: `atwill:${s.name}`,
            nonConsumable: true,
            frequencyLabel: 'At will',
          })
        } else if (isInnate && s.frequency?.kind === 'per') {
          const label = `${s.frequency.max}/${s.frequency.per}`
          for (let i = 0; i < s.frequency.max; i++) {
            defaultSlots.push({
              kind: 'default',
              name: s.name,
              foundryId: s.foundryId,
              slotKey: `freq:${s.name}#${i}`,
              frequencyLabel: label,
            })
          }
        } else {
          defaultSlots.push({
            kind: 'default',
            name: s.name,
            foundryId: s.foundryId,
            slotKey: take(s.name),
          })
        }
      }
      const addedRefs = addedByRank[rank] ?? []
      const addedSlots: SlotInstance[] = addedRefs.map((ref) => ({
        kind: 'added',
        name: ref.name,
        foundryId: ref.foundryId ?? null,
        slotKey: take(ref.name),
      }))
      result.set(rank, { defaultSlots, addedSlots })
    }
    return result
  }, [effectiveRanks, entry.spellsByRank, removedSpells, addedByRank, castMode])

  function renderRank(rank: number) {
    const byRank = entry.spellsByRank.find((br) => br.rank === rank)
    const baseSlots = byRank?.slots ?? 0
    const slotDelta = slotDeltas[rank] ?? 0
    const totalSlots = Math.max(0, baseSlots + slotDelta)
    const used = usedSlots[rank] ?? 0
    const warn = rankWarning ? rankWarning(rank) : null
    const slots = slotsByRank.get(rank) ?? { defaultSlots: [], addedSlots: [] }

    if (rank === 0) {
      return (
        <CantripSection
          key={rank}
          byRank={byRank}
          defaultSlots={slots.defaultSlots}
          addedSlots={slots.addedSlots}
          mode={mode}
          tradition={entry.tradition}
          warn={warn}
          autoCastRank={autoCantripRank}
          onRemoveSpell={onRemoveSpell}
          onOpenSpellSearch={onOpenSpellSearch}
          sourceName={sourceName}
          combatId={combatId}
        />
      )
    }

    if (castMode === 'prepared') {
      return (
        <ConsumableCopiesView
          key={rank}
          rank={rank}
          totalSlots={totalSlots}
          baseSlots={baseSlots}
          used={used}
          warn={warn}
          defaultSlots={slots.defaultSlots}
          addedSlots={slots.addedSlots}
          mode={mode}
          castType="prepared"
          preparedCasts={preparedCasts}
          tradition={entry.tradition}
          onCast={onCastPrepared}
          onTogglePip={onTogglePip}
          onSlotDelta={onSlotDelta}
          onRemoveSpell={onRemoveSpell}
          onOpenSpellSearch={onOpenSpellSearch}
          sourceName={sourceName}
          combatId={combatId}
        />
      )
    }

    if (castMode === 'innate') {
      return (
        <ConsumableCopiesView
          key={rank}
          rank={rank}
          totalSlots={totalSlots}
          baseSlots={baseSlots}
          used={used}
          warn={warn}
          defaultSlots={slots.defaultSlots}
          addedSlots={slots.addedSlots}
          mode={mode}
          castType="innate"
          preparedCasts={preparedCasts}
          tradition={entry.tradition}
          onCast={onCastInnate ?? onCastPrepared}
          onTogglePip={onTogglePip}
          onSlotDelta={onSlotDelta}
          onRemoveSpell={onRemoveSpell}
          onOpenSpellSearch={onOpenSpellSearch}
          sourceName={sourceName}
          combatId={combatId}
        />
      )
    }

    if (castMode === 'focus') {
      return (
        <FocusPoolView
          key={rank}
          rank={rank}
          warn={warn}
          defaultSlots={slots.defaultSlots}
          addedSlots={slots.addedSlots}
          mode={mode}
          tradition={entry.tradition}
          onCast={onCastSpontaneous}
          onRemoveSpell={onRemoveSpell}
          onOpenSpellSearch={onOpenSpellSearch}
          sourceName={sourceName}
          combatId={combatId}
        />
      )
    }

    return (
      <PooledSpellsView
        key={rank}
        rank={rank}
        totalSlots={totalSlots}
        baseSlots={baseSlots}
        used={used}
        warn={warn}
        defaultSlots={slots.defaultSlots}
        addedSlots={slots.addedSlots}
        mode={mode}
        tradition={entry.tradition}
        onCast={onCastSpontaneous}
        onTogglePip={onTogglePip}
        onSlotDelta={onSlotDelta}
        onRemoveSpell={onRemoveSpell}
        onOpenSpellSearch={onOpenSpellSearch}
        sourceName={sourceName}
        combatId={combatId}
      />
    )
  }

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
            {t('spellcastingEditor.allRanks')}
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

      {filteredRanks.map(renderRank)}

      {isEdit && onAddRank && nextRank <= 10 && (
        <button
          type="button"
          onClick={() => onAddRank(nextRank)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>{t('spellcastingEditor.addRank', { rank: nextRank })}</span>
        </button>
      )}
    </div>
  )
}
