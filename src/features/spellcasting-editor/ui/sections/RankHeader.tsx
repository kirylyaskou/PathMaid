import { Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import { IconButton } from '@/shared/ui/icon-button'
import { SlotPips } from '@/entities/creature'
import { rankLabel } from '@/shared/lib/pf2e-display'
import type { SpellcastingSection } from '@/entities/spell'

export interface RankHeaderProps {
  rank: number
  warn: string | null
  totalSlots: number
  baseSlots: number
  used: number
  tradition: SpellcastingSection['tradition']
  isEdit: boolean
  showPips: boolean
  onTogglePip?: (rank: number, idx: number, total: number) => void
  onSlotDelta?: (rank: number, delta: 1 | -1) => void
}

export function RankHeader({
  rank,
  warn,
  totalSlots,
  baseSlots,
  used,
  tradition,
  isEdit,
  showPips,
  onTogglePip,
  onSlotDelta,
}: RankHeaderProps) {
  const { t } = useTranslation('common')
  const pipsBlock = showPips && totalSlots > 0 ? (
    <div className="flex items-center gap-1.5">
      {isEdit && onSlotDelta && (
        <IconButton
          intent="danger"
          onClick={() => onSlotDelta(rank, -1)}
          disabled={totalSlots <= 0}
          title={t('spellcastingEditor.removeSlot')}
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
          title={t('spellcastingEditor.addSlot')}
        >
          <Plus className="w-3 h-3" />
        </IconButton>
      )}
    </div>
  ) : showPips && totalSlots === 0 && isEdit && onSlotDelta ? (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{t('spellcastingEditor.zeroSlots')}</span>
      <IconButton
        intent="primary"
        onClick={() => onSlotDelta(rank, 1)}
        title={t('spellcastingEditor.addSlot')}
      >
        <Plus className="w-3 h-3" />
      </IconButton>
    </div>
  ) : showPips && !isEdit && baseSlots > 0 && !onTogglePip ? (
    <span className="text-xs text-muted-foreground">({baseSlots} slots)</span>
  ) : null

  return (
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
      {pipsBlock}
    </div>
  )
}
