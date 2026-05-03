import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SpellRow } from './SpellRow'
import { RankHeader } from './RankHeader'
import { type SpellcastingSection, dedupeSpontaneousSpells } from '@/entities/spell'
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
  const { t } = useTranslation('common')
  const isEdit = mode === 'edit'
  const canSpontCast = used < totalSlots
  const showCast = !isEdit && rank > 0 && !!onCast

  // Spontaneous casters share one rank-pool of slots, so duplicate spell names
  // in the list contribute nothing — collapse to first occurrence per
  // `${name}:${foundryId}` so the row list mirrors what the caster can cast.
  const dedupedDefault = useMemo(() => dedupeSpontaneousSpells(defaultSlots), [defaultSlots])
  const dedupedAdded = useMemo(() => dedupeSpontaneousSpells(addedSlots), [addedSlots])

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
        {dedupedDefault.map((slot, i) => (
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
            removeTitle={t('spellcastingEditor.removeSpell')}
          />
        ))}

        {dedupedAdded.map((slot, i) => (
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
            removeTitle={t('spellcastingEditor.removeAddedSpell')}
          />
        ))}

        {isEdit && onOpenSpellSearch && (
          <button
            type="button"
            onClick={() => onOpenSpellSearch(rank)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
          >
            <Plus className="w-3 h-3" />
            <span>{t('spellcastingEditor.addSpell')}</span>
          </button>
        )}
      </div>
    </div>
  )
}
