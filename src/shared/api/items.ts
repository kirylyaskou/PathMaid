import { getDb } from '@/shared/db'
import { getCurrentLocale } from '@/shared/i18n/get-locale'

export interface ItemRow {
  id: string
  name: string
  name_loc: string | null
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
  usage: string | null
  linked_spell_id: string | null
}

export interface CreatureItemRow {
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

export async function searchItems(
  query: string,
  itemType?: string,
  minLevel?: number,
  maxLevel?: number,
  rarity?: string,
  traits?: string[],
  source?: string,
  subcategory?: string,
): Promise<ItemRow[]> {
  const db = await getDb()

  const typeFilter = itemType ? 'AND i.item_type = ?' : ''
  const minLvlFilter = minLevel !== undefined ? 'AND i.level >= ?' : ''
  const maxLvlFilter = maxLevel !== undefined ? 'AND i.level <= ?' : ''
  const rarityFilter = rarity ? 'AND i.rarity = ?' : ''
  const sourceFilter = source ? 'AND i.source_book = ?' : ''

  let subcategoryFilter = ''
  if (subcategory) {
    if (itemType === 'weapon') subcategoryFilter = 'AND i.weapon_group = ?'
    else if (itemType === 'consumable') subcategoryFilter = 'AND i.consumable_category = ?'
  }

  let traitsFilter = ''
  const traitsParams: string[] = []
  if (traits && traits.length > 0) {
    traitsFilter = traits.map(() => 'AND EXISTS (SELECT 1 FROM json_each(i.traits) WHERE value = ?)').join(' ')
    traitsParams.push(...traits)
  }

  const extraParams = [
    ...(itemType ? [itemType] : []),
    ...(minLevel !== undefined ? [minLevel] : []),
    ...(maxLevel !== undefined ? [maxLevel] : []),
    ...(rarity ? [rarity] : []),
    ...traitsParams,
    ...(source ? [source] : []),
    ...(subcategory && subcategoryFilter ? [subcategory] : []),
  ]

  if (query.trim()) {
    const ftsQuery = query.trim().replace(/['"*]/g, '') + '*'
    return await db.select<ItemRow[]>(
      `SELECT i.*, (SELECT t.name_loc FROM translations t WHERE t.kind='item' AND t.name_key=i.name COLLATE NOCASE AND t.locale=?) AS name_loc FROM items i
       JOIN items_fts f ON i.rowid = f.rowid
       WHERE items_fts MATCH ?
         ${typeFilter} ${minLvlFilter} ${maxLvlFilter} ${rarityFilter}
         ${traitsFilter} ${sourceFilter} ${subcategoryFilter}
       ORDER BY f.rank
       LIMIT 500`,
      [ftsQuery, getCurrentLocale(), ...extraParams]
    )
  }

  return await db.select<ItemRow[]>(
    `SELECT i.*, (SELECT t.name_loc FROM translations t WHERE t.kind='item' AND t.name_key=i.name COLLATE NOCASE AND t.locale=?) AS name_loc FROM items i
     WHERE 1=1
       ${typeFilter} ${minLvlFilter} ${maxLvlFilter} ${rarityFilter}
       ${traitsFilter} ${sourceFilter} ${subcategoryFilter}
     ORDER BY level ASC, name ASC
     LIMIT 500`,
    [getCurrentLocale(), ...extraParams]
  )
}

export async function getItemsByIds(ids: string[]): Promise<ItemRow[]> {
  if (ids.length === 0) return []
  const db = await getDb()
  const placeholders = ids.map(() => '?').join(', ')
  return db.select<ItemRow[]>(
    `SELECT i.*, (SELECT t.name_loc FROM translations t WHERE t.kind='item' AND t.name_key=i.name COLLATE NOCASE AND t.locale=?) AS name_loc FROM items i WHERE i.id IN (${placeholders})`,
    [getCurrentLocale(), ...ids]
  )
}

export async function getItemById(id: string): Promise<ItemRow | null> {
  const db = await getDb()
  const rows = await db.select<ItemRow[]>(
    `SELECT i.*, (SELECT t.name_loc FROM translations t WHERE t.kind='item' AND t.name_key=i.name COLLATE NOCASE AND t.locale=?) AS name_loc FROM items i WHERE i.id = ?`,
    [getCurrentLocale(), id]
  )
  return rows[0] ?? null
}

export async function getItemsByType(itemType: string): Promise<ItemRow[]> {
  const db = await getDb()
  return await db.select<ItemRow[]>(
    `SELECT i.*, (SELECT t.name_loc FROM translations t WHERE t.kind='item' AND t.name_key=i.name COLLATE NOCASE AND t.locale=?) AS name_loc FROM items i WHERE i.item_type = ? ORDER BY i.level ASC, i.name ASC`,
    [getCurrentLocale(), itemType]
  )
}

export async function getItemCount(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM items',
    []
  )
  return rows[0]?.count ?? 0
}

export async function getCreatureItems(creatureId: string): Promise<CreatureItemRow[]> {
  const db = await getDb()
  return await db.select<CreatureItemRow[]>(
    `SELECT * FROM creature_items
     WHERE creature_id = ?
     ORDER BY
       CASE item_type
         WHEN 'weapon' THEN 1
         WHEN 'armor' THEN 2
         WHEN 'shield' THEN 3
         WHEN 'consumable' THEN 4
         ELSE 5
       END,
       sort_order ASC`,
    [creatureId]
  )
}

export async function fetchDistinctItemTraits(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<{ value: string }[]>(
    `SELECT DISTINCT value FROM items, json_each(items.traits)
     WHERE traits IS NOT NULL
     ORDER BY value`,
    []
  )
  return rows.map((r) => r.value)
}

export async function fetchDistinctItemSources(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<{ value: string }[]>(
    `SELECT DISTINCT source_book as value FROM items
     WHERE source_book IS NOT NULL
     ORDER BY source_book`,
    []
  )
  return rows.map((r) => r.value)
}

export async function fetchDistinctSubcategories(itemType: string | null): Promise<string[]> {
  if (!itemType || (itemType !== 'weapon' && itemType !== 'consumable')) return []
  const db = await getDb()
  const col = itemType === 'weapon' ? 'weapon_group' : 'consumable_category'
  const rows = await db.select<{ value: string }[]>(
    `SELECT DISTINCT ${col} as value FROM items
     WHERE item_type = ? AND ${col} IS NOT NULL
     ORDER BY ${col}`,
    [itemType]
  )
  return rows.map((r) => r.value)
}

export async function getFavoriteIds(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<{ item_id: string }[]>(
    'SELECT item_id FROM item_favorites',
    []
  )
  return rows.map((r) => r.item_id)
}

export async function toggleFavoriteDb(itemId: string, isFavorited: boolean): Promise<void> {
  const db = await getDb()
  if (isFavorited) {
    await db.execute('INSERT OR IGNORE INTO item_favorites (item_id) VALUES (?)', [itemId])
  } else {
    await db.execute('DELETE FROM item_favorites WHERE item_id = ?', [itemId])
  }
}
