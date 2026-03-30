import { getSqlite } from './database';

/**
 * Result type for FTS5 search queries.
 */
export interface EntitySearchResult {
  id: number;
  name: string;
  entityType: string;
  pack: string;
  slug: string;
  level: number | null;
  rarity: string | null;
}

/**
 * Sanitize user input for FTS5 MATCH queries.
 *
 * Wraps input in double quotes for literal phrase matching and appends *
 * for prefix search (type-ahead). Escapes embedded double quotes by doubling them.
 *
 * FTS5 special characters that could break queries: " * ^ - AND OR NOT NEAR
 * Quoting neutralizes all of them except " which must be doubled.
 */
export function sanitizeSearchQuery(query: string): string {
  const trimmed = query.trim();
  if (trimmed.length === 0) return '';
  const escaped = trimmed.replace(/"/g, '""');
  return `"${escaped}"*`;
}

/**
 * Search pf2e_entities via the FTS5 index.
 *
 * Joins pf2e_fts virtual table back to pf2e_entities for full row data.
 * Results ordered by BM25 rank (best match first), limited to 50.
 *
 * Returns empty array for empty/whitespace queries.
 *
 * Note: Uses getSqlite() raw access for consistency with the batch INSERT pattern.
 * Note: INSERT OR REPLACE fires FTS AFTER DELETE + AFTER INSERT triggers per replaced row
 * (expected SQLite behavior — documented, not a bug).
 */
export async function searchEntities(query: string, limit = 50): Promise<EntitySearchResult[]> {
  const matchExpr = sanitizeSearchQuery(query);
  if (matchExpr === '') return [];

  const sqlite = await getSqlite();
  const results = await sqlite.select<EntitySearchResult[]>(
    `SELECT e.id, e.name, e.entity_type as entityType, e.pack, e.slug, e.level, e.rarity
     FROM pf2e_fts f
     JOIN pf2e_entities e ON e.id = f.rowid
     WHERE pf2e_fts MATCH $1
     ORDER BY rank
     LIMIT $2`,
    [matchExpr, limit]
  );

  return results;
}
