import { cn } from '@/shared/lib/utils'
import { formatModifier, formatRollFormula } from '@/shared/lib/format'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import { useCurrentLocale, getSkillLabel, type SupportedLocale } from '@/shared/i18n'
import type { StatModifierResult } from '../model/use-modified-stats'

interface SkillRowData {
  name: string
  modifier: number
  calculated?: boolean
}

interface CreatureSkillsLineProps {
  skills: SkillRowData[]
  modStats: Map<string, StatModifierResult>
  onRoll: (formula: string, label: string) => void
}

export function CreatureSkillsLine({ skills, modStats, onRoll }: CreatureSkillsLineProps) {
  const locale = useCurrentLocale()
  return (
    <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2 2xl:grid-cols-3">
      {skills.map((skill) => (
        <SkillEntry
          key={skill.name}
          skill={skill}
          modStats={modStats}
          onRoll={onRoll}
          locale={locale}
        />
      ))}
    </div>
  )
}

function SkillEntry({
  skill,
  modStats,
  onRoll,
  locale,
}: {
  skill: SkillRowData
  modStats: Map<string, StatModifierResult>
  onRoll: (formula: string, label: string) => void
  locale: SupportedLocale
}) {
  const skillMod = modStats.get(skill.name.toLowerCase())
  const net = skillMod?.netModifier ?? 0
  const finalMod = skill.modifier + net
  const displayLabel = getSkillLabel(skill.name, locale)
  const btnColor =
    net < 0
      ? 'text-pf-blood decoration-pf-blood/50'
      : net > 0
        ? 'text-pf-threat-low decoration-pf-threat-low/50'
        : 'text-primary decoration-primary/50'
  return (
    <span
      className={cn(
        'flex min-w-0 items-center justify-between gap-2 rounded border border-border/30 bg-secondary/10 px-2 py-1',
        skill.calculated && 'opacity-40',
      )}
    >
      <span className="truncate text-muted-foreground">{displayLabel}</span>
      <ModifierTooltip
        modifiers={skillMod?.modifiers ?? []}
        netModifier={net}
        finalDisplay={formatModifier(finalMod)}
      >
        <button
          onClick={() => onRoll(formatRollFormula(finalMod), `${skill.name} check`)}
          title={`Roll ${skill.name} check`}
          className={cn(
            'shrink-0 font-mono font-bold cursor-pointer underline decoration-dotted underline-offset-2 hover:text-pf-gold transition-colors duration-100',
            btnColor,
          )}
        >
          {finalMod >= 0 ? '+' : ''}{finalMod}
        </button>
      </ModifierTooltip>
    </span>
  )
}
