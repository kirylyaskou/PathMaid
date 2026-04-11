import { cn } from '@/shared/lib/utils'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import { formatRollFormula } from '@/shared/lib/format'
import type { StatModifierResult } from '../model/use-modified-stats'

interface StatItemProps {
  label: string
  value: number
  modifier?: boolean
  highlight?: boolean
  colorClass?: string
  showDc?: boolean
  modResult?: StatModifierResult
  onRoll?: (formula: string) => void
}

export function StatItem({ label, value, modifier, highlight, colorClass, showDc, modResult, onRoll }: StatItemProps) {
  const netMod = modResult?.netModifier ?? 0
  const finalValue = value + netMod
  const displayValue = modifier && finalValue > 0 ? `+${finalValue}` : `${finalValue}`
  const dc = showDc ? ` (${10 + finalValue})` : ''

  const valClassName = cn(
    'font-mono font-bold text-[clamp(0.7rem,2.8cqw,1.125rem)]',
    highlight && 'text-pf-threat-extreme',
    !highlight && netMod < 0 && 'text-pf-blood',
    !highlight && netMod > 0 && 'text-pf-threat-low',
    !highlight && netMod === 0 && colorClass,
  )

  const formula = formatRollFormula(finalValue)

  const valueEl = onRoll ? (
    <button
      onClick={() => onRoll(formula)}
      title={`Roll ${formula}`}
      className={cn(valClassName, 'cursor-pointer underline decoration-dotted underline-offset-2 hover:text-pf-gold transition-colors duration-100')}
    >
      {displayValue}{dc}
    </button>
  ) : (
    <p className={valClassName}>{displayValue}{dc}</p>
  )

  return (
    <div className="px-4">
      <p className="text-[clamp(0.55rem,1.8cqw,0.75rem)] text-muted-foreground mb-1">{label}</p>
      <ModifierTooltip modifiers={modResult?.modifiers ?? []} netModifier={netMod} finalDisplay={`${displayValue}${dc}`}>
        {valueEl}
      </ModifierTooltip>
    </div>
  )
}
