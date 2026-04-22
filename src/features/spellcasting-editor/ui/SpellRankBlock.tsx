import { useMemo } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import { IconButton } from '@/shared/ui/icon-button'
import { SlotPips } from '@/entities/creature'
import { rankLabel } from '@/shared/lib/pf2e-display'
import { SpellSlotRow } from './SpellSlotRow'
import type { SpellcastingSection } from '@/entities/spell'

interface SpellRankBlockProps {
  rank: number
  byRank: SpellcastingSection['spellsByRank'][number] | undefined
  slotDelta: number
  used: number
  warn: string | null
  addedSpells: string[]
  removedSpells: Set<string>
  preparedCasts: Set<string>
  mode: 'view' | 'edit'
  castType: SpellcastingSection['castType']
  tradition: SpellcastingSection['tradition']
  sourceName?: string
  combatId?: string
  onTogglePip?: (rank: number, idx: number, total: number) => void
  onSlotDelta?: (rank: number, delta: 1 | -1) => void
  onRemoveSpell?: (name: string, rank: number, isDefault: boolean) => void
  onCastPrepared?: (name: string, foundryId: string | null, rank: number, slotKey: string, total: number) => void
  onCastSpontaneous?: (name: string, foundryId: string | null, rank: number, total: number) => void
  onOpenSpellSearch?: (rank: number) => void
}

interface SlotInstance {
  kind: 'default' | 'added'
  name: string
  foundryId: string | null
  slotKey: string
}

export function SpellRankBlock(props: SpellRankBlockProps) {
  const {
    rank, byRank, slotDelta, used, warn, addedSpells, removedSpells, preparedCasts,
    mode, castType, tradition, sourceName, combatId,
    onTogglePip, onSlotDelta, onRemoveSpell,
    onCastPrepared, onCastSpontaneous, onOpenSpellSearch,
  } = props

  const isEdit = mode === 'edit'
  const isPrepared = castType === 'prepared'
  const isSpontaneous = castType === 'spontaneous'
  const baseSlots = byRank?.slots ?? 0
  const totalSlots = Math.max(0, baseSlots + slotDelta)
  const canSpontCast = isSpontaneous && used < totalSlots
  const showCastButton = !isEdit && rank > 0 && (!!onCastPrepared || !!onCastSpontaneous)

  // Precompute slot instances so duplicate prepared spell names get unique
  // slot keys without mutating a closure during render.
  const { defaultSlots, addedSlots } = useMemo(() => {
    const visible = byRank
      ? byRank.spells.filter((s) => !removedSpells.has(`${rank}:${s.name}`))
      : []
    const occ = new Map<string, number>()
    const take = (name: string) => {
      const seen = occ.get(name) ?? 0
      occ.set(name, seen + 1)
      return `${name}#${seen}`
    }
    const def: SlotInstance[] = visible.map((s) => ({
      kind: 'default',
      name: s.name,
      foundryId: s.foundryId,
      slotKey: take(s.name),
    }))
    const add: SlotInstance[] = addedSpells.map((name) => ({
      kind: 'added',
      name,
      foundryId: null,
      slotKey: take(name),
    }))
    return { defaultSlots: def, addedSlots: add }
  }, [byRank, removedSpells, rank, addedSpells])

  return (
    <div>
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
                tradition={tradition}
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

      <div className="space-y-1">
        {defaultSlots.map((slot, i) => {
          const cast = isPrepared && preparedCasts.has(`${rank}:${slot.slotKey}`)
          return (
            <SpellSlotRow
              key={`def-${i}`}
              name={slot.name}
              foundryId={slot.foundryId}
              rank={rank}
              slotKey={slot.slotKey}
              totalSlots={totalSlots}
              isEdit={isEdit}
              isPrepared={isPrepared}
              isSpontaneous={isSpontaneous}
              canSpontCast={canSpontCast}
              showCastButton={showCastButton}
              cast={cast}
              sourceName={sourceName}
              combatId={combatId}
              showCastTooltip
              onCastPrepared={onCastPrepared}
              onCastSpontaneous={onCastSpontaneous}
              onRemove={onRemoveSpell ? () => onRemoveSpell(slot.name, rank, true) : undefined}
              removeTitle="Remove"
            />
          )
        })}

        {addedSlots.map((slot, i) => {
          const cast = isPrepared && preparedCasts.has(`${rank}:${slot.slotKey}`)
          return (
            <SpellSlotRow
              key={`add-${i}`}
              name={slot.name}
              foundryId={slot.foundryId}
              rank={rank}
              slotKey={slot.slotKey}
              totalSlots={totalSlots}
              isEdit={isEdit}
              isPrepared={isPrepared}
              isSpontaneous={isSpontaneous}
              canSpontCast={canSpontCast}
              showCastButton={showCastButton}
              cast={cast}
              sourceName={sourceName}
              combatId={combatId}
              showCastTooltip={false}
              onCastPrepared={onCastPrepared}
              onCastSpontaneous={onCastSpontaneous}
              onRemove={onRemoveSpell ? () => onRemoveSpell(slot.name, rank, false) : undefined}
              removeTitle="Remove added spell"
            />
          )
        })}

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
}
