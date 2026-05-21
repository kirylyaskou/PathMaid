import type { CreatureStatBlockData, DisplaySize, Rarity } from '@/entities/creature'
import { stringifyCustomCreaturePathmaid } from './importExport'

const RARITIES = new Set(['common', 'uncommon', 'rare', 'unique'])
const ALIGNMENTS = new Set(['lg', 'ng', 'cg', 'ln', 'n', 'cn', 'le', 'ne', 'ce'])
const CREATURE_TYPES = new Set(['aberration', 'animal', 'astral', 'beast', 'celestial', 'construct', 'dragon', 'elemental', 'ethereal', 'fey', 'fiend', 'fungus', 'giant', 'humanoid', 'monitor', 'ooze', 'plant', 'spirit', 'undead'])
const SIZE_MAP: Record<string, DisplaySize> = {
  tiny: 'Tiny',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  huge: 'Huge',
  gargantuan: 'Gargantuan',
}

const KNOWN_SECTION_PREFIXES = [
  'perception',
  'languages',
  'skills',
  'str ',
  'ac ',
  'hp ',
  'speed',
  'melee',
  'ranged',
  'immunities',
  'weaknesses',
  'resistances',
]

const SPELLCASTING_RE = /\b(?:[A-Za-z]+\s+)?(?:Innate\s+)?Spells\b.*(?:DC\s*\d+|Rank\b)/i

const SPELL_NAME_ALIASES: Record<string, string> = {
  'hallucinatory terrain': 'Mirage',
}

const ACTION_GLYPH_RE = /[\u25c6\u25c7\u2b25\u2666\ufffd]+/g

interface ParseResult {
  statBlock: CreatureStatBlockData
  pathmaidText: string
  warnings: string[]
}

type SpellcastingSection = NonNullable<CreatureStatBlockData['spellcasting']>[number]
type SpellFrequency = SpellcastingSection['spellsByRank'][number]['spells'][number]['frequency']

function linesOf(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function titleCaseName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/(^|[\s/-])([a-z])/g, (_, prefix: string, ch: string) => `${prefix}${ch.toUpperCase()}`)
}

function titleFromOcr(line: string): string {
  return line === line.toUpperCase() ? titleCaseName(line) : line
}

function normalizeImportedSpellName(name: string): string {
  const titled = titleCaseName(name)
  return SPELL_NAME_ALIASES[titled.toLowerCase()] ?? titled
}

function normalizeStrikeName(name: string): string {
  return titleCaseName(
    name
      .replace(/^Strike\b/i, '')
      .replace(ACTION_GLYPH_RE, ' ')
      .replace(/[^A-Za-z0-9\s'-]/g, ' '),
  )
}

function numberFrom(regex: RegExp, line: string): number | null {
  const match = regex.exec(line)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function findLine(lines: string[], prefix: string): string | undefined {
  const lower = prefix.toLowerCase()
  return lines.find((line) => line.toLowerCase().startsWith(lower))
}

function collectWrappedLine(lines: string[], startPrefix: string, stopPrefixes: string[]): string {
  const startIndex = lines.findIndex((line) => line.toLowerCase().startsWith(startPrefix.toLowerCase()))
  if (startIndex < 0) return ''

  const out: string[] = []
  for (let i = startIndex; i < lines.length; i += 1) {
    const lower = lines[i].toLowerCase()
    if (i > startIndex && stopPrefixes.some((prefix) => lower.startsWith(prefix))) break
    out.push(lines[i])
  }
  return out.join(' ')
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

function headerTokensFromLines(lines: string[]): string[] {
  return lines.flatMap((line) => {
    return line
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean)
  })
}

function creatureTypeFromTraits(traits: string[]): string {
  return traits.find((trait) => CREATURE_TYPES.has(trait)) ?? traits[0] ?? 'npc'
}

function parseSkills(text: string): CreatureStatBlockData['skills'] {
  const body = text.replace(/\bSkills\s+/gi, '').replace(/\([^)]*\)/g, '').replace(/,/g, ' ')
  return Array.from(body.matchAll(/([A-Za-z][A-Za-z' -]*?)\s+([+-]\d+)/g)).map((match) => ({
    name: match[1].trim(),
    modifier: Number(match[2]),
    calculated: false,
  }))
}

function parseAbilityMods(line: string): CreatureStatBlockData['abilityMods'] {
  const abilityMods = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  for (const ability of Object.keys(abilityMods) as Array<keyof typeof abilityMods>) {
    const match = new RegExp(`\\b${ability}\\s+([+-]?\\d+)`, 'i').exec(line)
    if (match) abilityMods[ability] = Number(match[1])
  }
  return abilityMods
}

function parseSpeeds(line: string): Record<string, number | null> {
  const speeds: Record<string, number | null> = {}
  const body = line.replace(/^Speed\s+/i, '')
  for (const entry of splitCsv(body)) {
    const match = /^(?:(\w+)\s+)?(\d+)\s+feet/i.exec(entry)
    if (!match) continue
    const key = match[1]?.toLowerCase() ?? 'land'
    speeds[key] = Number(match[2])
  }
  return Object.keys(speeds).length > 0 ? speeds : { land: 25 }
}

function parseDamageEntries(text: string): CreatureStatBlockData['strikes'][number]['damage'] {
  return text.split(/\s+plus\s+/i).flatMap((entry) => {
    const match = /^(.+?)\s+([a-z][a-z -]*)$/i.exec(entry.trim())
    if (!match) return [{ formula: entry.trim(), type: 'untyped' }]
    return [{ formula: match[1].trim(), type: match[2].trim().toLowerCase() }]
  })
}

function parseStrike(line: string): CreatureStatBlockData['strikes'][number] | null {
  const match = /^(Melee|Ranged)\s+(.+?)\s+([+-]\d+)\s*(?:\((.*?)\))?,\s*Damage\s+(.+)$/i.exec(line)
  if (!match) return null

  const traits = match[4] ? splitCsv(match[4]).map((trait) => trait.toLowerCase()) : []
  const reachMatch = /\breach\s+(\d+)\s+feet/i.exec(match[4] ?? '')
  const rangeMatch = /\brange(?: increment)?\s+(\d+)\s+feet/i.exec(match[4] ?? '')

  return {
    name: normalizeStrikeName(match[2]),
    modifier: Number(match[3]),
    damage: parseDamageEntries(match[5]),
    traits,
    reach: reachMatch ? Number(reachMatch[1]) : undefined,
    range: rangeMatch ? Number(rangeMatch[1]) : undefined,
  }
}

function isAbilityStartLine(line: string): boolean {
  return /^[A-Z][A-Za-z' -]+(?:\s{2,}|\s+\(|\s+If\b|\s+The\b|\s+Trigger\b|\s+Whenever\b|\s+Frequency\b)/.test(line)
}

function normalizeAbilityText(text: string): string {
  return text
    .replace(/([a-z)])(Trigger|Effect|Frequency|Requirement)\b/g, '$1 $2')
    .replace(/\b(Trigger|Effect|Frequency|Requirement)([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractLeadingTraits(description: string): { description: string; traits: string[] } {
  const match = /^\(([^)]+)\)\s*;?\s*(.*)$/.exec(description)
  if (!match) return { description, traits: [] }

  return {
    description: match[2].trim(),
    traits: splitCsv(match[1]).map((trait) => trait.toLowerCase()),
  }
}

function collectStrikeLines(lines: string[]): string[] {
  const strikes: string[] = []
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^(Melee|Ranged)\s+/i.test(lines[i])) continue
    const parts = [lines[i]]
    for (let j = i + 1; j < lines.length; j += 1) {
      const lower = lines[j].toLowerCase()
      if (KNOWN_SECTION_PREFIXES.some((prefix) => lower.startsWith(prefix))) break
      if (SPELLCASTING_RE.test(lines[j])) break
      if (isAbilityStartLine(lines[j])) break
      parts.push(lines[j])
      i = j
    }
    strikes.push(parts.join(' '))
  }
  return strikes
}

function collectSpellcastingLine(lines: string[]): string {
  const startIndex = lines.findIndex((line) => SPELLCASTING_RE.test(line))
  if (startIndex < 0) return ''

  const out: string[] = []
  for (let i = startIndex; i < lines.length; i += 1) {
    const lower = lines[i].toLowerCase()
    if (i > startIndex && KNOWN_SECTION_PREFIXES.some((prefix) => lower.startsWith(prefix))) break
    if (i > startIndex && isAbilityStartLine(lines[i])) break
    out.push(lines[i])
  }
  return out.join(' ')
}

function parseIwr(line: string, prefix: string): Array<{ type: string; value: number }> {
  return splitCsv(line.replace(new RegExp(`^${prefix}\\s+`, 'i'), '')).flatMap((entry) => {
    const match = /^(.+?)\s+(\d+)$/.exec(entry)
    if (!match) return []
    return [{ type: match[1].trim().toLowerCase(), value: Number(match[2]) }]
  })
}

function parseImmunities(line: string | undefined): CreatureStatBlockData['immunities'] {
  if (!line) return []
  return splitCsv(line.replace(/^Immunities\s+/i, '')).map((entry) => entry.toLowerCase())
}

function isKnownNonAbilityLine(line: string): boolean {
  const lower = line.toLowerCase()
  if (KNOWN_SECTION_PREFIXES.some((prefix) => lower.startsWith(prefix))) return true
  if (SPELLCASTING_RE.test(line)) return true
  if (/^(creature|common|uncommon|rare|unique)\b/i.test(line)) return true
  if (ALIGNMENTS.has(lower)) return true
  if (SIZE_MAP[lower]) return true
  return false
}

function parseAbilities(lines: string[]): CreatureStatBlockData['abilities'] {
  const abilities: CreatureStatBlockData['abilities'] = []
  let current: string[] = []

  function flush(): void {
    if (current.length === 0) return
    const rawDescription = normalizeAbilityText(current.join(' '))
    const nameMatch = /^([A-Z][A-Za-z' -]+?)(?:\s+\(|\s+If\b|\s+The\b|\s+Trigger\b|\s+Whenever\b|\s+Frequency\b|\s+Requirement\b|\s+Effect\b|$)/.exec(rawDescription)
    const name = nameMatch?.[1]?.trim() || 'Ability'
    const parsedDetails = extractLeadingTraits(rawDescription.slice(name.length).trim())
    const description = parsedDetails.description || rawDescription
    const actionCost = /\b(?:Trigger|reaction)\b/i.test(rawDescription) ? 'reaction' : undefined
    abilities.push({
      name,
      description,
      ...(actionCost ? { actionCost } : {}),
      traits: parsedDetails.traits,
    })
    current = []
  }

  for (const line of lines) {
    if (isKnownNonAbilityLine(line)) {
      flush()
      continue
    }
    const startsAbility = isAbilityStartLine(line)
    if (startsAbility) flush()
    if (startsAbility || current.length > 0) current.push(line)
  }
  flush()
  return abilities
}

function parseSpellRank(rankLabel: string): number | null {
  const match = /^(\d+)(?:st|nd|rd|th)$/i.exec(rankLabel.trim())
  if (!match) return null
  const rank = Number(match[1])
  return Number.isInteger(rank) && rank >= 0 && rank <= 10 ? rank : null
}

function parseSpellFrequency(name: string): {
  cleanName: string
  frequency?: SpellFrequency
} {
  if (/\(at will\)/i.test(name)) {
    return {
      cleanName: name.replace(/\s*\(at will\)\s*/ig, '').trim(),
      frequency: { kind: 'at-will' },
    }
  }
  return { cleanName: name.trim() }
}

function parseSpellsByRank(spellLine: string): SpellcastingSection['spellsByRank'] {
  const segments = spellLine.split(';')
  return segments.flatMap((segment) => {
    const trimmed = segment.trim()
    const match = /(?:^|\b)(\d+(?:st|nd|rd|th))(?:\s+Rank)?\s+(.+)$/.exec(trimmed)
    if (!match) return []
    const rank = parseSpellRank(match[1])
    if (rank === null) return []
    const spells = splitCsv(match[2]).flatMap((rawName, spellIndex) => {
      const { cleanName, frequency } = parseSpellFrequency(rawName)
      if (!cleanName) return []
      const spellName = normalizeImportedSpellName(cleanName)
      return [{
        name: spellName,
        foundryId: null,
        entryId: `ocr-spell-${rank}-${spellIndex}-${spellName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        ...(frequency ? { frequency } : {}),
      }]
    })
    return spells.length > 0 ? [{ rank, slots: 0, spells }] : []
  })
}

export function parseOcrStatblockToPathmaid(text: string): ParseResult {
  const warnings: string[] = []
  const lines = linesOf(text)
  const creatureIndex = lines.findIndex((line) => /^CREATURE\s*-?\d+/i.test(line))
  const name = creatureIndex > 0 ? titleFromOcr(lines[creatureIndex - 1]) : 'Imported Creature'
  const level = creatureIndex >= 0 ? numberFrom(/^CREATURE\s*(-?\d+)/i, lines[creatureIndex]) : null
  if (level === null) warnings.push('Creature level was not detected.')

  const perceptionIndex = lines.findIndex((line) => /^Perception\b/i.test(line))
  const headerLines = creatureIndex >= 0
    ? lines.slice(creatureIndex + 1, perceptionIndex >= 0 ? perceptionIndex : lines.length)
    : []
  const headerTokens = headerTokensFromLines(headerLines)
  const rarity = headerTokens.find((token) => RARITIES.has(token)) ?? 'common'
  const size = headerTokens.find((token) => SIZE_MAP[token])
  const traits = headerTokens.filter((token) => !RARITIES.has(token) && !ALIGNMENTS.has(token) && !SIZE_MAP[token])
  const type = creatureTypeFromTraits(traits)

  const perceptionLine = findLine(lines, 'Perception')
  const perception = perceptionLine ? numberFrom(/^Perception\s+([+-]?\d+)/i, perceptionLine) : null
  const senses = perceptionLine?.includes(';') ? splitCsv(perceptionLine.split(';').slice(1).join(';')) : []

  const languagesLine = findLine(lines, 'Languages')
  const languages = languagesLine ? splitCsv(languagesLine.replace(/^Languages\s+/i, '')) : []
  const skills = parseSkills(collectWrappedLine(lines, 'Skills', ['str ', 'ac ', 'hp ', 'speed']))
  const abilityLine = lines.find((line) => /^Str\s+/i.test(line))
  const abilityMods = abilityLine ? parseAbilityMods(abilityLine) : { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }

  const defenseLine = findLine(lines, 'AC')
  const ac = defenseLine ? numberFrom(/^AC\s+(\d+)/i, defenseLine) : null
  const fort = defenseLine ? numberFrom(/\bFort\s+([+-]?\d+)/i, defenseLine) : null
  const ref = defenseLine ? numberFrom(/\bRef\s+([+-]?\d+)/i, defenseLine) : null
  const will = defenseLine ? numberFrom(/\bWill\s+([+-]?\d+)/i, defenseLine) : null
  const hpLine = findLine(lines, 'HP')
  const hp = hpLine ? numberFrom(/^HP\s+(\d+)/i, hpLine) : null
  const speedLine = findLine(lines, 'Speed')

  const strikes = collectStrikeLines(lines).flatMap((line) => {
    const strike = parseStrike(line)
    return strike ? [strike] : []
  })

  const spellLine = collectSpellcastingLine(lines)
  const spellDC = spellLine ? numberFrom(/\bDC\s+(\d+)/i, spellLine) : null
  const spellAttack = spellLine ? numberFrom(/\battack\s+([+-]?\d+)/i, spellLine) : null
  const spellsByRank = spellLine ? parseSpellsByRank(spellLine) : []

  const statBlock: CreatureStatBlockData = {
    id: '',
    name,
    level: level ?? 1,
    hp: hp ?? 1,
    ac: ac ?? 10,
    fort: fort ?? 0,
    ref: ref ?? 0,
    will: will ?? 0,
    perception: perception ?? 0,
    stealth: skills.find((skill) => skill.name.toLowerCase() === 'stealth')?.modifier ?? null,
    traits,
    rarity: rarity as Rarity,
    size: size ? SIZE_MAP[size] : 'Medium',
    type,
    builderMode: 'manual',
    abilityMods,
    immunities: parseImmunities(findLine(lines, 'Immunities')),
    weaknesses: parseIwr(findLine(lines, 'Weaknesses') ?? '', 'Weaknesses'),
    resistances: parseIwr(findLine(lines, 'Resistances') ?? '', 'Resistances'),
    speeds: speedLine ? parseSpeeds(speedLine) : { land: 25 },
    strikes,
    abilities: parseAbilities(lines),
    skills,
    languages,
    senses,
    source: 'custom',
    ...(spellDC !== null ? { spellDC } : {}),
    ...(spellLine
      ? {
          spellcasting: [{
            entryId: 'ocr-spellcasting',
            entryName: spellLine.replace(/\s*;.*$/, '').trim(),
            tradition: spellLine.split(' ')[0]?.toLowerCase() ?? 'arcane',
            castType: /innate/i.test(spellLine) ? 'innate' : 'prepared',
            spellDc: spellDC ?? 0,
            spellAttack: spellAttack ?? 0,
            spellsByRank,
          }],
        }
      : {}),
    auras: [],
    rituals: [],
  }

  if (!perceptionLine) warnings.push('Perception was not detected.')
  if (!defenseLine) warnings.push('AC/saves were not detected.')
  if (!hpLine) warnings.push('HP was not detected.')
  if (strikes.length === 0) warnings.push('No strikes were detected.')

  return {
    statBlock,
    pathmaidText: stringifyCustomCreaturePathmaid(statBlock),
    warnings,
  }
}
