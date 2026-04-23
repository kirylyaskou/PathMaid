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
  source_name: string | null
  // Paizo adventure of origin (beginner-box, sundered-waves, ...).
  // NULL for iconics and pre-library-tag bestiary entries.
  source_adventure: string | null
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

/**
 * Use Pregen (NPC mode). Finds the entities-row twin of a
 * characters-table pregen so the custom-creature builder can reuse
 * `toCreatureStatBlockData` on it. Scoped to the Paizo library packs so a
 * user-created NPC with the same name never leaks into the picker flow.
 * Returns the first match (names are unique inside iconics/pregens).
 */
export async function fetchPregenCreatureByName(
  name: string
): Promise<CreatureRow | null> {
  const db = await getDb()
  const rows = await db.select<CreatureRow[]>(
    `SELECT * FROM entities
     WHERE name = ?
       AND type = 'npc'
       AND source_pack IN ('iconics', 'paizo-pregens')
     LIMIT 1`,
    [name]
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

export interface CreatureFilters {
  query?: string
  levelMin?: number | null
  levelMax?: number | null
  rarity?: string | null
  traits?: string[]
  source?: string | null
  // adventure-scoped library filter. Special value `__iconics__` matches
  // rows where `source_pack = 'iconics'`; otherwise matches by source_adventure.
  sourceAdventure?: string | null
}

export async function searchCreaturesFiltered(
  filters: CreatureFilters,
  limit = 100,
  offset = 0
): Promise<CreatureRow[]> {
  const db = await getDb()
  const conditions: string[] = ["e.type = 'npc'"]
  const params: (string | number)[] = []

  if (filters.query?.trim()) {
    const ftsQuery = filters.query.trim().replace(/"/g, '""') + '*'
    conditions.push('e.rowid IN (SELECT rowid FROM entities_fts WHERE entities_fts MATCH ?)')
    params.push(ftsQuery)
  }
  if (filters.levelMin != null) {
    conditions.push('e.level >= ?')
    params.push(filters.levelMin)
  }
  if (filters.levelMax != null) {
    conditions.push('e.level <= ?')
    params.push(filters.levelMax)
  }
  if (filters.rarity) {
    conditions.push('e.rarity = ?')
    params.push(filters.rarity)
  }
  if (filters.source) {
    // Filter by source_name (human-readable, unique per row).
    // Previously filtered by source_pack, but many distinct sources share
    // pack='pf2e' (Monster Core, Bestiary 1, Bestiary 2…), so the filter
    // effectively did nothing — picking "Monster Core" returned every pf2e row.
    // Fallback to source_pack when source_name is NULL keeps legacy entries usable.
    conditions.push('COALESCE(e.source_name, e.source_pack) = ?')
    params.push(filters.source)
  }
  // Paizo library scope filter.
  //   __iconics__ → rows whose source_pack = 'iconics'
  //   <adventure> → rows whose source_adventure matches literally (pregens).
  if (filters.sourceAdventure === '__iconics__') {
    conditions.push("e.source_pack = 'iconics'")
  } else if (filters.sourceAdventure) {
    conditions.push('e.source_adventure = ?')
    params.push(filters.sourceAdventure)
  }
  if (filters.traits && filters.traits.length > 0) {
    for (const trait of filters.traits) {
      conditions.push("EXISTS (SELECT 1 FROM json_each(e.traits) WHERE value = ?)")
      params.push(trait)
    }
  }

  params.push(limit, offset)
  const where = conditions.join(' AND ')
  return db.select<CreatureRow[]>(
    `SELECT e.* FROM entities e WHERE ${where} ORDER BY e.name LIMIT ? OFFSET ?`,
    params
  )
}

export async function fetchDistinctSources(): Promise<{ pack: string; name: string }[]> {
  const db = await getDb()
  const rows = await db.select<{ source_pack: string; source_name: string | null }[]>(
    "SELECT DISTINCT source_pack, source_name FROM entities WHERE type = 'npc' AND source_pack IS NOT NULL ORDER BY source_pack"
  )
  return rows.map(r => ({
    pack: r.source_pack,
    name: r.source_name ?? r.source_pack,
  }))
}

// returns the set of library-scope filter values distilled from
// currently-synced entities. Shape: { value, label } so the UI can emit
// the stable token on click while showing a humanised label.
//   - `__iconics__` chip when any iconics row exists.
//   - One chip per distinct source_adventure (e.g. beginner-box → PF Beginner Box).
export interface LibrarySourceOption {
  value: string
  label: string
}

function adventureLabel(slug: string): string {
  return (
    'PF ' +
    slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  )
}

export async function fetchDistinctLibrarySources(): Promise<LibrarySourceOption[]> {
  const db = await getDb()
  const iconicsRows = await db.select<{ c: number }[]>(
    "SELECT COUNT(*) as c FROM entities WHERE source_pack = 'iconics'"
  )
  const adventureRows = await db.select<{ slug: string }[]>(
    `SELECT DISTINCT source_adventure as slug FROM entities
     WHERE source_adventure IS NOT NULL ORDER BY source_adventure`
  )
  const out: LibrarySourceOption[] = []
  if ((iconicsRows[0]?.c ?? 0) > 0) {
    out.push({ value: '__iconics__', label: 'Iconics' })
  }
  for (const r of adventureRows) {
    out.push({ value: r.slug, label: adventureLabel(r.slug) })
  }
  return out
}

export async function fetchDistinctTraits(): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<{ trait: string }[]>(
    `SELECT DISTINCT value as trait FROM entities, json_each(entities.traits)
     WHERE entities.type = 'npc' ORDER BY value LIMIT 200`
  )
  return rows.map(r => r.trait)
}

export async function getCreatureCount(): Promise<number> {
  const db = await getDb()
  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM entities WHERE type = 'npc'`
  )
  return rows[0]?.count ?? 0
}
