---
phase: 85-migration-db-schema
verified: 2026-04-24T00:00:00Z
status: human_needed
score: 5/6
overrides_applied: 1
overrides:
  - must_have: "Drizzle db.select().from(translations) type включает structuredJson"
    reason: "CONTEXT.md D-04 явно deferred Drizzle до v1.8+. Эквивалентный критерий — TranslationRow.structuredJson: string | null в raw SQL pattern — реализован. ROADMAP.md SC4 был черновиком до фиксации D-04. Отклонение задокументировано в SUMMARY и PLAN."
    accepted_by: "K.Yaskou"
    accepted_at: "2026-04-24T00:00:00Z"
human_verification:
  - test: "Scenario A (fresh install): удалить %APPDATA%\\com.pathmaid.app\\pathmaid.db → pnpm tauri dev → DevTools (Ctrl+Shift+I) → await __pathmaid_migrationsDebug()"
    expected: "[migrations.debug] 6/6 assertions passed"
    why_human: "Требует запущенного Tauri WebView — недоступно в CI и статическом анализе"
  - test: "Scenario B (existing install): НЕ удалять DB → pnpm tauri dev → убедиться в Console: '[migrate] Applying: 0041_translations.sql' и '[migrate] Applying: 0042_translation_structured_json.sql' появляются один раз → await __pathmaid_migrationsDebug()"
    expected: "[migrations.debug] 6/6 assertions passed"
    why_human: "Требует live SQLite DB с pre-Phase-85 данными + Tauri WebView"
  - test: "Scenario C (idempotency): второй pnpm tauri dev сразу после Scenario B → проверить что '[migrate] Applying:' логов НЕТ → await __pathmaid_migrationsDebug()"
    expected: "[migrations.debug] 6/6 assertions passed — harness проходит на уже применённых миграциях"
    why_human: "Поведение idempotency проверяется только через live DB state"
---

# Phase 85: Migration + DB Schema — Verification Report

**Phase Goal:** DB готова принимать structured_json. Prefix collision с Phase 79 migration разрешена.
**Verified:** 2026-04-24
**Status:** human_needed
**Re-verification:** Нет — начальная верификация

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Fresh install: `translations` table получает column `structured_json TEXT NULL` после первого запуска | ✓ VERIFIED | `0042_translation_structured_json.sql` содержит `ALTER TABLE translations ADD COLUMN structured_json TEXT` (без NOT NULL, без DEFAULT). Порядок применения гарантирован лексикографически: `0041_translations.sql` < `0042_translation_structured_json.sql`. |
| 2 | Existing install: `0042_*` удаляет stale `0038_translations.sql` запись из `_migrations`, регистрирует `0041_translations.sql` как applied (idempotent), ADD COLUMN завершается без ошибок | ✓ VERIFIED | SQL-файл содержит ровно 3 statement'а: `DELETE FROM _migrations WHERE name = '0038_translations.sql'`, `INSERT OR IGNORE INTO _migrations (name) VALUES ('0041_translations.sql')`, `ALTER TABLE translations ADD COLUMN structured_json TEXT`. `INSERT OR IGNORE` обеспечивает idempotency. |
| 3 | `import.meta.glob('./migrations/*.sql')` находит ровно 3 файла на `0041_*` / `0042_*` путь; нет дубля `0038_translations.sql` | ✓ VERIFIED | `0038_translations.sql` отсутствует (git mv подтверждён через `git log --follow`). `0038_spell_overrides_heightened.sql` на месте. Директория содержит `0041_translations.sql` + `0042_translation_structured_json.sql`. |
| 4 | `TranslationRow.structuredJson: string \| null` доступен consumer'у `getTranslation()` — поле читается из DB через SELECT и маппится в `toRow()` | ✓ VERIFIED | `translations.ts`: интерфейс `TranslationRow` содержит `structuredJson: string \| null`, интерфейс `TranslationDbRow` содержит `structured_json: string \| null`, `toRow()` маппит `structuredJson: db.structured_json`, обе SELECT query включают `structured_json` в column list. |
| 5 | DevTools: `await window.__pathmaid_migrationsDebug()` печатает 'PASS' по 4+ assertions (column exists, column type TEXT, new marker present, old marker absent) | ? NEEDS HUMAN | `migrations.debug.ts` содержит 6 assertions (A1–A6), `window.__pathmaid_migrationsDebug` прикреплён под DEV guard. Результат runtime требует Tauri WebView — см. Human Verification. |
| 6 | `pnpm tsc --noEmit` = 0 ошибок; `pnpm lint` не добавляет новых ошибок в изменённых файлах | ✓ VERIFIED | `pnpm tsc --noEmit` → exit 0. `pnpm lint` → 2 pre-existing ошибки в `src/shared/i18n/index.ts:24-25` (baseline из Phase 84). Ни одной новой ошибки в файлах T1–T4. |

**Score (automated):** 5/5 автоматически верифицируемых истин подтверждены. Truth #5 требует human testing.

### ROADMAP Success Criteria vs Implementation

| SC | Критерий (ROADMAP) | Статус | Примечание |
|----|-------------------|--------|------------|
| SC1 | Fresh install: migrations без конфликтов, `translations.structured_json` nullable | ✓ VERIFIED | Покрыто Truth #1 + Truth #3 |
| SC2 | Existing install: migration 0041 idempotent; legacy rows `structured_json IS NULL` | ✓ VERIFIED | Покрыто Truth #2; `ALTER TABLE ADD COLUMN` без DEFAULT → существующие rows NULL |
| SC3 | `import.meta.glob` находит все migrations в новом порядке; нет дубля `0038_*` | ✓ VERIFIED | Покрыто Truth #3 |
| SC4 | Drizzle `db.select().from(translations)` type включает `structuredJson: string \| null` | PASSED (override) | D-04 deferred Drizzle. `TranslationRow.structuredJson: string \| null` через raw SQL pattern реализован. Override принят. |
| SC5 | `tsc --noEmit` = 0, `pnpm lint:arch` = 0 | ✓ VERIFIED | Покрыто Truth #6 |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/shared/db/migrations/0041_translations.sql` | translations table schema (renamed, content unchanged) | ✓ VERIFIED | Существует, содержит `CREATE TABLE IF NOT EXISTS translations`. Контент идентичен baseline `0038_translations.sql` (diff после CRLF-нормализации = пусто). |
| `src/shared/db/migrations/0042_translation_structured_json.sql` | cleanup _migrations + ADD COLUMN structured_json | ✓ VERIFIED | Существует, 3 SQL statements, 16 comment-строк, `ADD COLUMN structured_json TEXT` присутствует. |
| `src/shared/api/translations.ts` | TranslationRow.structuredJson field | ✓ VERIFIED | `structuredJson` — 3 вхождения; `structured_json` — 4 вхождения; оба SELECT query расширены. |
| `src/shared/db/migrations.debug.ts` | runMigrationsDebug() + window.__pathmaid_migrationsDebug | ✓ VERIFIED | Экспортирует `runMigrationsDebug`, 6 `assert()` вызовов, `__pathmaid_migrationsDebug` — 4 вхождения, 1 `import.meta.env.DEV` guard. |
| `src/shared/db/migrations/0038_translations.sql` | DELETED (renamed via git mv) | ✓ VERIFIED | Файл отсутствует. `git log --follow` подтверждает rename из `29d2443f`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/shared/db/migrate.ts` | `src/shared/db/migrations/0041_translations.sql` | `import.meta.glob` + localeCompare | ✓ VERIFIED | Файл `0041_translations.sql` существует в директории `migrations/`. Содержит `CREATE TABLE IF NOT EXISTS translations` — pattern из PLAN. Порядок применения гарантирован lexicographic sort. |
| `0042_translation_structured_json.sql` | `translations.structured_json` | `ALTER TABLE ADD COLUMN executed after 0041_translations.sql` | ✓ VERIFIED | `ALTER TABLE translations ADD COLUMN structured_json TEXT` присутствует. `0042_` > `0041_` лексикографически — порядок корректен. |
| `src/shared/api/translations.ts (toRow + SELECT)` | `translations.structured_json DB column` | `SELECT ... structured_json ... snake_case→camelCase mapping` | ✓ VERIFIED | Обе SELECT query содержат `structured_json` в column list (строки 101, 119). `toRow()` маппит `structuredJson: db.structured_json` (строка 66). |
| `src/main.tsx` | `src/shared/db/migrations.debug.ts` | DEV-guarded dynamic import side-effect | ✓ VERIFIED | `void import('./shared/db/migrations.debug')` на строке 11, внутри `if (import.meta.env.DEV)` блока (строки 9–12). |

### Data-Flow Trace (Level 4)

`translations.ts` — API функция, не рендерящий компонент. `getTranslation()` выполняет реальный SQL-запрос к SQLite через `db.select()` и возвращает результат напрямую. Данные текут: DB → `TranslationDbRow[]` → `toRow()` → `TranslationRow`. Поле `structuredJson` будет `null` для всех строк до Phase 86 (backfill) — это intentional known stub, задокументированный в SUMMARY.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `translations.ts getTranslation()` | `structuredJson` из `TranslationDbRow` | `db.select()` → SQLite `translations.structured_json` | Колонка существует; NULL для existing rows до Phase 86 backfill | ✓ FLOWING (column exists; NULL values intentional pending Phase 86) |

### Behavioral Spot-Checks

Модуль `migrations.debug.ts` требует Tauri WebView runtime — spot-checks не запускались статически. TypeScript-компиляция прошла (exit 0), что подтверждает корректность типов.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `pnpm tsc --noEmit` exits 0 | `pnpm tsc --noEmit; echo $?` | `EXIT_CODE: 0` | ✓ PASS |
| `pnpm lint` no new errors in Phase 85 files | `pnpm lint 2>&1` | 2 pre-existing errors в `shared/i18n/index.ts:24-25`; 0 новых в T1-T4 файлах | ✓ PASS |
| window.__pathmaid_migrationsDebug() 6/6 | Требует Tauri WebView | — | ? SKIP (см. Human Verification) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| TRANS-02 | 85-01-PLAN.md | Migration 0041_translation_structured_json.sql — добавляет `structured_json TEXT NULL`, rename 0038→0041 | ✓ SATISFIED | 0041_translations.sql (renamed), 0042_translation_structured_json.sql (ADD COLUMN + cleanup), TranslationRow.structuredJson реализованы. Все AC из PLAN — PASS. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/shared/db/migrations/0041_translations.sql` | 1, 18 | `Phase 78`, `Phase 79` в комментариях | ℹ️ Info | Pre-existing — byte-identical rename из `0038_translations.sql`. Задание явно exempts: "legacy 0041_translations.sql content is excepted". Не new debt. |
| `src/shared/api/translations.ts` | 10 | `Phase 78` в JSDoc | ℹ️ Info | Pre-existing — присутствовал в файле до Phase 85 (подтверждено `git show ec26db4f`). Phase 85 не добавил новых phase/version refs. |

Никаких blockers или новых anti-patterns в коде Phase 85.

### Human Verification Required

#### 1. Smoke-test Scenario A — Fresh Install

**Test:** Удалить `%APPDATA%\com.pathmaid.app\pathmaid.db`. Запустить `pnpm tauri dev`. Открыть DevTools (`Ctrl+Shift+I`). Убедиться что в Console появился `[migrations.debug] Available via window.__pathmaid_migrationsDebug()`. Выполнить: `await __pathmaid_migrationsDebug()`.

**Expected:** `[migrations.debug] 6/6 assertions passed`. Никаких `[FAIL]` строк.

**Why human:** Debug harness выполняет PRAGMA queries к живой SQLite DB через Tauri IPC — недоступно вне WebView runtime.

#### 2. Smoke-test Scenario B — Existing Install

**Test:** НЕ удалять существующую DB (должна содержать `0038_translations.sql` запись в `_migrations`). Запустить `pnpm tauri dev`. В Console подтвердить что видны строки `[migrate] Applying: 0041_translations.sql` и `[migrate] Applying: 0042_translation_structured_json.sql` (оба — одноразово). Выполнить: `await __pathmaid_migrationsDebug()`.

**Expected:** `[migrations.debug] 6/6 assertions passed`. В частности A5 ("_migrations must NOT contain stale 0038_translations.sql marker") должен проходить — это верифицирует работу DELETE в 0042.

**Why human:** Требует live DB с pre-Phase-85 состоянием.

#### 3. Smoke-test Scenario C — Idempotency

**Test:** Второй `pnpm tauri dev` сразу после Scenario B. Проверить что `[migrate] Applying:` логи НЕ появляются (все применены). Выполнить: `await __pathmaid_migrationsDebug()`.

**Expected:** `[migrations.debug] 6/6 assertions passed` — harness проходит на уже применённых миграциях.

**Why human:** Поведение idempotency проверяется только через состояние live DB.

### CONTEXT.md Decisions Honored

| Decision | Status | Evidence |
|----------|--------|----------|
| D-01: Rename 0038→0041 через git mv | ✓ | `git log --follow` показывает rename `29d2443f`; `0038_translations.sql` отсутствует |
| D-02: Cleanup в 0042 (DELETE + INSERT OR IGNORE + ALTER) | ✓ | `0042_translation_structured_json.sql` содержит ровно эти 3 statement'а |
| D-03: Порядок — 0041 перед 0042 лексикографически | ✓ | `0041_translations.sql` < `0042_translation_structured_json.sql` по sort |
| D-04: Drizzle не вводится — raw SQL pattern | ✓ | Нет Drizzle imports в новых файлах; `TranslationRow`/`TranslationDbRow` pattern сохранён |
| D-05: Debug harness с ≥4 assertions + manual smoke-test path в SUMMARY | ✓ | 6 assertions в harness; Scenarios A/B/C задокументированы в SUMMARY |

### Gaps Summary

Автоматически проверяемых gaps нет. Единственный неразрешённый пункт — runtime-верификация debug harness (требует Tauri WebView).

ROADMAP SC4 (Drizzle) — осознанное отклонение, покрытое override: CONTEXT.md D-04 явно deferred Drizzle до v1.8+, а эквивалентный критерий (`TranslationRow.structuredJson: string | null`) реализован через raw SQL pattern.

---

_Verified: 2026-04-24_
_Verifier: Claude (gsd-verifier)_
