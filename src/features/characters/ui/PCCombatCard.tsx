import { useMemo } from 'react'
import { ScrollArea } from '@/shared/ui/scroll-area'
import type { PathbuilderBuild, PathbuilderAbilities } from '@engine'
import type { Combatant } from '@/entities/combatant'

interface PCCombatCardProps {
  build: PathbuilderBuild
  combatant: Combatant
}

const RANK_CLASS: Record<string, string> = {
  U: 'bg-muted text-muted-foreground',
  T: 'bg-pf-threat-low/15 text-pf-threat-low',
  E: 'bg-pf-skill-expert/15 text-pf-skill-expert',
  M: 'bg-pf-rarity-rare/15 text-pf-rarity-rare',
  L: 'bg-pf-gold/15 text-pf-gold',
}

const SKILL_ABILITY: Record<string, keyof PathbuilderAbilities> = {
  acrobatics: 'dex', arcana: 'int', athletics: 'str', crafting: 'int',
  deception: 'cha', diplomacy: 'cha', intimidation: 'cha',
  medicine: 'wis', nature: 'wis', occultism: 'int', performance: 'cha',
  religion: 'wis', society: 'int', stealth: 'dex', survival: 'wis',
  thievery: 'dex',
}

const ABILITY_DISPLAY: Array<[string, keyof PathbuilderAbilities]> = [
  ['STR', 'str'], ['DEX', 'dex'], ['CON', 'con'],
  ['INT', 'int'], ['WIS', 'wis'], ['CHA', 'cha'],
]

export function PCCombatCard({ build, combatant }: PCCombatCardProps) {
  const { abilities, proficiencies, level } = build

  const abilityMod = (score: number) => Math.floor((score - 10) / 2)
  const signed = (n: number) => (n >= 0 ? `+${n}` : String(n))
  const rankLabel = (prof: number): string =>
    prof >= 8 ? 'L' : prof >= 6 ? 'M' : prof >= 4 ? 'E' : prof >= 2 ? 'T' : 'U'
  const modWithProf = (prof: number, score: number) => {
    const mod = abilityMod(score)
    return prof > 0 ? mod + level + prof : mod
  }

  const saves = [
    { label: 'Fort', value: modWithProf(proficiencies.fortitude, abilities.con) },
    { label: 'Ref',  value: modWithProf(proficiencies.reflex, abilities.dex) },
    { label: 'Will', value: modWithProf(proficiencies.will, abilities.wis) },
  ]

  const profs = proficiencies as unknown as Record<string, number>
  const skills = useMemo(
    () =>
      Object.keys(SKILL_ABILITY)
        .map((key) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          prof: profs[key] ?? 0,
          mod: modWithProf(profs[key] ?? 0, abilities[SKILL_ABILITY[key]]),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [build]
  )

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div>
        <p className="text-base font-semibold">{build.name}</p>
        <p className="text-xs text-muted-foreground">
          {build.class} {level}
        </p>
      </div>

      {/* HP + AC */}
      <div className="border-t border-border/50 pt-3 flex gap-4">
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold font-mono">
            {combatant.hp} / {combatant.maxHp}
          </span>
          <span className="text-xs text-muted-foreground">HP</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold font-mono">{combatant.ac ?? '—'}</span>
          <span className="text-xs text-muted-foreground">AC</span>
        </div>
      </div>

      {/* Ability scores */}
      <div className="border-t border-border/50 pt-3">
        <div className="grid grid-cols-6 gap-1 text-center">
          {ABILITY_DISPLAY.map(([label, key]) => {
            const score = abilities[key]
            const mod = abilityMod(score)
            return (
              <div key={key}>
                <div className="text-xs font-mono text-foreground">{signed(mod)}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Saves */}
      <div className="border-t border-border/50 pt-3">
        <p className="text-xs text-muted-foreground mb-1.5">Saves</p>
        <div className="flex gap-4">
          {saves.map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <span className="text-sm font-mono">{signed(s.value)}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Skills */}
      <div className="border-t border-border/50 pt-3">
        <p className="text-xs text-muted-foreground mb-1.5">Skills</p>
        <ScrollArea className="max-h-48">
          <div className="space-y-0.5">
            {skills.map((skill) => {
              const rank = rankLabel(skill.prof)
              return (
                <div key={skill.name} className="flex items-center gap-2 text-sm">
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-semibold ${RANK_CLASS[rank]}`}
                  >
                    {rank}
                  </span>
                  <span className="flex-1 text-sm">{skill.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {signed(skill.mod)}
                  </span>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
