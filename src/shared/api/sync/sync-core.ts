import { getDb } from '@/shared/db'
import { setSyncMetadata } from '../db'
import type { RawEntity, SyncProgressCallback } from './types'
import { BATCH_SIZE } from './types'

export { BATCH_SIZE } from './types'

export const ITEM_TYPES = [
  'weapon', 'armor', 'consumable', 'equipment', 'treasure',
  'backpack', 'kit', 'book', 'shield', 'effect',
]

export const FOLDER_TO_CATEGORY: Record<string, string> = {
  'dfRpdU8Efsenms12': 'basic',
  '0Z6sKp3ActW2pM2e': 'skill',
  'NnWkuvbKXtwc0nEt': 'exploration',
  'zXSrhFwRbm6XXqAa': 'downtime',
}

const SELECTOR_LABELS: Record<string, string> = {
  'all': 'all checks',
  'attack-roll': 'attack rolls',
  'perception': 'Perception',
  'initiative': 'initiative',
  'skill-check': 'skill checks',
  'saving-throw': 'saving throws',
  'ac': 'AC',
  'str-based': 'Strength-based checks',
  'str-damage': 'Strength-based damage',
  'dex-based': 'Dexterity-based checks',
  'con-based': 'Constitution-based checks',
  'int-based': 'Intelligence-based checks',
  'wis-based': 'Wisdom-based checks',
  'cha-based': 'Charisma-based checks',
  'fortitude': 'Fortitude',
  'reflex': 'Reflex',
  'will': 'Will',
  'spell-attack-roll': 'spell attack rolls',
  'spell-dc': 'spell DC',
}

export function parseItemPrice(price: Record<string, unknown>): number | null {
  if (!price || typeof price !== 'object') return null
  const val = price.value as Record<string, number> | undefined
  if (!val) return null
  const gp = (val.gp ?? 0)
  const sp = (val.sp ?? 0) / 10
  const cp = (val.cp ?? 0) / 100
  const pp = (val.pp ?? 0) * 10
  const total = gp + sp + cp + pp
  return total > 0 ? Math.round(total * 100) / 100 : null
}

export function parseDamageFormula(damage: Record<string, unknown>): { formula: string | null; type: string | null } {
  if (!damage || typeof damage !== 'object') return { formula: null, type: null }
  const dice = damage.dice as number | undefined
  const die = damage.die as string | undefined
  const damageType = damage.damageType as string | undefined
  if (!dice || !die) return { formula: null, type: damageType ?? null }
  return {
    formula: `${dice}${die} ${damageType ?? ''}`.trim(),
    type: damageType ?? null,
  }
}

export function parseCompendiumId(source: string | undefined): string | null {
  if (!source) return null
  // "Compendium.pf2e.spells-srd.Item.AbCdEfGhI" → "AbCdEfGhI"
  const match = source.match(/Item\.([A-Za-z0-9]+)$/)
  return match ? match[1] : null
}

export function getLocalizeValue(obj: Record<string, unknown>, dotPath: string): string | undefined {
  const parts = dotPath.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

export function selectorLabel(selector: string | string[]): string {
  if (Array.isArray(selector)) {
    return selector.map((s) => SELECTOR_LABELS[s] ?? s).join(' and ')
  }
  return SELECTOR_LABELS[selector] ?? selector
}

export function parseModifierSummary(rules: unknown[]): string {
  if (!Array.isArray(rules)) return ''
  const parts: string[] = []
  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    if (r.key !== 'FlatModifier') continue
    const selector = r.selector as string | string[] | undefined
    if (!selector) continue
    const typeLabel = r.type === 'circumstance' ? 'Circumstance' : 'Status'
    const rawValue = r.value
    let valueStr: string
    if (typeof rawValue === 'number') {
      valueStr = rawValue < 0 ? `−${Math.abs(rawValue)}` : `+${rawValue}`
    } else if (typeof rawValue === 'string' && rawValue.includes('@item.badge.value')) {
      valueStr = '−value'
    } else {
      continue
    }
    parts.push(`${typeLabel} ${valueStr} to ${selectorLabel(selector)}`)
  }
  return parts.join('; ')
}

export async function batchInsertEntities(
  entities: RawEntity[],
  onProgress?: SyncProgressCallback
): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM entities', [])

  const total = entities.length
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE)
    const placeholders = batch
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ')
    const values = batch.flatMap((e) => [
      e.id,
      e.name,
      // 70-02: iconic/pregen records ship with type='character'; the bestiary
      // indexes by type='npc' and the Characters page consumes the separate
      // `characters` table, so reroute on insert. Keep non-character types
      // (npc, hazard, …) untouched.
      e.entity_type === 'character' ? 'npc' : e.entity_type,
      e.level,
      e.hp,
      e.ac,
      e.fort,
      e.ref_save,
      e.will,
      e.perception,
      e.traits,
      e.rarity,
      e.size,
      e.source_pack,
      e.raw_json,
      e.source_name,
      e.source_adventure,
    ])

    await db.execute(
      `INSERT OR REPLACE INTO entities (id, name, type, level, hp, ac, fort, ref, will, perception, traits, rarity, size, source_pack, raw_json, source_name, source_adventure) VALUES ${placeholders}`,
      values
    )

    onProgress?.(
      `Importing entities (${Math.min(i + BATCH_SIZE, total)} / ${total})...`,
      Math.min(i + BATCH_SIZE, total),
      total
    )
  }

  onProgress?.('Building search index...', total, total)
  await db.execute(
    "INSERT INTO entities_fts(entities_fts) VALUES('rebuild')",
    []
  )

  await setSyncMetadata('entity_count', String(total))
  await setSyncMetadata('last_sync_date', new Date().toISOString())
}
