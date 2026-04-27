import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  /** Effective rank to render cantrip damage at. PF2e RAW: cantrips scale to
   *  `ceil(casterLevel / 2)`. Passed from SpellcastingEditor which receives
   *  creatureLevel. */
  autoCastRank: number
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
  autoCastRank,
  onRemoveSpell,
  onOpenSpellSearch,
  sourceName,
  combatId,
}: CantripSectionProps) {
  const { t } = useTranslation('common')
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
            castRank={autoCastRank}
            cast={false}
            isEdit={isEdit}
            showCast={false}
            canCast={false}
            onRemove={onRemoveSpell ? () => onRemoveSpell(slot.name, rank, true) : undefined}
            sourceName={sourceName}
            combatId={combatId}
            showCastTooltip={false}
            removeTitle={t('spellcastingEditor.removeSpell')}
          />
        ))}

        {addedSlots.map((slot, i) => (
          <SpellRow
            key={`add-${i}`}
            name={slot.name}
            foundryId={slot.foundryId}
            rank={rank}
            castRank={autoCastRank}
            cast={false}
            isEdit={isEdit}
            showCast={false}
            canCast={false}
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
