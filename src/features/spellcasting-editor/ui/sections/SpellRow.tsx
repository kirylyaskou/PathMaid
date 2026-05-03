import { BookMarked, Flame, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import { IconButton } from '@/shared/ui/icon-button'
import { SpellCard } from '@/entities/creature'

export interface SpellRowProps {
  name: string
  foundryId: string | null
  rank: number
  cast: boolean
  isEdit: boolean
  showCast: boolean
  canCast: boolean
  onCast?: () => void
  onRemove?: () => void
  sourceName?: string
  combatId?: string
  castRank?: number
  showCastTooltip: boolean
  removeTitle?: string
  /** Innate at-will: hide cast/strike entirely. */
  nonConsumable?: boolean
  /** Badge like "At will" or "3/day" rendered next to the SpellCard. */
  frequencyLabel?: string
  /**
   * Cast affordance icon variant.
   * - 'flame' (default): spontaneous-style — consumes a pool slot on click.
   * - 'book': prepared-style — represents one of N grouped prepared copies.
   *   When set, `remainingCount` drives the `× N` badge and strike-through state.
   */
  castVariant?: 'flame' | 'book'
  /** Copies left in the prepared group; rendered as `× N` badge for book variant. */
  remainingCount?: number
  /** Total copies in the prepared group; used for aria-label only. */
  totalCount?: number
}

export function SpellRow({
  name,
  foundryId,
  rank,
  cast,
  isEdit,
  showCast,
  canCast,
  onCast,
  onRemove,
  sourceName,
  combatId,
  castRank,
  showCastTooltip,
  removeTitle,
  nonConsumable,
  frequencyLabel,
  castVariant = 'flame',
  remainingCount,
  totalCount,
}: SpellRowProps) {
  const { t } = useTranslation('common')
  const isBook = castVariant === 'book'
  const isStackEmpty = isBook && remainingCount === 0
  const effectiveShowCast = showCast && !nonConsumable
  // Book variant strikes the SpellCard when the entire stack is consumed —
  // per-copy `cast` flag is irrelevant since one row represents N copies.
  const effectiveCast = isBook
    ? isStackEmpty
    : cast && !nonConsumable
  const castButton = effectiveShowCast && canCast ? (
    <button
      type="button"
      onClick={onCast}
      className={cn(
        'p-1 rounded shrink-0 transition-colors',
        cast && !isBook
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground/70 hover:text-primary hover:bg-accent/30',
      )}
      aria-label={
        isBook
          ? t('spellcastingEditor.castPreparedAria', { name })
          : t('spellcastingEditor.castSpell', { name, rank })
      }
    >
      {isBook ? <BookMarked className="w-3 h-3" /> : <Flame className="w-3 h-3" />}
    </button>
  ) : null

  const tooltipText = isBook
    ? t('spellcastingEditor.castPrepared')
    : t('spellcastingEditor.castApplyEffect')

  return (
    <div className="flex items-center gap-1 group">
      {castButton && (
        showCastTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>{castButton}</TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {tooltipText}
            </TooltipContent>
          </Tooltip>
        ) : castButton
      )}
      <div className="flex-1 flex items-center gap-1.5">
        <div className="flex-1">
          <SpellCard
            name={name}
            foundryId={foundryId}
            source={sourceName}
            combatId={combatId}
            castRank={castRank ?? rank}
            castConsumed={effectiveCast}
          />
        </div>
        {typeof remainingCount === 'number' && isBook && (
          <span
            className={cn(
              'shrink-0 px-1.5 py-0.5 text-[10px] rounded font-mono tabular-nums',
              isStackEmpty
                ? 'text-muted-foreground/60 line-through'
                : 'text-muted-foreground bg-muted/40 border border-border/40',
            )}
            aria-label={t('spellcastingEditor.copyCount', {
              count: remainingCount,
              total: totalCount,
            })}
          >
            × {remainingCount}
          </span>
        )}
        {frequencyLabel && (
          <span className="shrink-0 px-1.5 py-0.5 text-[10px] rounded border border-primary/30 bg-primary/10 text-primary uppercase tracking-wider font-semibold">
            {frequencyLabel}
          </span>
        )}
      </div>
      {isEdit && onRemove && (
        <IconButton
          intent="danger"
          showOnHover
          onClick={onRemove}
          title={removeTitle ?? 'Remove'}
        >
          <X className="w-3 h-3" />
        </IconButton>
      )}
    </div>
  )
}
