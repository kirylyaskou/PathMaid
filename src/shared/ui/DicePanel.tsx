import { useState } from 'react'
import { Dices } from 'lucide-react'
import type { Roll } from '@engine'
import { useRoll } from '@/shared/hooks'
import { cn } from '@/shared/lib/utils'

// full die set — d100, d20, d12, d10, d8, d6, d4
export const DICE = [
  { sides: 100, label: 'd100' },
  { sides: 20, label: 'd20' },
  { sides: 12, label: 'd12' },
  { sides: 10, label: 'd10' },
  { sides: 8, label: 'd8' },
  { sides: 6, label: 'd6' },
  { sides: 4, label: 'd4' },
] as const

const QUANTITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

/**
 * Generic dice roller panel: choose quantity (1-10) then tap a die to roll.
 * Rolls go through the shared rollDice engine helper so they appear in roll
 * history like every other roll. Math.random() is fine here — this is a
 * tabletop tool, no cryptographic requirement.
 */
export function DicePanel() {
  const [quantity, setQuantity] = useState(1)
  const [lastRoll, setLastRoll] = useState<Roll | null>(null)
  const roll = useRoll()

  function handleRoll(sides: number, label: string) {
    const formula = `${quantity}d${sides}`
    setLastRoll(roll(formula, label))
  }

  // rolls array for display — individual die values from the last roll
  const rolls = lastRoll?.dice.map((d) => d.value) ?? []
  const total = lastRoll?.total ?? 0

  return (
    <div className="p-3 space-y-3 w-64">
      <div className="flex items-center gap-1.5 text-xs">
        <Dices className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-semibold text-muted-foreground uppercase tracking-wider">Dice Roller</span>
      </div>

      {/* Quantity selector */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Quantity</span>
        <div className="flex flex-wrap gap-1">
          {QUANTITIES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setQuantity(n)}
              className={cn(
                'w-6 h-6 rounded text-xs font-mono transition-colors border',
                quantity === n
                  ? 'bg-primary/20 text-primary border-primary/30 font-semibold'
                  : 'hover:bg-muted/50 text-muted-foreground border-border/30',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Die buttons */}
      <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Die</span>
        <div className="grid grid-cols-4 gap-1.5">
          {DICE.map(({ sides, label }) => (
            <button
              key={sides}
              type="button"
              onClick={() => handleRoll(sides, `${quantity}${label}`)}
              className="px-2 py-1.5 rounded text-xs font-mono bg-muted/40 hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border/30 transition-colors"
              title={`Roll ${quantity}${label}`}
            >
              {quantity > 1 ? `${quantity}${label}` : label}
            </button>
          ))}
        </div>
      </div>

      {/* Last roll results */}
      {lastRoll && rolls.length > 0 && (
        <div className="rounded border border-border/30 bg-muted/20 p-2 space-y-1">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {lastRoll.formula}
          </div>
          <div className="flex flex-wrap gap-1">
            {rolls.map((r, i) => (
              <span
                key={i}
                className="inline-flex items-center justify-center min-w-[1.5rem] px-1 py-0.5 rounded text-xs font-mono font-bold bg-background/60 border border-border/40"
              >
                {r}
              </span>
            ))}
          </div>
          {rolls.length > 1 && (
            <div className="text-sm font-mono font-bold text-primary text-right">
              = {total}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
