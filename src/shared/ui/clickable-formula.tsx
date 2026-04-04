import { cn } from '@/shared/lib/utils'
import { rollDice } from '@engine'
import { useRollStore } from '@/shared/model/roll-store'

interface ClickableFormulaProps {
  formula: string
  label?: string
  source?: string
  combatId?: string
  className?: string
}

export function ClickableFormula({ formula, label, source, combatId, className }: ClickableFormulaProps) {
  const addRoll = useRollStore((state) => state.addRoll)

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    addRoll(rollDice(formula, label, { source, combatId }))
  }

  return (
    <button
      onClick={handleClick}
      title={`Roll ${formula}`}
      className={cn(
        'font-bold font-mono cursor-pointer',
        'underline decoration-dotted underline-offset-2 decoration-pf-gold/60',
        'hover:text-pf-gold transition-colors duration-100',
        className,
      )}
    >
      {formula}
    </button>
  )
}
