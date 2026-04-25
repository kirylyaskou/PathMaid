/**
 * Pure transform from a Babele actor entry to MonsterStructuredLoc.
 *
 * Babele packs ship overlay deltas: a field appears only when the upstream
 * translation differs from the engine's English source. Numeric values
 * (HP/AC/save totals, ability scores, perception number) stay in
 * engine.creature.* — duplicating them here would create a two-source-of-truth
 * risk.
 *
 * Fields prefixed with underscore in pack JSON (e.g. `_descriptionGM`) are
 * the Babele convention for disabled translations and are intentionally
 * dropped by this adapter.
 */

import type { MonsterStructuredLoc, SpellStructuredLoc } from '../lib/types'

export interface BabeleActorEntry {
  name?: string
  blurb?: string
  description?: string
  descriptionGM?: string
  language?: string
  senses?: string
  speed?: string
  hp?: string
  ac?: string
  allSaves?: string
  stealth?: string
  skills?: Record<string, { details?: string }>
  items?: Array<{
    id: string
    name: string
    description?: string
    rules?: Record<string, { label?: string }>
  }>
  [key: string]: unknown
}

export interface BabelePackFile {
  label: string
  mapping?: Record<string, unknown>
  entries: Record<string, BabeleActorEntry>
}

export function isActorPack(pack: BabelePackFile): boolean {
  if (!pack.mapping || typeof pack.mapping !== 'object') return false
  const fields = Object.keys(pack.mapping)
  return fields.includes('items') && fields.includes('description')
}

/**
 * Detect a spell-shaped pack: spell entries carry name + description text
 * with spell-specific overlay fields (range, duration, time, heightening,
 * cost, target) but no items[]. Used to route the spells-srd pack into
 * the simpler text-overlay path (no MonsterStructuredLoc).
 */
export function isSpellPack(pack: BabelePackFile): boolean {
  if (!pack.mapping || typeof pack.mapping !== 'object') return false
  const fields = Object.keys(pack.mapping)
  return (
    !fields.includes('items') &&
    fields.includes('range') &&
    fields.includes('duration') &&
    fields.includes('heightening')
  )
}

/**
 * Babele spell entry — name + description + the small set of free-form
 * stat-block overlay fields the upstream module localizes (range,
 * target, duration, time, cost, requirements, heightening).
 */
export interface BabeleSpellEntry {
  name?: string
  description?: string
  range?: string
  target?: string
  duration?: string
  time?: string
  cost?: string
  requirements?: string
  heightening?: string
  [key: string]: unknown
}

/**
 * Pure transform: Babele spell entry → name + description + structured
 * overlay. Structured fields are optional — adapter copies only those
 * present in the source entry (sparse delta convention).
 */
export function adaptBabeleSpellEntry(
  entry: BabeleSpellEntry,
): { name: string; description: string; structured: SpellStructuredLoc } {
  if (entry === null || typeof entry !== 'object') {
    throw new Error('Invalid Babele spell entry: not an object')
  }
  const structured: SpellStructuredLoc = {
    ...(typeof entry.range === 'string' && entry.range.length > 0 && { range: entry.range }),
    ...(typeof entry.target === 'string' && entry.target.length > 0 && { target: entry.target }),
    ...(typeof entry.duration === 'string' && entry.duration.length > 0 && { duration: entry.duration }),
    ...(typeof entry.time === 'string' && entry.time.length > 0 && { time: entry.time }),
    ...(typeof entry.cost === 'string' && entry.cost.length > 0 && { cost: entry.cost }),
    ...(typeof entry.requirements === 'string' && entry.requirements.length > 0 && { requirements: entry.requirements }),
    ...(typeof entry.heightening === 'string' && entry.heightening.length > 0 && { heightening: entry.heightening }),
  }
  return {
    name: typeof entry.name === 'string' ? entry.name : '',
    description: typeof entry.description === 'string' ? entry.description : '',
    structured,
  }
}

/**
 * Babele item-shaped entry — covers actions, feats, equipment, conditions.
 * Pack mappings for these are typically empty (`{}`) because Babele falls
 * back to the global Item mapping for `name` + `description`. Entries
 * carry the same minimal name+description shape as spells.
 */
export interface BabeleItemEntry {
  name?: string
  description?: string
  [key: string]: unknown
}

export function adaptBabeleItemEntry(
  entry: BabeleItemEntry,
): { name: string; description: string } {
  if (entry === null || typeof entry !== 'object') {
    throw new Error('Invalid Babele item entry: not an object')
  }
  return {
    name: typeof entry.name === 'string' ? entry.name : '',
    description: typeof entry.description === 'string' ? entry.description : '',
  }
}

export function adaptBabeleActorEntry(
  entry: BabeleActorEntry,
): MonsterStructuredLoc {
  if (entry === null || typeof entry !== 'object') {
    throw new Error('Invalid Babele entry: not an object')
  }

  const items: MonsterStructuredLoc['items'] = []
  if (Array.isArray(entry.items)) {
    for (const item of entry.items) {
      if (!item || typeof item !== 'object') continue
      if (typeof item.id !== 'string' || typeof item.name !== 'string') continue
      items.push({
        id: item.id,
        name: item.name,
        ...(item.description !== undefined && { description: item.description }),
        ...(item.rules !== undefined && { rules: item.rules }),
      })
    }
  }

  return {
    ...(entry.blurb !== undefined && { blurb: entry.blurb }),
    ...(entry.description !== undefined && { description: entry.description }),
    ...(entry.descriptionGM !== undefined && { descriptionGM: entry.descriptionGM }),
    ...(entry.language !== undefined && { languageDetails: entry.language }),
    ...(entry.senses !== undefined && { sensesDetails: entry.senses }),
    ...(entry.speed !== undefined && { speedDetails: entry.speed }),
    ...(entry.hp !== undefined && { hpDetails: entry.hp }),
    ...(entry.ac !== undefined && { acDetails: entry.ac }),
    ...(entry.allSaves !== undefined && { allSavesDetails: entry.allSaves }),
    ...(entry.stealth !== undefined && { stealthDetails: entry.stealth }),
    ...(entry.skills !== undefined && { skillsDetails: entry.skills }),
    items,
  }
}
