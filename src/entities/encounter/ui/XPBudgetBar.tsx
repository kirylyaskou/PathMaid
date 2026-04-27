import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { generateEncounterBudgets, calculateEncounterRating } from '@engine'
import type { ThreatRating } from '@engine'
import { cn } from "@/shared/lib/utils"

interface XPBudgetBarProps {
  currentXP: number
  partySize: number
  className?: string
}

const threatColors: Record<ThreatRating, string> = {
  trivial: "bg-pf-threat-trivial",
  low: "bg-pf-threat-low",
  moderate: "bg-pf-threat-moderate",
  severe: "bg-pf-threat-severe",
  extreme: "bg-pf-threat-extreme",
}

const threatTextColors: Record<ThreatRating, string> = {
  trivial: "text-pf-threat-trivial",
  low: "text-pf-threat-low",
  moderate: "text-pf-threat-moderate",
  severe: "text-pf-threat-severe",
  extreme: "text-pf-threat-extreme",
}

export function XPBudgetBar({ currentXP, partySize, className }: XPBudgetBarProps) {
  const { t } = useTranslation('common')
  const thresholds = generateEncounterBudgets(partySize)
  const threatLevel = calculateEncounterRating(currentXP, partySize)
  const maxXP = thresholds.extreme * 1.5 // extend bar beyond extreme for visual

  // Calculate segment widths as percentages
  const trivialWidth = (thresholds.trivial / maxXP) * 100
  const lowWidth = ((thresholds.low - thresholds.trivial) / maxXP) * 100
  const moderateWidth = ((thresholds.moderate - thresholds.low) / maxXP) * 100
  const severeWidth = ((thresholds.severe - thresholds.moderate) / maxXP) * 100
  const extremeWidth = ((thresholds.extreme - thresholds.severe) / maxXP) * 100
  const beyondWidth = 100 - trivialWidth - lowWidth - moderateWidth - severeWidth - extremeWidth

  // Current XP indicator position
  const indicatorPosition = Math.min((currentXP / maxXP) * 100, 100)

  const thresholdLabels = useMemo<[ThreatRating, number, string][]>(() => [
    ['trivial',  thresholds.trivial,  t('entities.encounter.trivial',  { n: thresholds.trivial })],
    ['low',      thresholds.low,      t('entities.encounter.low',      { n: thresholds.low })],
    ['moderate', thresholds.moderate, t('entities.encounter.moderate', { n: thresholds.moderate })],
    ['severe',   thresholds.severe,   t('entities.encounter.severe',   { n: thresholds.severe })],
    ['extreme',  thresholds.extreme,  t('entities.encounter.extreme',  { n: thresholds.extreme })],
  ], [t, thresholds])

  return (
    <div className={cn("space-y-2", className)}>
      {/* Threat Level Display - Grimdark */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('entities.encounter.threatAssessment')}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">{currentXP} XP</span>
          <span
            className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
              threatColors[threatLevel],
              "text-background",
              threatLevel === 'extreme' && "animate-pulse"
            )}
          >
            {threatLevel === 'extreme' ? 'TPK' : threatLevel}
          </span>
        </div>
      </div>

      {/* Progress Bar - Grimdark */}
      <div className="relative">
        <div className={cn("flex h-2 rounded overflow-hidden bg-secondary/50 border border-border/50", threatLevel === 'extreme' && "animate-fire-glow")}>
          <div
            className="bg-pf-threat-trivial/80"
            style={{ width: `${trivialWidth}%` }}
          />
          <div
            className="bg-pf-threat-low/80"
            style={{ width: `${lowWidth}%` }}
          />
          <div
            className="bg-pf-threat-moderate/80"
            style={{ width: `${moderateWidth}%` }}
          />
          <div
            className="bg-pf-threat-severe/80"
            style={{ width: `${severeWidth}%` }}
          />
          <div
            className="bg-pf-threat-extreme/80"
            style={{ width: `${extremeWidth}%` }}
          />
          <div
            className="bg-pf-threat-extreme/30"
            style={{ width: `${beyondWidth}%` }}
          />
        </div>

        {/* Current XP Indicator */}
        <div
          className="absolute top-0 w-0.5 h-4 -mt-1 bg-foreground shadow-lg transform -translate-x-1/2 transition-all duration-300"
          style={{ left: `${indicatorPosition}%` }}
        />
      </div>

      {/* Threshold Labels — absolutely positioned to match bar segments */}
      <div className="relative h-4 text-[10px] font-mono">
        <span className="absolute left-0 text-muted-foreground">0</span>
        {thresholdLabels.map(([tier, xp, label]) => (
          <span
            key={tier}
            className={cn("absolute -translate-x-1/2", threatTextColors[tier])}
            style={{ left: `${(xp / maxXP) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
