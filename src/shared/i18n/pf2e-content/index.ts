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
import { collectMonsterTranslations } from './ingest'
import { getTranslation } from '@/shared/api/translations'
import type { SupportedLocale } from '@/shared/i18n/config'
import type { MonsterStructuredLoc } from './lib'

export type TranslationKind = 'monster' | 'spell' | 'item' | 'feat' | 'action'

const LOCALE = 'ru'
const SOURCE = 'pf2-locale-ru'
const KIND = 'monster' as const

// SQLite parameter limit is 999. With 9 columns per row we use 100 rows per
// chunk = 900 params — well under the limit and large enough that 1973 rows
// fit in 20 statements instead of 1973.
const CHUNK_SIZE = 100

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
  const rows = collectMonsterTranslations()

  const existing = await db.select<{ n: number }[]>(
    'SELECT COUNT(*) AS n FROM translations WHERE source = ? AND locale = ? AND kind = ?',
    [SOURCE, LOCALE, KIND],
  )
  const existingCount = existing[0]?.n ?? 0

  if (existingCount === rows.length) {
    console.log(`[translations] Skipping seed — ${existingCount} rows already present`)
  } else {
    console.log(
      `[translations] Seeding ${rows.length} rows (existing=${existingCount}); chunked transaction`,
    )
    await db.execute('BEGIN TRANSACTION', [])
    try {
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunk = rows.slice(i, i + CHUNK_SIZE)
        const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')
        const params: (string | null)[] = []
        for (const row of chunk) {
          params.push(
            KIND,
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
      await db.execute('COMMIT', [])
    } catch (err) {
      await db.execute('ROLLBACK', [])
      throw err
    }
  }

  await db.execute(
    `UPDATE entities
       SET name_loc = (
         SELECT name_loc FROM translations
          WHERE translations.kind = 'monster'
            AND translations.locale = ?
            AND translations.name_key = entities.name COLLATE NOCASE
          LIMIT 1
       )`,
    [LOCALE],
  )

  await db.execute(
    `INSERT INTO entities_fts(entities_fts) VALUES('rebuild')`,
    [],
  )

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
