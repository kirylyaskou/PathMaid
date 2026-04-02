import { getDb } from '@/shared/db'

export interface ConditionRow {
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

export async function getAllConditions(): Promise<ConditionRow[]> {
  const db = await getDb()
  return await db.select<ConditionRow[]>(
    'SELECT * FROM conditions ORDER BY name ASC',
    []
  )
}

export async function searchConditions(query: string): Promise<ConditionRow[]> {
  const db = await getDb()
  if (!query.trim()) return getAllConditions()
  return await db.select<ConditionRow[]>(
    `SELECT * FROM conditions WHERE name LIKE ? ORDER BY name ASC`,
    [`%${query.trim()}%`]
  )
}

export async function getConditionBySlug(slug: string): Promise<ConditionRow | null> {
  const db = await getDb()
  const rows = await db.select<ConditionRow[]>(
    'SELECT * FROM conditions WHERE slug = ? LIMIT 1',
    [slug]
  )
  return rows[0] ?? null
}

export async function getConditionsByGroup(groupName: string): Promise<ConditionRow[]> {
  const db = await getDb()
  return await db.select<ConditionRow[]>(
    'SELECT * FROM conditions WHERE group_name = ? ORDER BY name ASC',
    [groupName]
  )
}
