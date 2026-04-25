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
 *   8. getTranslation('monster', 'Succubus', null, 'ru') returns a row whose
 *      structured field is a typed object with non-empty items[] —
 *      proves the full read-path chain (column → loader → JSON.parse → typed).
 *
 * This file is NOT a test suite — it is a manual smoke test. Excluded from
 * production bundle by the DEV-guarded dynamic import in main.tsx.
 */

import { getDb } from './connection'
import { getTranslation } from '@/shared/api/translations'
import {
  getSkillLabel,
  getSizeLabel,
  getLanguageLabel,
  getTraitLabel,
  getTraitDescription,
} from '@/shared/i18n'

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
  //     after the loader ran. Proves the write path is live end-to-end
  //     (adapter produced output → JSON.stringify → column populated).
  const populated = await db.select<CountRow[]>(
    "SELECT COUNT(*) AS n FROM translations WHERE kind = 'monster' AND structured_json IS NOT NULL",
    [],
  )
  assert(
    (populated[0]?.n ?? 0) >= 1,
    "translations must contain at least one monster row with structured_json populated after seed (run pnpm tauri dev and retry if DB is empty)",
  )

  // A8: end-to-end read-path — getTranslation returns a typed structured
  //     object for Succubus. Proves that: column exists, loader wrote JSON,
  //     toRow() parsed it back into a typed shape, and the hook-facing
  //     TranslationRow.structured surface works.
  //
  //     Babele actor entries do not carry a level field, so adapter writes
  //     level=NULL. getTranslation's fuzzy fallback (level IS NULL) DESC
  //     matches that row first when caller passes level=null.
  const succubusRow = await getTranslation('monster', 'Succubus', null, 'ru')
  assert(
    succubusRow !== null,
    "getTranslation must return a row for Succubus locale=ru (run pnpm tauri dev to seed the translations table if empty)",
  )
  assert(
    succubusRow?.structured !== null && succubusRow?.structured !== undefined,
    "Succubus row must have a parsed structured object (not null) — write+read path typed round-trip",
  )
  assert(
    (succubusRow?.structured?.items?.length ?? 0) > 0,
    "Succubus structured.items must be non-empty — adapter populated items[] from the Babele pack actor entry",
  )

  console.log(`[migrations.debug] ${passed}/${total} assertions passed`)
  if (passed !== total) {
    console.error(
      `[migrations.debug] FAILED: ${total - passed} assertion(s) did not pass — check FAIL logs above`,
    )
  }
}

/**
 * Smoke test for the Phase 92 dictionary getters. Verifies:
 *   - skill label lookup, SF2e drop, Lore promotion, locale=en passthrough
 *   - size label lookup, slug fallback
 *   - language label lookup, known gap fallback (infernal absent in upstream)
 *   - trait label PascalCase→kebab conversion, numbered variant
 *   - trait description null on miss
 */
export function runDictionariesDebug(): void {
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

  assert(getSkillLabel('Acrobatics', 'ru') === 'Акробатика', 'skill: Acrobatics → Акробатика')
  assert(getSkillLabel('Performance', 'ru') === 'Выступление', 'skill: Performance → Выступление')
  assert(getSkillLabel('Lore', 'ru') === 'Знания', 'skill: Lore promoted from PF2E.SkillLore')
  assert(getSkillLabel('Computers', 'ru') === 'Computers', 'skill: SF2e Computers filtered to slug')
  assert(getSkillLabel('Acrobatics', 'en') === 'Acrobatics', 'skill: locale=en echoes slug')
  assert(getSkillLabel('Unknown', 'ru') === 'Unknown', 'skill: silent fallback for unknown slug')

  assert(getSizeLabel('med', 'ru') === 'Средний', 'size: med → Средний')
  assert(getSizeLabel('grg', 'ru') === 'Исполинский', 'size: grg → Исполинский')
  assert(getSizeLabel('unknown', 'ru') === 'unknown', 'size: silent fallback for unknown engine slug')

  assert(getLanguageLabel('common', 'ru').length > 0, 'language: common resolves')
  assert(getLanguageLabel('infernal', 'ru') === 'infernal', 'language: known gap → slug fallback')
  assert(getLanguageLabel('CommonLanguage', 'ru') === 'CommonLanguage', 'language: UI-template key filtered out')

  assert(getTraitLabel('forceful', 'ru') === 'Силовое', 'trait: forceful → Силовое')
  assert(getTraitLabel('two-hand', 'ru').length > 0, 'trait: two-hand resolves (PascalCase TwoHand)')
  assert(getTraitLabel('additive', 'ru').length > 0, 'trait: bare additive resolves')
  assert(getTraitLabel('unknown-trait-foo', 'ru') === 'unknown-trait-foo', 'trait: silent fallback')

  assert(getTraitDescription('unknown-trait-foo', 'ru') === null, 'trait description: null on miss')
  assert(getTraitDescription('forceful', 'en') === null, 'trait description: null at locale=en')

  console.log(`[dictionaries.debug] ${passed}/${total} assertions passed`)
  if (passed !== total) {
    console.error(
      `[dictionaries.debug] FAILED: ${total - passed} assertion(s) did not pass — check FAIL logs above`,
    )
  }
}

if (import.meta.env.DEV) {
  ;(
    window as unknown as {
      __pathmaid_migrationsDebug: () => Promise<void>
      __pathmaid_dictionariesDebug: () => void
    }
  ).__pathmaid_migrationsDebug = runMigrationsDebug
  ;(
    window as unknown as {
      __pathmaid_dictionariesDebug: () => void
    }
  ).__pathmaid_dictionariesDebug = runDictionariesDebug
  console.log(
    '[migrations.debug] Available via window.__pathmaid_migrationsDebug()',
  )
  console.log(
    '[dictionaries.debug] Available via window.__pathmaid_dictionariesDebug()',
  )
}
