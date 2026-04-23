import { useMemo } from 'react'
import type { SpeedType } from '@engine'
import { mergeCreatureSpeeds, applySpeedModifier } from '../lib/merge-speeds'
import type { StatModifierResult } from './use-modified-stats'

export interface EffectiveSpeed {
  type: SpeedType
  final: number
  net: number
  modifiers: StatModifierResult['modifiers']
  inactiveModifiers: StatModifierResult['inactiveModifiers']
  hasTooltip: boolean
}

export function useEffectiveSpeeds(
  baseSpeeds: Record<string, number | null | undefined>,
  effectSpeeds: Partial<Record<SpeedType, number>>,
  modStats: Map<string, StatModifierResult>,
): EffectiveSpeed[] {
  return useMemo(() => {
    const merged = mergeCreatureSpeeds(baseSpeeds, effectSpeeds)
    return Object.entries(merged).map(([type, base]) => {
      const mod = modStats.get(`${type}-speed`)
      const net = mod?.netModifier ?? 0
      const hasInactive = (mod?.inactiveModifiers?.length ?? 0) > 0
      return {
        type: type as SpeedType,
        final: applySpeedModifier(base, net),
        net,
        modifiers: mod?.modifiers ?? [],
        inactiveModifiers: mod?.inactiveModifiers,
        hasTooltip: Boolean(mod) && (net !== 0 || hasInactive),
      }
    })
  }, [baseSpeeds, effectSpeeds, modStats])
}
