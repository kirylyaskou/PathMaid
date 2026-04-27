import { Lock, Unlock, Link, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  className?: string
}

export function ConditionBadge({
  condition,
  onRemove,
  onToggleLock,
  onInfo,
  className,
}: ConditionBadgeProps) {
  const { t } = useTranslation('common')
  const colorClass = getCategoryColor(condition.slug)

  return (
    <div
      className={cn(
        // Badge sizing bumped — was text-xs / gap-1 / px-2 py-0.5, felt cramped
        // and the action icons (info/lock) were tiny and low-contrast.
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm cursor-pointer transition-colors hover:brightness-110',
        colorClass,
        className
      )}
      onClick={onRemove}
      title={t('entities.condition.clickToRemove', { slug: condition.slug })}
    >
      {condition.grantedBy && (
        <Link className="w-3 h-3 opacity-60" />
      )}
      <span className="capitalize">{condition.slug.replace('-', ' ')}</span>
      {condition.value !== undefined && condition.value > 0 && (
        <span className="font-mono font-semibold">{condition.value}</span>
      )}
      {onInfo && (
        <button
          className="ml-0.5 text-sky-300 hover:text-sky-100 transition-colors"
          onClick={(e) => { e.stopPropagation(); onInfo() }}
          title={t('entities.condition.viewDetails')}
        >
          <Info className="w-4 h-4" />
        </button>
      )}
      {onToggleLock && (
        <button
          className={cn(
            'ml-0.5 transition-colors',
            // Distinct per-state color so Lock ≠ Unlock at a glance.
            // Locked  → amber   (warning: pinned, auto-decrement skipped)
            // Unlock  → muted but visible (opacity bumped from 40 → 70)
            condition.isLocked
              ? 'text-amber-300 hover:text-amber-100'
              : 'text-foreground/60 hover:text-foreground',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock()
          }}
          title={condition.isLocked ? 'Unlock (allow auto-decrement)' : 'Lock (skip auto-decrement)'}
        >
          {condition.isLocked ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Unlock className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  )
}
