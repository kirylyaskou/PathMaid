import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import { getRecallKnowledgeInfo } from '@engine'
import { formatModifier } from '@/shared/lib/format'
import { stripHtml } from '@/shared/lib/html'
import {
  getSkillLabel,
  getTraitLabel,
  type AbilityLoc,
  type SupportedLocale,
} from '@/shared/i18n'
import {
  formatImmunityWithExceptions,
  normalizeImmunities,
  normalizeResistances,
  normalizeWeaknesses,
} from '../model/iwr-normalize'
import type { CreatureStatBlockData, DisplayActionCost } from '../model/types'
import { rankLabel } from './spellcasting-helpers'

type PdfStrike = CreatureStatBlockData['strikes'][number] & {
  modifiedMod?: number
  map1?: number
  map2?: number
  effectiveDamage?: CreatureStatBlockData['strikes'][number]['damage']
  displayReach?: number
  hasNonDefaultReach?: boolean
  hasRange?: boolean
}

export interface CreaturePdfSpeed {
  type: string
  final: number
}

export interface CreaturePdfStatValues {
  ac?: number
  fort?: number
  ref?: number
  will?: number
  perception?: number
  spellDc?: number
  classDc?: number
}

export interface CreaturePdfLabels {
  recallKnowledgeDc: string
  senses: string
  hp: string
  ac: string
  fort: string
  ref: string
  will: string
  perception: string
  spellDc: string
  classDc: string
  speed: string
  immunities: string
  resistances: string
  weaknesses: string
  strikes: string
  damage: string
  reach: string
  range: string
  abilities: string
  offensive: string
  defensive: string
  other: string
  reactions: string
  spellcasting: string
  dc: string
  attack: string
  skills: string
  languages: string
  equipment: string
  source: string
  abilityMods: string
  traits: string
}

export interface CreaturePdfOptions {
  locale: SupportedLocale
  displayName?: string
  sizeTypeLine?: string
  traitLabels?: string[]
  labels?: Partial<CreaturePdfLabels>
  statValues?: CreaturePdfStatValues
  speeds?: readonly CreaturePdfSpeed[]
  strikes?: readonly PdfStrike[]
  itemsLocById?: Map<string, AbilityLoc>
}

const DEFAULT_LABELS: CreaturePdfLabels = {
  recallKnowledgeDc: 'Recall Knowledge DC',
  senses: 'Senses',
  hp: 'HP',
  ac: 'AC',
  fort: 'Fort',
  ref: 'Ref',
  will: 'Will',
  perception: 'Perception',
  spellDc: 'Spell DC',
  classDc: 'Class DC',
  speed: 'Speed',
  immunities: 'Immunities',
  resistances: 'Resistances',
  weaknesses: 'Weaknesses',
  strikes: 'Strikes',
  damage: 'Damage',
  reach: 'Reach',
  range: 'Range',
  abilities: 'Abilities',
  offensive: 'Offensive',
  defensive: 'Defensive',
  other: 'Other',
  reactions: 'Reactions',
  spellcasting: 'Spellcasting',
  dc: 'DC',
  attack: 'Attack',
  skills: 'Skills',
  languages: 'Languages',
  equipment: 'Equipment',
  source: 'Source',
  abilityMods: 'Ability Mods',
  traits: 'Traits',
}

const COLORS = {
  page: '#ffffff',
  ink: '#0e0e0e',
  muted: '#303030',
  line: '#8e8e8e',
  header: '#111111',
  rarity: '#b23a1b',
  size: '#24836f',
  trait: '#6d1f12',
  traitBorder: '#e2d0ad',
  linkBlue: '#0c6b8f',
}

const CONTENT_WIDTH = 535
const ACTIONS: Record<string, string> = {
  '1': '1',
  '2': '2',
  '3': '3',
  reaction: 'R',
  free: 'F',
}

function cleanText(value: string | undefined): string {
  return stripHtml(value ?? '')
    .replace(/@UUID\[[^\]]+\]\{([^}]+)\}/g, '$1')
    .replace(/@Check\[[^\]]+\]/g, 'check')
    .replace(/@Damage\[[^\]]+\]\{([^}]+)\}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function localTrait(value: string, locale: SupportedLocale): string {
  return getTraitLabel(value.toLowerCase(), locale)
}

function rule(): Content {
  return {
    canvas: [
      { type: 'line', x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.7, lineColor: COLORS.line },
    ],
    margin: [0, 4, 0, 3],
  } as Content
}

function line(parts: Content[], margin: [number, number, number, number] = [0, 0, 0, 1]): Content {
  return {
    text: parts,
    style: 'line',
    margin,
  } as Content
}

function label(value: string): Content {
  return { text: `${value} `, bold: true, color: COLORS.ink }
}

function raw(value: string | number, extra?: Record<string, unknown>): Content {
  return { text: String(value), color: COLORS.ink, ...extra } as Content
}

function actionGlyph(cost: DisplayActionCost | 1): Content {
  return {
    text: ACTIONS[String(cost)] ?? '',
    style: 'actionGlyph',
  } as Content
}

function traitChipColor(labelValue: string): string {
  const normalized = labelValue.toLowerCase()
  if (
    normalized.includes('tiny') ||
    normalized.includes('small') ||
    normalized.includes('medium') ||
    normalized.includes('large') ||
    normalized.includes('huge') ||
    normalized.includes('gargantuan') ||
    normalized.includes('крошеч') ||
    normalized.includes('малень') ||
    normalized.includes('средн') ||
    normalized.includes('больш') ||
    normalized.includes('огром')
  ) {
    return COLORS.size
  }

  if (
    normalized.includes('unique') ||
    normalized.includes('uncommon') ||
    normalized.includes('rare') ||
    normalized.includes('уник') ||
    normalized.includes('необыч') ||
    normalized.includes('редк')
  ) {
    return COLORS.rarity
  }

  return COLORS.trait
}

function chip(labelValue: string): Content {
  return {
    table: {
      widths: ['auto'],
      body: [[{
        text: labelValue.toUpperCase(),
        style: 'traitChip',
        fillColor: traitChipColor(labelValue),
        border: [true, true, true, true],
        margin: [4, 1, 4, 1],
      }]],
    },
    layout: {
      hLineWidth: () => 0.8,
      vLineWidth: () => 0.8,
      hLineColor: () => COLORS.traitBorder,
      vLineColor: () => COLORS.traitBorder,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin: [0, 0, 3, 2],
  } as Content
}

function chipRows(traits: string[]): Content[] {
  const rows: Content[] = []
  for (let index = 0; index < traits.length; index += 6) {
    rows.push({
      columns: traits.slice(index, index + 6).map((trait) => ({ width: 'auto', stack: [chip(trait)] })),
      columnGap: 1,
      margin: [0, index === 0 ? 2 : 0, 0, 0],
    } as Content)
  }
  return rows
}

function formatDamage(damage: CreatureStatBlockData['strikes'][number]['damage']): string {
  return damage
    .map((entry) => `${entry.formula} ${entry.type}${entry.persistent ? ' persistent' : ''}`.trim())
    .join(' plus ')
}

function formatTraits(values: readonly string[], locale: SupportedLocale): string {
  return values.map((trait) => localTrait(trait, locale).toLowerCase()).join(', ')
}

function buildHeader(
  creature: CreatureStatBlockData,
  options: CreaturePdfOptions,
): Content[] {
  const traits = options.traitLabels ?? [
    ...(creature.rarity !== 'common' ? [localTrait(creature.rarity, options.locale)] : []),
    localTrait(creature.size, options.locale),
    ...creature.traits.map((trait) => localTrait(trait, options.locale)),
  ]

  return [
    {
      table: {
        widths: ['*', 'auto'],
        body: [[
          { text: (options.displayName ?? creature.name).toUpperCase(), style: 'title', border: [false, false, false, false] },
          { text: `CREATURE ${creature.level}`, style: 'title', alignment: 'right', border: [false, false, false, false] },
        ]],
      },
      layout: {
        hLineWidth: (rowIndex: number) => rowIndex === 0 || rowIndex === 1 ? 1.1 : 0,
        vLineWidth: () => 0,
        hLineColor: () => COLORS.header,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 1,
      },
      margin: [0, 0, 0, 2],
    } as Content,
    ...chipRows(traits),
  ]
}

function buildOpeningLines(
  creature: CreatureStatBlockData,
  options: CreaturePdfOptions,
  labels: CreaturePdfLabels,
): Content[] {
  const values = options.statValues ?? {}
  const lines: Content[] = [
    line([
      label(labels.perception),
      raw(formatModifier(values.perception ?? creature.perception)),
      creature.senses.length > 0 ? raw(`; ${creature.senses.map((sense) => localTrait(sense, options.locale)).join(', ')}`) : raw(''),
    ]),
  ]

  if (creature.languages.length > 0) {
    lines.push(line([label(labels.languages), raw(creature.languages.join(', '))]))
  }

  if (creature.skills.length > 0) {
    lines.push(line([
      label(labels.skills),
      raw(creature.skills
        .map((skill) => `${getSkillLabel(skill.name, options.locale)} ${formatModifier(skill.modifier)}`)
        .join(', ')),
    ]))
  }

  if (creature.abilityMods) {
    const mods = creature.abilityMods
    lines.push(line([
      label('Str'),
      raw(`${formatModifier(mods.str)}, `),
      label('Dex'),
      raw(`${formatModifier(mods.dex)}, `),
      label('Con'),
      raw(`${formatModifier(mods.con)}, `),
      label('Int'),
      raw(`${formatModifier(mods.int)}, `),
      label('Wis'),
      raw(`${formatModifier(mods.wis)}, `),
      label('Cha'),
      raw(formatModifier(mods.cha)),
    ]))
  }

  const recall = getRecallKnowledgeInfo({
    level: creature.level,
    rarity: creature.rarity,
    type: creature.type,
    traits: creature.traits,
  })
  lines.push(line([
    label(labels.recallKnowledgeDc),
    raw(`${recall.dc} ${recall.type}${recall.skills.length > 0 ? ` (${recall.skills.join(', ')})` : ''}`),
  ]))

  return lines
}

function iwrText(creature: CreatureStatBlockData, labels: CreaturePdfLabels): Content[] {
  const lines: Content[] = []
  const immunities = normalizeImmunities(creature.immunities)
  const resistances = normalizeResistances(creature.resistances)
  const weaknesses = normalizeWeaknesses(creature.weaknesses)

  if (immunities.length > 0) {
    lines.push(line([label(labels.immunities), raw(immunities.map(formatImmunityWithExceptions).join(', '))]))
  }
  if (resistances.length > 0) {
    lines.push(line([
      label(labels.resistances),
      raw(resistances.map((entry) => {
        const exceptions = entry.exceptions?.length ? ` (except ${entry.exceptions.join(', ')})` : ''
        const doubleVs = entry.doubleVs?.length ? ` [x2 vs ${entry.doubleVs.join(', ')}]` : ''
        return `${entry.type} ${entry.value}${exceptions}${doubleVs}`
      }).join(', ')),
    ]))
  }
  if (weaknesses.length > 0) {
    lines.push(line([
      label(labels.weaknesses),
      raw(weaknesses.map((entry) => {
        const exceptions = entry.exceptions?.length ? ` (except ${entry.exceptions.join(', ')})` : ''
        return `${entry.type} ${entry.value}${exceptions}`
      }).join(', ')),
    ]))
  }

  return lines
}

function buildDefenseLines(
  creature: CreatureStatBlockData,
  options: CreaturePdfOptions,
  labels: CreaturePdfLabels,
): Content[] {
  const values = options.statValues ?? {}
  const dcParts = []
  if (creature.spellDC != null) dcParts.push(`${labels.spellDc} ${values.spellDc ?? creature.spellDC}`)
  if (creature.classDC != null) dcParts.push(`${labels.classDc} ${values.classDc ?? creature.classDC}`)

  return [
    rule(),
    line([
      label(labels.ac),
      raw(`${values.ac ?? creature.ac}; `),
      label(labels.fort),
      raw(`${formatModifier(values.fort ?? creature.fort)}, `),
      label(labels.ref),
      raw(`${formatModifier(values.ref ?? creature.ref)}, `),
      label(labels.will),
      raw(formatModifier(values.will ?? creature.will)),
      dcParts.length > 0 ? raw(`; ${dcParts.join(', ')}`) : raw(''),
    ]),
    line([label(labels.hp), raw(creature.hp)]),
    ...iwrText(creature, labels),
  ]
}

function buildSpeedLine(
  creature: CreatureStatBlockData,
  options: CreaturePdfOptions,
  labels: CreaturePdfLabels,
): Content[] {
  const speeds = options.speeds ??
    Object.entries(creature.speeds)
      .filter(([, value]) => typeof value === 'number' && value > 0)
      .map(([type, final]) => ({ type, final: final as number }))

  if (speeds.length === 0) return []

  return [
    rule(),
    line([
      label(labels.speed),
      raw(speeds
        .map((speed) => {
          const speedLabel = speed.type === 'land' ? '' : `${localTrait(speed.type, options.locale)} `
          return `${speedLabel}${speed.final} feet`
        })
        .join(', ')),
    ]),
  ]
}

function buildStrikeLines(options: CreaturePdfOptions, labels: CreaturePdfLabels): Content[] {
  const strikes = options.strikes ?? []

  return strikes.map((strike) => {
    const loc = strike.id ? options.itemsLocById?.get(strike.id) : undefined
    const name = loc?.name ?? strike.name
    const attack = formatModifier(strike.modifiedMod ?? strike.modifier)
    const map = strike.map1 != null && strike.map2 != null ? ` (${formatModifier(strike.map1)} / ${formatModifier(strike.map2)})` : ''
    const reach = strike.hasRange || strike.range ? `${labels.range.toLowerCase()} ${strike.range} feet` :
      strike.hasNonDefaultReach || strike.displayReach ? `${labels.reach.toLowerCase()} ${strike.displayReach ?? strike.reach} feet` : ''
    const traits = [
      ...strike.traits.map((trait) => localTrait(trait, options.locale).toLowerCase()),
      reach,
    ].filter(Boolean).join(', ')
    const description = cleanText(loc?.description)

    return line([
      label(strike.hasRange || strike.range ? 'Ranged' : 'Melee'),
      actionGlyph(1),
      raw(' '),
      { text: name, bold: true, color: COLORS.ink },
      raw(` ${attack}${map}`),
      traits ? raw(` (${traits})`) : raw(''),
      raw(', '),
      label(labels.damage),
      raw(formatDamage(strike.effectiveDamage ?? strike.damage)),
      description ? raw(`. ${description}`) : raw(''),
    ])
  })
}

function buildSpellcastingLines(creature: CreatureStatBlockData, labels: CreaturePdfLabels): Content[] {
  const sections = creature.spellcasting ?? []

  return sections.flatMap((entry): Content[] => [
    line([
      label(entry.entryName || `${entry.tradition} ${entry.castType} ${labels.spellcasting}`),
      raw(`${labels.dc} ${entry.spellDc}, ${labels.attack} ${formatModifier(entry.spellAttack)}`),
    ]),
    ...entry.spellsByRank.map((rank) => line([
      { text: `  ${rankLabel(rank.rank)} `, bold: true, italics: true, color: COLORS.ink },
      raw(`${rank.slots > 0 ? `(${rank.slots}) ` : ''}${rank.spells.map((spell) => spell.name).join(', ')}`),
    ], [0, 0, 0, 0])),
  ])
}

function buildAbilityLines(creature: CreatureStatBlockData, options: CreaturePdfOptions): Content[] {
  return creature.abilities.map((ability) => {
    const loc = ability.id ? options.itemsLocById?.get(ability.id) : undefined
    const name = loc?.name ?? ability.name
    const description = cleanText(loc?.description) || cleanText(ability.description)
    const traits = ability.traits?.length ? ` (${formatTraits(ability.traits, options.locale)})` : ''
    const action = ability.actionCost !== undefined && ability.actionCost !== 0
      ? actionGlyph(ability.actionCost)
      : null

    return line([
      { text: name, bold: true, color: COLORS.ink },
      action ? raw(' ') : raw(''),
      action ?? raw(''),
      traits ? raw(traits) : raw(''),
      description ? raw(` ${description}`) : raw(''),
    ])
  })
}

function buildEquipmentLines(creature: CreatureStatBlockData, labels: CreaturePdfLabels): Content[] {
  const items = creature.equipment ?? []
  if (items.length === 0) return []

  return [
    line([
      label(labels.equipment),
      raw(items.map((item) => {
        const quantity = item.quantity > 1 ? ` x${item.quantity}` : ''
        return `${item.item_name}${quantity}`
      }).join(', ')),
    ]),
  ]
}

function buildFooterLines(creature: CreatureStatBlockData, labels: CreaturePdfLabels): Content[] {
  const lines: Content[] = []
  if (creature.description) {
    lines.push(line([raw(cleanText(creature.description))], [0, 3, 0, 1]))
  }
  if (creature.source) {
    lines.push(line([label(labels.source), raw(creature.source, { color: COLORS.linkBlue })], [0, 3, 0, 0]))
  }
  return lines
}

export function buildCreaturePdfDocument(
  creature: CreatureStatBlockData,
  options: CreaturePdfOptions,
): TDocumentDefinitions {
  const labels = { ...DEFAULT_LABELS, ...options.labels }
  const strikes = options.strikes ? options : { ...options, strikes: creature.strikes }
  const content = [
    ...buildHeader(creature, options),
    ...buildOpeningLines(creature, options, labels),
    ...buildDefenseLines(creature, options, labels),
    ...buildSpeedLine(creature, options, labels),
    ...buildStrikeLines(strikes, labels),
    ...buildSpellcastingLines(creature, labels),
    ...buildAbilityLines(creature, options),
    ...buildEquipmentLines(creature, labels),
    ...buildFooterLines(creature, labels),
  ]

  return {
    pageSize: 'A4',
    pageMargins: [30, 22, 30, 26],
    background: {
      canvas: [
        { type: 'rect', x: 0, y: 0, w: 595.28, h: 841.89, color: COLORS.page },
      ],
    },
    content,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10.5,
      color: COLORS.ink,
      lineHeight: 1.14,
    },
    styles: {
      title: {
        fontSize: 17,
        bold: true,
        color: COLORS.header,
        lineHeight: 1,
      },
      traitChip: {
        fontSize: 7,
        bold: true,
        color: '#ffffff',
        lineHeight: 1,
      },
      line: {
        fontSize: 10.5,
        color: COLORS.ink,
        lineHeight: 1.14,
      },
      actionGlyph: {
        font: 'Pathfinder2eActions',
        fontSize: 10.5,
        bold: true,
        color: COLORS.ink,
      },
    },
  }
}

export function creaturePdfFilename(name: string): string {
  const safe = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return `${safe || 'creature-card'}.pdf`
}
