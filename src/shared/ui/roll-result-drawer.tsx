import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { useRollStore } from '@/shared/model/roll-store'
import { DiceCubeAnimation } from './dice-cube-animation'
import type { Roll } from '@engine'

function RollBreakdown({ roll }: { roll: Roll }) {
  // fortune / misfortune rolls render a dedicated two-row
  // breakdown (one line per independent d20 roll) so the drawer mirrors the
  // toast layout.
  if (roll.fortune) {
    return <FortuneRollBreakdown roll={roll} />
  }

  const isNat20 = roll.dice.some((d) => d.sides === 20 && d.value === 20)
  const isNat1 = roll.dice.some((d) => d.sides === 20 && d.value === 1)
  const dieLabel = `d${roll.dice[0]?.sides ?? 20}`

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

function FortuneRollBreakdown({ roll }: { roll: Roll }) {
  const fortune = roll.fortune!
  const kindLabel = fortune.kind === 'fortune' ? 'Fortune — keep higher' : 'Misfortune — keep lower'

  return (
    <div className="flex items-start gap-4 flex-wrap">
      <DiceCubeAnimation dieLabel="d20" result={roll.total} />
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="font-mono">{roll.formula}</Badge>
          {roll.label && (
            <span className="text-xs text-muted-foreground">{roll.label}</span>
          )}
          {roll.source && (
            <span className="text-xs text-primary/70">— {roll.source}</span>
          )}
        </div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {kindLabel}
        </p>
        <div className="flex flex-col gap-1">
          {fortune.rolls.map((entry, idx) => {
            const isChosen = idx === fortune.chosen
            const isNat20 = entry.d20 === 20
            const isNat1 = entry.d20 === 1
            const totalColor = isNat20
              ? 'var(--pf-gold)'
              : isNat1
                ? 'var(--pf-blood)'
                : isChosen
                  ? 'var(--pf-gold)'
                  : 'inherit'
            const modSign = entry.modifier >= 0 ? '+' : ''
            return (
              <div
                key={idx}
                className={cn(
                  'flex items-center gap-2 rounded px-2 py-1 border',
                  isChosen
                    ? 'border-pf-gold/40 bg-pf-gold/10'
                    : 'border-border/30 bg-card opacity-70',
                )}
              >
                <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                  Roll {idx + 1}
                </span>
                <span className="w-6 h-6 flex items-center justify-center rounded border border-border bg-card font-mono text-[13px] shrink-0">
                  {entry.d20}
                </span>
                {entry.modifier !== 0 && (
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {modSign}{entry.modifier}
                  </span>
                )}
                <span className="text-xs font-mono text-muted-foreground">=</span>
                <span className="font-mono text-[13px] font-semibold" style={{ color: totalColor }}>
                  {entry.total}
                </span>
                {isNat20 && (
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--pf-gold)' }}>Critical!</span>
                )}
                {isNat1 && (
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--pf-blood)' }}>Fumble</span>
                )}
                {isChosen && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-pf-gold shrink-0">Chosen</span>
                )}
              </div>
            )
          })}
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
