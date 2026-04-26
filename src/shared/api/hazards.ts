import { getDb } from '@/shared/db'
import { getCurrentLocale } from '@/shared/i18n/get-locale'

export interface HazardRow {
  id: string
  name: string
  name_loc: string | null
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

// Hazards live in TWO translation buckets:
//  - kind='hazard' for entries from the dedicated pf2e.hazards.json pack (54 base hazards)
//  - kind='monster' for entries from AP bestiary packs (Foundry stores AP hazards as
//    actors alongside creatures; they share the actor-pack ingest path)
// LIMIT 1 + ORDER BY t.kind='hazard' DESC prefers the dedicated bucket when both exist.
const HAZARD_NAME_LOC_SUBQUERY = `(SELECT t.name_loc FROM translations t WHERE t.kind IN ('hazard','monster') AND t.name_key=h.name COLLATE NOCASE AND t.locale=? ORDER BY (t.kind='hazard') DESC LIMIT 1) AS name_loc`

export async function getAllHazards(): Promise<HazardRow[]> {
  const db = await getDb()
  return await db.select<HazardRow[]>(
    `SELECT h.*, ${HAZARD_NAME_LOC_SUBQUERY} FROM hazards h ORDER BY h.level ASC, h.name ASC`,
    [getCurrentLocale()]
  )
}

export async function searchHazards(query: string, limit = 50): Promise<HazardRow[]> {
  const db = await getDb()
  if (!query.trim()) {
    return await db.select<HazardRow[]>(
      `SELECT h.*, ${HAZARD_NAME_LOC_SUBQUERY} FROM hazards h ORDER BY h.level ASC, h.name ASC LIMIT ?`,
      [getCurrentLocale(), limit]
    )
  }
  return await db.select<HazardRow[]>(
    `SELECT h.*, ${HAZARD_NAME_LOC_SUBQUERY} FROM hazards h WHERE h.name LIKE ? ORDER BY h.level ASC, h.name ASC LIMIT ?`,
    [getCurrentLocale(), `%${query.trim()}%`, limit]
  )
}

export async function getHazardById(id: string): Promise<HazardRow | null> {
  const db = await getDb()
  const rows = await db.select<HazardRow[]>(
    `SELECT h.*, ${HAZARD_NAME_LOC_SUBQUERY} FROM hazards h WHERE h.id = ? LIMIT 1`,
    [getCurrentLocale(), id]
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
