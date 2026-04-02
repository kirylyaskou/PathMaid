import { getDb } from '@/shared/db'

export interface HazardRow {
  id: string
  name: string
  level: number
  is_complex: number
  hazard_type: string
  stealth_dc: number | null
  stealth_details: string | null
  ac: number | null
  hardness: number | null
  hp: number | null
  has_health: number
  description: string | null
  disable_details: string | null
  reset_details: string | null
  traits: string | null
  source_book: string | null
  source_pack: string | null
  actions_json: string | null
}

export async function getAllHazards(): Promise<HazardRow[]> {
  const db = await getDb()
  return await db.select<HazardRow[]>(
    'SELECT * FROM hazards ORDER BY level ASC, name ASC',
    []
  )
}

export async function searchHazards(query: string, limit = 50): Promise<HazardRow[]> {
  const db = await getDb()
  if (!query.trim()) {
    return await db.select<HazardRow[]>(
      'SELECT * FROM hazards ORDER BY level ASC, name ASC LIMIT ?',
      [limit]
    )
  }
  return await db.select<HazardRow[]>(
    `SELECT * FROM hazards WHERE name LIKE ? ORDER BY level ASC, name ASC LIMIT ?`,
    [`%${query.trim()}%`, limit]
  )
}

export async function getHazardById(id: string): Promise<HazardRow | null> {
  const db = await getDb()
  const rows = await db.select<HazardRow[]>(
    'SELECT * FROM hazards WHERE id = ? LIMIT 1',
    [id]
  )
  return rows[0] ?? null
}

export async function getHazardCount(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM hazards',
    []
  )
  return rows[0]?.count ?? 0
}
