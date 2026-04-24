/**
 * Debug harness for the translations-schema migration pair (0041 rename +
 * 0042 ADD COLUMN). Runs inside Tauri WebView DevTools.
 *
 * Usage: open app in `pnpm tauri dev`, open DevTools (Ctrl+Shift+I),
 * run: `await __pathmaid_migrationsDebug()`.
 *
 * Asserts:
 *   1. translations.structured_json column exists (PRAGMA table_info)
 *   2. structured_json column type is TEXT
 *   3. structured_json column is nullable (notnull = 0)
 *   4. _migrations contains the renamed filename marker (0041_translations.sql)
 *   5. _migrations no longer contains the pre-rename marker (0038_translations.sql)
 *   6. _migrations contains the new structured_json migration marker
 *   7. translations table has at least one monster row with structured_json populated
 *      (proves the bundled loader wrote JSON after seed — not just that the column exists)
 *
 * This file is NOT a test suite — it is a manual smoke test. Excluded from
 * production bundle by the DEV-guarded dynamic import in main.tsx.
 */

import { getDb } from './connection'

interface PragmaColumn {
  cid: number
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

interface MigrationRow {
  name: string
}

interface CountRow {
  n: number
}

export async function runMigrationsDebug(): Promise<void> {
  const db = await getDb()

  let passed = 0
  let total = 0

  function assert(condition: boolean, message: string): void {
    total++
    if (condition) {
      passed++
    } else {
      console.assert(false, `[FAIL] ${message}`)
    }
  }

  // PRAGMA table_info returns one row per column
  const columns = await db.select<PragmaColumn[]>(
    'PRAGMA table_info(translations)',
    [],
  )
  const structuredJsonCol = columns.find((c) => c.name === 'structured_json')

  // A1: column exists
  assert(
    structuredJsonCol !== undefined,
    'translations.structured_json column must exist after migration 0042 runs',
  )

  // A2: column type is TEXT
  assert(
    structuredJsonCol?.type === 'TEXT',
    `structured_json must be TEXT (got: ${structuredJsonCol?.type ?? 'undefined'})`,
  )

  // A3: column is nullable (notnull flag = 0) — legacy rows pre-date the seed
  assert(
    structuredJsonCol?.notnull === 0,
    'structured_json must be nullable (NOT NULL flag must be 0)',
  )

  // A4: _migrations contains the renamed marker
  const newMarker = await db.select<MigrationRow[]>(
    "SELECT name FROM _migrations WHERE name = '0041_translations.sql'",
    [],
  )
  assert(
    newMarker.length === 1,
    '_migrations must contain 0041_translations.sql marker',
  )

  // A5: _migrations no longer contains the pre-rename marker
  const oldMarker = await db.select<MigrationRow[]>(
    "SELECT name FROM _migrations WHERE name = '0038_translations.sql'",
    [],
  )
  assert(
    oldMarker.length === 0,
    '_migrations must NOT contain stale 0038_translations.sql marker (cleanup erased it)',
  )

  // A6: the new structured_json migration itself is marked applied
  const structuredMarker = await db.select<MigrationRow[]>(
    "SELECT name FROM _migrations WHERE name = '0042_translation_structured_json.sql'",
    [],
  )
  assert(
    structuredMarker.length === 1,
    '_migrations must contain 0042_translation_structured_json.sql marker',
  )

  // A7: at least one monster row in translations has structured_json populated
  //     after the bundled loader ran. Proves the write path is live end-to-end
  //     (parser produced output → JSON.stringify → column populated).
  const populated = await db.select<CountRow[]>(
    "SELECT COUNT(*) AS n FROM translations WHERE kind = 'monster' AND structured_json IS NOT NULL",
    [],
  )
  assert(
    (populated[0]?.n ?? 0) >= 1,
    "translations must contain at least one monster row with structured_json populated after seed (run pnpm tauri dev and retry if DB is empty)",
  )

  console.log(`[migrations.debug] ${passed}/${total} assertions passed`)
  if (passed !== total) {
    console.error(
      `[migrations.debug] FAILED: ${total - passed} assertion(s) did not pass — check FAIL logs above`,
    )
  }
}

if (import.meta.env.DEV) {
  ;(
    window as unknown as {
      __pathmaid_migrationsDebug: () => Promise<void>
    }
  ).__pathmaid_migrationsDebug = runMigrationsDebug
  console.log(
    '[migrations.debug] Available via window.__pathmaid_migrationsDebug()',
  )
}
