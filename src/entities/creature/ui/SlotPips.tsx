import { cn } from '@/shared/lib/utils'
import { TRADITION_SLOT_CONFIG } from '../lib/spellcasting-helpers'

export function SlotPips({ total, used, baseSlots, tradition, onToggle }: {
  total: number
  used: number
  baseSlots: number
  tradition: string
  onToggle: (idx: number) => void
}) {
  if (total <= 0) return null
  const cfg = TRADITION_SLOT_CONFIG[tradition] ?? TRADITION_SLOT_CONFIG.arcane
  const Icon = cfg.icon
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: total }).map((_, i) => {
        const isCustom = i >= baseSlots
        const isAvailable = i >= used
        return (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); onToggle(i) }}
            title={isAvailable ? 'Mark slot spent' : 'Mark slot available'}
            className={cn(
              "w-5 h-5 rounded flex items-center justify-center border transition-colors",
              isCustom && "border-dashed",
              isAvailable
                ? cfg.available
                : cn(cfg.spent, "bg-transparent hover:bg-muted/30")
            )}
          >
            {isAvailable && <Icon className="w-3 h-3" />}
          </button>
        )
      })}
    </div>
  )
}
