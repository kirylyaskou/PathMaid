import type { ModifierType } from '@engine'
import type { ActiveEffect } from '../model/types'

export const CUSTOM_PENALTY_EFFECT_ID_PREFIX = 'custom-penalty:'
export const CUSTOM_PENALTY_UNLIMITED_TURNS = 999999

export type CustomPenaltyTargetId =
  | 'all'
  | 'ac'
  | 'attack'
  | 'saving-throw'
  | 'skill-check'
  | 'spell-dc'
  | 'all-speeds'
  | 'land-speed'
  | 'str-based'
  | 'dex-based'
  | 'con-based'
  | 'int-based'
  | 'wis-based'
  | 'cha-based'

export interface CustomPenaltyTarget {
  id: CustomPenaltyTargetId
  selector: string
}

export const CUSTOM_PENALTY_TARGETS: readonly CustomPenaltyTarget[] = [
  { id: 'all', selector: 'all' },
  { id: 'ac', selector: 'ac' },
  { id: 'attack', selector: 'attack' },
  { id: 'saving-throw', selector: 'saving-throw' },
  { id: 'skill-check', selector: 'skill-check' },
  { id: 'spell-dc', selector: 'spell-dc' },
  { id: 'all-speeds', selector: 'all-speeds' },
  { id: 'land-speed', selector: 'land-speed' },
  { id: 'str-based', selector: 'str-based' },
  { id: 'dex-based', selector: 'dex-based' },
  { id: 'con-based', selector: 'con-based' },
  { id: 'int-based', selector: 'int-based' },
  { id: 'wis-based', selector: 'wis-based' },
  { id: 'cha-based', selector: 'cha-based' },
]

export interface CreateCustomPenaltyEffectInput {
  combatantId: string
  name: string
  penalty: number
  modifierType: ModifierType
  targetIds: CustomPenaltyTargetId[]
  targetLabels: string[]
}

export function createCustomPenaltyEffect({
  combatantId,
  name,
  penalty,
  modifierType,
  targetIds,
  targetLabels,
}: CreateCustomPenaltyEffectInput): ActiveEffect {
  const magnitude = Math.max(1, Math.trunc(Math.abs(penalty)))
  const selectors = targetIds
    .map((id) => CUSTOM_PENALTY_TARGETS.find((target) => target.id === id)?.selector)
    .filter((selector): selector is string => Boolean(selector))
  const id = `${CUSTOM_PENALTY_EFFECT_ID_PREFIX}${crypto.randomUUID()}`
  const displayName = name.trim() || `Custom penalty -${magnitude}`
  const selector = selectors.length === 1 ? selectors[0] : selectors

  return {
    id,
    combatantId,
    effectId: id,
    effectName: displayName,
    remainingTurns: CUSTOM_PENALTY_UNLIMITED_TURNS,
    rulesJson: JSON.stringify([
      {
        key: 'FlatModifier',
        selector,
        type: modifierType,
        value: -magnitude,
      },
    ]),
    durationJson: JSON.stringify({ unit: 'unlimited' }),
    description: `${modifierType} penalty -${magnitude}: ${targetLabels.join(', ')}`,
    level: 1,
    source: 'custom',
  }
}

export function isCustomPenaltyEffect(effect: Pick<ActiveEffect, 'effectId' | 'source'>): boolean {
  return effect.source === 'custom' || effect.effectId.startsWith(CUSTOM_PENALTY_EFFECT_ID_PREFIX)
}
