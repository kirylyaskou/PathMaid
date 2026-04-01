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
