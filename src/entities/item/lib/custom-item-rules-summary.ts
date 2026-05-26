import { parseCustomItemRules } from '@engine'
import type { CustomItemRule } from '@engine'

const ABILITY_LABELS: Record<string, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

function selectorText(selector: CustomItemRule & { kind: 'flatModifier' }): string {
  return Array.isArray(selector.selector)
    ? selector.selector.join(', ')
    : selector.selector
}

function frequencyText(frequency: Extract<CustomItemRule, { kind: 'grantSpell' }>['frequency']): string | null {
  if (!frequency) return null
  if (frequency.kind === 'at-will') return 'at-will'
  return `${frequency.max}/${frequency.per}`
}

function ruleSummary(rule: CustomItemRule): string | null {
  switch (rule.kind) {
    case 'resistance':
      return `Resistance ${rule.damageType} ${rule.value}`
    case 'flatModifier':
      return `${signed(rule.value)} ${rule.modifierType} bonus to ${selectorText(rule)}`
    case 'abilityModDelta':
      return `${signed(rule.value)} ${ABILITY_LABELS[rule.ability] ?? rule.ability.toUpperCase()} modifier`
    case 'grantAbility':
      return `Grants ability: ${rule.name}`
    case 'grantSpell': {
      const parts = [
        `rank ${rule.rank}`,
        rule.tradition,
        rule.castType ?? 'innate',
        frequencyText(rule.frequency),
      ].filter(Boolean)
      return `Grants spell: ${rule.name}${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`
    }
    default:
      return null
  }
}

export function getCustomItemRuleSummaries(rulesJson: string | null | undefined): string[] {
  return parseCustomItemRules(rulesJson)
    .map(ruleSummary)
    .filter((entry): entry is string => Boolean(entry))
}
