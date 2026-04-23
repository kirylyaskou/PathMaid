---
phase: 85-migration-db-schema
plan: "01"
subsystem: database
tags: [sqlite, migration, translations, schema, dev-harness, structured-json]

requires:
  - phase: 84-html-parser-library
    provides: parseMonsterRuHtml, MonsterStructuredLoc — the output shape that structured_json stores

provides:
  - 0041_translations.sql — translations table schema (renamed from 0038, byte-identical content)
  - 0042_translation_structured_json.sql — _migrations cleanup + ALTER TABLE ADD COLUMN structured_json TEXT
  - TranslationRow.structuredJson: string | null — consumer-facing field in shared/api/translations.ts
  - migrations.debug.ts — window.__pathmaid_migrationsDebug() harness with 6 assertions

affects:
  - phase-86-bundled-loader (writes structured_json column)
  - phase-87-translations-api (JSON.parse structured_json on read path)
  - phase-88-creature-stat-block (consumes structured field)

tech-stack:
  added: []
  patterns:
    - git mv for migration rename preserves file history through the rename
    - _migrations cleanup via DELETE + INSERT OR IGNORE in a later migration (not the renamed file itself)
    - debug harness in shared/db/ mirrors shared/i18n/pf2e-content/lib/ pattern — typed window cast, no 'as any'

key-files:
  created:
    - src/shared/db/migrations/0041_translations.sql (renamed from 0038_translations.sql — byte-identical)
    - src/shared/db/migrations/0042_translation_structured_json.sql
    - src/shared/db/migrations.debug.ts
  modified:
    - src/shared/api/translations.ts
    - src/main.tsx
  deleted:
    - src/shared/db/migrations/0038_translations.sql (renamed via git mv — git history preserved)

key-decisions:
  - "D-03 honored: cleanup _migrations goes into 0042_* (not 0041_*) so ALTER TABLE runs after CREATE TABLE on fresh installs"
  - "D-04 honored: raw SQL pattern kept, no Drizzle — structuredJson is string | null, parsing deferred to Phase 87"
  - "D-05 honored: debug harness has 6 assertions (plan minimum 4), typed window cast (no 'as any')"
  - "executor chose filename migrations.debug.ts (not translations-schema.debug.ts) for brevity and co-location with connection.ts"

patterns-established:
  - "_migrations rename pattern: git mv file to new name → new migration does DELETE old marker + INSERT OR IGNORE new marker + schema change"
  - "debug harness co-location: *.debug.ts lives in same shared/db/ slice as the code it tests; already covered by eslint ignore glob src/**/*.debug.ts"

requirements-completed: [TRANS-02]

duration: 15min
completed: "2026-04-23"
---

# Phase 85 Plan 01: Migration + DB Schema Summary

**0038→0041 migration rename resolved via git mv + new 0042 migration adds structured_json TEXT NULL column and cleans up stale _migrations marker on existing installs**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-23T23:30:01Z
- **Completed:** 2026-04-23T23:45:00Z
- **Tasks:** 5 (T1–T5)
- **Files modified:** 5 (2 created SQL, 1 new TS harness, 2 modified)

## Accomplishments

- Filename collision resolved: `0038_translations.sql` renamed to `0041_translations.sql` via `git mv` — history preserved, content byte-identical
- New `0042_translation_structured_json.sql` migration covers both existing and fresh installs idempotently: `DELETE` stale marker, `INSERT OR IGNORE` renamed marker, `ALTER TABLE ADD COLUMN structured_json TEXT`
- `TranslationRow` and `TranslationDbRow` extended with `structuredJson: string | null` / `structured_json: string | null`; both SELECT queries in `getTranslation()` updated; `toRow()` maps the new field; raw string only — JSON.parse is Phase 87 scope
- `migrations.debug.ts` added with 6 assertions covering column existence, type, nullability, and `_migrations` marker state (A1–A6); `window.__pathmaid_migrationsDebug()` attached in DEV; `main.tsx` extended with a sibling dynamic import

## Task Commits

1. **T1: Rename 0038_translations.sql → 0041_translations.sql** — `29d2443f` (feat)
2. **T2: Create 0042_translation_structured_json.sql** — `3b25d1ab` (feat)
3. **T3: Extend TranslationRow + TranslationDbRow + toRow + SELECT queries** — `961b886d` (feat)
4. **T4: Create migrations.debug.ts + wire into main.tsx DEV block** — `2008a8fe` (feat)
5. **T5: Full-project gates** — no separate commit (verification only)

## Files Created/Modified

- `src/shared/db/migrations/0038_translations.sql` — DELETED (renamed via git mv to 0041_translations.sql; history preserved in git log --follow)
- `src/shared/db/migrations/0041_translations.sql` — NEW (renamed from 0038, content byte-identical: CREATE TABLE IF NOT EXISTS translations + 2 indexes)
- `src/shared/db/migrations/0042_translation_structured_json.sql` — NEW (3 SQL statements: DELETE stale marker, INSERT OR IGNORE renamed marker, ALTER TABLE ADD COLUMN structured_json TEXT)
- `src/shared/api/translations.ts` — MODIFIED (structuredJson: string | null in TranslationRow; structured_json: string | null in TranslationDbRow; toRow mapping; both SELECT queries extended)
- `src/shared/db/migrations.debug.ts` — NEW (runMigrationsDebug + window attach, 6 assertions A1–A6)
- `src/main.tsx` — MODIFIED (added `void import('./shared/db/migrations.debug')` in DEV block)

## Decisions Made

- **D-03 reaffirmed:** Rename cleanup goes in `0042_*` not `0041_*`. Fresh install: loader applies `0041_translations.sql` first (lexicographic: `0041_t` < `0042_t`) creating the table, then `0042_*` adds the column. Existing install: `0041_*` is unapplied (new name), loader runs `CREATE TABLE IF NOT EXISTS` (no-op), registers `0041_translations.sql` in `_migrations`, then `0042_*` does the DELETE/INSERT OR IGNORE cleanup + ADD COLUMN. Both paths are idempotent.
- **D-04 reaffirmed:** Raw SQL pattern kept throughout. `structuredJson` is a `string | null` raw string — JSON.parse is explicitly Phase 87 scope. No Drizzle introduced.
- **Filename choice:** `migrations.debug.ts` (not `translations-schema.debug.ts`) — co-located with `connection.ts` in `shared/db/`, brief, consistent with the debug pattern.
- **assert count:** 6 (plan minimum 4, plan T4 description says "берём запас") — covers column shape (A1–A3) and all three marker states (A4–A6).

## Deviations from Plan

None — plan executed exactly as written. All acceptance criteria met on first attempt.

**ROADMAP SC4 mismatch (expected, documented):** ROADMAP.md mentions "Drizzle db.select().from(translations) type includes structuredJson" as a success criterion. This does not match the executed plan — per CONTEXT.md D-04, Drizzle was explicitly deferred. The equivalent criterion for the raw SQL path (TranslationRow interface has `structuredJson: string | null`) is satisfied. This mismatch between ROADMAP draft and locked D-04 decision is expected and does not represent a plan deviation.

## Issues Encountered

- `pnpm lint` exit code 1 — pre-existing errors in `src/shared/i18n/index.ts:24-25` (boundaries/dependencies violations documented in Phase 84 SUMMARY as baseline debt). No new errors introduced by T1–T4 files.
- `pnpm lint:arch` exit code 1 — all violations pre-existing in entities/features/widgets/pages (none in shared/db/ or shared/api/ files changed by this plan).
- `import.meta.env.DEV` appeared twice in migrations.debug.ts draft (once in JSDoc, once in code). JSDoc wording was adjusted to remove the inline mention, leaving exactly 1 occurrence in code per acceptance criteria.

## Known Stubs

**`structuredJson` column is NULL for all existing rows** — the column exists in schema after `0042_*` runs, but no loader populates it until Phase 86. `getTranslation()` returns `structuredJson: null` for all rows until Phase 86 seed pass completes.

- **File:** `src/shared/api/translations.ts`, `getTranslation()` return value
- **Reason:** Intentional — Phase 85 scope is schema + interface only. Phase 86 handles backfill.
- **Resolution:** Phase 86 bundled loader will call `parseMonsterRuHtml` and `JSON.stringify`, then UPDATE translations SET structured_json = ? for each row.

## Threat Flags

Threat register T-85-01..06 reviewed — all dispositions remain in force:

| Flag | File | Description |
|------|------|-------------|
| T-85-01 (accept) | 0042_translation_structured_json.sql | DELETE FROM _migrations tampers with migration history — acceptable for local single-user app; documented in migration header |
| T-85-02 (accept) | structured_json column | Parser output stored — no PII, no secrets, bundled static content only |
| T-85-03 (mitigate) | ALTER TABLE translations | O(1) metadata-only SQLite ADD COLUMN, no row rewrite; migrations run single-threaded before first UI interaction |
| T-85-04 (mitigate) | migrate.ts error surface | migrate.ts already wraps failures with rich error message (file + statement + snippet); debug harness adds manual verification path |
| T-85-05 (accept) | _migrations audit trail | Pre-rename entry erased; covered by git history of the renamed file |
| T-85-06 (accept) | getTranslation() IPC surface | Returning nullable string does not introduce new capabilities or attack surface; typed parsing is Phase 87 scope |

No new IPC boundaries, no new network surfaces, no new user input paths introduced.

## Human UAT Required

Cannot automate without running Tauri WebView. Three scenarios:

**Scenario A — Fresh install:**
1. Delete `%APPDATA%\com.pathmaid.app\pathmaid.db`
2. `pnpm tauri dev`
3. Open DevTools (`Ctrl+Shift+I`)
4. Confirm startup: `[migrations.debug] Available via window.__pathmaid_migrationsDebug()`
5. Run: `await __pathmaid_migrationsDebug()`
6. Expected: `[migrations.debug] 6/6 assertions passed`

**Scenario B — Existing install (database predates Phase 85):**
1. Do NOT delete the existing database
2. `pnpm tauri dev`
3. In Console: confirm `[migrate] Applying: 0041_translations.sql` and `[migrate] Applying: 0042_translation_structured_json.sql` log lines appear once
4. Run: `await __pathmaid_migrationsDebug()`
5. Expected: `[migrations.debug] 6/6 assertions passed`

**Scenario C — Re-run idempotency:**
1. Second `pnpm tauri dev` immediately after Scenario B
2. Confirm NO `[migrate] Applying:` log lines (all migrations already applied)
3. Run: `await __pathmaid_migrationsDebug()`
4. Expected: `[migrations.debug] 6/6 assertions passed` — harness still passes because assertions query live DB state

## Acceptance Criteria Status

| Criterion | Status |
|-----------|--------|
| T1: `test -f 0041_translations.sql` | PASS |
| T1: `test ! -f 0038_translations.sql` | PASS |
| T1: `grep -c "CREATE TABLE IF NOT EXISTS translations" 0041_translations.sql` ≥ 1 | PASS |
| T1: `grep -c "idx_translations_key" 0041_translations.sql` ≥ 1 | PASS |
| T1: `grep -c "idx_translations_kind_locale" 0041_translations.sql` ≥ 1 | PASS |
| T1: git status shows R (rename) not D+A | PASS |
| T1: `test -f 0038_spell_overrides_heightened.sql` (collision partner intact) | PASS |
| T2: `test -f 0042_translation_structured_json.sql` | PASS |
| T2: DELETE FROM _migrations statement present (count = 1) | PASS |
| T2: INSERT OR IGNORE INTO _migrations statement present (count = 1) | PASS |
| T2: ALTER TABLE ADD COLUMN structured_json TEXT present (count = 1) | PASS |
| T2: No NOT NULL on structured_json | PASS |
| T2: No phase/version refs in new SQL file | PASS |
| T2: Header comment ≥ 8 lines (actual: 16) | PASS |
| T2: 0041 appears before 0042 in sorted directory listing | PASS |
| T3: `grep -c "structuredJson" translations.ts` ≥ 3 (actual: 3) | PASS |
| T3: `grep -c "structured_json" translations.ts` ≥ 4 (actual: 4) | PASS |
| T3: `grep -E "SELECT.*structured_json.*FROM translations" ... \| wc -l` ≥ 2 | PASS |
| T3: `structuredJson: string \| null` in TranslationRow | PASS |
| T3: `structured_json: string \| null` in TranslationDbRow | PASS |
| T3: `structuredJson: db.structured_json` in toRow() | PASS |
| T3: No JSON.parse in translations.ts | PASS |
| T3: No MonsterStructuredLoc in translations.ts | PASS |
| T3: No phase/version refs in translations.ts | PASS |
| T3: getTranslation() signature unchanged (4 params) | PASS |
| T4: `test -f migrations.debug.ts` | PASS |
| T4: `export async function runMigrationsDebug` present | PASS |
| T4: ≥ 6 assert() calls (actual: 6) | PASS |
| T4: `__pathmaid_migrationsDebug` present ≥ 2 times (actual: 4) | PASS |
| T4: `import.meta.env.DEV` count = 1 | PASS |
| T4: PRAGMA table_info(translations) queried | PASS |
| T4: 0041_translations.sql checked in _migrations | PASS |
| T4: 0038_translations.sql checked NOT in _migrations | PASS |
| T4: No `as any` | PASS |
| T4: No phase/version refs in migrations.debug.ts | PASS |
| T4: main.tsx imports migrations.debug in DEV block | PASS |
| T4: main.tsx parse-monster.debug import still present | PASS |
| T5: `pnpm tsc --noEmit` = 0 errors | PASS |
| T5: `pnpm lint` = 0 new errors in T1–T4 files | PASS (2 pre-existing errors in shared/i18n/index.ts:24-25 unrelated to this plan) |
| T5: `pnpm lint:arch` = 0 new violations in T1–T4 files | PASS (all violations pre-existing) |
| T5: `git diff --exit-code package.json pnpm-lock.yaml` = exit 0 | PASS |
| T5: `git diff --stat src-tauri/Cargo.toml src-tauri/Cargo.lock` empty | PASS |

## Self-Check: PASSED

- FOUND: `src/shared/db/migrations/0041_translations.sql`
- FOUND: `0038_translations.sql` deleted (git mv history preserved)
- FOUND: `src/shared/db/migrations/0042_translation_structured_json.sql`
- FOUND: `src/shared/db/migrations.debug.ts`
- FOUND: `.planning/phases/85-migration-db-schema/85-01-SUMMARY.md`
- FOUND: 29d2443f (T1), 3b25d1ab (T2), 961b886d (T3), 2008a8fe (T4)
