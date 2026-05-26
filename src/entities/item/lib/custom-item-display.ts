import type { CustomItemRow } from '@/shared/api'
import { formatPrice } from './format'

const KNOWN_COMPACT_TRAITS = [
  'unique',
  'rare',
  'uncommon',
  'common',
  'magical',
  'invested',
  'holy',
  'unholy',
  'agile',
  'finesse',
  'intelligent',
  'evocation',
  'fire',
  'cold',
  'electricity',
  'acid',
  'sonic',
  'force',
  'mental',
  'poison',
  'disease',
  'divine',
  'arcane',
  'occult',
  'primal',
] as const

function splitCompactTraits(value: string): string[] {
  const lower = value.toLowerCase()
  const result: string[] = []
  let rest = lower
  while (rest.length > 0) {
    const match = KNOWN_COMPACT_TRAITS.find((trait) => rest.startsWith(trait))
    if (!match) break
    result.push(match)
    rest = rest.slice(match.length)
  }
  if (result.length === 0) return [value.trim()]
  if (rest.length > 0) result.push(rest)
  return result
}

export function parseCustomItemTraitsText(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const hasExplicitSeparator = /[,;\n]/.test(trimmed)
  const chunks = hasExplicitSeparator
    ? trimmed.split(/[,;\n]+/)
    : trimmed.split(/\s+/)
  return chunks
    .flatMap((entry) => splitCompactTraits(entry.trim()))
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function parseCustomItemTraits(traits: string | null): string[] {
  if (!traits) return []
  try {
    const parsed = JSON.parse(traits) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : []
  } catch {
    return traits.split(',').map((entry) => entry.trim()).filter(Boolean)
  }
}

export function stringifyCustomItemTraits(traits: string[]): string | null {
  const clean = traits
    .flatMap((entry) => parseCustomItemTraitsText(entry))
    .filter((entry, index, all) => all.indexOf(entry) === index)
  return clean.length > 0 ? JSON.stringify(clean) : null
}

export function formatCustomItemSubtitle(item: CustomItemRow): string {
  const parts = [
    `Item ${item.level}`,
    item.item_type,
    item.rarity && item.rarity !== 'common' ? item.rarity : null,
    item.price_gp !== null ? formatPrice(item.price_gp) : null,
  ].filter(Boolean)
  return parts.join(' · ')
}
