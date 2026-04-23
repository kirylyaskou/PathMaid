import { Plus } from 'lucide-react'
import { SpellRow } from './SpellRow'
import { RankHeader } from './RankHeader'
import type { SpellcastingSection } from '@/entities/spell'
import type { SlotInstance } from '../../model/types'

/**
 * Focus caster view: cards only, no per-rank pips.
 *
 * Focus pool (1-3 points shared across all focus spells) is a class-level
 * resource owned by CreatureStatBlock, rendered separately from ranked slots.
 */
export interface FocusPoolViewProps {
  rank: number
  warn: string | null
  defaultSlots: SlotInstance[]
  addedSlots: SlotInstance[]
  mode: 'view' | 'edit'
  tradition: SpellcastingSection['tradition']
  onCast?: (spellName: string, foundryId: string | null, rank: number, total: number) => void
  onRemoveSpell?: (name: string, rank: number, isDefault: boolean) => void
  onOpenSpellSearch?: (rank: number) => void
  sourceName?: string
  combatId?: string
}

export function FocusPoolView({
  rank,
  warn,
  defaultSlots,
  addedSlots,
  mode,
  tradition,
  onCast,
  onRemoveSpell,
  onOpenSpellSearch,
  sourceName,
  combatId,
}: FocusPoolViewProps) {
  const isEdit = mode === 'edit'
  const showCast = !isEdit && rank > 0 && !!onCast

  return (
    <div>
      <RankHeader
        rank={rank}
        warn={warn}
        totalSlots={0}
        baseSlots={0}
        used={0}
        tradition={tradition}
        isEdit={isEdit}
        showPips={false}
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
            canCast={true}
            onCast={onCast ? () => onCast(slot.name, slot.foundryId, rank, 0) : undefined}
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
            canCast={true}
            onCast={onCast ? () => onCast(slot.name, slot.foundryId, rank, 0) : undefined}
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
