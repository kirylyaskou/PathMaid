import type { ModifierType } from '../modifiers/modifiers'
import type { SpellEffectModifierInput } from '../effects/spell-effect-modifiers'

export type CustomItemAbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
export type CustomItemActionCost = 0 | 1 | 2 | 3 | 'reaction' | 'free'

export type CustomItemRule =
  | { kind: 'resistance'; damageType: string; value: number }
  | {
      kind: 'flatModifier'
      selector: string | string[]
      modifierType: ModifierType
      value: number
    }
  | { kind: 'abilityModDelta'; ability: CustomItemAbilityKey; value: number }
  | {
      kind: 'grantAbility'
      name: string
      actionCost?: CustomItemActionCost
      description: string
      traits?: string[]
    }
  | {
      kind: 'grantSpell'
      name: string
      rank: number
      tradition: string
      castType?: 'innate' | 'prepared' | 'spontaneous' | 'focus'
      foundryId?: string | null
      spellDc?: number
      spellAttack?: number
      frequency?: { kind: 'at-will' } | { kind: 'per'; max: number; per: 'day' | 'hour' | 'round' }
    }

export interface CustomItemGrantedAbility {
  name: string
  actionCost?: CustomItemActionCost
  description: string
  traits?: string[]
}

export interface CustomItemGrantedSpell {
  name: string
  rank: number
  tradition: string
  castType: 'innate' | 'prepared' | 'spontaneous' | 'focus'
  foundryId: string | null
  spellDc?: number
  spellAttack?: number
  frequency?: { kind: 'at-will' } | { kind: 'per'; max: number; per: 'day' | 'hour' | 'round' }
}

const ABILITIES = new Set<CustomItemAbilityKey>(['str', 'dex', 'con', 'int', 'wis', 'cha'])
const MODIFIER_TYPES = new Set<ModifierType>(['status', 'circumstance', 'item', 'untyped'])
const ACTION_COSTS = new Set<CustomItemActionCost>([0, 1, 2, 3, 'reaction', 'free'])
const CAST_TYPES = new Set(['innate', 'prepared', 'spontaneous', 'focus'])
const FREQUENCY_PERIODS = new Set(['day', 'hour', 'round'])

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function normalizeRule(raw: unknown): CustomItemRule | null {
  if (!raw || typeof raw !== 'object') return null
  const rule = raw as Record<string, unknown>
  switch (rule.kind) {
    case 'resistance': {
      const damageType = typeof rule.damageType === 'string' ? rule.damageType.trim() : ''
      const value = typeof rule.value === 'number' ? rule.value : Number(rule.value)
      if (!damageType || !Number.isFinite(value) || value <= 0) return null
      return { kind: 'resistance', damageType, value }
    }
    case 'flatModifier': {
      const selector = typeof rule.selector === 'string' || isStringArray(rule.selector)
        ? rule.selector
        : null
      const modifierType = MODIFIER_TYPES.has(rule.modifierType as ModifierType)
        ? rule.modifierType as ModifierType
        : 'untyped'
      const value = typeof rule.value === 'number' ? rule.value : Number(rule.value)
      if (!selector || !Number.isFinite(value) || value === 0) return null
      return { kind: 'flatModifier', selector, modifierType, value }
    }
    case 'abilityModDelta': {
      const ability = rule.ability as CustomItemAbilityKey
      const value = typeof rule.value === 'number' ? rule.value : Number(rule.value)
      if (!ABILITIES.has(ability) || !Number.isFinite(value) || value === 0) return null
      return { kind: 'abilityModDelta', ability, value }
    }
    case 'grantAbility': {
      const name = typeof rule.name === 'string' ? rule.name.trim() : ''
      const description = typeof rule.description === 'string' ? rule.description : ''
      const actionCost = ACTION_COSTS.has(rule.actionCost as CustomItemActionCost)
        ? rule.actionCost as CustomItemActionCost
        : undefined
      const traits = isStringArray(rule.traits) ? rule.traits : undefined
      if (!name) return null
      return { kind: 'grantAbility', name, actionCost, description, traits }
    }
    case 'grantSpell': {
      const name = typeof rule.name === 'string' ? rule.name.trim() : ''
      const rank = Math.trunc(typeof rule.rank === 'number' ? rule.rank : Number(rule.rank))
      const tradition = typeof rule.tradition === 'string' && rule.tradition.trim()
        ? rule.tradition.trim().toLowerCase()
        : 'arcane'
      const castType = CAST_TYPES.has(String(rule.castType))
        ? rule.castType as CustomItemGrantedSpell['castType']
        : 'innate'
      const foundryId = typeof rule.foundryId === 'string' && rule.foundryId.trim()
        ? rule.foundryId.trim()
        : null
      const spellDc = typeof rule.spellDc === 'number' ? rule.spellDc : Number(rule.spellDc)
      const spellAttack = typeof rule.spellAttack === 'number' ? rule.spellAttack : Number(rule.spellAttack)
      const rawFrequency = rule.frequency && typeof rule.frequency === 'object'
        ? rule.frequency as Record<string, unknown>
        : null
      const frequency = rawFrequency?.kind === 'at-will'
        ? { kind: 'at-will' as const }
        : rawFrequency?.kind === 'per'
          ? {
              kind: 'per' as const,
              max: Math.max(1, Math.trunc(Number(rawFrequency.max) || 1)),
              per: FREQUENCY_PERIODS.has(String(rawFrequency.per))
                ? rawFrequency.per as 'day' | 'hour' | 'round'
                : 'day',
            }
          : undefined
      if (!name || !Number.isFinite(rank) || rank < 0 || rank > 10) return null
      return {
        kind: 'grantSpell',
        name,
        rank,
        tradition,
        castType,
        foundryId,
        spellDc: Number.isFinite(spellDc) ? spellDc : undefined,
        spellAttack: Number.isFinite(spellAttack) ? spellAttack : undefined,
        frequency,
      }
    }
    default:
      return null
  }
}

export function parseCustomItemRules(rulesJson: string | null | undefined): CustomItemRule[] {
  if (!rulesJson) return []
  try {
    const parsed = JSON.parse(rulesJson) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((entry) => {
      const rule = normalizeRule(entry)
      return rule ? [rule] : []
    })
  } catch {
    return []
  }
}

export function getCustomItemResistances(
  rules: readonly CustomItemRule[],
): { type: string; value: number }[] {
  return rules.flatMap((rule) =>
    rule.kind === 'resistance'
      ? [{ type: rule.damageType, value: rule.value }]
      : [],
  )
}

export function getCustomItemFlatModifiers(
  rules: readonly CustomItemRule[],
  sourceId: string,
  sourceName: string,
): SpellEffectModifierInput[] {
  return rules.flatMap((rule) =>
    rule.kind === 'flatModifier'
      ? [{
          effectId: `custom-item:${sourceId}`,
          effectName: sourceName,
          selector: rule.selector,
          modifierType: rule.modifierType,
          value: rule.value,
        }]
      : [],
  )
}

export function getCustomItemAbilityDeltas(
  rules: readonly CustomItemRule[],
): Array<{ ability: CustomItemAbilityKey; value: number }> {
  return rules.flatMap((rule) =>
    rule.kind === 'abilityModDelta'
      ? [{ ability: rule.ability, value: rule.value }]
      : [],
  )
}

export function getCustomItemGrantedAbilities(
  rules: readonly CustomItemRule[],
): CustomItemGrantedAbility[] {
  return rules.flatMap((rule) =>
    rule.kind === 'grantAbility'
      ? [{
          name: rule.name,
          actionCost: rule.actionCost,
          description: rule.description,
          traits: rule.traits,
        }]
      : [],
  )
}

export function getCustomItemGrantedSpells(
  rules: readonly CustomItemRule[],
): CustomItemGrantedSpell[] {
  return rules.flatMap((rule) =>
    rule.kind === 'grantSpell'
      ? [{
          name: rule.name,
          rank: rule.rank,
          tradition: rule.tradition,
          castType: rule.castType ?? 'innate',
          foundryId: rule.foundryId ?? null,
          spellDc: rule.spellDc,
          spellAttack: rule.spellAttack,
          frequency: rule.frequency,
        }]
      : [],
  )
}
