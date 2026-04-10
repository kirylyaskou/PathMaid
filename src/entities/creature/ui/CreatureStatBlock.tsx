import type { ReactNode } from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { rollDice, detectCasterProgression, getMaxRecommendedRank } from '@engine'
import { useRollStore } from '@/shared/model/roll-store'
import { ClickableFormula } from '@/shared/ui/clickable-formula'
import { cn } from "@/shared/lib/utils"
import { Card, CardContent, CardHeader } from "@/shared/ui/card"
import { Separator } from "@/shared/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible"
import { ChevronDown, ChevronRight, X, Backpack, Plus, Minus, HelpCircle, Search, Zap, Flame, Leaf, Feather, Swords, Shield as ShieldIcon, Sparkles } from "lucide-react"
import { LevelBadge } from "@/shared/ui/level-badge"
import { TraitList } from "@/shared/ui/trait-pill"
import { ActionIcon } from "@/shared/ui/action-icon"
import { AbilityCard } from "@/shared/ui/ability-card"
import type { CreatureStatBlockData } from '../model/types'
import type { SpellcastingSection, SpellRow } from '@/entities/spell'
import { getSpellById, getSpellByName, searchSpells, saveSpellSlotUsage, loadSpellSlots, loadSpellOverrides, upsertSpellOverride, deleteSpellOverride, loadItemOverrides, upsertItemOverride, deleteItemOverride, searchItems, saveSlotOverride, loadSlotOverrides } from '@/shared/api'
import type { SpellOverrideRow, CreatureItemRow, EncounterItemRow, ItemRow } from '@/shared/api'
import { ITEM_TYPE_COLORS, ItemReferenceDrawer } from '@/entities/item'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { resolveFoundryTokens } from '@/shared/lib/foundry-tokens'
import { stripHtml } from '@/shared/lib/html'
import { useModifiedStats, useSpellModifiers } from '@/entities/creature/model/use-modified-stats'
import type { StatModifierResult } from '@/entities/creature/model/use-modified-stats'
import { useCombatantStore } from '@/entities/combatant'

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
  const addRoll = useRollStore((state) => state.addRoll)
  function handleRoll(formula: string, label?: string) {
    addRoll(rollDice(formula, label, {
      source: creature.name,
      ...(encounterContext ? { combatId: encounterContext.encounterId } : {}),
    }))
  }

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
  const classifiedAbilities = useMemo(() => {
    const offensive: typeof creature.abilities = []
    const defensive: typeof creature.abilities = []
    const reactions: typeof creature.abilities = []
    const other: typeof creature.abilities = []
    const OFFENSIVE_NAME = /strike|attack|bite|claw|breath|slam|gore|tail|tongue|spit|charge|rage|pounce|swallow|constrict|grab\b|trample|maul/i
    const DEFENSIVE_NAME = /shield|block|parry|evasion|deflect|resist|ward|defense|defen[sc]e|regenerat|fortify|hardness|absorb/i
    // For troop/swarm creatures, exclude abilities already rendered in the formation section.
    const troopDefensesName = troopDefenses?.name?.toLowerCase() ?? ''
    for (const a of creature.abilities) {
      if (isSpecialFormation) {
        const nameLower = a.name.toLowerCase()
        // Skip abilities shown in the troop formation section (Troop Defenses, Troop/Swarm Formation).
        if (troopDefensesName && nameLower === troopDefensesName) continue
        if (/^(troop|swarm)\s+formation$/i.test(a.name)) continue
      }
      if (a.actionCost === 'reaction') {
        reactions.push(a)
        continue
      }
      const traits = a.traits ?? []
      if (traits.includes('attack') || traits.includes('offensive') || OFFENSIVE_NAME.test(a.name)) {
        offensive.push(a)
        continue
      }
      if (traits.includes('defensive') || DEFENSIVE_NAME.test(a.name)) {
        defensive.push(a)
        continue
      }
      other.push(a)
    }
    return { offensive, defensive, reactions, other }
  }, [creature.abilities])

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
              {creature.spellDC != null && (() => {
                const r = modStats.get('spell-dc')
                const net = r?.netModifier ?? 0
                const finalDc = creature.spellDC! + net
                const col = net < 0 ? 'text-pf-blood' : net > 0 ? 'text-pf-threat-low' : 'text-primary'
                const el = <p className={cn('font-mono font-bold text-lg', col)}>{finalDc}</p>
                return (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Spell DC</p>
                    {r && r.modifiers.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{el}</TooltipTrigger>
                        <TooltipContent side="top" className="min-w-[180px] max-w-[240px] p-2 font-mono text-xs">
                          {r.modifiers.map((m) => (
                            <div key={m.slug} className="flex justify-between gap-4">
                              <span className="text-muted-foreground">{m.label}</span>
                              <span className={m.modifier < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
                                {m.modifier > 0 ? '+' : ''}{m.modifier}
                              </span>
                            </div>
                          ))}
                          <div className="border-t border-border mt-1 pt-1 flex justify-between">
                            <span className="text-muted-foreground">Total</span>
                            <span className={col}>{finalDc}</span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : el}
                  </div>
                )
              })()}
              {creature.classDC != null && (() => {
                const r = modStats.get('spell-dc')
                const net = r?.netModifier ?? 0
                const finalDc = creature.classDC! + net
                const col = net < 0 ? 'text-pf-blood' : net > 0 ? 'text-pf-threat-low' : 'text-primary'
                const el = <p className={cn('font-mono font-bold text-lg', col)}>{finalDc}</p>
                return (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Class DC</p>
                    {r && r.modifiers.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{el}</TooltipTrigger>
                        <TooltipContent side="top" className="min-w-[180px] max-w-[240px] p-2 font-mono text-xs">
                          {r.modifiers.map((m) => (
                            <div key={m.slug} className="flex justify-between gap-4">
                              <span className="text-muted-foreground">{m.label}</span>
                              <span className={m.modifier < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
                                {m.modifier > 0 ? '+' : ''}{m.modifier}
                              </span>
                            </div>
                          ))}
                          <div className="border-t border-border mt-1 pt-1 flex justify-between">
                            <span className="text-muted-foreground">Total</span>
                            <span className={col}>{finalDc}</span>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : el}
                  </div>
                )
              })()}
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
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
              <span className="font-semibold text-sm text-foreground">Strikes</span>
              <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
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
                  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
                  const strikeModResult = modStats.get(strikeSlug)
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
                              ? `1st attack — Roll 1d20${fmt(mod)}`
                              : i === 1
                                ? `2nd attack (${isAgile ? '-4' : '-5'} agile/normal) — Roll 1d20${fmt(mod)}`
                                : `3rd attack (${isAgile ? '-8' : '-10'} agile/normal) — Roll 1d20${fmt(mod)}`
                            const active = Boolean(mapCombatantId) && currentMapIndex === i
                            return (
                              <button
                                key={i}
                                type="button"
                                title={title}
                                onClick={() => {
                                  handleRoll(`1d20${mod >= 0 ? '+' : ''}${mod}`, `${strike.name} attack${i > 0 ? ` (MAP ${i + 1})` : ''}`)
                                  if (mapCombatantId) updateCombatantAction(mapCombatantId, { mapIndex: i })
                                }}
                                className={cn(
                                  'px-1.5 py-0.5 rounded font-mono transition-colors border',
                                  active
                                    ? 'bg-primary/20 text-primary border-primary/30 font-semibold'
                                    : 'bg-muted/30 border-border/30 text-muted-foreground hover:text-foreground hover:bg-muted/50',
                                )}
                              >
                                {fmt(mod)}
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
                          {!isRanged && (() => {
                            const enfeebledPenalty = strikeModResult?.modifiers
                              .filter((m) => m.slug.startsWith('enfeebled:'))
                              .reduce((s, m) => s + m.modifier, 0) ?? 0
                            return enfeebledPenalty < 0 ? (
                              <span className="ml-1 font-mono text-xs text-pf-blood">
                                {enfeebledPenalty} <span className="text-muted-foreground">(Enfeebled)</span>
                              </span>
                            ) : null
                          })()}
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
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
                <span className="font-semibold text-sm text-foreground">Abilities</span>
                <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
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
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
            <span className="font-semibold text-sm text-foreground">Skills</span>
            <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
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
                      onClick={() => handleRoll(`1d20+${finalMod}`, `${skill.name} check`)}
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
                      {skillMod && skillMod.modifiers.length > 0 ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{btn}</TooltipTrigger>
                          <TooltipContent side="top" className="min-w-[180px] max-w-[240px] p-2 font-mono text-xs">
                            {skillMod.modifiers.map((m) => (
                              <div key={m.slug} className="flex justify-between gap-4">
                                <span className="text-muted-foreground">{m.label}</span>
                                <span className={m.modifier < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
                                  {m.modifier > 0 ? '+' : ''}{m.modifier}
                                </span>
                              </div>
                            ))}
                            <div className="border-t border-border mt-1 pt-1 flex justify-between">
                              <span className="text-muted-foreground">Total</span>
                              <span className={net < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
                                {finalMod >= 0 ? '+' : ''}{finalMod}
                              </span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : btn}
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

// Damage type color coding for PF2e
const DAMAGE_TYPE_COLORS: Record<string, string> = {
  // Physical — dark grey
  bludgeoning: "text-zinc-400",
  slashing: "text-zinc-400",
  piercing: "text-zinc-400",
  // Energy
  fire: "text-orange-400",
  cold: "text-cyan-300",
  electricity: "text-yellow-300",
  acid: "text-lime-400",
  sonic: "text-violet-400",
  force: "text-blue-400",
  // Positive/Negative
  positive: "text-green-400",
  healing: "text-green-400",
  negative: "text-pink-400",
  // Other
  poison: "text-emerald-400",
  mental: "text-indigo-400",
  bleed: "text-red-400",
  holy: "text-yellow-200",
  unholy: "text-purple-600",
  chaotic: "text-orange-500",
  lawful: "text-slate-400",
  good: "text-amber-300",
  evil: "text-purple-800",
  untyped: "text-zinc-500",
  spirit: "text-violet-300",
}

function damageTypeColor(type: string): string {
  return DAMAGE_TYPE_COLORS[type.toLowerCase()] ?? "text-pf-blood"
}

// Strip Foundry VTT inline roll tags: [[/gmr 2d6 #rounds]]{2d6 rounds} → "2d6 rounds"
// If no display text, strip the tag entirely.
const FOUNDRY_TAG_RE = /\[\[.*?\]\](?:\{([^}]*)\})?/g
function stripFoundryTags(text: string): string {
  return text.replace(FOUNDRY_TAG_RE, (_, display) => display ?? "")
}

// Inline highlighting for DC values and damage dice in ability text
// Group 2 = dice formula, Group 3 = damage type (stripped of brackets)
const GAME_TEXT_RE = /(DC\s+\d+)|(\d+d\d+(?:\s*[+\-]\s*\d+)?)(?:\[(\w+)\])?/gi

function highlightGameText(raw: string, onRoll?: (formula: string) => void): ReactNode {
  const text = stripFoundryTags(raw)
  const parts: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(GAME_TEXT_RE)) {
    const idx = match.index!
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx))

    if (match[1]) {
      // DC value
      parts.push(
        <span key={key++} className="text-pf-gold font-semibold font-mono">{match[1]}</span>
      )
    } else if (match[2]) {
      // Dice formula — clickable if onRoll provided
      const formula = match[2]
      if (onRoll) {
        parts.push(
          <button
            key={key++}
            onClick={(e) => { e.stopPropagation(); onRoll(formula) }}
            title={`Roll ${formula}`}
            className="text-pf-blood font-bold font-mono cursor-pointer underline decoration-dotted underline-offset-2 decoration-pf-blood/50 hover:text-pf-gold transition-colors duration-100"
          >
            {formula}
          </button>
        )
      } else {
        parts.push(
          <span key={key++} className="text-pf-blood font-mono">{formula}</span>
        )
      }
      // Damage type (if present, stripped of brackets)
      if (match[3]) {
        parts.push(
          <span key={key++} className={cn("font-mono", damageTypeColor(match[3]))}> {match[3]}</span>
        )
      }
    }
    lastIndex = idx + match[0].length
  }

  if (lastIndex === 0) return text
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <>{parts}</>
}

// ── Spellcasting ──────────────────────────────────────────────────────────────

function traditionColor(tradition: string): string {
  const map: Record<string, string> = {
    arcane: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    divine: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    occult: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    primal: 'bg-green-500/20 text-green-300 border-green-500/30',
  }
  return map[tradition.toLowerCase()] ?? 'bg-secondary text-secondary-foreground border-border'
}

function rankLabel(rank: number): string {
  return rank === 0 ? 'Cantrips' : `Rank ${rank}`
}

function actionCostLabel(cost: string): string {
  if (cost === 'free') return '◇'
  if (cost === 'reaction') return '↺'
  const n = parseInt(cost)
  if (n === 1) return '◆'
  if (n === 2) return '◆◆'
  if (n === 3) return '◆◆◆'
  return cost
}

const stripHtmlInline = stripHtml

function SpellCard({ foundryId, name, source, combatId }: { foundryId: string | null; name: string; source?: string; combatId?: string }) {
  // FEAT-13 D-29: spell cards expand by default in the spellcasting panel.
  const [open, setOpen] = useState(true)
  const [spell, setSpell] = useState<SpellRow | null>(null)
  const [loading, setLoading] = useState(false)

  const loadSpell = useCallback(async () => {
    if (spell || loading) return
    setLoading(true)
    try {
      let data: SpellRow | null = null
      if (foundryId) {
        data = await getSpellById(foundryId)
      }
      if (!data) {
        data = await getSpellByName(name)
      }
      setSpell(data)
    } finally {
      setLoading(false)
    }
  }, [foundryId, name, spell, loading])

  // Auto-load on mount so the default-open card actually has content.
  useEffect(() => {
    if (open && !spell && !loading) {
      loadSpell()
    }
  }, [])

  async function handleToggle() {
    if (!open) await loadSpell()
    setOpen((v) => !v)
  }

  const traditions: string[] = spell?.traditions ? JSON.parse(spell.traditions) : []
  const traits: string[] = spell?.traits ? JSON.parse(spell.traits) : []

  return (
    <div className="rounded border border-border/30 bg-secondary/30 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-sm text-left hover:bg-secondary/60 transition-colors"
      >
        {open
          ? <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
          : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
        }
        <span className="font-medium">{name}</span>
        {loading && <span className="text-xs text-muted-foreground ml-auto">…</span>}
      </button>

      {open && spell && (
        <div className="px-3 pb-2 pt-1 space-y-1.5 border-t border-border/30">
          {/* Meta row */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {spell.action_cost && (
              <span className="font-mono text-primary">{actionCostLabel(spell.action_cost)}</span>
            )}
            {spell.range_text && (
              <span className="text-muted-foreground">Range: <span className="text-foreground">{spell.range_text}</span></span>
            )}
            {spell.area && (() => {
              const a = JSON.parse(spell.area) as { type?: string; value?: number }
              return a.value
                ? <span className="text-muted-foreground">Area: <span className="text-foreground">{a.value}-foot {a.type}</span></span>
                : null
            })()}
            {spell.duration_text && (
              <span className="text-muted-foreground">Duration: <span className="text-foreground">{spell.duration_text}</span></span>
            )}
            {spell.save_stat && (
              <span className="text-muted-foreground">Save: <span className="text-foreground capitalize">{spell.save_stat}</span></span>
            )}
          </div>
          {/* Damage */}
          {spell.damage && (() => {
            const dmg = JSON.parse(spell.damage) as Record<string, { formula?: string; damage?: string; damageType?: string; type?: string }>
            const parts = Object.values(dmg)
              .map((d) => ({ formula: d.formula ?? d.damage ?? null, type: d.damageType ?? d.type ?? null }))
              .filter((d) => d.formula)
            return parts.length > 0
              ? (
                <p className="text-xs flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground">Damage:</span>
                  {parts.map((d, i) => (
                    <span key={i} className="flex items-center gap-0.5">
                      {i > 0 && <span className="text-muted-foreground">+</span>}
                      <ClickableFormula
                        formula={d.formula!}
                        label={`${name} damage`}
                        source={source}
                        combatId={combatId}
                        className="text-xs"
                      />
                      {d.type && <span className={cn("font-mono", damageTypeColor(d.type))}>{d.type}</span>}
                    </span>
                  ))}
                </p>
              )
              : null
          })()}
          {/* Traits */}
          {(traits.length > 0 || traditions.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {[...traditions, ...traits].map((t) => (
                <span key={t} className="px-1 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">{t}</span>
              ))}
            </div>
          )}
          {/* Description */}
          {spell.description && (
            <p className="text-xs text-foreground/75 leading-relaxed line-clamp-4">
              {stripHtmlInline(resolveFoundryTokensForSpell(spell.description))}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Slot pips ─────────────────────────────────────────────────────────────────

const TRADITION_SLOT_CONFIG: Record<string, {
  icon: typeof Zap
  available: string
  spent: string
}> = {
  arcane: {
    icon: Zap,
    available: 'bg-blue-500/80 text-blue-100 border-blue-400/70',
    spent: 'border-blue-500/30',
  },
  occult: {
    icon: Flame,
    available: 'bg-purple-500/80 text-purple-100 border-purple-400/70',
    spent: 'border-purple-500/30',
  },
  primal: {
    icon: Leaf,
    available: 'bg-green-500/80 text-green-100 border-green-400/70',
    spent: 'border-green-500/30',
  },
  divine: {
    icon: Feather,
    available: 'bg-yellow-500/80 text-yellow-100 border-yellow-400/70',
    spent: 'border-yellow-500/30',
  },
}

const DEFAULT_SLOT_CONFIG = TRADITION_SLOT_CONFIG.arcane

function SlotPips({ total, used, baseSlots, tradition, onToggle }: {
  total: number; used: number; baseSlots: number; tradition: string; onToggle: (idx: number) => void
}) {
  if (total <= 0) return null
  const cfg = TRADITION_SLOT_CONFIG[tradition] ?? DEFAULT_SLOT_CONFIG
  const Icon = cfg.icon
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: total }).map((_, i) => {
        const isCustom = i >= baseSlots
        const isAvailable = i >= used
        return (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); onToggle(i) }}
            title={isAvailable ? 'Mark slot spent' : 'Mark slot available'}
            className={cn(
              "w-5 h-5 rounded flex items-center justify-center border transition-colors",
              isCustom && "border-dashed",
              isAvailable
                ? cfg.available
                : cn(cfg.spent, "bg-transparent hover:bg-muted/30")
            )}
          >
            {isAvailable && <Icon className="w-3 h-3" />}
          </button>
        )
      })}
    </div>
  )
}

// ── Spell search dialog ──────────────────────────────────────────────────────

const DIALOG_TRADITIONS = ['arcane', 'divine', 'occult', 'primal'] as const
const DIALOG_TRADITION_COLORS: Record<string, string> = {
  arcane: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  divine: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  occult: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  primal: 'bg-green-500/20 text-green-300 border-green-500/40',
}

function SpellSearchDialog({ open, onOpenChange, defaultRank, defaultTradition, focusOnly, onAdd }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultRank: number
  defaultTradition?: string
  focusOnly?: boolean
  onAdd: (name: string, rank: number) => void
}) {
  const [query, setQuery] = useState('')
  const [tradition, setTradition] = useState<string | null>(defaultTradition ?? null)
  const [rank, setRank] = useState<number | null>(defaultRank)
  const [results, setResults] = useState<SpellRow[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset filters when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setTradition(defaultTradition ?? null)
      setRank(defaultRank)
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, defaultRank, defaultTradition])

  // Debounced search
  useEffect(() => {
    if (!open) return
    setLoading(true)
    const t = setTimeout(async () => {
      const r = await searchSpells(
        query,
        rank ?? undefined,
        focusOnly ? undefined : (tradition ?? undefined),
        focusOnly ? 'focus' : undefined
      )
      setResults(r)
      setLoading(false)
    }, 200)
    return () => clearTimeout(t)
  }, [query, rank, tradition, open, focusOnly])

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-sm">{focusOnly ? 'Add Focus Spell' : 'Add Spell'}</DialogTitle>
        </DialogHeader>

        {/* Search + filters */}
        <div className="px-4 pt-3 pb-2 space-y-2 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              placeholder={focusOnly ? "Search focus spells…" : "Search spells…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 h-8 text-sm rounded-md border border-border bg-secondary/30 px-3 focus:outline-none focus:border-primary/50"
            />
          </div>
          {/* Tradition filter (hidden for focus spells) */}
          {!focusOnly && (
            <div className="flex flex-wrap gap-1.5">
              {DIALOG_TRADITIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTradition((p) => (p === t ? null : t))}
                  className={cn(
                    "px-2 py-0.5 text-[11px] rounded border uppercase tracking-wider font-semibold transition-opacity",
                    DIALOG_TRADITION_COLORS[t],
                    tradition && tradition !== t && "opacity-30"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {/* Rank filter */}
          <div className="flex flex-wrap gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
              <button
                key={r}
                onClick={() => setRank((p) => (p === r ? null : r))}
                className={cn(
                  "w-7 h-6 text-xs rounded border transition-colors font-mono",
                  rank === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 text-muted-foreground border-border/40 hover:border-border"
                )}
              >
                {r === 0 ? 'C' : r}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {loading ? 'Searching…' : `${results.length} spell${results.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
          {results.map((s) => {
            const traditions: string[] = s.traditions ? JSON.parse(s.traditions) : []
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{s.name}</span>
                    {s.action_cost && (
                      <span className="font-mono text-primary text-xs shrink-0">
                        {s.action_cost === 'free' ? '◇' : s.action_cost === 'reaction' ? '↺' : '◆'.repeat(Math.min(3, Number(s.action_cost) || 1))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{rankLabel(s.rank)}</span>
                    {traditions.map((t) => (
                      <span key={t} className={cn("px-1 py-0 text-[9px] rounded border uppercase font-semibold", DIALOG_TRADITION_COLORS[t] ?? '')}>
                        {t.slice(0, 3)}
                      </span>
                    ))}
                    {s.save_stat && <span className="text-[10px] text-muted-foreground capitalize">{s.save_stat}</span>}
                  </div>
                </div>
                <button
                  onClick={() => onAdd(s.name, rank ?? s.rank)}
                  className="shrink-0 px-2 py-1 text-xs rounded border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                >
                  Add
                </button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Meme warnings ────────────────────────────────────────────────────────────

const RANK_WARNINGS: Record<number, string> = {
  1: "GIT GUD",
  2: "Mister wizard pants, huh?",
  3: "Morrigan disapproves.",
  4: "Fane raises an eyebrow. He has no eyebrows.",
  5: "Optimism is a moral imperative. But I think you've moved beyond optimism.",
  6: "Daeran finds this mildly amusing.",
  7: "Ignorant slaves, how quickly you forget!",
  8: "The Greybeards shout \"FUS RO NO\".",
  9: "Areelu Vorlesh takes notes. This is now a thesis on hubris.",
  10: "Fear not the dark, my friend. And let the feast begin.",
}

// ── SpellcastingBlock (with encounter-aware slots + overrides) ────────────────

function SpellcastingBlock({ section, creatureLevel, encounterContext, creatureName }: {
  section: SpellcastingSection
  creatureLevel: number
  encounterContext?: EncounterContext
  creatureName?: string
}) {
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
  const addRoll = useRollStore((state) => state.addRoll)
  function handleSpellRoll(formula: string, label?: string) {
    addRoll(rollDice(formula, label, {
      ...(creatureName ? { source: creatureName } : {}),
      ...(encounterContext ? { combatId: encounterContext.encounterId } : {}),
    }))
  }

  // Slot state — keyed by rank
  const [usedSlots, setUsedSlots] = useState<Record<number, number>>({})
  // Override state
  const [overrides, setOverrides] = useState<SpellOverrideRow[]>([])
  // Slot overrides — keyed by rank
  const [slotDeltas, setSlotDeltas] = useState<Record<number, number>>({})
  // Spell search dialog state
  const [spellDialogOpen, setSpellDialogOpen] = useState(false)
  const [spellDialogRank, setSpellDialogRank] = useState(0)

  const { encounterId, combatantId } = encounterContext ?? {}

  // Phase 39: tradition-based condition modifiers for spell attack/DC
  const spellMod = useSpellModifiers(combatantId, section.tradition)
  const modifiedSpellAttack = section.spellAttack + spellMod.netModifier
  const modifiedSpellDc = section.spellDc + spellMod.netModifier
  const spellModColor = spellMod.netModifier < 0
    ? 'text-pf-blood decoration-pf-blood/50'
    : spellMod.netModifier > 0
      ? 'text-pf-threat-low decoration-pf-threat-low/50'
      : ''

  // Caster progression detection
  const maxSlotRank = useMemo(() => {
    let max = 0
    for (const byRank of section.spellsByRank) {
      if (byRank.rank > 0 && byRank.slots > 0 && byRank.rank > max) max = byRank.rank
    }
    return max
  }, [section.spellsByRank])

  const progression = useMemo(
    () => detectCasterProgression(creatureLevel, maxSlotRank),
    [creatureLevel, maxSlotRank]
  )
  const recommendedMaxRank = useMemo(
    () => getMaxRecommendedRank(creatureLevel, progression),
    [creatureLevel, progression]
  )

  const loadSlotState = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSpellSlots(encounterId, combatantId)
    const byRank: Record<number, number> = {}
    for (const r of rows) {
      if (r.entryId === section.entryId) byRank[r.rank] = r.usedCount
    }
    setUsedSlots(byRank)
  }, [encounterId, combatantId, section.entryId])

  const loadOverrideState = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSpellOverrides(encounterId, combatantId)
    setOverrides(rows.filter((r) => r.entryId === section.entryId))
  }, [encounterId, combatantId, section.entryId])

  const loadSlotOverrideState = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSlotOverrides(encounterId, combatantId)
    const byRank: Record<number, number> = {}
    for (const r of rows) {
      if (r.entryId === section.entryId) byRank[r.rank] = r.slotDelta
    }
    setSlotDeltas(byRank)
  }, [encounterId, combatantId, section.entryId])

  useEffect(() => {
    loadSlotState()
    loadOverrideState()
    loadSlotOverrideState()
  }, [loadSlotState, loadOverrideState, loadSlotOverrideState])

  async function handleTogglePip(rank: number, idx: number, total: number) {
    if (!encounterId || !combatantId) return
    const current = usedSlots[rank] ?? 0
    const newUsed = idx < current ? idx : Math.min(idx + 1, total)
    setUsedSlots((prev) => ({ ...prev, [rank]: newUsed }))
    await saveSpellSlotUsage(encounterId, combatantId, section.entryId, rank, newUsed)
  }

  async function handleSlotDelta(rank: number, change: 1 | -1) {
    if (!encounterId || !combatantId) return
    const currentDelta = slotDeltas[rank] ?? 0
    const newDelta = currentDelta + change
    setSlotDeltas((prev) => ({ ...prev, [rank]: newDelta }))
    await saveSlotOverride(encounterId, combatantId, section.entryId, rank, newDelta)

    // For prepared casters: adding a slot opens spell search
    if (change === 1 && section.castType === 'prepared') {
      setSpellDialogRank(rank)
      setSpellDialogOpen(true)
    }
  }

  async function handleAddRank(newRank: number) {
    if (!encounterId || !combatantId) return
    setSlotDeltas((prev) => ({ ...prev, [newRank]: 1 }))
    await saveSlotOverride(encounterId, combatantId, section.entryId, newRank, 1)
  }

  async function handleAddSpell(name: string, rank: number) {
    if (!encounterId || !combatantId) return
    const id = `${combatantId}:${section.entryId}:add:${name}:${rank}`
    const override: SpellOverrideRow = {
      id, encounterId, combatantId, entryId: section.entryId,
      spellName: name, rank, isRemoved: false, sortOrder: Date.now(),
    }
    await upsertSpellOverride(override)
    setOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
  }

  async function handleRemoveSpell(spellName: string, rank: number, isDefault: boolean) {
    if (!encounterId || !combatantId) return
    if (isDefault) {
      const id = `${combatantId}:${section.entryId}:rm:${spellName}:${rank}`
      const override: SpellOverrideRow = {
        id, encounterId, combatantId, entryId: section.entryId,
        spellName, rank, isRemoved: true, sortOrder: 0,
      }
      await upsertSpellOverride(override)
      setOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
    } else {
      const id = `${combatantId}:${section.entryId}:add:${spellName}:${rank}`
      await deleteSpellOverride(id)
      setOverrides((prev) => prev.filter((o) => o.id !== id))
    }
  }

  const removedSpells = new Set(overrides.filter((o) => o.isRemoved).map((o) => `${o.rank}:${o.spellName}`))
  const addedByRank = overrides
    .filter((o) => !o.isRemoved)
    .reduce<Record<number, string[]>>((acc, o) => {
      if (!acc[o.rank]) acc[o.rank] = []
      acc[o.rank].push(o.spellName)
      return acc
    }, {})

  // Build effective ranks list: base + custom-added ranks from overrides
  const effectiveRanks = useMemo(() => {
    const baseRanks = section.spellsByRank.map((br) => br.rank)
    const customRanks = Object.entries(slotDeltas)
      .filter(([r, d]) => !baseRanks.includes(Number(r)) && d > 0)
      .map(([r]) => Number(r))
    const allRanks = [...baseRanks, ...customRanks].sort((a, b) => a - b)
    return allRanks
  }, [section.spellsByRank, slotDeltas])

  // Next available rank for "Add rank" button
  const nextRank = useMemo(() => {
    if (effectiveRanks.length === 0) return 1
    const max = Math.max(...effectiveRanks.filter((r) => r > 0))
    return max + 1
  }, [effectiveRanks])

  // Tradition filter for AddSpellRow (innate/focus = no tradition filter)
  const isFocus = section.castType === 'focus'
  const traditionFilter = (section.castType === 'innate' || isFocus) ? undefined : section.tradition

  function rankWarning(rank: number): string | null {
    if (rank <= 0 || rank <= recommendedMaxRank) return null
    return RANK_WARNINGS[rank] ?? RANK_WARNINGS[10]!
  }

  // FEAT-13: per-block slot-level filter. null = all ranks; number = only that rank.
  // Defaults to the minimum available rank so the panel does not open as one long wall of spells.
  const [selectedSlotLevel, setSelectedSlotLevel] = useState<number | null>(null)
  const minAvailableRank = useMemo(
    () => (effectiveRanks.length > 0 ? Math.min(...effectiveRanks) : null),
    [effectiveRanks],
  )
  const effectiveSelectedSlotLevel = selectedSlotLevel ?? minAvailableRank
  const filteredRanks = useMemo(
    () =>
      effectiveSelectedSlotLevel === null
        ? effectiveRanks
        : effectiveRanks.filter((r) => r === effectiveSelectedSlotLevel),
    [effectiveRanks, effectiveSelectedSlotLevel],
  )

  return (
    <Collapsible defaultOpen>
      <div className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40">
        <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-semibold text-sm text-foreground">Spellcasting</span>
          <span className={cn("px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold", traditionColor(section.tradition))}>
            {section.tradition} {section.castType}
          </span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        {encounterId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-0.5" type="button">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {progression === 'unknown'
                ? `Custom progression — max rank ${recommendedMaxRank} at level ${creatureLevel}`
                : `${progression === 'full' ? 'Full' : 'Bounded'} caster (${section.tradition} ${section.castType}) — max rank ${recommendedMaxRank} at level ${creatureLevel}`
              }
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <CollapsibleContent>
        <div className="px-4 pb-3 pt-2 space-y-3">
          {/* DC + Attack */}
          <div className="flex gap-4 text-sm">
            {section.spellDc > 0 && (() => {
              const dcCol = spellMod.netModifier < 0 ? 'text-pf-blood' : spellMod.netModifier > 0 ? 'text-pf-threat-low' : 'text-primary'
              const dcEl = <span className={cn('font-mono font-bold', dcCol)}>{modifiedSpellDc}</span>
              return (
                <span className="text-muted-foreground">DC{' '}
                  {spellMod.modifiers.length > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{dcEl}</TooltipTrigger>
                      <TooltipContent side="top" className="min-w-[180px] max-w-[240px] p-2 font-mono text-xs">
                        {spellMod.modifiers.map((m) => (
                          <div key={m.slug} className="flex justify-between gap-4">
                            <span className="text-muted-foreground">{m.label}</span>
                            <span className={m.modifier < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
                              {m.modifier > 0 ? '+' : ''}{m.modifier}
                            </span>
                          </div>
                        ))}
                        <div className="border-t border-border mt-1 pt-1 flex justify-between">
                          <span className="text-muted-foreground">Total</span>
                          <span className={dcCol}>{modifiedSpellDc}</span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : dcEl}
                </span>
              )
            })()}
            {section.spellAttack !== 0 && (() => {
              const attackBtn = (
                <button
                  onClick={() => handleSpellRoll(`1d20+${modifiedSpellAttack}`, `${section.tradition} spell attack`)}
                  title={`Roll spell attack 1d20+${modifiedSpellAttack}`}
                  className={cn(
                    'font-mono font-bold cursor-pointer underline decoration-dotted underline-offset-2 hover:text-pf-gold transition-colors duration-100',
                    spellModColor || 'text-primary decoration-primary/50',
                  )}
                >
                  {fmt(modifiedSpellAttack)}
                </button>
              )
              return (
                <span className="text-muted-foreground">Attack{' '}
                  {spellMod.modifiers.length > 0 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{attackBtn}</TooltipTrigger>
                      <TooltipContent side="top" className="min-w-[180px] max-w-[240px] p-2 font-mono text-xs">
                        {spellMod.modifiers.map((m) => (
                          <div key={m.slug} className="flex justify-between gap-4">
                            <span className="text-muted-foreground">{m.label}</span>
                            <span className={m.modifier < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
                              {m.modifier > 0 ? '+' : ''}{m.modifier}
                            </span>
                          </div>
                        ))}
                        <div className="border-t border-border mt-1 pt-1 flex justify-between">
                          <span className="text-muted-foreground">Total</span>
                          <span className={spellMod.netModifier < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
                            {fmt(modifiedSpellAttack)}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : attackBtn}
                </span>
              )
            })()}
          </div>
          {/* FEAT-13: slot-level filter pills — tap a rank to focus, All to show everything */}
          {effectiveRanks.length > 1 && (
            <div className="flex flex-wrap gap-1 pb-1">
              <button
                type="button"
                onClick={() => setSelectedSlotLevel(null)}
                className={cn(
                  'px-1.5 py-0.5 text-[10px] rounded uppercase tracking-wider transition-colors border',
                  selectedSlotLevel === null && minAvailableRank === null
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : selectedSlotLevel === null
                      ? 'bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50'
                      : 'bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50',
                )}
              >
                All
              </button>
              {effectiveRanks.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedSlotLevel(r)}
                  className={cn(
                    'px-1.5 py-0.5 text-[10px] rounded uppercase tracking-wider transition-colors border',
                    effectiveSelectedSlotLevel === r && selectedSlotLevel !== null
                      ? 'bg-primary/20 text-primary border-primary/30 font-semibold'
                      : effectiveSelectedSlotLevel === r
                        ? 'bg-primary/10 text-primary border-primary/20'
                        : 'bg-muted/30 text-muted-foreground border-border/30 hover:bg-muted/50',
                  )}
                >
                  {rankLabel(r)}
                </button>
              ))}
            </div>
          )}
          {/* Spells by rank (filtered) */}
          {filteredRanks.map((rank) => {
            const byRank = section.spellsByRank.find((br) => br.rank === rank)
            const baseSlots = byRank?.slots ?? 0
            const delta = slotDeltas[rank] ?? 0
            const totalSlots = Math.max(0, baseSlots + delta)
            const used = usedSlots[rank] ?? 0
            const visibleSpells = byRank
              ? byRank.spells.filter((s) => !removedSpells.has(`${rank}:${s.name}`))
              : []
            const added = addedByRank[rank] ?? []
            const warn = encounterId ? rankWarning(rank) : null
            return (
              <div key={rank}>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {warn ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider cursor-help">
                          {rankLabel(rank)} ⚠
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-amber-300 bg-amber-950 border-amber-500/40">
                        {warn}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {rankLabel(rank)}
                    </span>
                  )}
                  {rank === 0 ? null
                    : encounterId && totalSlots > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSlotDelta(rank, -1)}
                          disabled={totalSlots <= 0}
                          className="w-5 h-5 flex items-center justify-center rounded border border-border/60 bg-secondary/60 text-muted-foreground hover:text-destructive hover:border-destructive/40 disabled:opacity-30 transition-colors"
                          title="Remove slot"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <SlotPips
                          total={totalSlots}
                          used={used}
                          baseSlots={baseSlots}
                          tradition={section.tradition}
                          onToggle={(idx) => handleTogglePip(rank, idx, totalSlots)}
                        />
                        <button
                          onClick={() => handleSlotDelta(rank, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded border border-border/60 bg-secondary/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                          title="Add slot"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : encounterId && totalSlots === 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">(0 slots)</span>
                        <button
                          onClick={() => handleSlotDelta(rank, 1)}
                          className="w-5 h-5 flex items-center justify-center rounded border border-border/60 bg-secondary/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                          title="Add slot"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : !encounterId && baseSlots > 0 ? (
                      <span className="text-xs text-muted-foreground">({baseSlots} slots)</span>
                    ) : null}
                </div>
                <div className="space-y-1">
                  {visibleSpells.map((spell, i) => (
                    <div key={i} className="flex items-center gap-1 group/spell">
                      <div className="flex-1">
                        <SpellCard name={spell.name} foundryId={spell.foundryId} source={creatureName} combatId={encounterContext?.encounterId} />
                      </div>
                      {encounterId && (
                        <button
                          onClick={() => handleRemoveSpell(spell.name, rank, true)}
                          className="opacity-0 group-hover/spell:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          title="Remove for this encounter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {added.map((name, i) => (
                    <div key={`added-${i}`} className="flex items-center gap-1 group/spell">
                      <div className="flex-1">
                        <SpellCard name={name} foundryId={null} source={creatureName} combatId={encounterContext?.encounterId} />
                      </div>
                      {encounterId && (
                        <button
                          onClick={() => handleRemoveSpell(name, rank, false)}
                          className="opacity-0 group-hover/spell:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          title="Remove added spell"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {encounterId && (
                    <button
                      onClick={() => { setSpellDialogRank(rank); setSpellDialogOpen(true) }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add spell…</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {/* Add new rank button */}
          {encounterId && nextRank <= 10 && (
            <button
              onClick={() => handleAddRank(nextRank)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add rank {nextRank}</span>
            </button>
          )}
        </div>
      </CollapsibleContent>

      {/* Spell search dialog */}
      {encounterId && (
        <SpellSearchDialog
          open={spellDialogOpen}
          onOpenChange={setSpellDialogOpen}
          defaultRank={spellDialogRank}
          defaultTradition={traditionFilter}
          focusOnly={isFocus}
          onAdd={(name, rank) => handleAddSpell(name, rank)}
        />
      )}
    </Collapsible>
  )
}

const resolveFoundryTokensForSpell = resolveFoundryTokens

interface StatItemProps {
  label: string
  value: number
  modifier?: boolean
  highlight?: boolean
  colorClass?: string
  showDc?: boolean
  modResult?: StatModifierResult
  onRoll?: (formula: string) => void
}

function StatItem({ label, value, modifier, highlight, colorClass, showDc, modResult, onRoll }: StatItemProps) {
  const netMod = modResult?.netModifier ?? 0
  const finalValue = value + netMod
  const displayValue = modifier && finalValue > 0 ? `+${finalValue}` : `${finalValue}`
  const dc = showDc ? ` (${10 + finalValue})` : ''

  const valClassName = cn(
    'font-mono font-bold text-[clamp(0.7rem,2.8cqw,1.125rem)]',
    highlight && 'text-pf-threat-extreme',
    !highlight && netMod < 0 && 'text-pf-blood',
    !highlight && netMod > 0 && 'text-pf-threat-low',
    !highlight && netMod === 0 && colorClass,
  )

  const formula = `1d20${finalValue >= 0 ? '+' : ''}${finalValue}`

  const valueEl = onRoll ? (
    <button
      onClick={() => onRoll(formula)}
      title={`Roll ${formula}`}
      className={cn(valClassName, 'cursor-pointer underline decoration-dotted underline-offset-2 hover:text-pf-gold transition-colors duration-100')}
    >
      {displayValue}{dc}
    </button>
  ) : (
    <p className={valClassName}>{displayValue}{dc}</p>
  )

  return (
    <div className="px-4">
      <p className="text-[clamp(0.55rem,1.8cqw,0.75rem)] text-muted-foreground mb-1">{label}</p>
      {modResult && modResult.modifiers.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>{valueEl}</TooltipTrigger>
          <TooltipContent side="top" className="min-w-[180px] max-w-[240px] p-2 font-mono text-xs">
            {modResult.modifiers.map((m) => (
              <div key={m.slug} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{m.label}</span>
                <span className={m.modifier < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
                  {m.modifier > 0 ? '+' : ''}{m.modifier}
                </span>
              </div>
            ))}
            <div className="border-t border-border mt-1 pt-1 flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className={netMod < 0 ? 'text-pf-blood' : 'text-pf-threat-low'}>
                {displayValue}{dc}
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        valueEl
      )}
    </div>
  )
}

// ── EquipmentBlock ────────────────────────────────────────────────────────────

function EquipmentBlock({
  items,
  encounterContext,
}: {
  items: CreatureItemRow[]
  encounterContext?: EncounterContext
}) {
  const [overrides, setOverrides] = useState<EncounterItemRow[]>([])
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState<ItemRow[]>([])
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null)

  useEffect(() => {
    if (!encounterContext) return
    loadItemOverrides(encounterContext.encounterId, encounterContext.combatantId)
      .then(setOverrides)
      .catch(() => { })
  }, [encounterContext?.encounterId, encounterContext?.combatantId])

  useEffect(() => {
    if (!encounterContext || !addQuery.trim()) { setAddResults([]); return }
    const timer = setTimeout(() => {
      searchItems(addQuery).then((r) => setAddResults(r.slice(0, 8))).catch(() => { })
    }, 200)
    return () => clearTimeout(timer)
  }, [addQuery, encounterContext])

  const handleRemove = useCallback(async (item: CreatureItemRow) => {
    if (!encounterContext) return
    const override: EncounterItemRow = {
      id: `${encounterContext.encounterId}:${encounterContext.combatantId}:${item.id}`,
      encounterId: encounterContext.encounterId,
      combatantId: encounterContext.combatantId,
      itemName: item.item_name,
      itemFoundryId: item.foundry_item_id,
      itemType: item.item_type,
      quantity: item.quantity,
      damageFormula: item.damage_formula,
      acBonus: item.ac_bonus,
      isRemoved: true,
    }
    setOverrides((prev) => [...prev.filter((o) => o.id !== override.id), override])
    await upsertItemOverride(override).catch(() => { })
    encounterContext.onInventoryChanged?.()
  }, [encounterContext])

  const handleRestoreBase = useCallback(async (item: CreatureItemRow) => {
    if (!encounterContext) return
    const id = `${encounterContext.encounterId}:${encounterContext.combatantId}:${item.id}`
    setOverrides((prev) => prev.filter((o) => o.id !== id))
    await deleteItemOverride(id).catch(() => { })
    encounterContext.onInventoryChanged?.()
  }, [encounterContext])

  const handleAddItem = useCallback(async (catalogItem: ItemRow) => {
    if (!encounterContext) return
    const id = `${encounterContext.encounterId}:${encounterContext.combatantId}:added:${catalogItem.id}`
    const override: EncounterItemRow = {
      id,
      encounterId: encounterContext.encounterId,
      combatantId: encounterContext.combatantId,
      itemName: catalogItem.name,
      itemFoundryId: catalogItem.id,
      itemType: catalogItem.item_type,
      quantity: 1,
      damageFormula: catalogItem.damage_formula,
      acBonus: catalogItem.ac_bonus,
      isRemoved: false,
    }
    setOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
    setAddQuery('')
    setAddResults([])
    await upsertItemOverride(override).catch(() => { })
    encounterContext.onInventoryChanged?.()
  }, [encounterContext])

  const handleRemoveAdded = useCallback(async (override: EncounterItemRow) => {
    setOverrides((prev) => prev.filter((o) => o.id !== override.id))
    await deleteItemOverride(override.id).catch(() => { })
    encounterContext?.onInventoryChanged?.()
  }, [encounterContext])

  const removedIds = new Set(overrides.filter((o) => o.isRemoved).map((o) => o.itemFoundryId ?? o.itemName))
  const addedItems = overrides.filter((o) => !o.isRemoved)

  const visibleBase = items.filter((item) => {
    const key = item.foundry_item_id ?? item.item_name
    return !removedIds.has(key)
  })

  const totalCount = visibleBase.length + addedItems.length
  if (totalCount === 0 && !encounterContext) return null

  function ItemRow_({ item, onRemove, onRestore, isRemoved, foundryItemId, onItemClick }: {
    item: { name: string; type: string; qty: number; damageFormula: string | null; acBonus: number | null; bulk?: string | null }
    onRemove?: () => void
    onRestore?: () => void
    isRemoved?: boolean
    foundryItemId?: string | null
    onItemClick?: (id: string) => void
  }) {
    const typeColor = ITEM_TYPE_COLORS[item.type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
    const qty = item.qty > 1 ? ` ×${item.qty}` : ''
    const stat = item.damageFormula ?? (item.acBonus !== null ? `AC +${item.acBonus}` : null)
    return (
      <div className={cn("group flex items-center gap-2 text-sm", isRemoved && "opacity-40 line-through")}>
        <span className={cn("px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0", typeColor)}>
          {item.type[0].toUpperCase()}
        </span>
        {foundryItemId && onItemClick ? (
          <button
            className="font-medium flex-1 min-w-0 truncate text-left hover:text-primary hover:underline cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onItemClick(foundryItemId) }}
          >
            {item.name}{qty}
          </button>
        ) : (
          <span className="font-medium flex-1 min-w-0 truncate">{item.name}{qty}</span>
        )}
        {stat && <span className="text-xs font-mono text-muted-foreground shrink-0">{stat}</span>}
        {item.bulk && item.bulk !== '-' && <span className="text-xs text-muted-foreground shrink-0">L{item.bulk}</span>}
        {encounterContext && onRemove && !isRemoved && (
          <button onClick={onRemove} className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity shrink-0">
            <X className="w-3 h-3" />
          </button>
        )}
        {encounterContext && onRestore && isRemoved && (
          <button onClick={onRestore} className="ml-auto text-xs text-primary hover:underline shrink-0">undo</button>
        )}
      </div>
    )
  }

  return (
    <>
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
          <div className="flex items-center gap-2">
            <Backpack className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold text-sm text-foreground">Equipment</span>
            <span className="text-xs text-muted-foreground">({totalCount})</span>
          </div>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-3 pt-2 space-y-1">
            {visibleBase.map((item) => (
              <ItemRow_
                key={item.id}
                item={{ name: item.item_name, type: item.item_type, qty: item.quantity, damageFormula: item.damage_formula, acBonus: item.ac_bonus, bulk: item.bulk }}
                onRemove={encounterContext ? () => handleRemove(item) : undefined}
                foundryItemId={item.foundry_item_id}
                onItemClick={(id) => setDrawerItemId(id)}
              />
            ))}
            {/* Removed items shown struck-through with undo */}
            {overrides.filter((o) => o.isRemoved).map((o) => {
              const base = items.find((i) => (i.foundry_item_id ?? i.item_name) === (o.itemFoundryId ?? o.itemName))
              if (!base) return null
              return (
                <ItemRow_
                  key={o.id}
                  item={{ name: o.itemName, type: o.itemType, qty: o.quantity, damageFormula: o.damageFormula, acBonus: o.acBonus }}
                  isRemoved
                  onRestore={() => handleRestoreBase(base)}
                  foundryItemId={o.itemFoundryId}
                  onItemClick={(id) => setDrawerItemId(id)}
                />
              )
            })}
            {/* Added items */}
            {addedItems.map((o) => (
              <ItemRow_
                key={o.id}
                item={{ name: o.itemName, type: o.itemType, qty: o.quantity, damageFormula: o.damageFormula, acBonus: o.acBonus }}
                onRemove={() => handleRemoveAdded(o)}
                foundryItemId={o.itemFoundryId}
                onItemClick={(id) => setDrawerItemId(id)}
              />
            ))}

            {/* Add item row — encounter context only */}
            {encounterContext && (
              <div className="relative mt-2">
                <input
                  type="text"
                  placeholder="Add item…"
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  className="w-full text-xs px-2 h-8 rounded-md border border-border/50 bg-secondary/40 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
                {addResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 top-full mt-0.5 rounded border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
                    {addResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleAddItem(r)}
                        className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left hover:bg-secondary/60 transition-colors"
                      >
                        <span className={cn("px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0", ITEM_TYPE_COLORS[r.item_type] ?? '')}>{r.item_type[0].toUpperCase()}</span>
                        <span className="flex-1 truncate">{r.name}</span>
                        {r.damage_formula && <span className="font-mono text-muted-foreground shrink-0">{r.damage_formula}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
      <ItemReferenceDrawer itemId={drawerItemId} onClose={() => setDrawerItemId(null)} />
    </>
  )
}
