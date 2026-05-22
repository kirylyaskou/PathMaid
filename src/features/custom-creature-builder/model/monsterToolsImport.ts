import type { CreatureStatBlockData, DisplayActionCost, DisplaySize, Rarity } from '@/entities/creature'
import { stringifyCustomCreaturePathmaid } from './importExport'

interface ParseResult {
  statBlock: CreatureStatBlockData
  pathmaidText: string
  warnings: string[]
}

type SpellcastingSection = NonNullable<CreatureStatBlockData['spellcasting']>[number]
type SpellFrequency = SpellcastingSection['spellsByRank'][number]['spells'][number]['frequency']

const RARITIES = new Set(['common', 'uncommon', 'rare', 'unique'])
const ALIGNMENTS = new Set(['lg', 'ng', 'cg', 'ln', 'n', 'cn', 'le', 'ne', 'ce'])
const TRADITIONS = new Set(['arcane', 'divine', 'occult', 'primal'])
const SIZE_MAP: Record<string, DisplaySize> = {
  tiny: 'Tiny',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  huge: 'Huge',
  gargantuan: 'Gargantuan',
}

const SKILL_FIELDS = [
  'acrobatics',
  'arcana',
  'athletics',
  'crafting',
  'deception',
  'diplomacy',
  'intimidation',
  'medicine',
  'nature',
  'occultism',
  'performance',
  'religion',
  'society',
  'stealth',
  'survival',
  'thievery',
] as const

const ABILITY_FIELDS = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const
const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function textField(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  return typeof value === 'string' ? value.trim() : ''
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  if (isRecord(value)) {
    const nested = value.value
    if (typeof nested === 'number' && Number.isFinite(nested)) return nested
    if (typeof nested === 'string' && nested.trim() !== '') {
      const parsed = Number(nested)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

function noteField(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value === 'string') return value.trim()
  if (isRecord(value) && typeof value.note === 'string') return value.note.trim()
  return ''
}

function normalizeTraits(raw: string): string[] {
  return splitCsv(raw).map((trait) => trait.toLowerCase())
}

function parseSpeeds(raw: string): Record<string, number | null> {
  const speeds: Record<string, number | null> = {}
  for (const entry of splitCsv(raw)) {
    const match = /^(?:(\w+)\s+)?(\d+)\s+feet/i.exec(entry)
    if (!match) continue
    const key = match[1]?.toLowerCase() ?? 'land'
    speeds[key] = Number(match[2])
  }
  return Object.keys(speeds).length > 0 ? speeds : { land: 25 }
}

function parseIwrText(raw: string): Array<{ type: string; value: number }> {
  return splitCsv(raw).flatMap((entry) => {
    const match = /^(.+?)\s+(\d+)$/i.exec(entry)
    if (!match) return []
    return [{ type: match[1].trim().toLowerCase(), value: Number(match[2]) }]
  })
}

function parseIwrField(record: Record<string, unknown>, key: string): Array<{ type: string; value: number }> {
  const value = record[key]
  const note = noteField(record, key)
  const parsedNote = parseIwrText(note)
  if (parsedNote.length > 0) return parsedNote
  if (typeof value === 'string') return parseIwrText(value)
  if (!isRecord(value)) return []

  const nestedValue = numberField(record, key)
  if (!nestedValue || !note) return []
  return splitCsv(note).map((type) => ({ type: type.toLowerCase(), value: nestedValue }))
}

function parseImmunities(record: Record<string, unknown>): CreatureStatBlockData['immunities'] {
  const note = noteField(record, 'immunity')
  if (note) return splitCsv(note).map((entry) => entry.toLowerCase())
  const value = record.immunity
  if (typeof value === 'string') return splitCsv(value).map((entry) => entry.toLowerCase())
  return []
}

function parseDamageEntries(raw: string): CreatureStatBlockData['strikes'][number]['damage'] {
  return raw.split(/\s+plus\s+/i).flatMap((entry) => {
    const match = /^(.+?)\s+([a-z][a-z -]*)$/i.exec(entry.trim())
    if (!match) return [{ formula: entry.trim(), type: 'untyped' }]
    return [{ formula: match[1].trim(), type: match[2].trim().toLowerCase() }]
  })
}

function parseStrikes(value: unknown): CreatureStatBlockData['strikes'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const name = textField(entry, 'name')
    const attack = numberField(entry, 'attack')
    const damage = textField(entry, 'damage')
    if (!name || attack === null || !damage) return []

    const traits = normalizeTraits(textField(entry, 'traits'))
    const reachMatch = /\breach\s+(\d+)\s+feet/i.exec(textField(entry, 'traits'))
    const rangeMatch = /\brange(?: increment)?\s+(\d+)\s+feet/i.exec(textField(entry, 'traits'))

    return [{
      id: textField(entry, 'id') || undefined,
      name,
      modifier: attack,
      damage: parseDamageEntries(damage),
      traits,
      reach: reachMatch ? Number(reachMatch[1]) : undefined,
      range: rangeMatch ? Number(rangeMatch[1]) : undefined,
    }]
  })
}

function actionCostFromMonsterTools(value: unknown): DisplayActionCost | undefined {
  if (typeof value === 'number' && value >= 1 && value <= 3) return value as 1 | 2 | 3
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'one' || normalized === '1') return 1
  if (normalized === 'two' || normalized === '2') return 2
  if (normalized === 'three' || normalized === '3') return 3
  if (normalized === 'reaction') return 'reaction'
  if (normalized === 'free') return 'free'
  return undefined
}

function parseSpecials(value: unknown): CreatureStatBlockData['abilities'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const name = textField(entry, 'name')
    if (!name) return []

    const type = textField(entry, 'type').toLowerCase()
    const traits = normalizeTraits(textField(entry, 'traits'))
    if (type === 'offense') traits.push('HB-Attack')
    if (type === 'defense') traits.push('HB-Def')

    return [{
      id: textField(entry, 'id') || undefined,
      name,
      actionCost: actionCostFromMonsterTools(entry.actions),
      description: textField(entry, 'description'),
      traits,
    }]
  })
}

function parseSkills(record: Record<string, unknown>): CreatureStatBlockData['skills'] {
  const skills = SKILL_FIELDS.flatMap((field) => {
    const modifier = numberField(record, field)
    if (modifier === null) return []
    return [{
      name: field.charAt(0).toUpperCase() + field.slice(1),
      modifier,
      calculated: false,
    }]
  })

  for (const loreKey of ['lore', 'lorealt']) {
    const value = record[loreKey]
    if (!isRecord(value)) continue
    const modifier = numberField(record, loreKey)
    const name = typeof value.name === 'string' && value.name.trim() ? value.name.trim() : 'Lore'
    if (modifier !== null) skills.push({ name, modifier, calculated: false })
  }

  return skills
}

function parseAbilityMods(record: Record<string, unknown>): CreatureStatBlockData['abilityMods'] {
  return ABILITY_FIELDS.reduce<CreatureStatBlockData['abilityMods']>((mods, field, index) => {
    return { ...mods, [ABILITY_KEYS[index]]: numberField(record, field) ?? 0 }
  }, { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 })
}

function titleCaseName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/(^|[\s/-])([a-z])/g, (_, prefix: string, ch: string) => `${prefix}${ch.toUpperCase()}`)
}

function parseSpellRankFromIndex(index: number, count: number): number {
  if (count >= 11) return Math.max(0, 10 - index)
  return Math.max(0, count - 1 - index)
}

function parseSpellFrequency(name: string): { cleanName: string; frequency?: SpellFrequency } {
  if (/\(at will\)/i.test(name)) {
    return {
      cleanName: name.replace(/\s*\(at will\)\s*/ig, '').trim(),
      frequency: { kind: 'at-will' },
    }
  }
  return { cleanName: name.trim() }
}

function parseSpells(record: Record<string, unknown>): CreatureStatBlockData['spellcasting'] {
  const spells = Array.isArray(record.spells) ? record.spells : []
  const spellsByRank = spells.flatMap((raw, index) => {
    if (typeof raw !== 'string' || !raw.trim()) return []
    const rank = parseSpellRankFromIndex(index, spells.length)
    const entries = splitCsv(raw).flatMap((spellName, spellIndex) => {
      const { cleanName, frequency } = parseSpellFrequency(spellName)
      if (!cleanName) return []
      const name = titleCaseName(cleanName)
      return [{
        name,
        foundryId: null,
        entryId: `monstertools-spell-${rank}-${spellIndex}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        ...(frequency ? { frequency } : {}),
      }]
    })
    return entries.length > 0 ? [{ rank, slots: 0, spells: entries }] : []
  })

  const spellType = textField(record, 'spelltype').toLowerCase()
  const tradition = spellType.split(/\s+/).find((part) => TRADITIONS.has(part)) ?? 'arcane'
  const hasSpellStats = numberField(record, 'spelldc') !== null || numberField(record, 'spellattack') !== null
  if (spellsByRank.length === 0 && !hasSpellStats) return undefined

  return [{
    entryId: 'monstertools-spellcasting',
    entryName: textField(record, 'spelltype') || `${tradition} spells`,
    tradition,
    castType: spellType.includes('innate') ? 'innate' : spellType.includes('spontaneous') ? 'spontaneous' : 'prepared',
    spellDc: numberField(record, 'spelldc') ?? 0,
    spellAttack: numberField(record, 'spellattack') ?? 0,
    spellsByRank,
  }]
}

export function parseMonsterToolsJsonToPathmaid(text: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Monster Tools file is not valid JSON.')
  }
  if (!isRecord(parsed)) {
    throw new Error('Expected a Monster Tools creature JSON object.')
  }

  const warnings: string[] = []
  const name = textField(parsed, 'name') || 'Imported Creature'
  const level = numberField(parsed, 'level')
  if (level === null) warnings.push('Creature level was not detected.')

  const rawTraits = [
    ...normalizeTraits(textField(parsed, 'traits')),
    ...normalizeTraits(textField(parsed, 'type')),
  ]
  const rarity = rawTraits.find((trait) => RARITIES.has(trait)) ?? 'common'
  const traits = Array.from(new Set(rawTraits.filter((trait) => !RARITIES.has(trait) && !ALIGNMENTS.has(trait))))
  const sizeKey = textField(parsed, 'size').toLowerCase()
  const skills = parseSkills(parsed)
  const spellcasting = parseSpells(parsed)

  const statBlock: CreatureStatBlockData = {
    id: '',
    name,
    level: level ?? 1,
    hp: numberField(parsed, 'hp') ?? 1,
    ac: numberField(parsed, 'ac') ?? 10,
    fort: numberField(parsed, 'fortitude') ?? 0,
    ref: numberField(parsed, 'reflex') ?? 0,
    will: numberField(parsed, 'will') ?? 0,
    perception: numberField(parsed, 'perception') ?? 0,
    stealth: skills.find((skill) => skill.name.toLowerCase() === 'stealth')?.modifier ?? null,
    traits,
    rarity: rarity as Rarity,
    size: SIZE_MAP[sizeKey] ?? 'Medium',
    type: textField(parsed, 'type') || traits[0] || 'npc',
    builderMode: 'manual',
    abilityMods: parseAbilityMods(parsed),
    immunities: parseImmunities(parsed),
    weaknesses: parseIwrField(parsed, 'weakness'),
    resistances: parseIwrField(parsed, 'resistance'),
    speeds: parseSpeeds(textField(parsed, 'speed')),
    strikes: parseStrikes(parsed.strikes),
    abilities: parseSpecials(parsed.specials),
    skills,
    languages: splitCsv(textField(parsed, 'languages')),
    senses: splitCsv(noteField(parsed, 'perception')),
    description: textField(parsed, 'description'),
    source: textField(parsed, 'src') || 'Monster Tools',
    ...(numberField(parsed, 'spelldc') !== null ? { spellDC: numberField(parsed, 'spelldc') ?? 0 } : {}),
    ...(spellcasting ? { spellcasting } : {}),
    auras: [],
    rituals: [],
  }

  if (statBlock.strikes.length === 0) warnings.push('No strikes were detected.')
  if (statBlock.abilities.length === 0) warnings.push('No special abilities were detected.')
  if (textField(parsed, 'items')) warnings.push('Monster Tools free-text items are not structured; inventory was not imported.')

  return {
    statBlock,
    pathmaidText: stringifyCustomCreaturePathmaid(statBlock),
    warnings,
  }
}
