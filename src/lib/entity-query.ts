import { getSqlite } from './database'
import { sanitizeSearchQuery } from './search-service'
import type { TagLogic } from '@/types/entity'

/**
 * Filter criteria for entity queries.
 *
 * When `name` is absent, filterEntities uses list-all mode (no FTS5 join).
 * When `name` is present, filterEntities uses the FTS5 CTE pattern.
 */
export interface EntityFilter {
  name?: string       // FTS5 prefix match — optional; absent = list-all mode
  entityType?: string // exact match on entity_type column
  levelMin?: number   // inclusive lower bound on level
  levelMax?: number   // inclusive upper bound on level
  rarity?: string     // exact match on rarity column
  family?: string     // exact match on family STORED column (added in migration v3)
  tags?: string[]     // trait/tag match via json_each ($.system.traits.value)
  tagLogic?: TagLogic // 'AND' requires all tags to match; 'OR' requires any (default: 'AND')
}

/**
 * A single row returned by filterEntities.
 *
 * Contains all stored/generated columns plus the full raw_data JSON blob so
 * downstream components can render stat blocks without a second DB call.
 */
export interface EntityResult {
  id: number
  name: string
  entityType: string
  pack: string
  slug: string
  level: number | null
  rarity: string | null
  family: string | null
  rawData: string  // full JSON as stored — no processing
}

/**
 * Query pf2e_entities with optional column filters and optional FTS5 search.
 *
 * Two query paths:
 *   Path A (list-all): `name` absent or whitespace — direct column scan, no FTS5 join.
 *   Path B (FTS5):     `name` present — CTE pattern per PITFALLS.md mandated approach.
 *
 * Column filters (entityType, levelMin, levelMax, rarity, family) are applied in both
 * paths via the `$N IS NULL OR column = $N` pattern so absent filters are no-ops.
 *
 * When `tags` is non-empty, a json_each join is added AFTER all STORED column filters
 * to avoid scanning all raw_data blobs (PITFALLS.md Pitfall 4).
 * tagLogic='AND' (default): HAVING COUNT(DISTINCT t.value) = tagCount
 * tagLogic='OR':            any matching tag suffices — no HAVING clause added
 */
export async function filterEntities(
  filters: EntityFilter,
  limit: number = 200,
  offset: number = 0
): Promise<EntityResult[]> {
  const sqlite = await getSqlite()

  // Determine query path based on name presence
  const matchExpr = filters.name ? sanitizeSearchQuery(filters.name) : ''
  const useFts = matchExpr !== ''

  const hasTags = filters.tags != null && filters.tags.length > 0
  const tagLogic = filters.tagLogic ?? 'AND'

  if (useFts) {
    // Path B: FTS5 + column filters via CTE pattern (PITFALLS.md mandated)
    // CRITICAL: Use bare table name in MATCH — never alias pf2e_fts (Pitfall 3)

    if (hasTags) {
      const tags = filters.tags!
      // FTS path params: $1=matchExpr, $2-$6=STORED columns, $7..=$6+len(tags)=tags, last=limit
      const tagStartIdx = 7
      const tagPlaceholders = tags.map((_, i) => `$${tagStartIdx + i}`).join(', ')
      const havingClause = tagLogic === 'AND'
        ? `HAVING COUNT(DISTINCT t.value) = ${tags.length}`
        : ''
      const limitIdx = tagStartIdx + tags.length

      const sql = `
        WITH fts_results AS (
          SELECT e.id, e.name, e.entity_type, e.pack, e.slug, e.level, e.rarity, e.family, e.raw_data
          FROM pf2e_fts f
          JOIN pf2e_entities e ON e.id = f.rowid
          WHERE pf2e_fts MATCH $1
          ORDER BY f.rank
          LIMIT 500
        )
        SELECT DISTINCT r.id, r.name, r.entity_type as entityType, r.pack, r.slug,
                        r.level, r.rarity, r.family, r.raw_data as rawData
        FROM fts_results r
        JOIN json_each(r.raw_data, '$.system.traits.value') AS t
        WHERE ($2 IS NULL OR r.entity_type = $2)
          AND ($3 IS NULL OR r.level >= $3)
          AND ($4 IS NULL OR r.level <= $4)
          AND ($5 IS NULL OR r.rarity = $5)
          AND ($6 IS NULL OR r.family = $6)
          AND t.value IN (${tagPlaceholders})
        GROUP BY r.id
        ${havingClause}
        LIMIT $${limitIdx}
        OFFSET $${limitIdx + 1}
      `
      return sqlite.select<EntityResult[]>(sql, [
        matchExpr,
        filters.entityType ?? null,
        filters.levelMin ?? null,
        filters.levelMax ?? null,
        filters.rarity ?? null,
        filters.family ?? null,
        ...tags,
        limit,
        offset,
      ])
    } else {
      const sql = `
        WITH fts_results AS (
          SELECT e.id, e.name, e.entity_type, e.pack, e.slug, e.level, e.rarity, e.family, e.raw_data
          FROM pf2e_fts f
          JOIN pf2e_entities e ON e.id = f.rowid
          WHERE pf2e_fts MATCH $1
          ORDER BY f.rank
          LIMIT 500
        )
        SELECT id, name, entity_type as entityType, pack, slug, level, rarity, family, raw_data as rawData
        FROM fts_results
        WHERE ($2 IS NULL OR entity_type = $2)
          AND ($3 IS NULL OR level >= $3)
          AND ($4 IS NULL OR level <= $4)
          AND ($5 IS NULL OR rarity = $5)
          AND ($6 IS NULL OR family = $6)
        LIMIT $7
        OFFSET $8
      `
      return sqlite.select<EntityResult[]>(sql, [
        matchExpr,
        filters.entityType ?? null,
        filters.levelMin ?? null,
        filters.levelMax ?? null,
        filters.rarity ?? null,
        filters.family ?? null,
        limit,
        offset,
      ])
    }
  } else {
    // Path A: List-all — no FTS5, direct column filters only

    if (hasTags) {
      const tags = filters.tags!
      // List-all params: $1-$5=STORED columns, $6..=$5+len(tags)=tags, last=limit
      const tagStartIdx = 6
      const tagPlaceholders = tags.map((_, i) => `$${tagStartIdx + i}`).join(', ')
      const havingClause = tagLogic === 'AND'
        ? `HAVING COUNT(DISTINCT t.value) = ${tags.length}`
        : ''
      const limitIdx = tagStartIdx + tags.length

      const sql = `
        SELECT DISTINCT e.id, e.name, e.entity_type as entityType, e.pack, e.slug,
                        e.level, e.rarity, e.family, e.raw_data as rawData
        FROM pf2e_entities e
        JOIN json_each(e.raw_data, '$.system.traits.value') AS t
        WHERE ($1 IS NULL OR e.entity_type = $1)
          AND ($2 IS NULL OR e.level >= $2)
          AND ($3 IS NULL OR e.level <= $3)
          AND ($4 IS NULL OR e.rarity = $4)
          AND ($5 IS NULL OR e.family = $5)
          AND t.value IN (${tagPlaceholders})
        GROUP BY e.id
        ${havingClause}
        LIMIT $${limitIdx}
        OFFSET $${limitIdx + 1}
      `
      return sqlite.select<EntityResult[]>(sql, [
        filters.entityType ?? null,
        filters.levelMin ?? null,
        filters.levelMax ?? null,
        filters.rarity ?? null,
        filters.family ?? null,
        ...tags,
        limit,
        offset,
      ])
    } else {
      const sql = `
        SELECT id, name, entity_type as entityType, pack, slug, level, rarity, family, raw_data as rawData
        FROM pf2e_entities
        WHERE ($1 IS NULL OR entity_type = $1)
          AND ($2 IS NULL OR level >= $2)
          AND ($3 IS NULL OR level <= $3)
          AND ($4 IS NULL OR rarity = $4)
          AND ($5 IS NULL OR family = $5)
        LIMIT $6
        OFFSET $7
      `
      return sqlite.select<EntityResult[]>(sql, [
        filters.entityType ?? null,
        filters.levelMin ?? null,
        filters.levelMax ?? null,
        filters.rarity ?? null,
        filters.family ?? null,
        limit,
        offset,
      ])
    }
  }
}

/**
 * Returns distinct non-null family values for creature entities.
 * Used to populate the family dropdown filter in EntityFilterBar.
 */
export async function getDistinctFamilies(): Promise<string[]> {
  const sqlite = await getSqlite()
  const rows = await sqlite.select<Array<{ family: string }>>(
    `SELECT DISTINCT family FROM pf2e_entities
     WHERE family IS NOT NULL AND entity_type = 'npc'
     ORDER BY family`,
    []
  )
  return rows.map(r => r.family)
}

/**
 * Returns distinct trait values extracted from the raw_data traits array.
 * Used to populate the traits filter autocomplete in EntityFilterBar.
 *
 * @param entityType - Optional: narrow to a specific entity type (e.g. 'creature')
 */
export async function getDistinctTraits(entityType?: string): Promise<string[]> {
  const sqlite = await getSqlite()
  const sql = entityType
    ? `SELECT DISTINCT t.value as trait
       FROM pf2e_entities e, json_each(e.raw_data, '$.system.traits.value') t
       WHERE e.entity_type = $1
       ORDER BY t.value`
    : `SELECT DISTINCT t.value as trait
       FROM pf2e_entities e, json_each(e.raw_data, '$.system.traits.value') t
       ORDER BY t.value`
  const params = entityType ? [entityType] : []
  const rows = await sqlite.select<Array<{ trait: string }>>(sql, params)
  return rows.map(r => r.trait)
}
