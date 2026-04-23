import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { classifyStat, getBenchmark } from '@engine'
import type { StatKind, Tier } from '@engine'
import { TIER_COLORS, TIER_LABEL, TIER_ORDER } from '../lib/tier-colors'

// per-stat tier chip + dropdown. Always 5 tiers .
// For simple numeric stats only — strikeDamage / areaDamage use their own dedicated hint in Strikes tab.

type SimpleStat = Exclude<StatKind, 'strikeDamage' | 'areaDamage'>

interface Props {
  stat: SimpleStat
  level: number
  value: number
  onSelectTier: (tierValue: number, tier: Tier) => void
  // If true, renders inline without the "Tier:" prefix (compact mode for skills list rows).
  compact?: boolean
}

export function BenchmarkHint({ stat, level, value, onSelectTier, compact }: Props) {
  const currentTier = classifyStat(stat, level, value)
  const currentColors = TIER_COLORS[currentTier]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider font-semibold transition-colors hover:brightness-110 ${currentColors.text} ${currentColors.bg} ${currentColors.border}`}
          title={`Current: ${TIER_LABEL[currentTier]} — click to set a different tier`}
        >
          {!compact && (
            <span className="text-muted-foreground font-medium normal-case tracking-normal">Tier:</span>
          )}
          <span>{TIER_LABEL[currentTier]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {TIER_ORDER.map((t) => {
          const benchValue = getBenchmark(stat, level, t)
          const colors = TIER_COLORS[t]
          return (
            <DropdownMenuItem
              key={t}
              onClick={() => onSelectTier(benchValue, t)}
              className="flex items-center justify-between gap-3 cursor-pointer"
            >
              <span
                className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider font-semibold ${colors.text} ${colors.bg} ${colors.border}`}
              >
                {TIER_LABEL[t]}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {formatBenchmark(stat, benchValue)}
              </span>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function formatBenchmark(stat: SimpleStat, value: number): string {
  // Modifier-shaped stats show +/- sign; DC-shaped stats show bare number; HP shows bare number.
  const signedStats: SimpleStat[] = ['abilityMod', 'perception', 'skill', 'save', 'attackBonus']
  if (signedStats.includes(stat)) {
    return value >= 0 ? `+${value}` : `${value}`
  }
  return `${value}`
}
