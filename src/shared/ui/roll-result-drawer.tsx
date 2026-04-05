import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'
import { useRollStore } from '@/shared/model/roll-store'
import { DiceCubeAnimation } from './dice-cube-animation'
import type { Roll } from '@engine'

function RollBreakdown({ roll }: { roll: Roll }) {
  const isNat20 = roll.dice.some((d) => d.sides === 20 && d.value === 20)
  const isNat1 = roll.dice.some((d) => d.sides === 20 && d.value === 1)
  const dieLabel = `d${roll.dice[0]?.sides ?? 20}`
  const totalColor = isNat1 ? 'var(--pf-blood)' : 'var(--pf-gold)'

  const diceGroups = new Map<number, number[]>()
  for (const die of roll.dice) {
    const group = diceGroups.get(die.sides) ?? []
    group.push(die.value)
    diceGroups.set(die.sides, group)
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Animated cube */}
      <DiceCubeAnimation dieLabel={dieLabel} result={roll.total} />

      {/* Breakdown */}
      <div className="flex flex-col gap-1.5 min-w-0">
        {/* Formula + label + source */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="font-mono">{roll.formula}</Badge>
          {roll.label && (
            <span className="text-xs text-muted-foreground">{roll.label}</span>
          )}
          {roll.source && (
            <span className="text-xs text-primary/70">— {roll.source}</span>
          )}
          {isNat20 && (
            <span className="text-xs font-bold" style={{ color: 'var(--pf-gold)' }}>Critical!</span>
          )}
          {isNat1 && (
            <span className="text-xs font-bold" style={{ color: 'var(--pf-blood)' }}>Fumble</span>
          )}
        </div>

        {/* Die values */}
        <div className="flex items-center gap-1 flex-wrap">
          {Array.from(diceGroups.entries()).map(([sides, values]) => (
            <div key={sides} className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground font-mono">d{sides}:</span>
              {values.map((val, i) => (
                <span
                  key={i}
                  className="w-6 h-6 flex items-center justify-center rounded border border-border bg-card font-mono text-[13px]"
                >
                  {val}
                </span>
              ))}
            </div>
          ))}
          {roll.modifier !== 0 && (
            <span className="text-xs font-mono text-muted-foreground">
              {roll.modifier > 0 ? '+' : ''}{roll.modifier}
            </span>
          )}
        </div>
      </div>

    </div>
  )
}

export function RollResultDrawer() {
  const rolls = useRollStore((state) => state.rolls)
  const [open, setOpen] = useState(false)
  const [displayRoll, setDisplayRoll] = useState<Roll | null>(null)
  const prevLengthRef = useRef(rolls.length)

  useEffect(() => {
    if (rolls.length > prevLengthRef.current) {
      setDisplayRoll(rolls[rolls.length - 1])
      setOpen(true)
    }
    prevLengthRef.current = rolls.length
  }, [rolls.length])

  if (!displayRoll) return null

  return (
    <div
      className={cn(
        'fixed z-50 right-4 bottom-4',
        'w-auto',
        'rounded-lg border border-border bg-background shadow-2xl',
        'transition-all duration-200',
        open
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-4 pointer-events-none',
      )}
    >
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <RollBreakdown roll={displayRoll} />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 shrink-0 -mt-1"
            onClick={() => setOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
