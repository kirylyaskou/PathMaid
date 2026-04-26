import { getDb } from '@/shared/db'
import { getCurrentLocale } from '@/shared/i18n/get-locale'

export interface SpellRow {
  id: string
  name: string
  name_loc: string | null
  rank: number
  traditions: string | null
  traits: string | null
  description: string | null
  damage: string | null
  area: string | null
  range_text: string | null
  duration_text: string | null
  action_cost: string | null
  save_stat: string | null
  source_book: string | null
  source_pack: string | null
  heightened_json: string | null
}

export interface SpellcastingEntry {
  id: string
  creature_id: string
  entry_name: string
  tradition: string | null
  cast_type: string | null
  spell_dc: number | null
  spell_attack: number | null
  slots: string | null
}

export interface CreatureSpellItem {
  id: string
  creature_id: string
  entry_id: string
  spell_foundry_id: string | null
  spell_name: string
  rank_prepared: number
  sort_order: number
  frequency_json: string | null
}

export interface SpellSearchResult extends SpellRow {
  heightenedToRank?: number
}

type HeightenSpec =
  | { type: 'interval'; perRanks: number; damage: Record<string, string> }
  | { type: 'fixed'; levels: Record<string, unknown> }

function heightenEligible(spec: HeightenSpec, baseRank: number, targetRank: number): boolean {
  if (targetRank <= baseRank) return false
  if (spec.type === 'interval') {
    const perRanks = Math.max(1, spec.perRanks)
    return Math.floor((targetRank - baseRank) / perRanks) > 0
  }
  return Object.prototype.hasOwnProperty.call(spec.levels, String(targetRank))
}

export async function searchSpells(
  query: string,
  rank?: number,
  tradition?: string,
  trait?: string,
  isFocus?: boolean,
  includeHeightened?: boolean,
): Promise<SpellSearchResult[]> {
  const db = await getDb()
  const traitFilter = trait ? `AND s.traits LIKE ?` : ''
  const traitParam = trait ? [`%"${trait}"%`] : []
  const focusFilter =
    isFocus === true
      ? `AND s.traditions IS NULL AND s.traits LIKE '%"focus"%'`
      : isFocus === false
        ? `AND (s.traditions IS NOT NULL OR s.traits NOT LIKE '%"focus"%')`
        : ''

  let exact: SpellRow[]
  if (query.trim()) {
    const ftsQuery = query.trim().replace(/['"*]/g, '') + '*'
    const rows = await db.select<SpellRow[]>(
      `SELECT s.*, (SELECT t.name_loc FROM translations t WHERE t.kind='spell' AND t.name_key=s.name COLLATE NOCASE AND t.locale=?) AS name_loc FROM spells s
       JOIN spells_fts f ON s.rowid = f.rowid
       WHERE spells_fts MATCH ?
         ${rank !== undefined ? 'AND s.rank = ?' : ''}
         ${tradition ? "AND s.traditions LIKE ?" : ''}
         ${traitFilter}
         ${focusFilter}
       ORDER BY f.rank
       LIMIT 500`,
      [
        getCurrentLocale(),
        ftsQuery,
        ...(rank !== undefined ? [rank] : []),
        ...(tradition ? [`%"${tradition}"%`] : []),
        ...traitParam,
      ]
    )
    if (rows.length > 0) {
      exact = rows
    } else {
      // FTS5 fallback: if the FTS index is empty/out-of-sync or the query
      // tokenizer drops short inputs, fall back to a LIKE scan on name.
      const likePattern = `%${query.trim().replace(/[%_]/g, '')}%`
      exact = await db.select<SpellRow[]>(
        `SELECT s.*, (SELECT t.name_loc FROM translations t WHERE t.kind='spell' AND t.name_key=s.name COLLATE NOCASE AND t.locale=?) AS name_loc FROM spells s
         WHERE s.name LIKE ? COLLATE NOCASE
           ${rank !== undefined ? 'AND s.rank = ?' : ''}
           ${tradition ? "AND s.traditions LIKE ?" : ''}
           ${traitFilter}
           ${focusFilter}
         ORDER BY s.rank ASC, s.name ASC
         LIMIT 500`,
        [
          getCurrentLocale(),
          likePattern,
          ...(rank !== undefined ? [rank] : []),
          ...(tradition ? [`%"${tradition}"%`] : []),
          ...traitParam,
        ]
      )
    }
  } else {
    exact = await db.select<SpellRow[]>(
      `SELECT s.*, (SELECT t.name_loc FROM translations t WHERE t.kind='spell' AND t.name_key=s.name COLLATE NOCASE AND t.locale=?) AS name_loc FROM spells s
       WHERE 1=1
         ${rank !== undefined ? 'AND s.rank = ?' : ''}
         ${tradition ? "AND s.traditions LIKE ?" : ''}
         ${traitFilter}
         ${focusFilter}
       ORDER BY s.rank ASC, s.name ASC
       LIMIT 500`,
      [
        getCurrentLocale(),
        ...(rank !== undefined ? [rank] : []),
        ...(tradition ? [`%"${tradition}"%`] : []),
        ...traitParam,
      ]
    )
  }

  // Exact-rank rows come first, unmodified.
  const results: SpellSearchResult[] = exact.map((r) => ({ ...r }))

  if (!includeHeightened || rank === undefined || rank <= 0) return results

  // Second query: spells with base rank < target rank and a heighten spec.
  // Post-filter in TS applies the HeightenSpec eligibility rule (interval
  // increment count or fixed-level presence).
  const heightenRows = await db.select<SpellRow[]>(
    `SELECT s.*, (SELECT t.name_loc FROM translations t WHERE t.kind='spell' AND t.name_key=s.name COLLATE NOCASE AND t.locale=?) AS name_loc FROM spells s
     WHERE s.rank < ?
       AND s.rank > 0
       AND s.heightened_json IS NOT NULL
       ${query.trim() ? "AND s.name LIKE ? COLLATE NOCASE" : ''}
       ${tradition ? "AND s.traditions LIKE ?" : ''}
       ${traitFilter}
       ${focusFilter}
     ORDER BY s.rank ASC, s.name ASC
     LIMIT 500`,
    [
      getCurrentLocale(),
      rank,
      ...(query.trim() ? [`%${query.trim().replace(/[%_]/g, '')}%`] : []),
      ...(tradition ? [`%"${tradition}"%`] : []),
      ...traitParam,
    ]
  )

  const seen = new Set(results.map((r) => r.id))
  for (const row of heightenRows) {
    if (seen.has(row.id)) continue
    if (!row.heightened_json) continue
    let spec: HeightenSpec | null = null
    try {
      spec = JSON.parse(row.heightened_json) as HeightenSpec
    } catch {
      continue
    }
    if (!spec || !heightenEligible(spec, row.rank, rank)) continue
    results.push({ ...row, heightenedToRank: rank })
    seen.add(row.id)
  }

  return results
}

export async function getSpellById(id: string): Promise<SpellRow | null> {
  const db = await getDb()
  const rows = await db.select<SpellRow[]>(
    `SELECT s.*, (SELECT t.name_loc FROM translations t WHERE t.kind='spell' AND t.name_key=s.name COLLATE NOCASE AND t.locale=?) AS name_loc FROM spells s WHERE s.id = ?`,
    [getCurrentLocale(), id]
  )
  return rows[0] ?? null
}

export async function getSpellByName(name: string): Promise<SpellRow | null> {
  const db = await getDb()
  const rows = await db.select<SpellRow[]>(
    `SELECT s.*, (SELECT t.name_loc FROM translations t WHERE t.kind='spell' AND t.name_key=s.name COLLATE NOCASE AND t.locale=?) AS name_loc FROM spells s WHERE s.name = ? COLLATE NOCASE LIMIT 1`,
    [getCurrentLocale(), name]
  )
  return rows[0] ?? null
}

export async function getCreatureSpellcasting(creatureId: string): Promise<{
  entries: SpellcastingEntry[]
  spells: CreatureSpellItem[]
}> {
  const db = await getDb()

  const entries = await db.select<SpellcastingEntry[]>(
    'SELECT * FROM creature_spellcasting_entries WHERE creature_id = ? ORDER BY entry_name ASC',
    [creatureId]
  )

  const spells = await db.select<CreatureSpellItem[]>(
    'SELECT * FROM creature_spell_lists WHERE creature_id = ? ORDER BY entry_id ASC, rank_prepared ASC, sort_order ASC',
    [creatureId]
  )

  return { entries, spells }
}

export async function getSpellCount(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM spells',
    []
  )
  return rows[0]?.count ?? 0
}

export async function fetchDistinctSpellTraits(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<{ value: string }[]>(
    `SELECT DISTINCT value FROM spells, json_each(spells.traits)
     WHERE traits IS NOT NULL
     ORDER BY value`,
    []
  )
  return rows.map((r) => r.value)
}
