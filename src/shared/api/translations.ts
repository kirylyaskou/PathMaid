/**
 * Translation lookup API.
 *
 * Single read path for all kinds of pf2e content (monster/spell/item/feat/
 * action). Callers never construct SQL — all matching happens here through
 * parameterized queries with NOCASE collation.
 *
 * Matching policy:
 *   1. NOCASE match on name_key (English name stored by bundled JSON loader
 *      in Phase 78; `import.meta.glob` loader seeds the table at startup).
 *   2. level disambiguation when both sides have a value; if the caller
 *      doesn't know the level (level === undefined/null), fall back to the
 *      first NOCASE match for that name.
 *   3. locale fallback handled at the render layer — this function returns
 *      `null` when no translation exists for the requested locale, and the
 *      caller (useContentTranslation) decides to show the English original.
 *
 * This API is the sole Tauri IPC boundary for translations per FSD constraint
 * (shared/api/ is the only place invoke() is allowed). Today it only touches
 * a single local SQLite table, but keeping the boundary preserves the option
 * to swap the backend (remote translation CDN, crowd-sourced edits) without
 * touching callers.
 */

import { getDb } from '@/shared/db'
import type { TranslationKind } from '@/shared/i18n'

export type { TranslationKind }

export interface TranslationRow {
  kind: TranslationKind
  nameKey: string
  level: number | null
  locale: string
  nameLoc: string
  traitsLoc: string | null
  textLoc: string
  source: string | null
}

interface TranslationDbRow {
  kind: string
  name_key: string
  level: number | null
  locale: string
  name_loc: string
  traits_loc: string | null
  text_loc: string
  source: string | null
}

function toRow(db: TranslationDbRow): TranslationRow {
  return {
    kind: db.kind as TranslationKind,
    nameKey: db.name_key,
    level: db.level,
    locale: db.locale,
    nameLoc: db.name_loc,
    traitsLoc: db.traits_loc,
    textLoc: db.text_loc,
    source: db.source,
  }
}

/**
 * Look up a single translation. Returns null when no match exists for the
 * given kind/name/level/locale combination — callers must handle the
 * null-case (fall back to original EN content).
 *
 * @param kind    — content kind
 * @param name    — English name (canonical matching key)
 * @param level   — optional level for disambiguation; pass null/undefined
 *                  when caller does not know or the kind has no level
 * @param locale  — requested locale ('ru', etc.); 'en' always returns null
 *                  (the EN content IS the original — no translation needed)
 */
export async function getTranslation(
  kind: TranslationKind,
  name: string,
  level: number | null | undefined,
  locale: string,
): Promise<TranslationRow | null> {
  // 'en' short-circuits — we never store English translations (the source
  // tables already hold the English canonical form).
  if (locale === 'en') return null
  if (!name) return null

  const db = await getDb()

  if (typeof level === 'number') {
    // Exact match on (kind, name NOCASE, level, locale)
    const exact = await db.select<TranslationDbRow[]>(
      `SELECT kind, name_key, level, locale, name_loc, traits_loc, text_loc, source
       FROM translations
       WHERE kind = ?
         AND name_key = ? COLLATE NOCASE
         AND level = ?
         AND locale = ?
       LIMIT 1`,
      [kind, name, level, locale],
    )
    if (exact.length > 0) return toRow(exact[0])
    // Fall through to level-less match below if the JSON didn't carry level.
  }

  // No level known, or exact-level failed — try any row for this name.
  // Prefer level = NULL first, then any level in ascending order (so we pick
  // a deterministic row if the data ever contains level-variants without an
  // exact caller level).
  const fuzzy = await db.select<TranslationDbRow[]>(
    `SELECT kind, name_key, level, locale, name_loc, traits_loc, text_loc, source
     FROM translations
     WHERE kind = ?
       AND name_key = ? COLLATE NOCASE
       AND locale = ?
     ORDER BY (level IS NULL) DESC, level ASC
     LIMIT 1`,
    [kind, name, locale],
  )
  return fuzzy.length > 0 ? toRow(fuzzy[0]) : null
}

/**
 * Diagnostic / power-user helper — count translations by (kind, locale).
 * Used by verification scripts and, later, a Settings panel that shows
 * translation coverage.
 */
export async function getTranslationCounts(): Promise<
  Array<{ kind: string; locale: string; count: number }>
> {
  const db = await getDb()
  const rows = await db.select<
    Array<{ kind: string; locale: string; n: number }>
  >(
    'SELECT kind, locale, COUNT(*) as n FROM translations GROUP BY kind, locale',
  )
  return rows.map((r) => ({ kind: r.kind, locale: r.locale, count: r.n }))
}
