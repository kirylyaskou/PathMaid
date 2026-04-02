import { getDb } from '@/shared/db'

export interface ActionRow {
  id: string
  name: string
  action_type: string
  action_cost: number | null
  category: string | null
  action_category: string
  description: string | null
  traits: string | null
  source_book: string | null
}

export async function getAllActions(): Promise<ActionRow[]> {
  const db = await getDb()
  return await db.select<ActionRow[]>(
    'SELECT * FROM actions ORDER BY action_category ASC, name ASC',
    []
  )
}

export async function searchActions(query: string, limit = 100): Promise<ActionRow[]> {
  const db = await getDb()
  if (!query.trim()) {
    return await db.select<ActionRow[]>(
      'SELECT * FROM actions ORDER BY action_category ASC, name ASC LIMIT ?',
      [limit]
    )
  }
  return await db.select<ActionRow[]>(
    `SELECT * FROM actions WHERE name LIKE ? ORDER BY action_category ASC, name ASC LIMIT ?`,
    [`%${query.trim()}%`, limit]
  )
}

export async function getActionsByCategory(category: string): Promise<ActionRow[]> {
  const db = await getDb()
  return await db.select<ActionRow[]>(
    'SELECT * FROM actions WHERE action_category = ? ORDER BY name ASC',
    [category]
  )
}

export async function getActionCount(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM actions',
    []
  )
  return rows[0]?.count ?? 0
}
