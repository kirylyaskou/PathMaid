import type { Roll } from '@engine'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'
import { cn } from '@/shared/lib/utils'
import { DiceCubeAnimation } from './dice-cube-animation'

interface RollResultToastProps {
  roll: Roll
}

export function RollResultToast({ roll }: RollResultToastProps) {
  // fortune / misfortune rolls render an expanded layout
  // showing each of the two independent d20 totals so the GM can see both
  // rolls, which one was chosen, and whether either would have been a crit
  // or fumble. Normal rolls fall through to the legacy single-roll layout.
  if (roll.fortune) {
    return <FortuneRollToast roll={roll} />
  }

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

      {/* Row 3: Breakdown (full math) or modifier fallback */}
      {roll.breakdown ? (
        <span className="font-mono text-[12px] text-muted-foreground">{roll.breakdown}</span>
      ) : roll.modifier !== 0 && (
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

      {/* Row 6: 65-05 active Note bodies — rendered when an effect's Note
          rule attached a body to this roll's selector. Plain text only for
          now; future phases may render @UUID refs / PF2E localizations. */}
      {roll.notes && roll.notes.length > 0 && (
        <div className="mt-1 space-y-0.5 border-t border-border/40 pt-1.5">
          {roll.notes.map((note, i) => (
            <p key={i} className="text-[11px] text-muted-foreground leading-snug">
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Fortune / Misfortune dual-roll layout ──────────────────────────────────
// Per PF2e RAW (Player Core pg. 11) each of the two d20 rolls is an
// independent check with its own crit/fumble eligibility. We surface both
// totals, highlight the chosen one, and label which kind of effect drove
// the duplication so the GM can sanity-check the pick.

function FortuneRollToast({ roll }: { roll: Roll }) {
  // Safe because caller guarantees roll.fortune is defined.
  const fortune = roll.fortune!
  const kindLabel = fortune.kind === 'fortune' ? 'Fortune — keep higher' : 'Misfortune — keep lower'

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <DiceCubeAnimation dieLabel="d20" result={roll.total} />
        <Badge variant="secondary">{roll.formula}</Badge>
        {roll.label && (
          <span className="text-xs text-muted-foreground">{roll.label}</span>
        )}
      </div>

      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
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
              <span
                className={cn('font-mono text-[14px] font-semibold')}
                style={{ color: totalColor }}
              >
                {entry.total}
              </span>
              {isNat20 && (
                <span className="text-[10px] font-semibold" style={{ color: 'var(--pf-gold)' }}>
                  Critical!
                </span>
              )}
              {isNat1 && (
                <span className="text-[10px] font-semibold" style={{ color: 'var(--pf-blood)' }}>
                  Fumble
                </span>
              )}
              {isChosen && (
                <span className="ml-auto text-[10px] uppercase tracking-wider text-pf-gold shrink-0">
                  Chosen
                </span>
              )}
            </div>
          )
        })}
      </div>

      <Separator />

      <span
        className="font-mono text-[16px] font-semibold"
        style={{ color: 'var(--pf-gold)' }}
      >
        = {roll.total}
      </span>

      {roll.notes && roll.notes.length > 0 && (
        <div className="mt-1 space-y-0.5 border-t border-border/40 pt-1.5">
          {roll.notes.map((note, i) => (
            <p key={i} className="text-[11px] text-muted-foreground leading-snug">
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
