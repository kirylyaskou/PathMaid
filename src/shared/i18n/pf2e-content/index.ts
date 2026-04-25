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

/**
 * Upsert all vendored monster translations into the `translations` table.
 * Safe to call repeatedly (idempotent via INSERT OR REPLACE on unique key).
 */
export async function loadContentTranslations(db: Database): Promise<void> {
  const rows = collectMonsterTranslations()

  for (const row of rows) {
    try {
      await db.execute(
        `INSERT OR REPLACE INTO translations
           (kind, name_key, level, locale, name_loc, traits_loc, text_loc, source, structured_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          KIND,
          row.packKey,
          null,
          LOCALE,
          row.nameLoc,
          null,
          row.textLoc,
          SOURCE,
          JSON.stringify(row.structured),
        ],
      )
    } catch (err) {
      console.warn(`[translations] insert failed for ${row.packKey}:`, err)
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
