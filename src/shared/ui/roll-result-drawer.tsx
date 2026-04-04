import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Drawer as DrawerPrimitive } from 'vaul'
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
        {/* Formula + label */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="font-mono">{roll.formula}</Badge>
          {roll.label && (
            <span className="text-xs text-muted-foreground">{roll.label}</span>
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

      {/* Total */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <Separator orientation="vertical" className="h-8" />
        <span
          className={cn('font-mono text-2xl font-bold', isNat20 && 'golden-glow')}
          style={{ color: totalColor }}
        >
          {roll.total}
        </span>
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
    <DrawerPrimitive.Root open={open} onOpenChange={setOpen} direction="bottom" modal={false}>
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Content
          className={cn(
            'fixed z-50 inset-x-0 bottom-0',
            'rounded-t-lg border-t border-border bg-background shadow-2xl',
            'focus:outline-none',
          )}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-3 h-1.5 w-16 shrink-0 rounded-full bg-muted" />

          {/* Content */}
          <div className="px-6 py-4">
            <div className="flex items-start gap-4">
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
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  )
}
