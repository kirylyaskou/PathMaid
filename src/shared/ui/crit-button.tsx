import { Swords } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { rollCritDamage } from '@engine'
import { useRollStore } from '@/shared/model/roll-store'
import { cn } from '@/shared/lib/utils'

interface CritButtonProps {
  formula: string
  traits?: readonly string[]
  label?: string
  source?: string
  combatId?: string
  className?: string
  /** Compact icon-only variant. Default false renders icon + "CRIT" label. */
  iconOnly?: boolean
}

/**
 * Big red button that rolls critical damage.
 * Rolls base formula ONCE, multiplies total by 2, then applies Deadly / Fatal
 * weapon traits per PF2e Player Core p.275.
 */
export function CritButton({ formula, traits, label, source, combatId, className, iconOnly }: CritButtonProps) {
  const { t } = useTranslation('common')
  const addRoll = useRollStore((s) => s.addRoll)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    const roll = rollCritDamage(formula, traits ?? [], {
      source,
      combatId,
      label: label ?? t('actions.crit'),
    })
    addRoll(roll)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={t('actions.critTooltip', { formula })}
      className={cn(
        'shrink-0 inline-flex items-center justify-center gap-1 px-2.5 h-8 rounded-md',
        'bg-rose-700/80 hover:bg-rose-600 text-rose-50 border border-rose-500/60',
        'text-xs font-bold uppercase tracking-wider transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60',
        className,
      )}
    >
      <Swords className="w-3.5 h-3.5" />
      {!iconOnly && <span>{t('actions.crit')}</span>}
    </button>
  )
}
