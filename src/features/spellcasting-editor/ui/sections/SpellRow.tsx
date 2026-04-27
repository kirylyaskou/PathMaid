import { Flame, X } from 'lucide-react'
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
}: SpellRowProps) {
  const { t } = useTranslation('common')
  const effectiveShowCast = showCast && !nonConsumable
  const effectiveCast = cast && !nonConsumable
  const castButton = effectiveShowCast && canCast ? (
    <button
      type="button"
      onClick={onCast}
      className={cn(
        'p-1 rounded shrink-0 transition-colors',
        cast
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground/70 hover:text-primary hover:bg-accent/30',
      )}
      aria-label={t('spellcastingEditor.castSpell', { name, rank })}
    >
      <Flame className="w-3 h-3" />
    </button>
  ) : null

  return (
    <div className="flex items-center gap-1 group">
      {castButton && (
        showCastTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>{castButton}</TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {t('spellcastingEditor.castApplyEffect')}
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
