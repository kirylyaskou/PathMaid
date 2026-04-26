/**
 * Boot-time seeder for the `translations` table.
 *
 * Reads vendored Babele packs through the pure ingest module and writes
 * one row per actor entry into SQLite. INSERT OR REPLACE keeps the seed
 * idempotent — re-running on every boot is safe and refreshes any rows
 * whose vendored content has changed since last launch.
 *
 * The FTS5 RU denormalization step (UPDATE entities.name_loc + rebuild
 * entities_fts) is preserved verbatim so bestiary search remains
 * FTS-accelerated against translated names instead of falling back to
 * a JOIN + LIKE.
 *
 * Babele actor entries do not carry a `level` field, so every row goes
 * in with level=NULL. Caller-side fuzzy fallback in getTranslation
 * handles consumers that supply a level. Likewise, no actor-level
 * `traits` field exists in Babele — traits_loc stays NULL and the
 * dictionary getters introduced later wire localized trait labels at
 * the component layer.
 */

import type Database from '@tauri-apps/plugin-sql'
import {
  collectMonsterTranslations,
  collectSpellTranslations,
  collectItemKindTranslations,
  type ItemKind,
} from './ingest'
import { getTranslation } from '@/shared/api/translations'
import type { SupportedLocale } from '@/shared/i18n/config'
import type { MonsterStructuredLoc } from './lib'

export type TranslationKind = 'monster' | 'spell' | 'item' | 'feat' | 'action' | 'condition'

const PERF_DEV = import.meta.env.DEV

const LOCALE = 'ru'
const SOURCE = 'pf2-locale-ru'
const KIND_MONSTER = 'monster' as const
const KIND_SPELL = 'spell' as const

// Bump this string whenever vendor pack content or adapter logic changes
// in a way that requires re-seeding existing DBs. The warm boot guard
// compares this against sync_metadata so collect* and INSERT loops are
// skipped entirely when the DB is already up to date.
const SEED_VERSION = '3'
const SEED_VERSION_KEY = 'seed.translations.version'

// SQLite parameter limit is 999. With 9 columns per row, 110 rows per
// chunk = 990 params — just under the limit and roughly 10% fewer IPC
// roundtrips than the previous 100-row chunk size.
const CHUNK_SIZE = 110

// entity_items uses 5 columns per row — packing 199 rows per IPC call.
// 199 rows × 5 cols = 995 params, just under SQLite's 999 ceiling.
const ENTITY_ITEMS_CHUNK_SIZE = 199

/**
 * Per-kind seeding helper: counts existing rows for `(kind, locale, source)`,
 * skips when the count matches the in-bundle row total, otherwise wraps the
 * caller-supplied INSERT loop in a transaction so SQLite issues one fsync
 * instead of one per chunk.
 */
async function seedKind(
  db: Database,
  kind: string,
  expected: number,
  insert: () => Promise<void>,
): Promise<void> {
  const existing = await db.select<{ n: number }[]>(
    'SELECT COUNT(*) AS n FROM translations WHERE source = ? AND locale = ? AND kind = ?',
    [SOURCE, LOCALE, kind],
  )
  const existingCount = existing[0]?.n ?? 0
  if (existingCount === expected) {
    console.log(`[translations] Skipping ${kind} seed — ${existingCount} rows already present`)
    return
  }
  console.log(
    `[translations] Seeding ${expected} ${kind} rows (existing=${existingCount}); chunked transaction`,
  )
  await db.execute('BEGIN TRANSACTION', [])
  try {
    await insert()
    await db.execute('COMMIT', [])
  } catch (err) {
    await db.execute('ROLLBACK', [])
    throw err
  }
}

/**
 * Upsert all vendored monster translations into the `translations` table.
 *
 * Boot strategy: idempotent and fast.
 *   1. Count existing rows with the current source. If the count already
 *      matches the in-bundle row count, skip the INSERT loop entirely —
 *      vendor data hasn't changed since last boot. Vendor bumps invalidate
 *      this gate by changing the row count.
 *   2. Otherwise, wrap chunked multi-VALUES INSERT OR REPLACE statements in
 *      a single transaction so SQLite issues one fsync instead of one per
 *      row. Without batching, the IPC round-trip per row stalled boot for
 *      minutes on the 1973-entry vendor set.
 *
 * The FTS5 RU denormalization step always runs because Foundry sync may
 * have rebuilt the entities table since last seed, clearing name_loc.
 */
export async function loadContentTranslations(db: Database): Promise<void> {
  // Warm boot guard: if sync_metadata already records the current
  // SEED_VERSION, all packs were ingested on a previous boot and the DB
  // is up to date. Skip collect* (no JSON parsing, no heap allocation)
  // and go straight to FTS rebuild which is always cheap and necessary
  // because Foundry sync may have cleared entities.name_loc since last seed.
  const versionRows = await db.select<{ value: string }[]>(
    'SELECT value FROM sync_metadata WHERE key = ?',
    [SEED_VERSION_KEY],
  )
  const storedVersion = versionRows[0]?.value ?? null
  if (storedVersion === SEED_VERSION) {
    console.log(`[translations] Warm boot — seed version ${SEED_VERSION} already present, skipping ingest`)
    // Check whether any entity rows are missing a translated name — the only
    // case that happens is when Foundry sync added new creatures after the last
    // boot. If every entity already has name_loc populated we skip the
    // correlated UPDATE (was 77 000 ms on a 13 K-row table) and the FTS
    // rebuild entirely, cutting warm-boot cost to near zero.
    const nullRows = await db.select<{ n: number }[]>(
      'SELECT COUNT(*) AS n FROM entities WHERE name_loc IS NULL',
    )
    const missingCount = nullRows[0]?.n ?? 0
    if (missingCount === 0) {
      console.log('[translations] Warm boot — name_loc fully populated, skipping UPDATE+FTS rebuild')
      return
    }
    // Partial update: only touch entities that still lack a translated name.
    // This happens after a Foundry sync that imported new creatures but
    // did not bump SEED_VERSION (translations pack unchanged).
    //
    // COALESCE sentinel: entities without a matching translation receive ''
    // (empty string) rather than NULL. NULL means "not yet attempted"; ''
    // means "attempted, no translation exists". The null-check above uses
    // IS NULL so sentinel rows are never revisited on subsequent boots,
    // breaking the infinite-retry cycle for the ~24 K entities that have
    // no Russian translation (non-monster kinds, untranslated bestiary
    // entries, etc.).
    //
    // Display code reads name_loc only from the `translations` table via
    // useContentTranslation — entities.name_loc is used exclusively for
    // FTS5 search. An empty string in FTS5 produces no tokens, which is
    // correct: untranslated creatures simply won't match Russian queries.
    await db.execute(
      `UPDATE entities
         SET name_loc = COALESCE(
           (SELECT name_loc FROM translations
             WHERE translations.kind = 'monster'
               AND translations.locale = ?
               AND translations.name_key = entities.name COLLATE NOCASE
             LIMIT 1),
           ''
         )
       WHERE name_loc IS NULL`,
      [LOCALE],
    )
    await db.execute(`INSERT INTO entities_fts(entities_fts) VALUES('rebuild')`, [])
    return
  }

  if (PERF_DEV) {
    console.log('[perf] === cold-boot seed start ===')
    console.time('[perf] total seed (cold boot)')
  }

  // One-shot cleanup: stale rows from prior seed sources and incomplete
  // spell rows that predate structured_json. Runs only on cold boot so
  // warm boot pays no full-scan cost on the translations table.
  if (PERF_DEV) console.time('[perf] cleanup DELETE')
  await db.execute(
    "DELETE FROM translations WHERE source = 'pf2.ru'",
    [],
  )
  await db.execute(
    `DELETE FROM translations
       WHERE kind = 'spell'
         AND source = ?
         AND structured_json IS NULL`,
    [SOURCE],
  )
  if (PERF_DEV) console.timeEnd('[perf] cleanup DELETE')

  if (PERF_DEV) console.time('[perf] collectMonsterTranslations')
  const monsterRows = await collectMonsterTranslations()
  if (PERF_DEV) console.timeEnd('[perf] collectMonsterTranslations')

  if (PERF_DEV) console.time('[perf] collectSpellTranslations')
  const spellRows = await collectSpellTranslations()
  if (PERF_DEV) console.timeEnd('[perf] collectSpellTranslations')

  if (PERF_DEV) console.time('[perf] seedKind monster INSERT')
  await seedKind(db, KIND_MONSTER, monsterRows.length, async () => {
    for (let i = 0; i < monsterRows.length; i += CHUNK_SIZE) {
      const chunk = monsterRows.slice(i, i + CHUNK_SIZE)
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
      const params: (string | null)[] = []
      for (const row of chunk) {
        params.push(
          KIND_MONSTER,
          row.packKey,
          null,
          LOCALE,
          row.nameLoc,
          null,
          row.textLoc,
          SOURCE,
          JSON.stringify(row.structured),
        )
      }
      await db.execute(
        `INSERT OR REPLACE INTO translations
           (kind, name_key, level, locale, name_loc, traits_loc, text_loc, source, structured_json)
         VALUES ${placeholders}`,
        params,
      )
    }
  })
  if (PERF_DEV) console.timeEnd('[perf] seedKind monster INSERT')

  if (PERF_DEV) console.time('[perf] seedKind spell INSERT')
  await seedKind(db, KIND_SPELL, spellRows.length, async () => {
    for (let i = 0; i < spellRows.length; i += CHUNK_SIZE) {
      const chunk = spellRows.slice(i, i + CHUNK_SIZE)
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
      const params: (string | null)[] = []
      for (const row of chunk) {
        params.push(
          KIND_SPELL,
          row.packKey,
          null,
          LOCALE,
          row.nameLoc,
          null,
          row.textLoc,
          SOURCE,
          JSON.stringify(row.structured),
        )
      }
      await db.execute(
        `INSERT OR REPLACE INTO translations
           (kind, name_key, level, locale, name_loc, traits_loc, text_loc, source, structured_json)
         VALUES ${placeholders}`,
        params,
      )
    }
  })
  if (PERF_DEV) console.timeEnd('[perf] seedKind spell INSERT')

  // Item-shaped kinds (action / feat / item / condition) share a uniform
  // text-overlay shape with spells. Group rows by kind and feed each
  // group through seedKind so per-kind skip-gates work independently.
  if (PERF_DEV) console.time('[perf] collectItemKindTranslations')
  const itemRows = await collectItemKindTranslations()
  if (PERF_DEV) console.timeEnd('[perf] collectItemKindTranslations')
  const grouped = new Map<ItemKind, typeof itemRows>()
  for (const row of itemRows) {
    const bucket = grouped.get(row.kind) ?? []
    bucket.push(row)
    grouped.set(row.kind, bucket)
  }
  if (PERF_DEV) console.time('[perf] seedKind item-kinds INSERT (loop)')
  for (const [kind, kindRows] of grouped) {
    await seedKind(db, kind, kindRows.length, async () => {
      for (let i = 0; i < kindRows.length; i += CHUNK_SIZE) {
        const chunk = kindRows.slice(i, i + CHUNK_SIZE)
        const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
        const params: (string | null)[] = []
        for (const row of chunk) {
          params.push(
            kind,
            row.packKey,
            null,
            LOCALE,
            row.nameLoc,
            null,
            row.textLoc,
            SOURCE,
            null,
          )
        }
        await db.execute(
          `INSERT OR REPLACE INTO translations
             (kind, name_key, level, locale, name_loc, traits_loc, text_loc, source, structured_json)
           VALUES ${placeholders}`,
          params,
        )
      }
    })
  }
  if (PERF_DEV) console.timeEnd('[perf] seedKind item-kinds INSERT (loop)')

  if (PERF_DEV) console.time('[perf] entities.name_loc UPDATE + FTS rebuild')
  await db.execute(
    `UPDATE entities
       SET name_loc = COALESCE(
         (SELECT name_loc FROM translations
           WHERE translations.kind = 'monster'
             AND translations.locale = ?
             AND translations.name_key = entities.name COLLATE NOCASE
           LIMIT 1),
         ''
       )`,
    [LOCALE],
  )

  await db.execute(
    `INSERT INTO entities_fts(entities_fts) VALUES('rebuild')`,
    [],
  )
  if (PERF_DEV) console.timeEnd('[perf] entities.name_loc UPDATE + FTS rebuild')

  // Flatten actor pack items[] into entity_items so strike rendering
  // can look up RU weapon names by (entity_name, item_id) without
  // parsing structured_json on every paint. Dedup on (entity, id)
  // because the same item id can appear in multiple actor entries that
  // share inventory and the DB primary key collapses those collisions.
  const itemPairsDedup = new Map<string, { entity: string; id: string; name: string; description: string | null }>()
  for (const row of monsterRows) {
    for (const item of row.structured.items) {
      const key = `${row.packKey.toLowerCase()}:${item.id}`
      itemPairsDedup.set(key, {
        entity: row.packKey,
        id: item.id,
        name: item.name,
        description: typeof item.description === 'string' && item.description.length > 0 ? item.description : null,
      })
    }
  }
  const monsterItemPairs = Array.from(itemPairsDedup.values())
  if (PERF_DEV) console.time('[perf] entity_items INSERT')
  if (monsterItemPairs.length > 0) {
    const existingItems = await db.select<{ n: number }[]>(
      'SELECT COUNT(*) AS n FROM entity_items WHERE locale = ?',
      [LOCALE],
    )
    const haveItems = existingItems[0]?.n ?? 0
    const expectedDescriptions = monsterItemPairs.filter((p) => p.description !== null).length
    const existingWithDesc = await db.select<{ n: number }[]>(
      'SELECT COUNT(*) AS n FROM entity_items WHERE locale = ? AND description_loc IS NOT NULL',
      [LOCALE],
    )
    const haveDescriptions = existingWithDesc[0]?.n ?? 0
    const needsReseed = haveItems !== monsterItemPairs.length || haveDescriptions !== expectedDescriptions
    if (needsReseed) {
      console.log(
        `[translations] Seeding ${monsterItemPairs.length} entity_items rows (existing=${haveItems}, descriptions=${haveDescriptions}/${expectedDescriptions})`,
      )
      await db.execute('BEGIN TRANSACTION', [])
      try {
        await db.execute(`DELETE FROM entity_items WHERE locale = ?`, [LOCALE])
        for (let i = 0; i < monsterItemPairs.length; i += ENTITY_ITEMS_CHUNK_SIZE) {
          const chunk = monsterItemPairs.slice(i, i + ENTITY_ITEMS_CHUNK_SIZE)
          const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ')
          const params: (string | null)[] = []
          for (const pair of chunk) {
            params.push(pair.entity, pair.id, LOCALE, pair.name, pair.description)
          }
          await db.execute(
            `INSERT OR REPLACE INTO entity_items
               (entity_name, item_id, locale, name_loc, description_loc)
             VALUES ${placeholders}`,
            params,
          )
        }
        await db.execute('COMMIT', [])
      } catch (err) {
        await db.execute('ROLLBACK', [])
        throw err
      }
    }
  }
  if (PERF_DEV) console.timeEnd('[perf] entity_items INSERT')

  // Record seed version so warm boot guard fires on next launch.
  await db.execute(
    'INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)',
    [SEED_VERSION_KEY, SEED_VERSION],
  )

  if (PERF_DEV) {
    console.timeEnd('[perf] total seed (cold boot)')
    console.log(`[perf] === cold-boot seed end — monsters=${monsterRows.length} spells=${spellRows.length} item-kinds=${itemRows.length} entity_items=${monsterItemPairs.length} ===`)
  }

  const counts = await db.select<{ kind: string; locale: string; n: number }[]>(
    'SELECT kind, locale, COUNT(*) as n FROM translations GROUP BY kind, locale',
  )
  console.log(
    '[translations] Loaded:',
    counts.map((r) => `${r.kind}/${r.locale}=${r.n}`).join(' '),
  )
}

/**
 * Look up a structured monster translation overlay.
 *
 * Thin wrapper over the generic translation API — exposes the typed
 * `MonsterStructuredLoc` directly so consumers do not need to deal with
 * the wider TranslationRow shape when they only care about the structured
 * overlay.
 */
export async function getMonsterTranslation(
  nameKey: string,
  level: number | null,
  locale: SupportedLocale,
): Promise<MonsterStructuredLoc | null> {
  const row = await getTranslation('monster', nameKey, level, locale)
  return row?.structured ?? null
}

export { getSizeLabel } from './dictionaries/sizes'
export { getSkillLabel } from './dictionaries/skills'
export { getLanguageLabel } from './dictionaries/languages'
export { getTraitLabel, getTraitDescription } from './dictionaries/traits'
