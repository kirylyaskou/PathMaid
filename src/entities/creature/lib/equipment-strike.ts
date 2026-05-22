import type { CreatureStatBlockData } from '../model/types'

export interface EquipmentAttackItem {
  id?: string
  name: string
  itemType: string
  damageFormula: string | null
  traits?: string | null
  descriptionLoc?: string
}

interface ParsedDamage {
  formula: string
  type: string
}

export function parseInlineDamageFormula(description: string | null | undefined): ParsedDamage | null {
  if (!description) return null
  const match = description.match(/@Damage\[\(?([0-9]+d[0-9]+(?:[+-][0-9]+)?)\)?\[([a-z,-]+)\]/i)
  if (!match) return null
  const types = match[2]
    ?.split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== 'persistent')
  return {
    formula: match[1] ?? '',
    type: types?.[0] ?? '',
  }
}

function normalizeName(name: string): string {
  return name.replace(/\s*\(\*\)\s*$/g, '').trim().toLowerCase()
}

function parseStoredDamage(damageFormula: string | null): ParsedDamage | null {
  if (!damageFormula) return null
  const match = damageFormula.trim().match(/^([0-9]+d[0-9]+(?:[+-][0-9]+)?)(?:\s+([a-z-]+))?$/i)
  if (!match) return { formula: damageFormula.trim(), type: '' }
  return {
    formula: match[1] ?? damageFormula.trim(),
    type: match[2] ?? '',
  }
}

function parseTraits(traits: string | null | undefined): string[] {
  if (!traits) return []
  try {
    const parsed = JSON.parse(traits) as unknown
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []
  } catch {
    return []
  }
}

export function buildEquipmentStrikes(
  equipment: readonly EquipmentAttackItem[],
  existingStrikes: readonly CreatureStatBlockData['strikes'][number][],
  fallbackModifier: number,
): CreatureStatBlockData['strikes'] {
  const existingIds = new Set(existingStrikes.map((strike) => strike.id).filter(Boolean))
  const existingNames = new Set(existingStrikes.map((strike) => normalizeName(strike.name)))

  return equipment.flatMap((item): CreatureStatBlockData['strikes'] => {
    if (item.itemType !== 'weapon') return []
    if (item.id && existingIds.has(item.id)) return []
    if (existingNames.has(normalizeName(item.name))) return []

    const parsedDamage =
      parseInlineDamageFormula(item.descriptionLoc) ?? parseStoredDamage(item.damageFormula)
    if (!parsedDamage?.formula) return []

    return [{
      id: item.id,
      name: item.name,
      modifier: fallbackModifier,
      damage: [{ formula: parsedDamage.formula, type: parsedDamage.type }],
      traits: parseTraits(item.traits),
    }]
  })
}
