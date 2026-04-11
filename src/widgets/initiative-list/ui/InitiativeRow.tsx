import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, User, Skull, Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import type { Combatant } from '@/entities/combatant'
import type { ActiveCondition } from '@/entities/condition'

interface InitiativeRowProps {
  combatant: Combatant
  conditions: ActiveCondition[]
  isActive: boolean
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
  onCreatureClick?: (creatureRef: string) => void
}

export function InitiativeRow({
  combatant,
  conditions,
  isActive,
  isSelected,
  onSelect,
  onRemove,
  onCreatureClick,
}: InitiativeRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: combatant.id, data: { combatant } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hpPercent = combatant.maxHp > 0 ? (combatant.hp / combatant.maxHp) * 100 : 0
  const stunnedCondition = conditions.find((c) => c.slug === 'stunned' && (c.value ?? 0) > 0) ?? null

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors border border-transparent',
        isActive && 'bg-primary/15 border-primary/30',
        isSelected && !isActive && 'bg-accent/50 border-accent/30',
        !isActive && !isSelected && 'hover:bg-accent/30',
        isDragging && 'opacity-50',
        combatant.hp === 0 && 'opacity-50'
      )}
      onClick={onSelect}
    >
      <button
        className="cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <span className="text-xs font-mono text-muted-foreground w-6 text-right shrink-0">
        {combatant.initiative}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {combatant.kind !== 'pc' ? (
            <Skull className="w-3 h-3 text-destructive/60 shrink-0" />
          ) : (
            <User className="w-3 h-3 text-primary/60 shrink-0" />
          )}
          {stunnedCondition && (
            <span className="px-1 py-0.5 text-[10px] rounded font-mono font-semibold bg-amber-900/60 text-amber-200 border border-amber-600/50 shrink-0">
              ⚡{stunnedCondition.value}
            </span>
          )}
          <span className="text-sm font-medium truncate">{combatant.displayName}</span>
        </div>
        <div className="mt-0.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              hpPercent > 50 && 'bg-emerald-500',
              hpPercent > 25 && hpPercent <= 50 && 'bg-amber-500',
              hpPercent <= 25 && 'bg-destructive'
            )}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        {conditions.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {conditions.slice(0, 4).map((c) => (
              <span
                key={c.slug}
                className="text-[9px] px-1 py-px rounded bg-muted text-muted-foreground leading-none"
              >
                {c.slug}{c.value !== undefined && c.value > 1 ? ` ${c.value}` : ''}
              </span>
            ))}
            {conditions.length > 4 && (
              <span className="text-[9px] px-1 py-px text-muted-foreground">
                +{conditions.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      <span className="text-xs font-mono text-muted-foreground shrink-0">
        {combatant.hp}/{combatant.maxHp}
      </span>

      {combatant.creatureRef && onCreatureClick && (
        <button
          type="button"
          className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-primary cursor-pointer transition-colors shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onCreatureClick(combatant.creatureRef!)
          }}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="w-5 h-5 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  )
}
