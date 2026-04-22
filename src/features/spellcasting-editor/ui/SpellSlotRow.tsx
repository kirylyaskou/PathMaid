import { Flame, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import { IconButton } from '@/shared/ui/icon-button'
import { SpellCard } from '@/entities/creature'

interface SpellSlotRowProps {
  name: string
  foundryId: string | null
  rank: number
  slotKey: string
  totalSlots: number
  isEdit: boolean
  isPrepared: boolean
  isSpontaneous: boolean
  canSpontCast: boolean
  showCastButton: boolean
  cast: boolean
  sourceName?: string
  combatId?: string
  showCastTooltip: boolean
  onCastPrepared?: (name: string, foundryId: string | null, rank: number, slotKey: string, totalSlots: number) => void
  onCastSpontaneous?: (name: string, foundryId: string | null, rank: number, totalSlots: number) => void
  onRemove?: () => void
  removeTitle?: string
}

export function SpellSlotRow({
  name, foundryId, rank, slotKey, totalSlots,
  isEdit, isPrepared, isSpontaneous, canSpontCast, showCastButton, cast,
  sourceName, combatId, showCastTooltip,
  onCastPrepared, onCastSpontaneous, onRemove, removeTitle,
}: SpellSlotRowProps) {
  void isSpontaneous

  const castButton = showCastButton && (isPrepared || canSpontCast) ? (
    <button
      type="button"
      onClick={() =>
        isPrepared
          ? onCastPrepared?.(name, foundryId, rank, slotKey, totalSlots)
          : onCastSpontaneous?.(name, foundryId, rank, totalSlots)
      }
      className={cn(
        'p-1 rounded shrink-0 transition-colors',
        cast
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground/70 hover:text-primary hover:bg-accent/30',
      )}
      aria-label={`Cast ${name} at rank ${rank}`}
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
              Cast &amp; apply effect
            </TooltipContent>
          </Tooltip>
        ) : castButton
      )}
      <div className="flex-1">
        <SpellCard
          name={name}
          foundryId={foundryId}
          source={sourceName}
          combatId={combatId}
          castRank={rank}
          castConsumed={cast}
        />
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
