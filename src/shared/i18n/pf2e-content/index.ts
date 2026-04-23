/**
 * Bundled content translations loader.
 *
 * Pattern mirrors `src/shared/db/migrate.ts:3` — `import.meta.glob` collects
 * all JSON files at build time; Vite inlines them into the bundle. The loader
 * runs once on app startup (after migrations) and upserts every row into the
 * `translations` SQLite table.
 *
 * Filename convention: `<kind>.json` where kind ∈ {monster, spell, item, feat,
 * action}. File root is a JSON array of TranslationRecord.
 *
 * Each array element maps to one `translations` row with:
 *   kind      ← filename stem
 *   name_key  ← record.name        (English)
 *   level     ← record.level       (nullable)
 *   locale    ← 'ru'               (only locale in v1.5.1; extensible)
 *   name_loc  ← record.rus_name
 *   traits_loc ← record.rus_traits (empty string → NULL)
 *   text_loc  ← record.rus_text
 *   source    ← 'pf2.ru'
 *
 * Idempotency: the unique index (kind, name_key NOCASE, level, locale)
 * plus INSERT OR REPLACE means rebooting the app does not create dupes,
 * and re-shipping a new bundled JSON with updated text overwrites the old row.
 */

import type Database from '@tauri-apps/plugin-sql'

export type TranslationKind = 'monster' | 'spell' | 'item' | 'feat' | 'action'

interface TranslationRecord {
  name: string
  rus_name: string
  traits?: string
  rus_traits?: string
  text?: string
  rus_text: string
  level?: number
}

const contentFiles = import.meta.glob('./*.json', {
  eager: true,
  import: 'default',
}) as Record<string, TranslationRecord[]>

const LOCALE = 'ru'
const SOURCE = 'pf2.ru'

const VALID_KINDS: readonly TranslationKind[] = [
  'monster',
  'spell',
  'item',
  'feat',
  'action',
]

function extractKind(path: string): TranslationKind | null {
  const match = path.match(/\.\/([a-z]+)\.json$/)
  if (!match) return null
  const kind = match[1] as TranslationKind
  return VALID_KINDS.includes(kind) ? kind : null
}

/**
 * Upsert all bundled translations into the `translations` table.
 * Safe to call repeatedly (idempotent via INSERT OR REPLACE on unique key).
 */
export async function loadContentTranslations(db: Database): Promise<void> {
  for (const [path, records] of Object.entries(contentFiles)) {
    const kind = extractKind(path)
    if (!kind) {
      console.warn(`[translations] Skipping unrecognized file: ${path}`)
      continue
    }
    if (!Array.isArray(records)) {
      console.warn(`[translations] ${path}: expected array, got ${typeof records}`)
      continue
    }

    for (const record of records) {
      if (!record?.name || !record?.rus_name || !record?.rus_text) {
        console.warn(
          `[translations] ${path}: skipping record missing name/rus_name/rus_text`,
          record?.name ?? '(unnamed)'
        )
        continue
      }

      const traitsLoc =
        record.rus_traits && record.rus_traits.trim().length > 0
          ? record.rus_traits
          : null
      const level = typeof record.level === 'number' ? record.level : null

      await db.execute(
        `INSERT OR REPLACE INTO translations
           (kind, name_key, level, locale, name_loc, traits_loc, text_loc, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [kind, record.name, level, LOCALE, record.rus_name, traitsLoc, record.rus_text, SOURCE]
      )
    }
  }

  // Observability: report count per (kind, locale)
  const rows = await db.select<{ kind: string; locale: string; n: number }[]>(
    'SELECT kind, locale, COUNT(*) as n FROM translations GROUP BY kind, locale'
  )
  console.log(
    '[translations] Loaded:',
    rows.map((r) => `${r.kind}/${r.locale}=${r.n}`).join(' '),
  )
}
