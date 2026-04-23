import { useMemo, useCallback } from "react"
import { useShallow } from 'zustand/react/shallow'
import { useRoll } from '@/shared/hooks'
import { formatRollFormula } from '@/shared/lib/format'
import { ModifierTooltip } from '@/shared/ui/ModifierTooltip'
import { cn } from "@/shared/lib/utils"
import { Card, CardContent, CardHeader } from "@/shared/ui/card"
import { Separator } from "@/shared/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
} from "@/shared/ui/collapsible"
import { SectionHeader } from "@/shared/ui/section-header"
import { StatRow } from "@/shared/ui/stat-row"
import { LevelBadge } from "@/shared/ui/level-badge"
import { TraitList } from "@/shared/ui/trait-pill"
import type { CreatureStatBlockData } from '../model/types'
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
import { StatItem } from './StatItem'
import { SpellListPreview } from './SpellListPreview'
import { EquipmentBlock } from './EquipmentBlock'
import { useContentTranslation } from '@/shared/i18n'
import type { SpellcastingSection } from '@/entities/spell'
import type { ReactNode } from 'react'
import { CreatureSpeedLine } from './CreatureSpeedLine'
import { CreatureStrikesSection } from './CreatureStrikesSection'
import { CreatureAbilitiesSection } from './CreatureAbilitiesSection'
import { CreatureSkillsLine } from './CreatureSkillsLine'
import { CreatureDefensesBlock } from './CreatureDefensesBlock'
import { useEffectiveStrikes, type EffectiveStrike } from '../model/use-effective-strikes'

import type { StatModifierResult } from '../model/use-modified-stats'

// Module-level stable empty array. useShallow only checks referential equality,
// so a fresh [] each render would retrigger selectors and loop the component.
const EMPTY_ACTIVE_EFFECTS: readonly ActiveEffect[] = []

// Ordered PF2e sizes — used to pick the largest resulting size when multiple
// size-shifting effects overlap. Must match engine/types.ts ordering.
const SIZE_ORDER = ['tiny', 'sm', 'med', 'lg', 'huge', 'grg'] as const
type EngineSize = (typeof SIZE_ORDER)[number]

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
  /** Inject a live-combat spellcasting renderer (SpellcastingBlock). When
   *  omitted, falls back to SpellListPreview — read-only cards only. Used as
   *  dependency-injection to avoid entities→features FSD violation. */
  renderSpellcasting?: (
    section: SpellcastingSection,
    creatureLevel: number,
    creatureName: string,
  ) => ReactNode
}

export function CreatureStatBlock({ creature, className, encounterContext, renderSpellcasting }: CreatureStatBlockProps) {
  // RU content translation overlay. When a bundled pf2.ru translation exists
  // we override the display name and the trait pills (traitsLoc is
  // comma-separated and already includes rarity/size labels, so
  // auto-rendered rarity/size pills are disabled to avoid duplicates). All
  // numeric stats, interactive formulas, ability cards, spellcasting blocks,
  // and skills stay English — keeps the structured UI intact.
  const { data: translation } = useContentTranslation(
    'monster',
    creature.name,
    creature.level,
  )

  // Tag this hook as an "attack" roll site so Sure Strike (RollTwice selector:
  // attack-roll) surfaces a fortune-aware formula in the toast. Non-attack
  // rolls on the stat-block (saves, perception) use separate useRoll calls in
  // CombatantSavesBar / PCCombatCard.
  const handleRoll = useRoll(
    creature.name,
    encounterContext?.encounterId,
    encounterContext?.combatantId,
    'attack',
  )

  // Stat slug list for the condition/spell-effect modifier engine. Speed
  // slugs are appended per declared speed type so effects with
  // selector: 'all-speeds' / 'land-speed' (Acid Grip's gated -10, etc.)
  // resolve against real stats rather than disappearing silently.
  const allStatSlugs = useMemo(
    () => {
      const declaredSpeeds = Object.entries(creature.speeds)
        .filter(([, v]) => typeof v === 'number' && (v as number) > 0)
        .map(([type]) => `${type}-speed`)
      return [
        'ac', 'fortitude', 'reflex', 'will', 'perception',
        'strike-attack',        // virtual: ranged + 'all'-selector conditions
        'melee-strike-attack',  // virtual: melee strikes + enfeebled (str-based)
        'spell-attack',         // virtual: spell attack roll
        'spell-dc',             // virtual: 'all'-selector conditions for DC display
        ...declaredSpeeds,
        ...creature.skills.map((s) => s.name.toLowerCase()),
      ]
    },
    [creature.skills, creature.speeds],
  )
  const modStats = useModifiedStats(encounterContext?.combatantId, allStatSlugs)

  // Per-strike MAP counter — clickable MAP numbers drive mapIndex on the
  // selected combatant so strike rolls from the stat block land at the
  // correct Multiple Attack Penalty. Owned here so it sits next to the
  // attack numbers it controls.
  const mapCombatantId = encounterContext?.combatantId
  const mapCombatant = useCombatantStore((s) =>
    mapCombatantId ? s.combatants.find((c) => c.id === mapCombatantId) : undefined,
  )
  const updateCombatantAction = useCombatantStore((s) => s.updateCombatant)
  const currentMapIndex = mapCombatant && isNpc(mapCombatant) ? mapCombatant.mapIndex ?? 0 : 0

  // BattleForm / CreatureSize overrides. Read-only — effect apply/remove
  // mutates the store; this is the single display-side consumer. Engine size
  // tokens ('lg', 'huge', …) map into the UI's DisplaySize before render so
  // the TraitList Size contract stays intact.
  const sizeOverride = useBattleFormOverridesStore((s) =>
    mapCombatantId ? s.creatureSizeOverrides[mapCombatantId]?.size : undefined,
  )
  const battleFormAcOverride = useBattleFormOverridesStore((s) =>
    mapCombatantId ? s.battleFormOverrides[mapCombatantId]?.ac : undefined,
  )
  const battleFormStrikes = useBattleFormOverridesStore((s) =>
    mapCombatantId ? s.battleFormOverrides[mapCombatantId]?.strikes : undefined,
  )
  const effectiveSize = sizeOverride ? mapSize(sizeOverride) : creature.size

  // AdjustStrike inputs from active effects. useShallow on the raw filter
  // keeps referential identity stable when effect content hasn't changed —
  // parsing happens in the useMemo below, so the final array is stable too.
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

  // Enlarge-class size shift (PF2e Player Core pg. 329): contributes a
  // +2/+4 status bonus to melee damage, NOT a dice step-up. Dice are fixed
  // by the weapon; legitimate dice step-up comes from AdjustStrike (Giant
  // Instinct et al). Status bonuses don't stack — take the max.
  //
  // Aggregate BaseSpeed rules from active effects — each contributes a
  // speed type (fly/swim/climb/burrow/land). When the same type is declared
  // multiple times take the max so Elemental Motion → air(landSpeed) +
  // another fly source stays consistent with PF2e status-bonus stacking.
  const effectSpeeds = useMemo(() => {
    const landSpeedFeet =
      typeof creature.speeds.land === 'number' ? (creature.speeds.land as number) : 0
    const byType: Partial<Record<SpeedType, number>> = {}
    for (const eff of combatantEffects) {
      const rules = parseBaseSpeedRules(eff.rulesJson)
      for (const r of rules) {
        // Predicate-gated BaseSpeed (Elemental Motion) is intentionally
        // skipped — evaluating @choice options from ChoiceSet is a separate
        // concern. Unconditional rules (Fly, Angelic Wings) still surface.
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
      // Status bonuses don't stack — take the max across all sources.
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

  // Troops/swarms use a specialized layout — no Strikes, collective damage
  // in Actions, troop HP segments rendered inline.
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

  const derivedShieldAcBonus = useMemo(() => {
    if (!creature.equipment) return 0
    const shield = creature.equipment.find(
      (it) => it.item_type === 'shield' || (it.item_name ?? '').toLowerCase().includes('shield'),
    )
    return shield?.ac_bonus ?? 0
  }, [creature.equipment])

  // "Troop Defenses" ability — surfaced inline next to troop HP segments
  // rather than buried in the abilities list.
  const troopDefenses = useMemo(() => {
    if (!isTroop) return null
    return (
      creature.abilities.find((a) => a.name.toLowerCase().includes('troop defenses')) ?? null
    )
  }, [isTroop, creature.abilities])

  // Classify abilities into Offensive / Defensive / Reactions / Other via
  // trait+name heuristics — no 'category' field on the Foundry data model.
  const classifiedAbilities = useMemo(
    () => classifyAbilities(creature.abilities, {
      isSpecialFormation,
      troopDefensesName: troopDefenses?.name?.toLowerCase() ?? '',
    }),
    [creature.abilities, isSpecialFormation, troopDefenses],
  )

  console.log(creature)

  return (
    <Card className={cn("overflow-hidden card-grimdark border-border/50 border-l-[3px] border-l-pf-gold", className)}>
      <CardHeader className="-mt-6 pb-2 stat-block-header border-b border-primary/20">
        <div className="flex items-start gap-4">
          <LevelBadge level={creature.level} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">
                {translation?.nameLoc ?? creature.name}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
              {effectiveSize} {recallKnowledge.type || creature.type}
            </p>
            {translation?.traitsLoc ? (
              // Translated traits string already carries rarity + size labels
              // (e.g. "Необычный, Средний, Демон, Бестия, Нечестивый") — split
              // into a pill list; disable auto rarity/size to avoid duplicates.
              <TraitList
                traits={translation.traitsLoc.split(/,\s*/).filter(Boolean)}
                showRarity={false}
                showSize={false}
                className="mt-2"
              />
            ) : (
              <TraitList
                traits={creature.traits}
                rarity={creature.rarity}
                size={effectiveSize}
                className="mt-2"
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Recall Knowledge + Senses sit between trait list and core stats,
            matching the AoN header-area placement. */}
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

        {(creature.immunities.length > 0 || creature.weaknesses.length > 0 || creature.resistances.length > 0) && (
          <>
            <CreatureDefensesBlock
              immunities={creature.immunities}
              resistances={creature.resistances}
              weaknesses={creature.weaknesses}
            />
            <Separator />
          </>
        )}

        <div className="p-4">
          <StatRow label="Speed">
            <CreatureSpeedLine speeds={effectiveSpeeds} />
          </StatRow>
        </div>

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

        {creature.abilities.length > 0 && (
          <>
            <CreatureAbilitiesSection classified={classifiedAbilities} onRoll={handleRoll} />
            <Separator />
          </>
        )}

        {creature.spellcasting && creature.spellcasting.length > 0 && (
          <>
            {creature.spellcasting.map((section) =>
              renderSpellcasting
                ? renderSpellcasting(section, creature.level, creature.name)
                : <SpellListPreview key={section.entryId} section={section} creatureName={creature.name} />
            )}
            <Separator />
          </>
        )}

        {(creature.equipment && creature.equipment.length > 0 || encounterContext) && (
          <>
            <EquipmentBlock
              items={creature.equipment ?? []}
              {...(encounterContext ? { encounterContext } : {})}
            />
            <Separator />
          </>
        )}

        <Collapsible defaultOpen>
          <SectionHeader>Skills</SectionHeader>
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-2">
              <CreatureSkillsLine skills={creature.skills} modStats={modStats} onRoll={handleRoll} />
            </div>
          </CollapsibleContent>
        </Collapsible>
        <Separator />

        {creature.languages.length > 0 && (
          <div className="p-4 space-y-2">
            <StatRow label="Languages">{creature.languages.join(", ")}</StatRow>
          </div>
        )}

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

        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground">
            Source: {creature.source}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
