import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getDb } from '@/shared/db'
import { setSyncMetadata } from './db'

interface RawEntity {
  id: string
  name: string
  entity_type: string
  level: number | null
  hp: number | null
  ac: number | null
  fort: number | null
  ref_save: number | null
  will: number | null
  perception: number | null
  traits: string | null
  rarity: string | null
  size: string | null
  source_pack: string | null
  raw_json: string
  source_name: string | null
}

interface SyncProgress {
  stage: string
  current: number
  total: number
}

export type SyncProgressCallback = (stage: string, current: number, total: number) => void

const BATCH_SIZE = 500

interface RawSpell {
  id: string
  name: string
  rank: number
  traditions: string | null
  traits: string | null
  description: string | null
  damage: string | null
  area: string | null
  range_text: string | null
  duration_text: string | null
  action_cost: string | null
  save_stat: string | null
  source_book: string | null
  source_pack: string | null
}

interface RawSpellcastingEntry {
  id: string
  creature_id: string
  entry_name: string
  tradition: string | null
  cast_type: string | null
  spell_dc: number | null
  spell_attack: number | null
  slots: string | null
}

interface RawCreatureSpell {
  id: string
  creature_id: string
  entry_id: string
  spell_foundry_id: string | null
  spell_name: string
  rank_prepared: number
  sort_order: number
}

const ITEM_TYPES = ['weapon', 'armor', 'consumable', 'equipment', 'treasure', 'backpack', 'kit', 'book', 'shield', 'effect']

interface RawItem {
  id: string
  name: string
  item_type: string
  level: number
  rarity: string | null
  bulk: string | null
  price_gp: number | null
  traits: string | null
  description: string | null
  source_book: string | null
  source_pack: string | null
  damage_formula: string | null
  damage_type: string | null
  weapon_category: string | null
  weapon_group: string | null
  ac_bonus: number | null
  dex_cap: number | null
  check_penalty: number | null
  speed_penalty: number | null
  strength_req: number | null
  consumable_category: string | null
  uses_max: number | null
}

interface RawCreatureItem {
  id: string
  creature_id: string
  item_name: string
  item_type: string
  foundry_item_id: string | null
  quantity: number
  bulk: string | null
  damage_formula: string | null
  ac_bonus: number | null
  traits: string | null
  sort_order: number
}

function parseItemPrice(price: Record<string, unknown>): number | null {
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

function parseDamageFormula(damage: Record<string, unknown>): { formula: string | null; type: string | null } {
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

function parseCompendiumId(source: string | undefined): string | null {
  if (!source) return null
  // "Compendium.pf2e.spells-srd.Item.AbCdEfGhI" → "AbCdEfGhI"
  const match = source.match(/Item\.([A-Za-z0-9]+)$/)
  return match ? match[1] : null
}

function getLocalizeValue(obj: Record<string, unknown>, dotPath: string): string | undefined {
  const parts = dotPath.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

interface RawCondition {
  id: string
  name: string
  slug: string | null
  is_valued: number
  description: string | null
  group_name: string | null
  overrides: string | null
  rules_json: string | null
  modifier_summary: string | null
  source_book: string | null
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

function selectorLabel(selector: string | string[]): string {
  if (Array.isArray(selector)) {
    return selector.map((s) => SELECTOR_LABELS[s] ?? s).join(' and ')
  }
  return SELECTOR_LABELS[selector] ?? selector
}

function parseModifierSummary(rules: unknown[]): string {
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

async function extractAndInsertConditions(entities: RawEntity[]): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM conditions', [])

  const conditions: RawCondition[] = []
  for (const entity of entities) {
    if (entity.entity_type !== 'condition') continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const sys = raw.system ?? {}
      const rules: unknown[] = sys.rules ?? []
      const overridesArr: string[] = sys.overrides ?? []
      const slug = sys.slug
        ?? entity.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      conditions.push({
        id: entity.id,
        name: entity.name,
        slug,
        is_valued: sys.value?.isValued ? 1 : 0,
        description: sys.description?.value ?? null,
        group_name: sys.group ?? null,
        overrides: overridesArr.length ? JSON.stringify(overridesArr) : null,
        rules_json: rules.length ? JSON.stringify(rules) : null,
        modifier_summary: parseModifierSummary(rules) || null,
        source_book: sys.publication?.title || null,
      })
    } catch {
      // skip malformed condition JSON
    }
  }

  for (let i = 0; i < conditions.length; i += BATCH_SIZE) {
    const batch = conditions.slice(i, i + BATCH_SIZE)
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
    const values = batch.flatMap((c) => [
      c.id, c.name, c.slug, c.is_valued, c.description,
      c.group_name, c.overrides, c.rules_json, c.modifier_summary, c.source_book,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO conditions (id, name, slug, is_valued, description, group_name, overrides, rules_json, modifier_summary, source_book) VALUES ${placeholders}`,
      values
    )
  }
}

async function extractAndInsertItems(entities: RawEntity[]): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM items', [])
  await db.execute("INSERT INTO items_fts(items_fts) VALUES('delete-all')", [])

  const items: RawItem[] = []
  for (const entity of entities) {
    if (!ITEM_TYPES.includes(entity.entity_type)) continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const sys = raw.system ?? {}
      const traits = sys.traits?.value
      const { formula: damageFormula, type: damageType } = parseDamageFormula(sys.damage ?? {})

      items.push({
        id: entity.id,
        name: entity.name,
        item_type: entity.entity_type,
        level: sys.level?.value ?? 0,
        rarity: sys.traits?.rarity ?? null,
        bulk: typeof sys.bulk?.value === 'string' || typeof sys.bulk?.value === 'number'
          ? String(sys.bulk.value)
          : null,
        price_gp: parseItemPrice(sys.price ?? {}),
        traits: traits?.length ? JSON.stringify(traits) : null,
        description: sys.description?.value ?? null,
        source_book: sys.publication?.title || null,
        source_pack: entity.source_pack,
        damage_formula: damageFormula,
        damage_type: damageType,
        weapon_category: sys.category ?? null,
        weapon_group: sys.group ?? null,
        ac_bonus: sys.acBonus ?? null,
        dex_cap: sys.dexCap ?? null,
        check_penalty: sys.checkPenalty ?? null,
        speed_penalty: sys.speedPenalty ?? null,
        strength_req: sys.strength ?? null,
        consumable_category: entity.entity_type === 'consumable' ? (sys.category ?? null) : null,
        uses_max: sys.uses?.max ?? null,
      })
    } catch {
      // skip malformed item JSON
    }
  }

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const placeholders = batch
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ')
    const values = batch.flatMap((it) => [
      it.id, it.name, it.item_type, it.level, it.rarity, it.bulk, it.price_gp,
      it.traits, it.description, it.source_book, it.source_pack,
      it.damage_formula, it.damage_type, it.weapon_category, it.weapon_group,
      it.ac_bonus, it.dex_cap, it.check_penalty, it.speed_penalty, it.strength_req,
      it.consumable_category, it.uses_max,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO items (id, name, item_type, level, rarity, bulk, price_gp, traits, description, source_book, source_pack, damage_formula, damage_type, weapon_category, weapon_group, ac_bonus, dex_cap, check_penalty, speed_penalty, strength_req, consumable_category, uses_max) VALUES ${placeholders}`,
      values
    )
  }

  if (items.length > 0) {
    await db.execute("INSERT INTO items_fts(items_fts) VALUES('rebuild')", [])
  }
}

async function extractCreatureItems(entities: RawEntity[]): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM creature_items', [])

  const SKIP_TYPES = new Set(['spellcastingEntry', 'spell', 'melee', 'ranged', 'action', 'lore'])
  const creatureItems: RawCreatureItem[] = []

  for (const entity of entities) {
    if (entity.entity_type !== 'npc') continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const items: unknown[] = raw.items ?? []

      for (const item of items) {
        const it = item as Record<string, unknown>
        const itemType = it.type as string
        if (SKIP_TYPES.has(itemType)) continue
        if (!ITEM_TYPES.includes(itemType)) continue

        const sys = (it.system as Record<string, unknown>) ?? {}
        const stats = (it._stats as Record<string, unknown>) ?? {}
        const traits = (sys.traits as Record<string, unknown>)?.value
        const { formula: damageFormula } = parseDamageFormula((sys.damage as Record<string, unknown>) ?? {})
        const acBonus = (sys.acBonus as number) ?? null
        const sourceId = stats.compendiumSource as string | undefined
        const foundryItemId = parseCompendiumId(sourceId) ?? (it._id as string | undefined) ?? null

        creatureItems.push({
          id: `${entity.id}:${it._id as string}`,
          creature_id: entity.id,
          item_name: it.name as string,
          item_type: itemType,
          foundry_item_id: foundryItemId,
          quantity: (sys.quantity as number) ?? 1,
          bulk: typeof (sys.bulk as Record<string, unknown>)?.value === 'string' ||
            typeof (sys.bulk as Record<string, unknown>)?.value === 'number'
            ? String((sys.bulk as Record<string, unknown>).value)
            : null,
          damage_formula: damageFormula,
          ac_bonus: acBonus,
          traits: Array.isArray(traits) && traits.length ? JSON.stringify(traits) : null,
          sort_order: (it.sort as number) ?? 0,
        })
      }
    } catch {
      // skip malformed creature JSON
    }
  }

  for (let i = 0; i < creatureItems.length; i += BATCH_SIZE) {
    const batch = creatureItems.slice(i, i + BATCH_SIZE)
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
    const values = batch.flatMap((ci) => [
      ci.id, ci.creature_id, ci.item_name, ci.item_type, ci.foundry_item_id,
      ci.quantity, ci.bulk, ci.damage_formula, ci.ac_bonus, ci.traits, ci.sort_order,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO creature_items (id, creature_id, item_name, item_type, foundry_item_id, quantity, bulk, damage_formula, ac_bonus, traits, sort_order) VALUES ${placeholders}`,
      values
    )
  }
}

async function extractAndInsertSpells(entities: RawEntity[]): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM spells', [])
  await db.execute("INSERT INTO spells_fts(spells_fts) VALUES('delete-all')", [])

  const spells: RawSpell[] = []
  for (const entity of entities) {
    if (entity.entity_type !== 'spell') continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const sys = raw.system ?? {}
      const damageObj = sys.damage ?? {}
      const areaObj = sys.area
      const defenseObj = sys.defense

      spells.push({
        id: entity.id,
        name: entity.name,
        rank: sys.level?.value ?? 0,
        traditions: sys.traits?.traditions?.length
          ? JSON.stringify(sys.traits.traditions)
          : null,
        traits: sys.traits?.value?.length
          ? JSON.stringify(sys.traits.value)
          : null,
        description: sys.description?.value ?? null,
        damage: Object.keys(damageObj).length ? JSON.stringify(damageObj) : null,
        area: areaObj ? JSON.stringify(areaObj) : null,
        range_text: sys.range?.value || null,
        duration_text: sys.duration?.value || null,
        action_cost: sys.time?.value || null,
        save_stat: defenseObj?.save?.statistic ?? null,
        source_book: sys.publication?.title || null,
        source_pack: entity.source_pack,
      })
    } catch {
      // skip malformed spell JSON
    }
  }

  for (let i = 0; i < spells.length; i += BATCH_SIZE) {
    const batch = spells.slice(i, i + BATCH_SIZE)
    const placeholders = batch
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ')
    const values = batch.flatMap((s) => [
      s.id, s.name, s.rank, s.traditions, s.traits,
      s.description, s.damage, s.area, s.range_text,
      s.duration_text, s.action_cost, s.save_stat,
      s.source_book, s.source_pack,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO spells (id, name, rank, traditions, traits, description, damage, area, range_text, duration_text, action_cost, save_stat, source_book, source_pack) VALUES ${placeholders}`,
      values
    )
  }

  if (spells.length > 0) {
    await db.execute("INSERT INTO spells_fts(spells_fts) VALUES('rebuild')", [])
  }
}

async function extractCreatureSpellcasting(entities: RawEntity[]): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM creature_spellcasting_entries', [])
  await db.execute('DELETE FROM creature_spell_lists', [])

  const entries: RawSpellcastingEntry[] = []
  const spellItems: RawCreatureSpell[] = []

  for (const entity of entities) {
    if (entity.entity_type !== 'npc') continue
    try {
      const raw = JSON.parse(entity.raw_json)
      const items: unknown[] = raw.items ?? []

      for (const item of items) {
        const it = item as Record<string, unknown>
        if (it.type === 'spellcastingEntry') {
          const sys = (it.system as Record<string, unknown>) ?? {}
          const spelldc = (sys.spelldc as Record<string, unknown>) ?? {}
          entries.push({
            id: it._id as string,
            creature_id: entity.id,
            entry_name: it.name as string,
            tradition: (sys.tradition as Record<string, unknown>)?.value as string ?? null,
            cast_type: (sys.prepared as Record<string, unknown>)?.value as string ?? null,
            spell_dc: (spelldc.dc as number) ?? null,
            spell_attack: (spelldc.value as number) ?? null,
            slots: sys.slots ? JSON.stringify(sys.slots) : null,
          })
        } else if (it.type === 'spell') {
          const sys = (it.system as Record<string, unknown>) ?? {}
          const stats = (it._stats as Record<string, unknown>) ?? {}
          spellItems.push({
            id: `${entity.id}:${it._id as string}`,
            creature_id: entity.id,
            entry_id: (sys.location as Record<string, unknown>)?.value as string ?? '',
            spell_foundry_id: parseCompendiumId(stats.compendiumSource as string | undefined),
            spell_name: it.name as string,
            rank_prepared: (sys.level as Record<string, unknown>)?.value as number ?? 0,
            sort_order: (it.sort as number) ?? 0,
          })
        }
      }
    } catch {
      // skip malformed creature JSON
    }
  }

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
    const values = batch.flatMap((e) => [
      e.id, e.creature_id, e.entry_name, e.tradition,
      e.cast_type, e.spell_dc, e.spell_attack, e.slots,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO creature_spellcasting_entries (id, creature_id, entry_name, tradition, cast_type, spell_dc, spell_attack, slots) VALUES ${placeholders}`,
      values
    )
  }

  for (let i = 0; i < spellItems.length; i += BATCH_SIZE) {
    const batch = spellItems.slice(i, i + BATCH_SIZE)
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')
    const values = batch.flatMap((s) => [
      s.id, s.creature_id, s.entry_id,
      s.spell_foundry_id, s.spell_name, s.rank_prepared, s.sort_order,
    ])
    await db.execute(
      `INSERT OR REPLACE INTO creature_spell_lists (id, creature_id, entry_id, spell_foundry_id, spell_name, rank_prepared, sort_order) VALUES ${placeholders}`,
      values
    )
  }
}

/**
 * Post-processing pass: resolve @UUID[...] tokens without alias in item descriptions.
 * @UUID[Compendium.pf2e.equipment.Item.AbCdEfGhI] → looks up name from items/spells/entities
 * and replaces with human-readable name. Runs after all data is inserted.
 */
async function resolveUUIDTokensInDescriptions(): Promise<void> {
  const db = await getDb()

  // Build id → name lookup from all three tables (items first — most complete)
  const idNameMap = new Map<string, string>()

  const itemRows = await db.select<{ id: string; name: string }[]>(
    'SELECT id, name FROM items', []
  )
  for (const r of itemRows) idNameMap.set(r.id, r.name)

  const spellRows = await db.select<{ id: string; name: string }[]>(
    'SELECT id, name FROM spells', []
  )
  for (const r of spellRows) idNameMap.set(r.id, r.name)

  const entityRows = await db.select<{ id: string; name: string }[]>(
    "SELECT id, name FROM entities WHERE type IN ('condition','action','feat','hazard')", []
  )
  for (const r of entityRows) idNameMap.set(r.id, r.name)

  // Regex: @UUID[...] WITHOUT a following {alias} block
  const UUID_RE = /@UUID\[([^\]]+)\](?!\{)/g

  function resolveUUID(path: string): string {
    // "Compendium.pf2e.equipment.Item.AbCdEfGhI" → extract Item ID segment
    const parts = path.split('.')
    const maybeId = parts[parts.length - 1]
    return idNameMap.get(maybeId) ?? maybeId
  }

  // Update items.description in batches (SELECT rows with unresolved @UUID)
  const itemsToFix = await db.select<{ id: string; description: string }[]>(
    `SELECT id, description FROM items WHERE description LIKE '%@UUID[%' AND description NOT GLOB '*@UUID[*]{*'`,
    []
  )
  for (let i = 0; i < itemsToFix.length; i += BATCH_SIZE) {
    const batch = itemsToFix.slice(i, i + BATCH_SIZE)
    for (const row of batch) {
      const fixed = row.description.replace(UUID_RE, (_, path: string) => resolveUUID(path))
      if (fixed !== row.description) {
        await db.execute('UPDATE items SET description=? WHERE id=?', [fixed, row.id])
      }
    }
  }

  // Update spells.description
  const spellsToFix = await db.select<{ id: string; description: string }[]>(
    `SELECT id, description FROM spells WHERE description LIKE '%@UUID[%' AND description NOT GLOB '*@UUID[*]{*'`,
    []
  )
  for (let i = 0; i < spellsToFix.length; i += BATCH_SIZE) {
    const batch = spellsToFix.slice(i, i + BATCH_SIZE)
    for (const row of batch) {
      const fixed = row.description.replace(UUID_RE, (_, path: string) => resolveUUID(path))
      if (fixed !== row.description) {
        await db.execute('UPDATE spells SET description=? WHERE id=?', [fixed, row.id])
      }
    }
  }
}

async function batchInsertEntities(
  entities: RawEntity[],
  onProgress?: SyncProgressCallback
): Promise<void> {
  const db = await getDb()

  await db.execute('DELETE FROM entities', [])

  const total = entities.length
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE)
    const placeholders = batch
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .join(', ')
    const values = batch.flatMap((e) => [
      e.id,
      e.name,
      e.entity_type,
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
    ])

    await db.execute(
      `INSERT OR REPLACE INTO entities (id, name, type, level, hp, ac, fort, ref, will, perception, traits, rarity, size, source_pack, raw_json, source_name) VALUES ${placeholders}`,
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

export async function syncFoundryData(
  onProgress?: SyncProgressCallback
): Promise<number> {
  const unlisten = await listen<SyncProgress>('sync-progress', (event) => {
    onProgress?.(event.payload.stage, event.payload.current, event.payload.total)
  })

  try {
    onProgress?.('Downloading ZIP...', 0, 0)
    const entities = await invoke<RawEntity[]>('sync_foundry_data', {
      url: null,
    })

    // Download en.json for @Localize token resolution
    let enJson: Record<string, unknown> = {}
    try {
      onProgress?.('Downloading localization data...', 0, 0)
      const enResponse = await fetch(
        'https://raw.githubusercontent.com/foundryvtt/pf2e/v13-dev/static/lang/en.json'
      )
      if (enResponse.ok) {
        enJson = await enResponse.json() as Record<string, unknown>
      }
    } catch {
      // en.json download failure is non-fatal — @Localize tokens remain in raw_json
      // and will be stripped by resolveFoundryTokens() fallback at display time
    }

    // Resolve @Localize tokens in raw_json before inserting into SQLite
    // Values must be JSON-escaped since they're spliced into a JSON string
    if (Object.keys(enJson).length > 0) {
      for (const entity of entities) {
        entity.raw_json = entity.raw_json.replace(
          /@Localize\[([^\]]+)\]/g,
          (_, key: string) => {
            const val = getLocalizeValue(enJson, key) ?? ''
            return JSON.stringify(val).slice(1, -1)
          }
        )
      }
    }

    onProgress?.('Importing entities...', 0, entities.length)
    await batchInsertEntities(entities, onProgress)

    onProgress?.('Importing spells...', 0, 0)
    await extractAndInsertSpells(entities)

    onProgress?.('Importing spellcasting data...', 0, 0)
    await extractCreatureSpellcasting(entities)

    onProgress?.('Importing items...', 0, 0)
    await extractAndInsertItems(entities)

    onProgress?.('Importing creature inventories...', 0, 0)
    await extractCreatureItems(entities)

    onProgress?.('Importing conditions...', 0, 0)
    await extractAndInsertConditions(entities)

    onProgress?.('Resolving item links...', 0, 0)
    await resolveUUIDTokensInDescriptions()

    return entities.length
  } finally {
    unlisten()
  }
}

export async function importLocalPacks(
  packDir: string,
  onProgress?: SyncProgressCallback
): Promise<number> {
  const unlisten = await listen<SyncProgress>('sync-progress', (event) => {
    onProgress?.(event.payload.stage, event.payload.current, event.payload.total)
  })

  try {
    onProgress?.('Reading local packs...', 0, 0)
    const entities = await invoke<RawEntity[]>('import_local_packs', {
      packDir,
    })

    onProgress?.('Importing entities...', 0, entities.length)
    await batchInsertEntities(entities, onProgress)

    onProgress?.('Importing spells...', 0, 0)
    await extractAndInsertSpells(entities)

    onProgress?.('Importing spellcasting data...', 0, 0)
    await extractCreatureSpellcasting(entities)

    onProgress?.('Importing items...', 0, 0)
    await extractAndInsertItems(entities)

    onProgress?.('Importing creature inventories...', 0, 0)
    await extractCreatureItems(entities)

    onProgress?.('Importing conditions...', 0, 0)
    await extractAndInsertConditions(entities)

    onProgress?.('Resolving item links...', 0, 0)
    await resolveUUIDTokensInDescriptions()

    return entities.length
  } finally {
    unlisten()
  }
}
