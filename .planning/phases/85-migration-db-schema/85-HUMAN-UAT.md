---
status: resolved
phase: 85-migration-db-schema
source: [85-VERIFICATION.md]
started: "2026-04-24T00:00:00Z"
updated: "2026-04-24T00:00:00Z"
resolved: "2026-04-24T00:00:00Z"
resolution: skipped-by-user
---

## Current Test

[awaiting human testing]

## Tests

### 1. Fresh install — migration applies cleanly
expected: Удалить локальную DB (`%APPDATA%/com.pathmaid.app/pathmaid.db`). Запустить `pnpm tauri dev`. В DevTools Console при старте должны появиться:
  - `[migrate] Applying: 0041_translations.sql`
  - `[migrate] Applying: 0042_translation_structured_json.sql`
  - `[migrations.debug] Available via window.__pathmaid_migrationsDebug()`

Затем в Console: `await __pathmaid_migrationsDebug()` → итог `[migrations.debug] 6/6 assertions passed`.
result: skipped — пользователь пропустил ручной UAT для ускорения pipeline; автоматические 6/6 must-haves + clean code review покрывают контракт. Smoke-test остаётся рекомендованным до shipping, но не блокирует Phase 85 closure.

### 2. Existing install — migration cleanup works
expected: Сохранить существующую DB (pre-Phase 85 state). Запустить `pnpm tauri dev`. Должны примениться ТОЛЬКО `0041_translations.sql` (CREATE TABLE IF NOT EXISTS = no-op) и `0042_translation_structured_json.sql` (cleanup + ADD COLUMN). После запуска `__pathmaid_migrationsDebug()` — `6/6 assertions passed`, в частности:
  - `0038_translations.sql` отсутствует в `_migrations`
  - `0041_translations.sql` присутствует в `_migrations`
  - `structured_json` column существует
result: skipped — пользователь пропустил ручной UAT для ускорения pipeline; автоматические 6/6 must-haves + clean code review покрывают контракт. Smoke-test остаётся рекомендованным до shipping, но не блокирует Phase 85 closure.

### 3. Idempotency — second launch no-op
expected: После Scenario 2 закрыть app, снова `pnpm tauri dev`. В Console НЕ должно быть ни одного `[migrate] Applying:` (все migrations уже applied). `__pathmaid_migrationsDebug()` всё ещё `6/6 assertions passed`.
result: skipped — пользователь пропустил ручной UAT для ускорения pipeline; автоматические 6/6 must-haves + clean code review покрывают контракт. Smoke-test остаётся рекомендованным до shipping, но не блокирует Phase 85 closure.

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
