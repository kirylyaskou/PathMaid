import { getDb } from '@/shared/db'

export interface CreatureRow {
  id: string
  name: string
  type: string
  level: number | null
  hp: number | null
  ac: number | null
  fort: number | null
  ref: number | null
  will: number | null
  perception: number | null
  traits: string | null
  rarity: string | null
  size: string | null
  source_pack: string | null
  raw_json: string
  source_name: string | null
}

export async function fetchCreatures(
  limit = 100,
  offset = 0
): Promise<CreatureRow[]> {
  const db = await getDb()
  return db.select<CreatureRow[]>(
    "SELECT * FROM entities WHERE type = 'npc' ORDER BY name LIMIT ? OFFSET ?",
    [limit, offset]
  )
}

export async function fetchCreatureById(
  id: string
): Promise<CreatureRow | null> {
  const db = await getDb()
  const rows = await db.select<CreatureRow[]>(
    'SELECT * FROM entities WHERE id = ?',
    [id]
  )
  return rows.length > 0 ? rows[0] : null
}

export async function searchCreatures(
  query: string,
  limit = 50
): Promise<CreatureRow[]> {
  if (!query.trim()) return []
  const db = await getDb()
  const ftsQuery = query.trim().replace(/"/g, '""') + '*'
  return db.select<CreatureRow[]>(
    `SELECT e.* FROM entities e
     JOIN entities_fts f ON e.rowid = f.rowid
     WHERE entities_fts MATCH ?
     AND e.type = 'npc'
     ORDER BY rank
     LIMIT ?`,
    [ftsQuery, limit]
  )
}

export interface CreatureFilters {
  query?: string
  levelMin?: number | null
  levelMax?: number | null
  rarity?: string | null
  traits?: string[]
  source?: string | null
}

export async function searchCreaturesFiltered(
  filters: CreatureFilters,
  limit = 100,
  offset = 0
): Promise<CreatureRow[]> {
  const db = await getDb()
  const conditions: string[] = ["e.type = 'npc'"]
  const params: (string | number)[] = []

  if (filters.query?.trim()) {
    const ftsQuery = filters.query.trim().replace(/"/g, '""') + '*'
    conditions.push('e.rowid IN (SELECT rowid FROM entities_fts WHERE entities_fts MATCH ?)')
    params.push(ftsQuery)
  }
  if (filters.levelMin != null) {
    conditions.push('e.level >= ?')
    params.push(filters.levelMin)
  }
  if (filters.levelMax != null) {
    conditions.push('e.level <= ?')
    params.push(filters.levelMax)
  }
  if (filters.rarity) {
    conditions.push('e.rarity = ?')
    params.push(filters.rarity)
  }
  if (filters.source) {
    conditions.push('e.source_pack = ?')
    params.push(filters.source)
  }
  if (filters.traits && filters.traits.length > 0) {
    for (const trait of filters.traits) {
      conditions.push("e.traits LIKE '%' || ? || '%'")
      params.push(trait)
    }
  }

  params.push(limit, offset)
  const where = conditions.join(' AND ')
  return db.select<CreatureRow[]>(
    `SELECT e.* FROM entities e WHERE ${where} ORDER BY e.name LIMIT ? OFFSET ?`,
    params
  )
}

export async function fetchDistinctSources(): Promise<{ pack: string; name: string }[]> {
  const db = await getDb()
  const rows = await db.select<{ source_pack: string; source_name: string | null }[]>(
    "SELECT DISTINCT source_pack, source_name FROM entities WHERE type = 'npc' AND source_pack IS NOT NULL ORDER BY source_pack"
  )
  return rows.map(r => ({
    pack: r.source_pack,
    name: r.source_name ?? r.source_pack,
  }))
}

export async function fetchDistinctTraits(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<{ trait: string }[]>(
    `SELECT DISTINCT value as trait FROM entities, json_each(entities.traits)
     WHERE entities.type = 'npc' ORDER BY value LIMIT 200`
  )
  return rows.map(r => r.trait)
}

export async function getCreatureCount(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM entities WHERE type = 'npc'`
  )
  return rows[0]?.count ?? 0
}
