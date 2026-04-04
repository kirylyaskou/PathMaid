import type { Roll } from '@engine'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'
import { DiceCubeAnimation } from './dice-cube-animation'

interface RollResultToastProps {
  roll: Roll
}

export function RollResultToast({ roll }: RollResultToastProps) {
  const dieLabel = `d${roll.dice[0]?.sides ?? 20}`

  const isNat20 = roll.dice.some((d) => d.sides === 20 && d.value === 20)
  const isNat1 = roll.dice.some((d) => d.sides === 20 && d.value === 1)

  const totalColor = isNat20 ? 'var(--pf-gold)' : isNat1 ? 'var(--pf-blood)' : 'var(--pf-gold)'

  // Group dice by sides
  const diceGroups = new Map<number, number[]>()
  for (const die of roll.dice) {
    const group = diceGroups.get(die.sides) ?? []
    group.push(die.value)
    diceGroups.set(die.sides, group)
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Row 1: Cube + formula badge + label + nat modifier */}
      <div className="flex items-center gap-2">
        <DiceCubeAnimation dieLabel={dieLabel} result={roll.total} />
        <Badge variant="secondary">{roll.formula}</Badge>
        {roll.label && (
          <span className="text-xs text-muted-foreground">{roll.label}</span>
        )}
        {isNat20 && (
          <span className="text-xs font-semibold" style={{ color: 'var(--pf-gold)' }}>
            Critical!
          </span>
        )}
        {isNat1 && (
          <span className="text-xs font-semibold" style={{ color: 'var(--pf-blood)' }}>
            Fumble
          </span>
        )}
      </div>

      {/* Row 2: Die breakdown */}
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
      </div>

      {/* Row 3: Modifier (conditional) */}
      {roll.modifier !== 0 && (
        <span className="font-mono text-[13px] text-muted-foreground">
          {roll.modifier > 0 ? '+' : ''}{roll.modifier}
        </span>
      )}

      {/* Row 4: Separator */}
      <Separator />

      {/* Row 5: Total */}
      <span
        className={`font-mono text-[16px] font-semibold${isNat20 ? ' golden-glow' : ''}`}
        style={{ color: totalColor }}
      >
        = {roll.total}
      </span>
    </div>
  )
}
