import type { ActionRow, FeatEntityRow } from '@/shared/api'
import type { CreatureStatBlockData, DisplayActionCost } from '@/entities/creature'
import { sanitizeFoundryText } from '@/shared/lib/foundry-tokens'

export type AbilityTemplateKind = 'action' | 'feat'

export interface AbilityTemplate {
  kind: AbilityTemplateKind
  id: string
  name: string
  level: number | null
  sourceLabel: string | null
  ability: CreatureStatBlockData['abilities'][number]
}

function parseTraits(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
  }
}

function parseFeatRaw(rawJson: string): {
  description: string
  actionCost?: DisplayActionCost
  traits: string[]
} {
  try {
    const raw = JSON.parse(rawJson) as {
      system?: {
        description?: { value?: unknown }
        actionType?: { value?: unknown }
        actions?: { value?: unknown }
        traits?: { value?: unknown }
      }
    }
    const system = raw.system ?? {}
    const actionType = typeof system.actionType?.value === 'string'
      ? system.actionType.value
      : 'passive'
    const actionNum = typeof system.actions?.value === 'number'
      ? system.actions.value
      : null
    const rawTraits = system.traits?.value
    const traits = Array.isArray(rawTraits)
      ? rawTraits.filter((v): v is string => typeof v === 'string')
      : []

    return {
      description: typeof system.description?.value === 'string'
        ? sanitizeFoundryText(system.description.value)
        : '',
      actionCost: parseActionCost(actionType, actionNum),
      traits,
    }
  } catch {
    return { description: '', traits: [] }
  }
}

function parseActionCost(
  actionType: string | null | undefined,
  actionCost: number | null,
): DisplayActionCost | undefined {
  if (actionType === 'free') return 'free'
  if (actionType === 'reaction') return 'reaction'
  if (actionCost === 0 || actionCost === 1 || actionCost === 2 || actionCost === 3) {
    return actionCost
  }
  return undefined
}

export function actionToAbilityTemplate(row: ActionRow): AbilityTemplate {
  return {
    kind: 'action',
    id: row.id,
    name: row.name,
    level: null,
    sourceLabel: row.action_category,
    ability: {
      id: row.id,
      name: row.name,
      description: row.description ? sanitizeFoundryText(row.description) : '',
      traits: parseTraits(row.traits),
      actionCost: parseActionCost(row.action_type, row.action_cost),
    },
  }
}

export function featToAbilityTemplate(row: FeatEntityRow): AbilityTemplate {
  const parsed = parseFeatRaw(row.raw_json)
  const traits = parsed.traits.length > 0 ? parsed.traits : parseTraits(row.traits)

  return {
    kind: 'feat',
    id: row.id,
    name: row.name,
    level: row.level,
    sourceLabel: null,
    ability: {
      id: row.id,
      name: row.name,
      description: parsed.description,
      traits,
      actionCost: parsed.actionCost,
    },
  }
}
