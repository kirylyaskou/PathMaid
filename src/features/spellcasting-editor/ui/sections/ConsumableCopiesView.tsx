import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { SpellRow } from './SpellRow'
import { RankHeader } from './RankHeader'
import { type SpellcastingSection, groupPreparedSpells } from '@/entities/spell'
import type { SlotInstance } from '../../model/types'

export interface ConsumableCopiesViewProps {
  rank: number
  totalSlots: number
  baseSlots: number
  used: number
  warn: string | null
  defaultSlots: SlotInstance[]
  addedSlots: SlotInstance[]
  mode: 'view' | 'edit'
  castType: 'prepared' | 'innate'
  preparedCasts: Set<string>
  tradition: SpellcastingSection['tradition']
  onCast?: (spellName: string, foundryId: string | null, rank: number, slotKey: string, total: number) => void
  onTogglePip?: (rank: number, idx: number, total: number) => void
  onSlotDelta?: (rank: number, delta: 1 | -1) => void
  onRemoveSpell?: (name: string, rank: number, isDefault: boolean) => void
  onOpenSpellSearch?: (rank: number) => void
  sourceName?: string
  combatId?: string
}

export function ConsumableCopiesView({
  rank,
  totalSlots,
  baseSlots,
  used,
  warn,
  defaultSlots,
  addedSlots,
  mode,
  castType,
  preparedCasts,
  tradition,
  onCast,
  onTogglePip,
  onSlotDelta,
  onRemoveSpell,
  onOpenSpellSearch,
  sourceName,
  combatId,
}: ConsumableCopiesViewProps) {
  const { t } = useTranslation('common')
  const isEdit = mode === 'edit'
  const showCast = !isEdit && rank > 0 && !!onCast
  const isPrepared = castType === 'prepared'

  // Prepared casters often have duplicate copies of the same spell (Pharasma
  // RANK 5 = 5× Heal). Collapse them into a single row with a `× N` badge so
  // the list stays scannable; innate path keeps per-slot rendering since each
  // innate slot has its own frequency badge / nonConsumable flag.
  const groupedDefault = useMemo(
    () => (isPrepared ? groupPreparedSpells(defaultSlots) : []),
    [isPrepared, defaultSlots],
  )
  const groupedAdded = useMemo(
    () => (isPrepared ? groupPreparedSpells(addedSlots) : []),
    [isPrepared, addedSlots],
  )

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
        {isPrepared ? (
          <>
            {groupedDefault.map((group, i) => {
              const castCount = group.slotKeys.reduce(
                (n, k) => n + (preparedCasts.has(`${rank}:${k}`) ? 1 : 0),
                0,
              )
              const remainingCount = group.totalCount - castCount
              const nextSlotKey = group.slotKeys.find((k) => !preparedCasts.has(`${rank}:${k}`))
              return (
                <SpellRow
                  key={`grp-def-${i}`}
                  name={group.name}
                  foundryId={group.foundryId}
                  rank={rank}
                  cast={false}
                  isEdit={isEdit}
                  showCast={showCast}
                  canCast={remainingCount > 0}
                  castVariant="book"
                  remainingCount={remainingCount}
                  totalCount={group.totalCount}
                  onCast={
                    onCast && nextSlotKey
                      ? () => onCast(group.name, group.foundryId, rank, nextSlotKey, totalSlots)
                      : undefined
                  }
                  onRemove={onRemoveSpell ? () => onRemoveSpell(group.name, rank, true) : undefined}
                  sourceName={sourceName}
                  combatId={combatId}
                  showCastTooltip
                  removeTitle={t('spellcastingEditor.removeSpell')}
                />
              )
            })}

            {groupedAdded.map((group, i) => {
              const castCount = group.slotKeys.reduce(
                (n, k) => n + (preparedCasts.has(`${rank}:${k}`) ? 1 : 0),
                0,
              )
              const remainingCount = group.totalCount - castCount
              const nextSlotKey = group.slotKeys.find((k) => !preparedCasts.has(`${rank}:${k}`))
              return (
                <SpellRow
                  key={`grp-add-${i}`}
                  name={group.name}
                  foundryId={group.foundryId}
                  rank={rank}
                  cast={false}
                  isEdit={isEdit}
                  showCast={showCast}
                  canCast={remainingCount > 0}
                  castVariant="book"
                  remainingCount={remainingCount}
                  totalCount={group.totalCount}
                  onCast={
                    onCast && nextSlotKey
                      ? () => onCast(group.name, group.foundryId, rank, nextSlotKey, totalSlots)
                      : undefined
                  }
                  onRemove={onRemoveSpell ? () => onRemoveSpell(group.name, rank, false) : undefined}
                  sourceName={sourceName}
                  combatId={combatId}
                  showCastTooltip={false}
                  removeTitle={t('spellcastingEditor.removeAddedSpell')}
                />
              )
            })}
          </>
        ) : (
          <>
            {defaultSlots.map((slot, i) => {
              const cast = preparedCasts.has(`${rank}:${slot.slotKey}`)
              return (
                <SpellRow
                  key={`def-${i}`}
                  name={slot.name}
                  foundryId={slot.foundryId}
                  rank={rank}
                  cast={cast}
                  isEdit={isEdit}
                  showCast={showCast}
                  canCast={true}
                  onCast={onCast ? () => onCast(slot.name, slot.foundryId, rank, slot.slotKey, totalSlots) : undefined}
                  onRemove={onRemoveSpell ? () => onRemoveSpell(slot.name, rank, true) : undefined}
                  sourceName={sourceName}
                  combatId={combatId}
                  showCastTooltip
                  removeTitle={t('spellcastingEditor.removeSpell')}
                  nonConsumable={slot.nonConsumable}
                  frequencyLabel={slot.frequencyLabel}
                />
              )
            })}

            {addedSlots.map((slot, i) => {
              const cast = preparedCasts.has(`${rank}:${slot.slotKey}`)
              return (
                <SpellRow
                  key={`add-${i}`}
                  name={slot.name}
                  foundryId={slot.foundryId}
                  rank={rank}
                  cast={cast}
                  isEdit={isEdit}
                  showCast={showCast}
                  canCast={true}
                  onCast={onCast ? () => onCast(slot.name, slot.foundryId, rank, slot.slotKey, totalSlots) : undefined}
                  onRemove={onRemoveSpell ? () => onRemoveSpell(slot.name, rank, false) : undefined}
                  sourceName={sourceName}
                  combatId={combatId}
                  showCastTooltip={false}
                  removeTitle={t('spellcastingEditor.removeAddedSpell')}
                />
              )
            })}
          </>
        )}

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
