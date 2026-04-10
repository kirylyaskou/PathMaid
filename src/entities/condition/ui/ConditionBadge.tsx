import { Lock, Unlock, Link, Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { ActiveCondition } from '../model/types'
import { CONDITION_GROUPS } from '@engine'

function getCategoryColor(slug: string): string {
  for (const [group, members] of Object.entries(CONDITION_GROUPS)) {
    if ((members as string[]).includes(slug)) {
      switch (group) {
        case 'death': return 'bg-red-900/60 text-red-200 border-red-700/40'
        case 'abilities': return 'bg-purple-900/60 text-purple-200 border-purple-700/40'
        case 'senses': return 'bg-blue-900/60 text-blue-200 border-blue-700/40'
        case 'detection': return 'bg-cyan-900/60 text-cyan-200 border-cyan-700/40'
        case 'attitudes': return 'bg-amber-900/60 text-amber-200 border-amber-700/40'
      }
    }
  }
  return 'bg-muted text-muted-foreground border-border/40'
}

interface ConditionBadgeProps {
  condition: ActiveCondition
  onRemove?: () => void
  onToggleLock?: () => void
  onInfo?: () => void
  /** If provided, overrides onRemove as the badge body click handler. */
  onClick?: () => void
  className?: string
}

export function ConditionBadge({
  condition,
  onRemove,
  onToggleLock,
  onInfo,
  onClick,
  className,
}: ConditionBadgeProps) {
  const colorClass = getCategoryColor(condition.slug)
  const handleClick = onClick ?? onRemove

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs cursor-pointer transition-colors hover:brightness-110',
        colorClass,
        className
      )}
      onClick={handleClick}
      title={onClick ? `Click to open ${condition.slug} dialog` : `Click to remove ${condition.slug}`}
    >
      {condition.grantedBy && (
        <Link className="w-2.5 h-2.5 opacity-60" />
      )}
      <span className="capitalize">{condition.slug.replace('-', ' ')}</span>
      {condition.value !== undefined && condition.value > 0 && (
        <span className="font-mono font-semibold">{condition.value}</span>
      )}
      {onInfo && (
        <button
          className="ml-0.5 hover:text-foreground opacity-50 hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); onInfo() }}
          title="View condition details"
        >
          <Info className="w-2.5 h-2.5" />
        </button>
      )}
      {onToggleLock && (
        <button
          className="ml-0.5 hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock()
          }}
          title={condition.isLocked ? 'Unlock (allow auto-decrement)' : 'Lock (skip auto-decrement)'}
        >
          {condition.isLocked ? (
            <Lock className="w-2.5 h-2.5" />
          ) : (
            <Unlock className="w-2.5 h-2.5 opacity-40" />
          )}
        </button>
      )}
    </div>
  )
}
