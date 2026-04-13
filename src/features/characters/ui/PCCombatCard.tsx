import { useMemo } from 'react'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { SectionHeader } from '@/shared/ui/section-header'
import { LevelBadge } from '@/shared/ui/level-badge'
import { TraitList } from '@/shared/ui/trait-pill'
import { cn } from '@/shared/lib/utils'
import { useRoll } from '@/shared/hooks'
import { formatModifier, formatRollFormula } from '@/shared/lib/format'
import { profRankLabel, PROF_RANK_CLASS } from '@/shared/lib/pf2e-display'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import { useModifiedStats, useSpellModifiers } from '@/entities/creature'
import type { StatModifierResult } from '@/entities/creature'
import { SpellInlineCard, TRADITION_COLORS } from '@/entities/spell'
import { FeatInlineCard } from '@/entities/feat'
import type {
  PathbuilderBuild,
  PathbuilderAbilities,
  PathbuilderProficiencies,
  PathbuilderSpellEntry,
} from '@engine'
import { abilityModifier, proficiencyModifier, SKILL_ABILITY } from '@engine'
import { ChevronDown } from 'lucide-react'
import type { Combatant } from '@/entities/combatant'

interface PCCombatCardProps {
  build: PathbuilderBuild
  combatant: Combatant
  encounterId?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ABILITY_DISPLAY: Array<[string, keyof PathbuilderAbilities]> = [
  ['STR', 'str'], ['DEX', 'dex'], ['CON', 'con'],
  ['INT', 'int'], ['WIS', 'wis'], ['CHA', 'cha'],
]

const WEAPON_PROF_MAP: Record<string, keyof PathbuilderProficiencies> = {
  simple: 'simple',
  martial: 'martial',
  advanced: 'advanced',
  unarmed: 'unarmed',
}

const STRIKING_DICE: Record<string, number> = {
  striking: 2,
  greaterStriking: 3,
  majorStriking: 4,
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// All skill slugs for useModifiedStats
const ALL_STAT_SLUGS = [
  'fortitude', 'reflex', 'will', 'perception', 'strike-attack',
  ...Object.keys(SKILL_ABILITY),
]


// ── Sub-components ────────────────────────────────────────────────────────────

function StatCell({ label, value, colorClass, highlight, onRoll, modResult }: {
  label: string
  value: string | number
  colorClass?: string
  highlight?: boolean
  onRoll?: () => void
  modResult?: StatModifierResult
}) {
  const net = modResult?.netModifier ?? 0
  const valClass = cn(
    'font-mono font-bold text-base leading-tight',
    highlight
      ? 'text-pf-threat-extreme'
      : net < 0 ? 'text-pf-blood'
      : net > 0 ? 'text-pf-threat-low'
      : (colorClass ?? 'text-foreground'),
  )
  const el = onRoll ? (
    <button
      onClick={onRoll}
      className={cn(valClass, 'cursor-pointer underline decoration-dotted underline-offset-2 hover:text-pf-gold transition-colors duration-100')}
    >
      {value}
    </button>
  ) : (
    <p className={valClass}>{value}</p>
  )
  return (
    <div className="flex-1 px-2 py-2.5 text-center">
      <p className="text-[10px] text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</p>
      <ModifierTooltip modifiers={modResult?.modifiers ?? []} netModifier={net} finalDisplay={String(value)}>
        {el}
      </ModifierTooltip>
    </div>
  )
}

// PCSpellCaster — one per spellcasting entry, hooks called at component level
function PCSpellCaster({ caster, abilities, level, combatantId, handleRoll }: {
  caster: PathbuilderSpellEntry
  abilities: PathbuilderAbilities
  level: number
  combatantId: string
  handleRoll: (formula: string, label?: string) => void
}) {
  const tradition = caster.magicTradition.toLowerCase()
  const typeLabel = caster.spellcastingType === 'focus' ? 'Focus'
    : caster.spellcastingType.charAt(0).toUpperCase() + caster.spellcastingType.slice(1)

  const abilityKey = caster.ability as keyof PathbuilderAbilities
  const baseSpellAtk = proficiencyModifier(caster.proficiency, abilities[abilityKey], level)
  const baseSpellDC = 10 + baseSpellAtk

  const spellMod = useSpellModifiers(combatantId, tradition)
  const finalSpellAtk = baseSpellAtk + spellMod.netModifier
  const finalSpellDC = baseSpellDC + spellMod.netModifier

  const atkColor = spellMod.netModifier < 0
    ? 'text-pf-blood decoration-pf-blood/50'
    : spellMod.netModifier > 0
      ? 'text-pf-threat-low decoration-pf-threat-low/50'
      : 'text-primary decoration-primary/50'
  const dcCol = spellMod.netModifier < 0 ? 'text-pf-blood'
    : spellMod.netModifier > 0 ? 'text-pf-threat-low' : 'text-primary'

  const atkBtn = (
    <button
      onClick={() => handleRoll(formatRollFormula(finalSpellAtk), `${tradition} spell attack`)}
      title={`Roll spell attack ${formatRollFormula(finalSpellAtk)}`}
      className={cn(
        'font-mono font-bold cursor-pointer underline decoration-dotted underline-offset-2 hover:text-pf-gold transition-colors duration-100',
        atkColor,
      )}
    >
      {formatModifier(finalSpellAtk)}
    </button>
  )

  return (
    <Collapsible defaultOpen>
      <div className="flex items-center w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40">
        <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:opacity-80 transition-opacity">
          <span className="font-semibold text-sm text-foreground">Spellcasting</span>
          <span className={cn(
            'px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold',
            TRADITION_COLORS[tradition] ?? 'bg-secondary text-secondary-foreground border-border',
          )}>
            {tradition} {typeLabel}
          </span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="px-4 pb-3 pt-2 space-y-3">
          {/* DC + Attack */}
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">DC{' '}
              <ModifierTooltip modifiers={spellMod.modifiers} netModifier={spellMod.netModifier} finalDisplay={String(finalSpellDC)}>
                <span className={cn('font-mono font-bold', dcCol)}>{finalSpellDC}</span>
              </ModifierTooltip>
            </span>
            <span className="text-muted-foreground">Attack{' '}
              <ModifierTooltip modifiers={spellMod.modifiers} netModifier={spellMod.netModifier} finalDisplay={formatModifier(finalSpellAtk)}>
                {atkBtn}
              </ModifierTooltip>
            </span>
          </div>

          {/* Spells by rank */}
          {(caster.spells ?? []).map((group) => (
            <div key={group.spellLevel}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.spellLevel === 0 ? 'Cantrips' : `Rank ${group.spellLevel}`}
                </span>
                {group.spellLevel > 0 && (caster.perDay[group.spellLevel] ?? 0) > 0 && (
                  <span className="text-xs text-muted-foreground">({caster.perDay[group.spellLevel]}/day)</span>
                )}
              </div>
              <div className="space-y-1">
                {group.list.map((name) => (
                  <SpellInlineCard key={name} spellName={name} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PCCombatCard({ build, combatant, encounterId }: PCCombatCardProps) {
  const handleRoll = useRoll(build.name, encounterId)
  const { abilities, proficiencies, level } = build

  function rollCheck(mod: number, label: string) {
    handleRoll(formatRollFormula(mod), label)
  }

  // Condition modifiers
  const modStats = useModifiedStats(combatant.id, ALL_STAT_SLUGS)

  // Base saves + perception
  const saveData = [
    { label: 'Fort', key: 'fortitude', base: proficiencyModifier(proficiencies.fortitude, abilities.con, level), rollLabel: 'Fortitude save' },
    { label: 'Ref',  key: 'reflex',    base: proficiencyModifier(proficiencies.reflex, abilities.dex, level),    rollLabel: 'Reflex save' },
    { label: 'Will', key: 'will',      base: proficiencyModifier(proficiencies.will, abilities.wis, level),      rollLabel: 'Will save' },
  ]
  const basePerception = proficiencyModifier(proficiencies.perception, abilities.wis, level)
  const percResult = modStats.get('perception')
  const finalPerception = basePerception + (percResult?.netModifier ?? 0)

  // Skills
  const profs = proficiencies as unknown as Record<string, number>
  const skills = useMemo(
    () =>
      Object.keys(SKILL_ABILITY)
        .map((key) => ({
          key,
          name: key.charAt(0).toUpperCase() + key.slice(1),
          prof: profs[key] ?? 0,
          mod: proficiencyModifier(profs[key] ?? 0, abilities[SKILL_ABILITY[key]], level),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [build]
  )
  const lores = useMemo(
    () =>
      (build.lores ?? []).map(([name, prof]) => ({
        name,
        prof,
        mod: proficiencyModifier(prof, abilities.int, level),
      })),
    [build]
  )

  const weapons = build.weapons ?? []
  const casters = build.spellCasters ?? []
  const feats = build.feats ?? []
  const specials = (build.specials ?? []).filter(
    (s) => s !== 'Low-Light Vision' && s !== 'Darkvision'
  )

  // Weapon attack condition modifier
  const strikeResult = modStats.get('strike-attack')
  const strikeNet = strikeResult?.netModifier ?? 0

  return (
    <Card className="overflow-hidden card-grimdark border-border/50 border-l-[3px] border-l-pf-gold rounded-none border-x-0 border-t-0">
      {/* Header */}
      <CardHeader className="-mt-6 pb-2 stat-block-header border-b border-primary/20">
        <div className="flex items-start gap-3">
          <LevelBadge level={level} size="lg" />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold tracking-tight">{build.name}</h2>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
              {build.ancestry} {build.class}
            </p>
            {build.traits?.length > 0 && (
              <TraitList traits={build.traits} className="mt-2" showRarity={false} showSize={false} />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Core stats */}
        <div className="flex flex-nowrap border-b border-border/40">
          <StatCell label="HP" value={`${combatant.hp}/${combatant.maxHp}`} highlight />
          <StatCell label="AC" value={'—'} colorClass="text-pf-gold" />
          {saveData.map((s) => {
            const modResult = modStats.get(s.key)
            const net = modResult?.netModifier ?? 0
            const finalVal = s.base + net
            return (
              <StatCell
                key={s.label}
                label={s.label}
                value={formatModifier(finalVal)}
                colorClass="text-pf-threat-low"
                modResult={modResult}
                onRoll={() => rollCheck(finalVal, s.rollLabel)}
              />
            )
          })}
          <StatCell
            label="Perc"
            value={formatModifier(finalPerception)}
            colorClass="text-pf-gold-dim"
            modResult={percResult}
            onRoll={() => rollCheck(finalPerception, 'Perception check')}
          />
        </div>

        {/* Ability scores */}
        <div className="grid grid-cols-6 border-b border-border/40">
          {ABILITY_DISPLAY.map(([label, key]) => (
            <div key={key} className="py-2 text-center">
              <p className="font-mono font-semibold text-sm">{formatModifier(abilityModifier(abilities[key]))}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* Skills */}
        <Collapsible defaultOpen>
          <SectionHeader>Skills</SectionHeader>
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-2">
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {skills.map((skill) => {
                  const rank = profRankLabel(skill.prof)
                  const modResult = modStats.get(skill.key)
                  const net = modResult?.netModifier ?? 0
                  const finalMod = skill.mod + net
                  const btnColor = net < 0
                    ? 'text-pf-blood decoration-pf-blood/50'
                    : net > 0
                      ? 'text-pf-threat-low decoration-pf-threat-low/50'
                      : 'text-primary decoration-primary/50'

                  const btn = (
                    <button
                      onClick={() => rollCheck(finalMod, `${skill.name} check`)}
                      title={`Roll ${formatRollFormula(finalMod)}`}
                      className={cn(
                        'font-mono font-bold cursor-pointer underline decoration-dotted underline-offset-2 hover:text-pf-gold transition-colors duration-100',
                        btnColor,
                      )}
                    >
                      {formatModifier(finalMod)}
                    </button>
                  )

                  return (
                    <span key={skill.key} className="inline-flex items-center gap-1 text-sm">
                      <span className={cn(
                        'inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-semibold shrink-0',
                        PROF_RANK_CLASS[rank],
                      )}>
                        {rank}
                      </span>
                      <span className="text-muted-foreground">{skill.name}</span>{' '}
                      <ModifierTooltip modifiers={modResult?.modifiers ?? []} netModifier={net} finalDisplay={formatModifier(finalMod)}>
                        {btn}
                      </ModifierTooltip>
                    </span>
                  )
                })}
                {lores.map((lore) => {
                  const rank = profRankLabel(lore.prof)
                  return (
                    <span key={lore.name} className="inline-flex items-center gap-1 text-sm">
                      <span className={cn(
                        'inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-semibold shrink-0',
                        PROF_RANK_CLASS[rank],
                      )}>
                        {rank}
                      </span>
                      <span className="text-muted-foreground italic">{lore.name} Lore</span>{' '}
                      <button
                        onClick={() => rollCheck(lore.mod, `${lore.name} Lore check`)}
                        title={`Roll ${formatRollFormula(lore.mod)}`}
                        className="font-mono font-bold cursor-pointer underline decoration-dotted underline-offset-2 text-primary decoration-primary/50 hover:text-pf-gold transition-colors duration-100"
                      >
                        {formatModifier(lore.mod)}
                      </button>
                    </span>
                  )
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Strikes */}
        {weapons.length > 0 && (
          <>
            <Separator />
            <Collapsible defaultOpen>
              <SectionHeader>Strikes</SectionHeader>
              <CollapsibleContent>
                <div className="px-4 py-3 space-y-3">
                  {weapons.map((w, i) => {
                    const profKey = WEAPON_PROF_MAP[w.prof] ?? 'simple'
                    const weaponProf = (proficiencies as unknown as Record<string, number>)[profKey] ?? 0
                    const baseAtkMod = proficiencyModifier(weaponProf, abilities.str, level) + w.pot
                    const finalAtkMod = baseAtkMod + strikeNet
                    const map1 = finalAtkMod - 5
                    const map2 = finalAtkMod - 10
                    const dice = STRIKING_DICE[w.str] ?? 1
                    const strMod = abilityModifier(abilities.str)
                    const dmgBonus = strMod !== 0 ? formatModifier(strMod) : ''
                    const atkBtnColor = strikeNet < 0
                      ? 'text-pf-blood decoration-pf-blood/50'
                      : strikeNet > 0
                        ? 'text-pf-threat-low decoration-pf-threat-low/50'
                        : 'text-primary decoration-primary/50'

                    const atkBtn = (
                      <button
                        onClick={() => handleRoll(formatRollFormula(finalAtkMod), `${w.name} attack`)}
                        title={`Roll ${formatRollFormula(finalAtkMod)}`}
                        className={cn(
                          'font-mono font-bold cursor-pointer underline decoration-dotted underline-offset-2 hover:text-pf-gold transition-colors duration-100',
                          atkBtnColor,
                        )}
                      >
                        {formatModifier(finalAtkMod)}
                      </button>
                    )

                    return (
                      <div key={i} className="p-3 rounded-md bg-secondary/50">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{w.name}</span>
                          <ModifierTooltip modifiers={strikeResult?.modifiers ?? []} netModifier={strikeNet} finalDisplay={formatModifier(finalAtkMod)}>
                            {atkBtn}
                          </ModifierTooltip>
                        </div>
                        <div className="mt-1 text-sm">
                          <span className="font-semibold">Damage </span>
                          <button
                            onClick={() => handleRoll(`${dice}${w.die}${dmgBonus}`, `${w.name} damage`)}
                            title={`Roll ${dice}${w.die}${dmgBonus}`}
                            className="font-mono font-bold cursor-pointer underline decoration-dotted underline-offset-2 decoration-pf-gold/60 hover:text-pf-gold transition-colors duration-100"
                          >
                            {dice}{w.die}{dmgBonus}
                          </button>
                          <span className="text-muted-foreground ml-1">{w.damageType}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground font-mono">
                          MAP:{' '}
                          <span className={strikeNet < 0 ? 'text-pf-blood' : strikeNet > 0 ? 'text-pf-threat-low' : 'text-primary'}>
                            {formatModifier(finalAtkMod)}
                          </span>
                          {' / '}
                          <span>{formatModifier(map1)}</span>
                          {' / '}
                          <span>{formatModifier(map2)}</span>
                        </div>
                        {w.runes.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {w.runes.map((r) => (
                              <span key={r} className="px-1.5 py-0.5 text-xs rounded bg-secondary text-secondary-foreground">
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Spells — one PCSpellCaster per entry */}
        {casters.map((caster, i) => (
          <div key={i}>
            <Separator />
            <PCSpellCaster
              caster={caster}
              abilities={abilities}
              level={level}
              combatantId={combatant.id}
              handleRoll={handleRoll}
            />
          </div>
        ))}

        {/* Feats & Class Features */}
        {(feats.length > 0 || specials.length > 0) && (
          <>
            <Separator />
            <Collapsible defaultOpen={false}>
              <SectionHeader>Feats & Features</SectionHeader>
              <CollapsibleContent>
                <div className="px-4 py-3 space-y-1">
                  {feats.map(([name, , type, lvl, note], i) => (
                    <FeatInlineCard
                      key={i}
                      featName={name}
                      typeLabel={type}
                      level={lvl}
                      note={note && !UUID_RE.test(note) ? note : undefined}
                    />
                  ))}
                  {specials.map((name, i) => (
                    <FeatInlineCard key={i} featName={name} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </CardContent>
    </Card>
  )
}
