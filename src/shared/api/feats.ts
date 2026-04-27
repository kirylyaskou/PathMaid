import { getDb } from '@/shared/db'

export interface FeatEntityRow {
  id: string
  name: string
  level: number | null
  traits: string | null
  raw_json: string
}

export async function searchFeats(
  query: string,
  limit = 50
): Promise<FeatEntityRow[]> {
  if (!query.trim()) return []
  const db = await getDb()
  const ftsQuery = query.trim().replace(/"/g, '""') + '*'
  return db.select<FeatEntityRow[]>(
    `SELECT e.id, e.name, e.level, e.traits, e.raw_json FROM entities e
     JOIN entities_fts f ON e.rowid = f.rowid
     WHERE entities_fts MATCH ?
     AND e.type = 'feat'
     ORDER BY rank
     LIMIT ?`,
    [ftsQuery, limit]
  )
}

export async function getFeatByName(name: string): Promise<FeatEntityRow | null> {
  const db = await getDb()
  const rows = await db.select<FeatEntityRow[]>(
    "SELECT id, name, level, traits, raw_json FROM entities WHERE type = 'feat' AND name = ? COLLATE NOCASE LIMIT 1",
    [name]
  )
  return rows[0] ?? null
}
