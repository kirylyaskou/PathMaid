import { getDb } from '@/shared/db'

export interface ItemRow {
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
  rarity?: string
): Promise<ItemRow[]> {
  const db = await getDb()

  const typeFilter = itemType ? 'AND i.item_type = ?' : ''
  const minLvlFilter = minLevel !== undefined ? 'AND i.level >= ?' : ''
  const maxLvlFilter = maxLevel !== undefined ? 'AND i.level <= ?' : ''
  const rarityFilter = rarity ? 'AND i.rarity = ?' : ''

  const extraParams = [
    ...(itemType ? [itemType] : []),
    ...(minLevel !== undefined ? [minLevel] : []),
    ...(maxLevel !== undefined ? [maxLevel] : []),
    ...(rarity ? [rarity] : []),
  ]

  if (query.trim()) {
    const ftsQuery = query.trim().replace(/['"*]/g, '') + '*'
    return await db.select<ItemRow[]>(
      `SELECT i.* FROM items i
       JOIN items_fts f ON i.rowid = f.rowid
       WHERE items_fts MATCH ?
         ${typeFilter} ${minLvlFilter} ${maxLvlFilter} ${rarityFilter}
       ORDER BY rank(matchinfo(items_fts)) DESC
       LIMIT 100`,
      [ftsQuery, ...extraParams]
    )
  }

  return await db.select<ItemRow[]>(
    `SELECT * FROM items
     WHERE 1=1
       ${typeFilter} ${minLvlFilter} ${maxLvlFilter} ${rarityFilter}
     ORDER BY level ASC, name ASC
     LIMIT 100`,
    extraParams
  )
}

export async function getItemById(id: string): Promise<ItemRow | null> {
  const db = await getDb()
  const rows = await db.select<ItemRow[]>(
    'SELECT * FROM items WHERE id = ?',
    [id]
  )
  return rows[0] ?? null
}

export async function getItemsByType(itemType: string): Promise<ItemRow[]> {
  const db = await getDb()
  return await db.select<ItemRow[]>(
    'SELECT * FROM items WHERE item_type = ? ORDER BY level ASC, name ASC',
    [itemType]
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
