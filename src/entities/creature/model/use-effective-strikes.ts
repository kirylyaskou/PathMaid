import { useMemo } from 'react'
import type { BattleFormStrikeOverride, applyAdjustStrikes } from '@engine'
import type { CreatureStatBlockData } from './types'
import type { StatModifierResult } from './use-modified-stats'
import { applyStrikeDamageAdjustments, type StrikeDamage } from '../lib/strike-damage'
import { baseReachFromDisplaySize, reachFromTraits } from '../lib/reach'

type AdjustStrikeInput = Parameters<typeof applyAdjustStrikes>[1][number]
type CreatureStrike = CreatureStatBlockData['strikes'][number]

interface SizeShift {
  meleeDamageBonus: number
  reachBonus: number
}

interface DisplayStrike {
  /** Foundry item _id — pack translation key. Absent for battle-form strikes. */
  id?: string
  name: string
  modifier: number
  traits: string[]
  group: string | undefined
  additionalDamage: CreatureStrike['additionalDamage']
  damage: StrikeDamage[]
  reach: number | undefined
  range: number | undefined
}

export interface EffectiveStrike extends DisplayStrike {
  isAgile: boolean
  isRanged: boolean
  modifiedMod: number
  map1: number
  map2: number
  strikeNet: number
  strikeModResult: StatModifierResult | undefined
  enfeebledPenalty: number
  effectiveDamage: StrikeDamage[]
  hasRange: boolean
  displayReach: number
  hasNonDefaultReach: boolean
}

function normalizeBattleFormStrike(bfs: BattleFormStrikeOverride): DisplayStrike {
  return {
    name: bfs.name,
    modifier: 0,
    traits: [],
    group: undefined,
    additionalDamage: undefined,
    damage: [
      {
        formula: `${bfs.diceNumber ?? 1}${bfs.dieSize}`,
        type: bfs.damageType ?? '',
        persistent: undefined,
      },
    ],
    reach: undefined,
    range: undefined,
  }
}

export function useEffectiveStrikes(
  strikes: readonly CreatureStrike[],
  battleFormStrikes: readonly BattleFormStrikeOverride[] | undefined,
  adjustStrikeInputs: readonly AdjustStrikeInput[],
  sizeShift: SizeShift | null,
  effectiveSize: string,
  modStats: Map<string, StatModifierResult>,
): EffectiveStrike[] {
  return useMemo(() => {
    const source: DisplayStrike[] = battleFormStrikes
      ? battleFormStrikes.map(normalizeBattleFormStrike)
      : strikes.map((s) => ({
          id: s.id,
          name: s.name,
          modifier: s.modifier,
          traits: s.traits,
          group: s.group,
          additionalDamage: s.additionalDamage,
          damage: s.damage,
          reach: s.reach,
          range: s.range,
        }))

    const hasBattleForm = Boolean(battleFormStrikes)
    const effectiveBaseReach = baseReachFromDisplaySize(effectiveSize)

    return source.map((strike) => {
      const isAgile = strike.traits.includes('agile')
      const isRanged =
        strike.traits.includes('ranged') || strike.traits.some((t) => /^range\s/i.test(t))
      // Melee strikes pick up str-based condition penalties (enfeebled) via virtual slug.
      const strikeSlug = isRanged ? 'strike-attack' : 'melee-strike-attack'
      const strikeModResult = modStats.get(strikeSlug)
      const strikeNet = strikeModResult?.netModifier ?? 0
      const modifiedMod = strike.modifier + strikeNet
      const map1 = modifiedMod - (isAgile ? 4 : 5)
      const map2 = modifiedMod - (isAgile ? 8 : 10)
      const enfeebledPenalty = !isRanged
        ? strikeModResult?.modifiers
            .filter((m) => m.slug.startsWith('enfeebled:'))
            .reduce((s, m) => s + m.modifier, 0) ?? 0
        : 0

      const meleeStatusBonus =
        sizeShift && !isRanged && !hasBattleForm ? sizeShift.meleeDamageBonus : 0
      const hasAdjustOrSize =
        (adjustStrikeInputs.length > 0 || meleeStatusBonus !== 0) && !hasBattleForm
      const effectiveDamage = hasAdjustOrSize
        ? applyStrikeDamageAdjustments(
            strike.damage,
            strike.name,
            adjustStrikeInputs,
            meleeStatusBonus,
          )
        : strike.damage

      const traitReach = reachFromTraits(strike.traits, effectiveBaseReach)
      const resolvedReach =
        typeof strike.reach === 'number'
          ? strike.reach
          : !isRanged
            ? (traitReach ?? effectiveBaseReach)
            : undefined
      const hasRange = typeof strike.range === 'number' && strike.range > 0
      const reachBuff = sizeShift && !hasBattleForm ? sizeShift.reachBonus : 0
      const displayReach =
        typeof resolvedReach === 'number' ? resolvedReach + reachBuff : 0
      // Default 5/10/15 ft reach is implicit from size — only render the badge
      // for weapons that exceed the default (e.g. Whip's base+5).
      const hasNonDefaultReach =
        !hasRange &&
        !isRanged &&
        typeof resolvedReach === 'number' &&
        resolvedReach > effectiveBaseReach

      return {
        ...strike,
        isAgile,
        isRanged,
        modifiedMod,
        map1,
        map2,
        strikeNet,
        strikeModResult,
        enfeebledPenalty,
        effectiveDamage,
        hasRange,
        displayReach,
        hasNonDefaultReach,
      }
    })
  }, [strikes, battleFormStrikes, adjustStrikeInputs, sizeShift, effectiveSize, modStats])
}
