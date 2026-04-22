import { useState, useEffect, useMemo, useCallback } from "react"
import { useShallow } from 'zustand/react/shallow'
import { useRoll } from '@/shared/hooks'
import { formatModifier, formatRollFormula } from '@/shared/lib/format'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import { cn } from "@/shared/lib/utils"
import { Card, CardContent, CardHeader } from "@/shared/ui/card"
import { Separator } from "@/shared/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
} from "@/shared/ui/collapsible"
import { Swords, Shield as ShieldIcon, Sparkles } from "lucide-react"
import { SectionHeader } from "@/shared/ui/section-header"
import { StatRow } from "@/shared/ui/stat-row"
import { LevelBadge } from "@/shared/ui/level-badge"
import { TraitList } from "@/shared/ui/trait-pill"
import { AbilityCard } from "@/shared/ui/ability-card"
import type { CreatureStatBlockData } from '../model/types'
import {
  normalizeImmunities,
  formatImmunityWithExceptions,
} from '../model/iwr-normalize'
import { stripHtml } from '@/shared/lib/html'
import { useModifiedStats } from '../model/use-modified-stats'
import { useEffectiveSpeeds } from '../model/use-effective-speeds'
import { useCombatantStore, isNpc } from '@/entities/combatant'
import { useBattleFormOverridesStore, useEffectStore } from '@/entities/spell-effect'
import type { ActiveEffect } from '@/entities/spell-effect'
import {
  parseSpellEffectAdjustStrikes,
  parseSpellEffectSizeShift,
  parseBaseSpeedRules,
  resolveBaseSpeedValue,
  getRecallKnowledgeInfo,
} from '@engine'
import type { SpeedType } from '@engine'
import { mapSize } from '@/shared/lib/size-map'
import { classifyAbilities } from '../model/classify-abilities'
import { highlightGameText } from '../lib/foundry-text'
import { StatItem } from './StatItem'
import { SpellcastingBlock } from './SpellcastingBlock'
import { EquipmentBlock } from './EquipmentBlock'
import { CreatureSpeedLine } from './CreatureSpeedLine'
import { CreatureStrikesSection } from './CreatureStrikesSection'
import { useEffectiveStrikes, type EffectiveStrike } from '../model/use-effective-strikes'

import type { StatModifierResult } from '../model/use-modified-stats'

// Module-level stable empty array — used as fallback in the useEffectStore selector
// so that "no combatant id" / "no active effects" never produces a fresh [] per
// render. useShallow only checks referential/shallow equality; a new [] every
// render would still be a new ref and re-trigger the render loop.
const EMPTY_ACTIVE_EFFECTS: readonly ActiveEffect[] = []

// Ordered PF2e sizes — used to pick the largest resulting size when multiple
// size-shifting effects overlap. Must match engine/types.ts ordering.
const SIZE_ORDER = ['tiny', 'sm', 'med', 'lg', 'huge', 'grg'] as const
type EngineSize = (typeof SIZE_ORDER)[number]

// Capitalize the first character of a string; returns empty string unchanged.
const capitalize = (s: string): string =>
  s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)

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
  // v1.4.1 UAT BUG-7: tag this hook as an "attack" roll site so Sure Strike
  // (RollTwice selector: attack-roll) surfaces a label+fortune formula in
  // the toast. Non-attack rolls on the stat-block (saves, perception) run
  // via separate useRoll calls in CombatantSavesBar / PCCombatCard.
  const handleRoll = useRoll(
    creature.name,
    encounterContext?.encounterId,
    encounterContext?.combatantId,
    'attack',
  )

  // Phase 39: build stat slug list for condition modifier computation.
  // v1.4.1 UAT BUG-6: append speed slugs the creature actually declares so
  // effects with selector:'all-speeds' / 'land-speed' (Acid Grip, etc.) can
  // resolve against them. Acid Grip's -10 status to all-speeds is predicate-
  // gated on self:condition:persistent-damage:acid — use-modified-stats
  // already splits active/inactive, so struck-out entries show in the
  // tooltip until the persistent acid condition fires.
  const allStatSlugs = useMemo(
    () => {
      const declaredSpeeds = Object.entries(creature.speeds)
        .filter(([, v]) => typeof v === 'number' && (v as number) > 0)
        .map(([type]) => `${type}-speed`)
      return [
        'ac', 'fortitude', 'reflex', 'will', 'perception',
        'strike-attack',        // virtual: ranged + 'all'-selector conditions (frightened, sickened)
        'melee-strike-attack',  // virtual: melee strikes — also receives enfeebled (str-based)
        'spell-attack',         // virtual: spell attack roll — receives 'attack' selector effects (D-03)
        'spell-dc',             // virtual: 'all'-selector conditions for core DC display
        ...declaredSpeeds,
        ...creature.skills.map((s) => s.name.toLowerCase()),
      ]
    },
    [creature.skills, creature.speeds],
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
  const currentMapIndex = mapCombatant && isNpc(mapCombatant) ? mapCombatant.mapIndex ?? 0 : 0

  // 65-04: BattleForm / CreatureSize overrides. Read-only — effect apply/remove
  // mutates the store; this is the single display-side consumer. Engine size
  // tokens ('lg', 'huge', …) are mapped into the UI's DisplaySize form before
  // the render tree sees them, keeping TraitList's Size contract intact.
  const sizeOverride = useBattleFormOverridesStore((s) =>
    mapCombatantId ? s.creatureSizeOverrides[mapCombatantId]?.size : undefined,
  )
  const battleFormAcOverride = useBattleFormOverridesStore((s) =>
    mapCombatantId ? s.battleFormOverrides[mapCombatantId]?.ac : undefined,
  )
  // BUG-1: BattleForm strike overrides — replaces creature.strikes when present.
  const battleFormStrikes = useBattleFormOverridesStore((s) =>
    mapCombatantId ? s.battleFormOverrides[mapCombatantId]?.strikes : undefined,
  )
  const effectiveSize = sizeOverride ? mapSize(sizeOverride) : creature.size

  // BUG-1: AdjustStrike — collect inputs from active effects for this combatant.
  // Select only the raw effects for this combatant; use useShallow so equal-content
  // arrays share referential identity and don't retrigger the render. Derivation
  // (parseSpellEffectAdjustStrikes) happens in a useMemo below, so the returned
  // inputs array is also stable across renders.
  const combatantEffects = useEffectStore(
    useShallow((s) =>
      mapCombatantId
        ? s.activeEffects.filter((e) => e.combatantId === mapCombatantId)
        : EMPTY_ACTIVE_EFFECTS,
    ),
  )
  const adjustStrikeInputs = useMemo(
    () =>
      combatantEffects.flatMap((e) =>
        parseSpellEffectAdjustStrikes(e.rulesJson, e.effectId, e.effectName),
      ),
    [combatantEffects],
  )

  // v1.4 UAT BUG-A (corrected per PF2e Player Core pg. 329): Enlarge-class size
  // shift contributes ONLY a +2/+4 status bonus to melee damage — it does NOT
  // step weapon damage dice. Walk active effects, resolve each CreatureSize-rule
  // (with ChoiceSet-fed dynamic values) against the effect's level, take the
  // largest resulting size token and the highest status bonus. Status bonuses
  // don't stack in PF2e; taking the max is safe for the common single-source
  // case (Enlarge).
  // TODO: wire `size` into `useBattleFormOverridesStore` so the Size badge
  // reflects the shift. Currently no runtime writer to that store exists —
  // tracked as a follow-up to this fix (see .planning/debug/v140-uat-failures).
  // v1.4.1 UAT BUG-5: aggregate BaseSpeed rules from active effects. Each
  // rule contributes a speed type (fly / swim / climb / burrow / land);
  // when the same type is declared multiple times we take the max so
  // Elemental Motion → air (landSpeed) + another fly source stays
  // consistent with PF2e's status-bonus stacking rules.
  const effectSpeeds = useMemo(() => {
    const landSpeedFeet =
      typeof creature.speeds.land === 'number' ? (creature.speeds.land as number) : 0
    const byType: Partial<Record<SpeedType, number>> = {}
    for (const eff of combatantEffects) {
      const rules = parseBaseSpeedRules(eff.rulesJson)
      for (const r of rules) {
        // Predicate-gated BaseSpeed (Elemental Motion) is intentionally
        // skipped here — evaluating @choice options from ChoiceSet is a
        // separate concern. Unconditional rules (Fly, Angelic Wings) still
        // surface the extra movement type in the speed list.
        if (r.predicate && r.predicate.length > 0) continue
        const resolved =
          resolveBaseSpeedValue(r.rawValue, landSpeedFeet) ?? landSpeedFeet
        if (!(r.type in byType) || resolved > (byType[r.type] ?? 0)) {
          byType[r.type] = resolved
        }
      }
    }
    return byType
  }, [combatantEffects, creature.speeds])

  const effectiveSpeeds = useEffectiveSpeeds(creature.speeds, effectSpeeds, modStats)

  const sizeShift = useMemo(() => {
    let topSize: EngineSize | null = null
    let topDamage = 0
    let topReach = 0
    for (const eff of combatantEffects) {
      const shift = parseSpellEffectSizeShift(eff.rulesJson, eff.level)
      if (!shift) continue
      if (!topSize || SIZE_ORDER.indexOf(shift.size) > SIZE_ORDER.indexOf(topSize)) {
        topSize = shift.size
      }
      // Status bonuses don't stack in PF2e — take the max across all sources.
      if (shift.meleeDamageBonus > topDamage) topDamage = shift.meleeDamageBonus
      if (shift.reachBonus > topReach) topReach = shift.reachBonus
    }
    if (!topSize && topDamage === 0 && topReach === 0) return null
    return {
      size: topSize ?? ('med' as EngineSize),
      meleeDamageBonus: topDamage,
      reachBonus: topReach,
    }
  }, [combatantEffects])

  // FEAT-04: detect troops/swarms from traits — they use a specialized layout
  // (no Strikes, collective damage in Actions, troop HP segments rendered inline).
  const traitsLower = useMemo(
    () => creature.traits.map((t) => t.toLowerCase()),
    [creature.traits],
  )
  const isTroop = traitsLower.includes('troop')
  const isSwarm = traitsLower.includes('swarm')

  // Recall Knowledge DC + skill, computed from level/rarity/type/traits per CRB Table 10-5.
  const recallKnowledge = useMemo(
    () =>
      getRecallKnowledgeInfo({
        level: creature.level,
        rarity: creature.rarity,
        type: creature.type,
        traits: creature.traits,
      }),
    [creature.level, creature.rarity, creature.type, creature.traits],
  )
  const isSpecialFormation = isTroop || isSwarm

  // FEAT-03a: hide Strikes section when the creature has none (troops/swarms also skip)
  const hasStrikes = creature.strikes.length > 0 && !isSpecialFormation

  const effectiveStrikes = useEffectiveStrikes(
    creature.strikes,
    battleFormStrikes,
    adjustStrikeInputs,
    sizeShift,
    effectiveSize,
    modStats,
  )

  const handleStrikeAttack = useCallback(
    (strike: EffectiveStrike, mapIdx: number) => {
      const mod =
        mapIdx === 0 ? strike.modifiedMod : mapIdx === 1 ? strike.map1 : strike.map2
      const suffix = mapIdx > 0 ? ` (MAP ${mapIdx + 1})` : ''
      handleRoll(formatRollFormula(mod), `${strike.name} attack${suffix}`)
      if (mapCombatantId) updateCombatantAction(mapCombatantId, { mapIndex: mapIdx })
    },
    [handleRoll, mapCombatantId, updateCombatantAction],
  )

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
console.log(creature)
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
              {effectiveSize} {recallKnowledge.type || creature.type}
            </p>
            <TraitList
              traits={creature.traits}
              rarity={creature.rarity}
              size={effectiveSize}
              className="mt-2"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Recall Knowledge + Senses — displayed between trait list and core stats, matching AoN header-area placement */}
        <div className="px-4 pt-2 pb-1 space-y-0.5">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground/80">
              Recall Knowledge DC {recallKnowledge.dc}
            </span>
            {recallKnowledge.type.length > 0 && (
              <>{' • '}{capitalize(recallKnowledge.type)}</>
            )}
            {recallKnowledge.skills.length > 0 && (
              <>{' '}({recallKnowledge.skills.map(capitalize).join(', ')})</>
            )}
          </p>
          {creature.senses.length > 0 && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground/80">Senses</span>
              {' '}{creature.senses.join(', ')}
            </p>
          )}
        </div>

        {/* Core Stats */}
        <div className="pb-4 bg-card [@container-type:inline-size]">
          <div className="flex flex-nowrap overflow-hidden">
            <StatItem label="HP" value={creature.hp} highlight />
            <StatItem
              label={(mapCombatant && isNpc(mapCombatant) && mapCombatant.shieldRaised) ? 'AC*' : 'AC'}
              value={(battleFormAcOverride ?? creature.ac) + ((mapCombatant && isNpc(mapCombatant) && mapCombatant.shieldRaised) ? derivedShieldAcBonus : 0)}
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
                <StatRow label="Immunities">
                  {normalizeImmunities(creature.immunities)
                    .map((i) => formatImmunityWithExceptions(i))
                    .join(", ")}
                </StatRow>
              )}
              {creature.resistances.length > 0 && (
                <StatRow label="Resistances">
                  {creature.resistances
                    .map((r) => {
                      const base = `${r.type} ${r.value}`
                      return r.exceptions && r.exceptions.length > 0
                        ? `${base} (except ${r.exceptions.join(', ')})`
                        : base
                    })
                    .join(", ")}
                </StatRow>
              )}
              {creature.weaknesses.length > 0 && (
                <StatRow label="Weaknesses">
                  {creature.weaknesses
                    .map((w) => {
                      const base = `${w.type} ${w.value}`
                      return w.exceptions && w.exceptions.length > 0
                        ? `${base} (except ${w.exceptions.join(', ')})`
                        : base
                    })
                    .join(", ")}
                </StatRow>
              )}
            </div>
            <Separator />
          </>
        )}

        <div className="p-4">
          <StatRow label="Speed">
            <CreatureSpeedLine speeds={effectiveSpeeds} />
          </StatRow>
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

        {hasStrikes && (
          <CreatureStrikesSection
            strikes={effectiveStrikes}
            creatureName={creature.name}
            encounterId={encounterContext?.encounterId}
            currentMapIndex={currentMapIndex}
            isMapTracked={Boolean(mapCombatantId)}
            onAttackClick={handleStrikeAttack}
          />
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
                      className="grid gap-2 items-start"
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
                        className="grid gap-2 items-start"
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

        {/* Languages (Senses moved to header area under Recall Knowledge) */}
        {creature.languages.length > 0 && (
          <div className="p-4 space-y-2">
            <StatRow label="Languages">{creature.languages.join(", ")}</StatRow>
          </div>
        )}

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

