import type { ModifierType } from '@engine'
import type { ActiveEffect } from '../model/types'

export const CUSTOM_PENALTY_EFFECT_ID_PREFIX = 'custom-penalty:'
export const CUSTOM_NARRATIVE_EFFECT_ID_PREFIX = 'custom-narrative:'
export const CUSTOM_WEAKNESS_EFFECT_ID_PREFIX = 'custom-weakness:'
export const CUSTOM_PENALTY_UNLIMITED_TURNS = 999999
export type CustomNarrativeKind = 'buff' | 'debuff'

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
  remainingTurns: number
}

export function createCustomPenaltyEffect({
  combatantId,
  name,
  penalty,
  modifierType,
  targetIds,
  targetLabels,
  remainingTurns,
}: CreateCustomPenaltyEffectInput): ActiveEffect {
  const magnitude = Math.max(1, Math.trunc(Math.abs(penalty)))
  const turns = Math.max(1, Math.trunc(remainingTurns))
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
    remainingTurns: turns,
    rulesJson: JSON.stringify([
      {
        key: 'FlatModifier',
        selector,
        type: modifierType,
        value: -magnitude,
      },
    ]),
    durationJson: JSON.stringify({ unit: 'rounds', value: turns }),
    description: `${modifierType} penalty -${magnitude}: ${targetLabels.join(', ')}`,
    level: 1,
    source: 'custom',
  }
}

export function createCustomNarrativeEffect({
  combatantId,
  name,
  kind,
  remainingTurns,
}: {
  combatantId: string
  name: string
  kind: CustomNarrativeKind
  remainingTurns: number
}): ActiveEffect {
  const turns = Math.max(1, Math.trunc(remainingTurns))
  const id = `${CUSTOM_NARRATIVE_EFFECT_ID_PREFIX}${crypto.randomUUID()}`
  const displayName = name.trim() || (kind === 'buff' ? 'Narrative buff' : 'Narrative debuff')

  return {
    id,
    combatantId,
    effectId: id,
    effectName: displayName,
    remainingTurns: turns,
    rulesJson: '[]',
    durationJson: JSON.stringify({ unit: 'rounds', value: turns }),
    description: kind === 'buff' ? 'Narrative buff' : 'Narrative debuff',
    level: 1,
    source: 'custom',
  }
}

export function createCustomWeaknessEffect({
  combatantId,
  name,
  weaknessType,
  value,
  remainingTurns,
}: {
  combatantId: string
  name: string
  weaknessType: string
  value: number
  remainingTurns: number
}): ActiveEffect {
  const turns = Math.max(1, Math.trunc(remainingTurns))
  const magnitude = Math.max(1, Math.trunc(Math.abs(value)))
  const type = weaknessType.trim().toLowerCase()
  const id = `${CUSTOM_WEAKNESS_EFFECT_ID_PREFIX}${crypto.randomUUID()}`
  const displayName = name.trim() || `Weakness ${type} ${magnitude}`

  return {
    id,
    combatantId,
    effectId: id,
    effectName: displayName,
    remainingTurns: turns,
    rulesJson: JSON.stringify([{ key: 'Weakness', type, value: magnitude }]),
    durationJson: JSON.stringify({ unit: 'rounds', value: turns }),
    description: `Weakness ${type} ${magnitude}`,
    level: 1,
    source: 'custom',
  }
}

export function isCustomPenaltyEffect(effect: Pick<ActiveEffect, 'effectId' | 'source'>): boolean {
  return effect.source === 'custom' || effect.effectId.startsWith(CUSTOM_PENALTY_EFFECT_ID_PREFIX)
}
