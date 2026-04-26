import { cn } from '@/shared/lib/utils'
import { formatModifier, formatRollFormula } from '@/shared/lib/format'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import { useCurrentLocale } from '@/shared/i18n'
import { getSkillLabel } from '@/shared/i18n/pf2e-content'
import type { StatModifierResult } from '../model/use-modified-stats'
import type { SupportedLocale } from '@/shared/i18n/config'

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
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
    <span className={skill.calculated ? 'opacity-40' : ''}>
      <span className="text-muted-foreground">{displayLabel}</span>{' '}
      <ModifierTooltip
        modifiers={skillMod?.modifiers ?? []}
        netModifier={net}
        finalDisplay={formatModifier(finalMod)}
      >
        <button
          onClick={() => onRoll(formatRollFormula(finalMod), `${skill.name} check`)}
          title={`Roll ${skill.name} check`}
          className={cn(
            'font-mono font-bold cursor-pointer underline decoration-dotted underline-offset-2 hover:text-pf-gold transition-colors duration-100',
            btnColor,
          )}
        >
          {finalMod >= 0 ? '+' : ''}{finalMod}
        </button>
      </ModifierTooltip>
    </span>
  )
}
