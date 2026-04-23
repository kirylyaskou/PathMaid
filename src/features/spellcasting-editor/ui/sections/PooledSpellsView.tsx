import { Plus } from 'lucide-react'
import { SpellRow } from './SpellRow'
import { RankHeader } from './RankHeader'
import type { SpellcastingSection } from '@/entities/spell'
import type { SlotInstance } from '../../model/types'

export interface PooledSpellsViewProps {
  rank: number
  totalSlots: number
  baseSlots: number
  used: number
  warn: string | null
  defaultSlots: SlotInstance[]
  addedSlots: SlotInstance[]
  mode: 'view' | 'edit'
  tradition: SpellcastingSection['tradition']
  onCast?: (spellName: string, foundryId: string | null, rank: number, total: number) => void
  onTogglePip?: (rank: number, idx: number, total: number) => void
  onSlotDelta?: (rank: number, delta: 1 | -1) => void
  onRemoveSpell?: (name: string, rank: number, isDefault: boolean) => void
  onOpenSpellSearch?: (rank: number) => void
  sourceName?: string
  combatId?: string
}

export function PooledSpellsView({
  rank,
  totalSlots,
  baseSlots,
  used,
  warn,
  defaultSlots,
  addedSlots,
  mode,
  tradition,
  onCast,
  onTogglePip,
  onSlotDelta,
  onRemoveSpell,
  onOpenSpellSearch,
  sourceName,
  combatId,
}: PooledSpellsViewProps) {
  const isEdit = mode === 'edit'
  const canSpontCast = used < totalSlots
  const showCast = !isEdit && rank > 0 && !!onCast

  return (
    <div>
      <RankHeader
        rank={rank}
        warn={warn}
        totalSlots={totalSlots}
        baseSlots={baseSlots}
        used={used}
        tradition={tradition}
        isEdit={isEdit}
        showPips={true}
        onTogglePip={onTogglePip}
        onSlotDelta={onSlotDelta}
      />

      <div className="space-y-1">
        {defaultSlots.map((slot, i) => (
          <SpellRow
            key={`def-${i}`}
            name={slot.name}
            foundryId={slot.foundryId}
            rank={rank}
            cast={false}
            isEdit={isEdit}
            showCast={showCast}
            canCast={canSpontCast}
            onCast={onCast ? () => onCast(slot.name, slot.foundryId, rank, totalSlots) : undefined}
            onRemove={onRemoveSpell ? () => onRemoveSpell(slot.name, rank, true) : undefined}
            sourceName={sourceName}
            combatId={combatId}
            showCastTooltip
            removeTitle="Remove"
          />
        ))}

        {addedSlots.map((slot, i) => (
          <SpellRow
            key={`add-${i}`}
            name={slot.name}
            foundryId={slot.foundryId}
            rank={rank}
            cast={false}
            isEdit={isEdit}
            showCast={showCast}
            canCast={canSpontCast}
            onCast={onCast ? () => onCast(slot.name, slot.foundryId, rank, totalSlots) : undefined}
            onRemove={onRemoveSpell ? () => onRemoveSpell(slot.name, rank, false) : undefined}
            sourceName={sourceName}
            combatId={combatId}
            showCastTooltip={false}
            removeTitle="Remove added spell"
          />
        ))}

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
