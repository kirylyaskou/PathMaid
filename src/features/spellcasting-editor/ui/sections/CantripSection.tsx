import { Plus } from 'lucide-react'
import { SpellRow } from './SpellRow'
import { RankHeader } from './RankHeader'
import type { SpellcastingSection } from '@/entities/spell'
import type { SlotInstance } from '../../model/types'

export interface CantripSectionProps {
  byRank: SpellcastingSection['spellsByRank'][number] | undefined
  defaultSlots: SlotInstance[]
  addedSlots: SlotInstance[]
  mode: 'view' | 'edit'
  tradition: SpellcastingSection['tradition']
  warn: string | null
  onRemoveSpell?: (name: string, rank: number, isDefault: boolean) => void
  onOpenSpellSearch?: (rank: number) => void
  sourceName?: string
  combatId?: string
}

export function CantripSection({
  defaultSlots,
  addedSlots,
  mode,
  tradition,
  warn,
  onRemoveSpell,
  onOpenSpellSearch,
  sourceName,
  combatId,
}: CantripSectionProps) {
  const isEdit = mode === 'edit'
  const rank = 0

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
            showCast={false}
            canCast={false}
            onRemove={onRemoveSpell ? () => onRemoveSpell(slot.name, rank, true) : undefined}
            sourceName={sourceName}
            combatId={combatId}
            showCastTooltip={false}
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
            showCast={false}
            canCast={false}
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
