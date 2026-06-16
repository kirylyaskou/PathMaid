import type { CreatureStatBlockData, DisplayActionCost } from '../model/types'

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

export function formatEquipmentDamageFormula(
  damageFormula: string | null | undefined,
  damageType: string | null | undefined,
  description: string | null | undefined = null,
): string | null {
  const formula = damageFormula?.trim()
  if (!formula) return null
  const upgradedFormula = applyStrikingDice(formula, description)
  if (!damageType) return upgradedFormula
  if (/\s+[a-z][a-z-]*$/i.test(upgradedFormula)) return upgradedFormula
  return `${upgradedFormula} ${damageType}`
}

function applyStrikingDice(formula: string, description: string | null | undefined): string {
  const strikingDice = strikingDiceFromDescription(description)
  if (!strikingDice) return formula
  const match = formula.match(/^(\d+)d(\d+)(.*)$/i)
  if (!match) return formula
  const currentDice = Number(match[1])
  if (!Number.isFinite(currentDice) || currentDice >= strikingDice) return formula
  return `${strikingDice}d${match[2]}${match[3] ?? ''}`
}

function strikingDiceFromDescription(description: string | null | undefined): number | null {
  if (!description) return null
  const text = description.replace(/<[^>]*>/g, ' ').toLowerCase()
  if (/\bmajor\s+striking\b/.test(text)) return 4
  if (/\bgreater\s+striking\b/.test(text)) return 3
  if (/\bstriking\b/.test(text)) return 2
  return null
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function actionCostFromGlyph(glyph: string | undefined): DisplayActionCost | undefined {
  const normalized = glyph?.trim().toLowerCase()
  if (!normalized) return undefined
  if (normalized === 'r') return 'reaction'
  if (normalized === 'f') return 'free'
  const numeric = Number.parseInt(normalized, 10)
  return numeric >= 1 && numeric <= 3 ? numeric as 1 | 2 | 3 : undefined
}

function parseActivationTraits(rawTraits: string | undefined): string[] {
  if (!rawTraits) return []
  return rawTraits
    .split(',')
    .map((trait) => trait.trim())
    .filter((trait) => trait.length > 0)
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

const ACTIVATE_RE =
  /<p>\s*<strong>\s*Activate(?:[—-]\s*([^<]+?))?\s*<\/strong>\s*(?:<span[^>]*class=["']action-glyph["'][^>]*>\s*([^<]+?)\s*<\/span>)?\s*(?:\(([^)]*)\))?\s*<\/p>/gi

export function buildEquipmentActivationAbilities(
  equipment: readonly EquipmentAttackItem[],
): CreatureStatBlockData['abilities'] {
  return equipment.flatMap((item): CreatureStatBlockData['abilities'] => {
    const description = item.descriptionLoc
    if (!description || !/<strong>\s*Activate/i.test(description)) return []

    const matches = Array.from(description.matchAll(ACTIVATE_RE))
    return matches.flatMap((match, index): CreatureStatBlockData['abilities'] => {
      const start = match.index
      if (start === undefined) return []
      const header = match[0]
      const bodyStart = start + header.length
      const bodyEnd = matches[index + 1]?.index ?? description.length
      const body = description.slice(bodyStart, bodyEnd).trim()
      const activationName = stripTags(match[1] ?? '') || 'Activate'
      const traits = parseActivationTraits(match[3])
      const actionCost = actionCostFromGlyph(match[2])
      return [{
        id: `equipment-activation:${item.id ?? item.name}:${index}`,
        name: activationName,
        actionCost,
        traits,
        description: `<p><strong>Item</strong> ${escapeHtml(item.name)}</p>${body}`,
      }]
    })
  })
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
      parseStoredDamage(formatEquipmentDamageFormula(item.damageFormula, null, item.descriptionLoc)) ??
      parseInlineDamageFormula(item.descriptionLoc)
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
