import { useState, useEffect, useMemo } from "react"
import { useRoll } from '@/shared/hooks'
import { formatModifier, formatRollFormula } from '@/shared/lib/format'
import { damageTypeColor } from '@/shared/lib/damage-colors'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import { ClickableFormula } from '@/shared/ui/clickable-formula'
import { cn } from "@/shared/lib/utils"
import { Card, CardContent, CardHeader } from "@/shared/ui/card"
import { Separator } from "@/shared/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
} from "@/shared/ui/collapsible"
import { Swords, Shield as ShieldIcon, Sparkles } from "lucide-react"
import { SectionHeader } from "@/shared/ui/section-header"
import { LevelBadge } from "@/shared/ui/level-badge"
import { TraitList } from "@/shared/ui/trait-pill"
import { ActionIcon } from "@/shared/ui/action-icon"
import { AbilityCard } from "@/shared/ui/ability-card"
import type { CreatureStatBlockData } from '../model/types'
import { stripHtml } from '@/shared/lib/html'
import { useModifiedStats } from '../model/use-modified-stats'
import { useCombatantStore } from '@/entities/combatant'
import { classifyAbilities } from '../model/classify-abilities'
import { highlightGameText } from '../lib/foundry-text'
import { StatItem } from './StatItem'
import { SpellcastingBlock } from './SpellcastingBlock'
import { EquipmentBlock } from './EquipmentBlock'

import type { StatModifierResult } from '../model/use-modified-stats'

/** Renders a DC value (Spell DC / Class DC) with condition modifier tinting. */
function DcDisplay({
  label,
  baseDc,
  modResult,
}: {
  label: string
  baseDc: number
  modResult: StatModifierResult | undefined
}) {
  const net = modResult?.netModifier ?? 0
  const finalDc = baseDc + net
  const col = net < 0 ? 'text-pf-blood' : net > 0 ? 'text-pf-threat-low' : 'text-primary'
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <ModifierTooltip modifiers={modResult?.modifiers ?? []} netModifier={net} finalDisplay={String(finalDc)}>
        <p className={cn('font-mono font-bold text-lg', col)}>{finalDc}</p>
      </ModifierTooltip>
    </div>
  )
}

export interface EncounterContext {
  encounterId: string
  combatantId: string
  /** Called after any encounter-inventory mutation so parent can reload hasShield etc. */
  onInventoryChanged?: () => void
}

interface CreatureStatBlockProps {
  creature: CreatureStatBlockData
  className?: string
  encounterContext?: EncounterContext
}

export function CreatureStatBlock({ creature, className, encounterContext }: CreatureStatBlockProps) {
  const handleRoll = useRoll(creature.name, encounterContext?.encounterId)

  // Phase 39: build stat slug list for condition modifier computation
  const allStatSlugs = useMemo(
    () => [
      'ac', 'fortitude', 'reflex', 'will', 'perception',
      'strike-attack',        // virtual: ranged + 'all'-selector conditions (frightened, sickened)
      'melee-strike-attack',  // virtual: melee strikes — also receives enfeebled (str-based)
      'spell-dc',             // virtual: 'all'-selector conditions for core DC display
      ...creature.skills.map((s) => s.name.toLowerCase()),
    ],
    [creature.skills],
  )
  const modStats = useModifiedStats(encounterContext?.combatantId, allStatSlugs)

  // FEAT-11: per-strike MAP counter — clickable MAP numbers drive the mapIndex
  // on the selected combatant, so strikes from the stat block roll at the correct
  // Multiple Attack Penalty. Lives here (not in CombatantDetail) so it sits next
  // to the attack numbers it controls.
  const mapCombatantId = encounterContext?.combatantId
  const mapCombatant = useCombatantStore((s) =>
    mapCombatantId ? s.combatants.find((c) => c.id === mapCombatantId) : undefined,
  )
  const updateCombatantAction = useCombatantStore((s) => s.updateCombatant)
  const currentMapIndex = mapCombatant?.mapIndex ?? 0

  // FEAT-04: detect troops/swarms from traits — they use a specialized layout
  // (no Strikes, collective damage in Actions, troop HP segments rendered inline).
  const traitsLower = useMemo(
    () => creature.traits.map((t) => t.toLowerCase()),
    [creature.traits],
  )
  const isTroop = traitsLower.includes('troop')
  const isSwarm = traitsLower.includes('swarm')
  const isSpecialFormation = isTroop || isSwarm

  // FEAT-03a: hide Strikes section when the creature has none (troops/swarms also skip)
  const hasStrikes = creature.strikes.length > 0 && !isSpecialFormation

  // FEAT-09: derive shield AC bonus from creature equipment data
  const derivedShieldAcBonus = useMemo(() => {
    if (!creature.equipment) return 0
    const shield = creature.equipment.find(
      (it) => it.item_type === 'shield' || (it.item_name ?? '').toLowerCase().includes('shield'),
    )
    return shield?.ac_bonus ?? 0
  }, [creature.equipment])

  // FEAT-04: extract "Troop Defenses" ability for inline HP segment display
  const troopDefenses = useMemo(() => {
    if (!isTroop) return null
    return (
      creature.abilities.find((a) => a.name.toLowerCase().includes('troop defenses')) ?? null
    )
  }, [isTroop, creature.abilities])

  // FEAT-03b: classify abilities into Offensive / Defensive / Reactions / Other.
  // No Foundry 'category' field exists on the current data model — use trait/name heuristics.
  const classifiedAbilities = useMemo(
    () => classifyAbilities(creature.abilities, {
      isSpecialFormation,
      troopDefensesName: troopDefenses?.name?.toLowerCase() ?? '',
    }),
    [creature.abilities, isSpecialFormation, troopDefenses],
  )

  const [actionTab, setActionTab] = useState<'offensive' | 'defensive' | 'other'>('offensive')

  // Auto-select the first non-empty tab so the initial view shows content.
  useEffect(() => {
    if (actionTab === 'offensive' && classifiedAbilities.offensive.length === 0) {
      if (classifiedAbilities.defensive.length > 0) setActionTab('defensive')
      else if (classifiedAbilities.other.length > 0) setActionTab('other')
    }
  }, [classifiedAbilities.offensive.length, classifiedAbilities.defensive.length, classifiedAbilities.other.length])

  return (
    <Card className={cn("overflow-hidden card-grimdark border-border/50 border-l-[3px] border-l-pf-gold", className)}>
      {/* Header - Grimdark */}
      <CardHeader className="-mt-6 pb-2 stat-block-header border-b border-primary/20">
        <div className="flex items-start gap-4">
          <LevelBadge level={creature.level} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{creature.name}</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
              {creature.size} {creature.type}
            </p>
            <TraitList
              traits={creature.traits}
              rarity={creature.rarity}
              size={creature.size}
              className="mt-2"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Core Stats */}
        <div className="pb-4 bg-card [@container-type:inline-size]">
          <div className="flex flex-nowrap overflow-hidden">
            <StatItem label="HP" value={creature.hp} highlight />
            <StatItem
              label={mapCombatant?.shieldRaised ? 'AC*' : 'AC'}
              value={creature.ac + (mapCombatant?.shieldRaised ? derivedShieldAcBonus : 0)}
              colorClass="text-pf-gold"
              modResult={modStats.get('ac')}
            />
            <StatItem label="Fort" value={creature.fort} modifier colorClass="text-pf-threat-low" showDc modResult={modStats.get('fortitude')} onRoll={(f) => handleRoll(f, 'Fortitude save')} />
            <StatItem label="Ref" value={creature.ref} modifier colorClass="text-pf-threat-low" showDc modResult={modStats.get('reflex')} onRoll={(f) => handleRoll(f, 'Reflex save')} />
            <StatItem label="Will" value={creature.will} modifier colorClass="text-pf-threat-low" showDc modResult={modStats.get('will')} onRoll={(f) => handleRoll(f, 'Will save')} />
            <StatItem label="Perception" value={creature.perception} modifier colorClass="text-pf-gold-dim" showDc modResult={modStats.get('perception')} onRoll={(f) => handleRoll(f, 'Perception check')} />
          </div>
          {(creature.spellDC != null || creature.classDC != null) && (
            <div className="flex gap-6 mt-3 pt-3 border-t border-border/40">
              {creature.spellDC != null && (
                <DcDisplay label="Spell DC" baseDc={creature.spellDC} modResult={modStats.get('spell-dc')} />
              )}
              {creature.classDC != null && (
                <DcDisplay label="Class DC" baseDc={creature.classDC} modResult={modStats.get('spell-dc')} />
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Immunities, Weaknesses, Resistances */}
        {(creature.immunities.length > 0 || creature.weaknesses.length > 0 || creature.resistances.length > 0) && (
          <>
            <div className="p-4 space-y-2">
              {creature.immunities.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold text-muted-foreground w-24 shrink-0">Immunities</span>
                  <span>{creature.immunities.join(", ")}</span>
                </div>
              )}
              {creature.resistances.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold text-muted-foreground w-24 shrink-0">Resistances</span>
                  <span>
                    {creature.resistances.map((r) => `${r.type} ${r.value}`).join(", ")}
                  </span>
                </div>
              )}
              {creature.weaknesses.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold text-muted-foreground w-24 shrink-0">Weaknesses</span>
                  <span>
                    {creature.weaknesses.map((w) => `${w.type} ${w.value}`).join(", ")}
                  </span>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Speed */}
        <div className="p-4">
          <div className="flex gap-2 text-sm">
            <span className="font-semibold text-muted-foreground w-24 shrink-0">Speed</span>
            <span>
              {Object.entries(creature.speeds)
                .filter(([, value]) => value)
                .map(([type, value]) => (type === "land" ? `${value} feet` : `${type} ${value} feet`))
                .join(", ")}
            </span>
          </div>
        </div>

        {/* FEAT-04: Troop/Swarm formation badge + troop HP segments */}
        {isSpecialFormation && (
          <>
            <Separator />
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] rounded bg-primary/15 text-primary border border-primary/30 uppercase tracking-wider font-semibold">
                  {isTroop ? 'Troop Formation' : 'Swarm Formation'}
                </span>
                {isSwarm && (
                  <span className="text-xs text-muted-foreground">Collective damage applies</span>
                )}
              </div>
              {isTroop && troopDefenses && (
                <div className="p-2 rounded bg-muted/30 text-xs leading-relaxed">
                  <span className="font-semibold">Troop Defenses: </span>
                  <span className="text-foreground/80">{stripHtml(troopDefenses.description)}</span>
                </div>
              )}
            </div>
          </>
        )}

        {hasStrikes && <Separator />}

        {/* Strikes — hidden when creature has no melee/ranged attacks or is a troop/swarm */}
        {hasStrikes && (
          <Collapsible defaultOpen>
            <SectionHeader>Strikes</SectionHeader>
            <CollapsibleContent>
              <div className="px-4 py-3 space-y-3">
                {creature.strikes.map((strike, i) => {
                  const isAgile = strike.traits.includes('agile')
                  const isRanged = strike.traits.includes('ranged') || strike.traits.some((t) => /^range\s/i.test(t))
                  // Melee strikes pick up str-based condition penalties (enfeebled) via virtual slug.
                  const strikeSlug = isRanged ? 'strike-attack' : 'melee-strike-attack'
                  const strikeNet = modStats.get(strikeSlug)?.netModifier ?? 0
                  const modifiedMod = strike.modifier + strikeNet
                  const map1 = modifiedMod - (isAgile ? 4 : 5)
                  const map2 = modifiedMod - (isAgile ? 8 : 10)
                  const strikeModResult = modStats.get(strikeSlug)
                  const enfeebledPenalty = !isRanged
                    ? (strikeModResult?.modifiers
                        .filter((m) => m.slug.startsWith('enfeebled:'))
                        .reduce((s, m) => s + m.modifier, 0) ?? 0)
                    : 0
                  return (
                    <div key={i} className="p-3 rounded-md bg-secondary/50">
                      <div className="flex items-center gap-2">
                        <ActionIcon cost={1} className="text-lg" />
                        <span className="font-semibold">{strike.name}</span>
                        {/* FEAT-11: MAP buttons — click to roll at that MAP and set the combatant's mapIndex */}
                        <div className="mt-1 flex items-center gap-1.5 text-xs">
                          {[0, 1, 2].map((i) => {
                            const mod = i === 0 ? modifiedMod : i === 1 ? map1 : map2
                            const title = i === 0
                              ? `1st attack — Roll 1d20${formatModifier(mod)}`
                              : i === 1
                                ? `2nd attack (${isAgile ? '-4' : '-5'} agile/normal) — Roll 1d20${formatModifier(mod)}`
                                : `3rd attack (${isAgile ? '-8' : '-10'} agile/normal) — Roll 1d20${formatModifier(mod)}`
                            const active = Boolean(mapCombatantId) && currentMapIndex === i
                            return (
                              <button
                                key={i}
                                type="button"
                                title={title}
                                onClick={() => {
                                  handleRoll(formatRollFormula(mod), `${strike.name} attack${i > 0 ? ` (MAP ${i + 1})` : ''}`)
                                  if (mapCombatantId) updateCombatantAction(mapCombatantId, { mapIndex: i })
                                }}
                                className={cn(
                                  'px-1.5 py-0.5 rounded font-mono transition-colors border',
                                  active
                                    ? 'bg-primary/20 text-primary border-primary/30 font-semibold'
                                    : 'bg-muted/30 border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                                )}
                              >
                                {formatModifier(mod)}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      {/* Main damage */}
                      {strike.damage.length > 0 && (
                        <div className="mt-1 text-sm">
                          <span className="font-semibold">Damage </span>
                          {strike.damage.map((d, di) => (
                            <span key={di}>
                              {di > 0 && <span className="text-muted-foreground"> plus </span>}
                              <ClickableFormula formula={d.formula} label={`${strike.name} damage`} source={creature.name} combatId={encounterContext?.encounterId} />
                              {d.type && (
                                <span className={cn("font-mono", damageTypeColor(d.type))}> {d.type}</span>
                              )}
                            </span>
                          ))}
                          {/* Enfeebled penalty on Strength-based damage (melee only) */}
                          {enfeebledPenalty < 0 && (
                            <span className="ml-1 font-mono text-xs text-pf-blood">
                              {enfeebledPenalty} <span className="text-muted-foreground">(Enfeebled)</span>
                            </span>
                          )}
                        </div>
                      )}
                      {/* Additional damage */}
                      {strike.additionalDamage && strike.additionalDamage.length > 0 && (
                        <div className="mt-1 text-sm space-y-0.5">
                          {strike.additionalDamage.map((ad, adi) => (
                            <div key={adi}>
                              {ad.label && (
                                <span className="text-muted-foreground text-xs">{ad.label}: </span>
                              )}
                              <ClickableFormula formula={ad.formula} label={ad.label ?? `${strike.name} damage`} source={creature.name} combatId={encounterContext?.encounterId} />
                              {ad.type && (
                                <span className={cn("font-mono", damageTypeColor(ad.type))}> {ad.type}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Weapon group badge */}
                      {strike.group && (
                        <div className="mt-1">
                          <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/60">
                            Group: {strike.group}
                          </span>
                        </div>
                      )}
                      {strike.traits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {strike.traits.map((trait) => (
                            <span
                              key={trait}
                              className="px-1.5 py-0.5 text-xs rounded bg-secondary text-secondary-foreground"
                            >
                              {trait}
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
        )}

        <Separator />

        {/* Abilities — FEAT-03b: Offensive/Defensive/Other tabs + Reactions sub-section */}
        {creature.abilities.length > 0 && (
          <>
            <Collapsible defaultOpen>
              <SectionHeader>Abilities</SectionHeader>
              <CollapsibleContent>
                <div className="px-4 py-3 space-y-3">
                  {/* Tab selector — hide tabs with 0 abilities */}
                  <div className="flex flex-wrap gap-1">
                    {([
                      { id: 'offensive', label: 'Offensive', icon: Swords, count: classifiedAbilities.offensive.length },
                      { id: 'defensive', label: 'Defensive', icon: ShieldIcon, count: classifiedAbilities.defensive.length },
                      { id: 'other', label: 'Other', icon: Sparkles, count: classifiedAbilities.other.length },
                    ] as const).filter(({ count }) => count > 0).map(({ id, label, icon: Icon, count }) => (
                      <button
                        key={id}
                        onClick={() => setActionTab(id)}
                        className={cn(
                          'flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors',
                          actionTab === id
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'hover:bg-muted/50 border border-transparent',
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                        <span className="text-muted-foreground">({count})</span>
                      </button>
                    ))}
                  </div>

                  {/* Active tab content — single item full-width, multiple items auto-fill grid */}
                  {classifiedAbilities[actionTab].length === 1 ? (
                    <AbilityCard
                      name={classifiedAbilities[actionTab][0].name}
                      actionCost={classifiedAbilities[actionTab][0].actionCost !== 0 ? classifiedAbilities[actionTab][0].actionCost : undefined}
                      traits={classifiedAbilities[actionTab][0].traits}
                    >
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {highlightGameText(classifiedAbilities[actionTab][0].description, (f) => handleRoll(f, classifiedAbilities[actionTab][0].name))}
                      </p>
                    </AbilityCard>
                  ) : (
                    <div
                      className="grid gap-2"
                      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
                    >
                      {classifiedAbilities[actionTab].map((ability, i) => (
                        <AbilityCard
                          key={`${actionTab}-${i}`}
                          name={ability.name}
                          actionCost={ability.actionCost !== 0 ? ability.actionCost : undefined}
                          traits={ability.traits}
                        >
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {highlightGameText(ability.description, (f) => handleRoll(f, ability.name))}
                          </p>
                        </AbilityCard>
                      ))}
                    </div>
                  )}

                  {/* Reactions sub-section (D-16: Offensive → Defensive → Reactions → Spells) */}
                  {classifiedAbilities.reactions.length > 0 && (
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reactions</p>
                      <div
                        className="grid gap-2"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
                      >
                        {classifiedAbilities.reactions.map((ability, i) => (
                          <AbilityCard
                            key={`react-${i}`}
                            name={ability.name}
                            actionCost="reaction"
                            traits={ability.traits}
                          >
                            <p className="text-sm text-foreground/80 leading-relaxed">
                              {highlightGameText(ability.description, (f) => handleRoll(f, ability.name))}
                            </p>
                          </AbilityCard>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
            <Separator />
          </>
        )}

        {/* Spellcasting */}
        {creature.spellcasting && creature.spellcasting.length > 0 && (
          <>
            {creature.spellcasting.map((section) => (
              <SpellcastingBlock
                key={section.entryId}
                section={section}
                creatureLevel={creature.level}
                creatureName={creature.name}
                {...(encounterContext ? { encounterContext } : {})}
              />
            ))}
            <Separator />
          </>
        )}

        {/* Equipment */}
        {(creature.equipment && creature.equipment.length > 0 || encounterContext) && (
          <>
            <EquipmentBlock
              items={creature.equipment ?? []}
              {...(encounterContext ? { encounterContext } : {})}
            />
            <Separator />
          </>
        )}

        {/* Skills — all 17 standard skills in Collapsible */}
        <Collapsible defaultOpen>
          <SectionHeader>Skills</SectionHeader>
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {creature.skills.map((skill) => {
                  const skillMod = modStats.get(skill.name.toLowerCase())
                  const net = skillMod?.netModifier ?? 0
                  const finalMod = skill.modifier + net
                  const btnColor = net < 0
                    ? 'text-pf-blood decoration-pf-blood/50'
                    : net > 0
                      ? 'text-pf-threat-low decoration-pf-threat-low/50'
                      : 'text-primary decoration-primary/50'
                  const btn = (
                    <button
                      onClick={() => handleRoll(formatRollFormula(finalMod), `${skill.name} check`)}
                      title={`Roll ${skill.name} check`}
                      className={cn(
                        'font-mono font-bold cursor-pointer underline decoration-dotted underline-offset-2 hover:text-pf-gold transition-colors duration-100',
                        btnColor,
                      )}
                    >
                      {finalMod >= 0 ? '+' : ''}{finalMod}
                    </button>
                  )
                  return (
                    <span key={skill.name} className={skill.calculated ? 'opacity-40' : ''}>
                      <span className="text-muted-foreground">{skill.name}</span>{' '}
                      <ModifierTooltip modifiers={skillMod?.modifiers ?? []} netModifier={net} finalDisplay={formatModifier(finalMod)}>
                        {btn}
                      </ModifierTooltip>
                    </span>
                  )
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <Separator />

        {/* Languages & Senses */}
        <div className="p-4 space-y-2">
          {creature.languages.length > 0 && (
            <div className="flex gap-2 text-sm">
              <span className="font-semibold text-muted-foreground w-24 shrink-0">Languages</span>
              <span>{creature.languages.join(", ")}</span>
            </div>
          )}
          {creature.senses.length > 0 && (
            <div className="flex gap-2 text-sm">
              <span className="font-semibold text-muted-foreground w-24 shrink-0">Senses</span>
              <span>{creature.senses.join(", ")}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {creature.description && (
          <>
            <Separator />
            <div className="p-4">
              <div className="p-4 rounded-md bg-pf-parchment">
                <p className="text-sm italic text-foreground/80">{creature.description}</p>
              </div>
            </div>
          </>
        )}

        {/* Source */}
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground">
            Source: {creature.source}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

