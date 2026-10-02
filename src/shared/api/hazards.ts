import { getDb } from '@/shared/db'
import { getCurrentLocale } from '@/shared/i18n/get-locale'
import { extractHazardActions } from './sync/sync-hazards'

export interface HazardDisableCheck {
  skill: string
  dc: number
  rank: 'untrained' | 'trained' | 'expert' | 'master' | 'legendary'
}

export interface HazardRow {
  id: string
  name: string
  name_loc: string | null
  /** Raw structured_json from translations table — parse via getHazardStructured() */
  structured_json: string | null
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
  disable_checks?: HazardDisableCheck[]
  reset_details: string | null
  routine_details: string | null
  traits: string | null
  source_book: string | null
  source_pack: string | null
  actions_json: string | null
  required_successes?: number | null
  is_custom?: boolean
}

async function getCustomHazards(): Promise<HazardRow[]> {
  const db = await getDb()
  const rows = await db.select<{ id: string; data_json: string }[]>(
    'SELECT id, data_json FROM custom_hazards ORDER BY level, name',
  )
  return rows.map(({ id, data_json }) => ({
    ...JSON.parse(data_json) as HazardRow,
    id,
    is_custom: true,
  }))
}

// Hazards live in TWO translation buckets:
//  - kind='hazard' for entries from the dedicated pf2e.hazards.json pack (54 base hazards)
//  - kind='monster' for entries from AP bestiary packs (Foundry stores AP hazards as
//    actors alongside creatures; they share the actor-pack ingest path)
// LIMIT 1 + ORDER BY t.kind='hazard' DESC prefers the dedicated bucket when both exist.
const HAZARD_NAME_LOC_SUBQUERY = `
  (SELECT t.name_loc FROM translations t WHERE t.kind IN ('hazard','monster') AND t.name_key=h.name COLLATE NOCASE AND t.locale=? ORDER BY (t.kind='hazard') DESC LIMIT 1) AS name_loc,
  (SELECT t.structured_json FROM translations t WHERE t.kind IN ('hazard','monster') AND t.name_key=h.name COLLATE NOCASE AND t.locale=? ORDER BY (t.kind='hazard') DESC LIMIT 1) AS structured_json
`

export async function getAllHazards(): Promise<HazardRow[]> {
  const db = await getDb()
  const hazards = await db.select<(HazardRow & { source_routine: string | null; source_has_health: number | null })[]>(
    `SELECT h.*, ${HAZARD_NAME_LOC_SUBQUERY},
      json_extract(e.raw_json, '$.system.details.routine') AS source_routine,
      json_extract(e.raw_json, '$.system.attributes.hasHealth') AS source_has_health
     FROM hazards h LEFT JOIN entities e ON e.id = h.id ORDER BY h.level ASC, h.name ASC`,
    [getCurrentLocale(), getCurrentLocale()]
  )
  const customs = await getCustomHazards()
  return [...hazards.map(({ source_routine, source_has_health, ...row }) => ({
    ...row,
    routine_details: row.routine_details || source_routine,
    has_health: row.has_health || (source_has_health !== 0 && (row.hp ?? 0) > 0 ? 1 : 0),
  })), ...customs].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
}

export async function searchHazards(query: string, limit = 50): Promise<HazardRow[]> {
  const hazards = await getAllHazards()
  const q = query.trim().toLowerCase()
  return hazards.filter((hazard) => !q || hazard.name.toLowerCase().includes(q)
    || hazard.name_loc?.toLowerCase().includes(q)).slice(0, limit)
}

export async function getHazardById(id: string): Promise<HazardRow | null> {
  const normalizedId = id.startsWith('hazard-') ? id.slice('hazard-'.length) : id
  if (normalizedId.startsWith('custom-hazard-')) {
    return (await getCustomHazards()).find((hazard) => hazard.id === normalizedId) ?? null
  }
  const db = await getDb()
  const rows = await db.select<(HazardRow & { source_routine: string | null; source_has_health: number | null; source_items_json: string | null })[]>(
    `SELECT h.*, ${HAZARD_NAME_LOC_SUBQUERY},
      json_extract(e.raw_json, '$.system.details.routine') AS source_routine,
      json_extract(e.raw_json, '$.system.attributes.hasHealth') AS source_has_health,
      json_extract(e.raw_json, '$.items') AS source_items_json
     FROM hazards h LEFT JOIN entities e ON e.id = h.id WHERE h.id = ? LIMIT 1`,
    [getCurrentLocale(), getCurrentLocale(), normalizedId]
  )
  const row = rows[0]
  if (!row) return null
  const { source_routine, source_has_health, source_items_json, ...hazard } = row
  return {
    ...hazard,
    routine_details: hazard.routine_details || source_routine,
    has_health: hazard.has_health || (source_has_health !== 0 && (hazard.hp ?? 0) > 0 ? 1 : 0),
    actions_json: source_items_json ? JSON.stringify(extractHazardActions(JSON.parse(source_items_json))) : hazard.actions_json,
  }
}

export async function getHazardCount(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM hazards',
    []
  )
  const customs = await db.select<{ count: number }[]>('SELECT COUNT(*) AS count FROM custom_hazards')
  return (rows[0]?.count ?? 0) + (customs[0]?.count ?? 0)
}

export async function saveCustomHazard(hazard: HazardRow): Promise<string> {
  const name = hazard.name.trim()
  if (!name || !Number.isInteger(hazard.level)) throw new Error('Invalid hazard name or level')
  if (hazard.required_successes != null && (!Number.isInteger(hazard.required_successes) || hazard.required_successes < 2)) {
    throw new Error('Required successes must be at least 2')
  }
  if (hazard.disable_checks?.some((check) => !check.skill || !Number.isInteger(check.dc) || check.dc < 1 || !['untrained', 'trained', 'expert', 'master', 'legendary'].includes(check.rank))) {
    throw new Error('Invalid disable check')
  }
  const id = hazard.is_custom && hazard.id ? hazard.id : `custom-hazard-${crypto.randomUUID()}`
  const data = { ...hazard, id, name, name_loc: null, structured_json: null, is_custom: true }
  const db = await getDb()
  await db.execute(
    `INSERT INTO custom_hazards (id, name, level, hazard_type, data_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, level=excluded.level,
       hazard_type=excluded.hazard_type, data_json=excluded.data_json, updated_at=datetime('now')`,
    [id, name, data.level, data.hazard_type, JSON.stringify(data)],
  )
  return id
}

export async function deleteCustomHazard(id: string): Promise<void> {
  if (!id.startsWith('custom-hazard-')) return
  const db = await getDb()
  const inUse = await db.select<{ used: number }[]>(
    `SELECT (
      EXISTS(SELECT 1 FROM encounter_combatants WHERE hazard_ref = ?)
      OR EXISTS(SELECT 1 FROM combat_combatants WHERE creature_ref = ?)
    ) AS used`, [id, id],
  )
  if (inUse[0]?.used) throw new Error('Hazard is used in an encounter or combat')
  await db.execute('DELETE FROM custom_hazards WHERE id = ?', [id])
}
