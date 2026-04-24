import { cn } from '@/shared/lib/utils'
import { formatModifier, formatRollFormula } from '@/shared/lib/format'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import type { StatModifierResult } from '../model/use-modified-stats'
import type { SkillLoc } from '@/shared/i18n'

interface SkillRowData {
  name: string
  modifier: number
  calculated?: boolean
}

interface CreatureSkillsLineProps {
  skills: SkillRowData[]
  modStats: Map<string, StatModifierResult>
  onRoll: (formula: string, label: string) => void
  skillsLoc?: SkillLoc[]
}

export function CreatureSkillsLine({ skills, modStats, onRoll, skillsLoc }: CreatureSkillsLineProps) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {skills.map((skill) => {
        // Engine key (EN) is used for modStats lookup — never swap it for the display name.
        const loc = skillsLoc?.find((s) => s.engineKey === skill.name)
        return (
          <SkillEntry
            key={skill.name}
            skill={skill}
            modStats={modStats}
            onRoll={onRoll}
            displayName={loc?.name}
          />
        )
      })}
    </div>
  )
}

function SkillEntry({
  skill,
  modStats,
  onRoll,
  displayName,
}: {
  skill: SkillRowData
  modStats: Map<string, StatModifierResult>
  onRoll: (formula: string, label: string) => void
  displayName?: string
}) {
  // Engine key drives modStats lookup; display name is presentation-only.
  const skillMod = modStats.get(skill.name.toLowerCase())
  const net = skillMod?.netModifier ?? 0
  const finalMod = skill.modifier + net
  const label = displayName ?? skill.name
  const btnColor =
    net < 0
      ? 'text-pf-blood decoration-pf-blood/50'
      : net > 0
        ? 'text-pf-threat-low decoration-pf-threat-low/50'
        : 'text-primary decoration-primary/50'
  return (
    <span className={skill.calculated ? 'opacity-40' : ''}>
      <span className="text-muted-foreground">{label}</span>{' '}
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
