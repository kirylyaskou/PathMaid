---
phase: 85-migration-db-schema
reviewed: 2026-04-24T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - src/shared/db/migrations/0042_translation_structured_json.sql
  - src/shared/api/translations.ts
  - src/shared/db/migrations.debug.ts
  - src/main.tsx
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
status: clean
---

# Phase 85: Code Review Report

**Reviewed:** 2026-04-24
**Depth:** standard
**Files Reviewed:** 4
**Status:** clean (issues are Info-level only — no bugs, no security issues)

## Summary

Ревью покрывает миграционную пару (`git mv` 0038→0041 + новая 0042 с `ADD COLUMN structured_json`), расширение `TranslationRow` полем `structuredJson`, manual smoke-harness `migrations.debug.ts` и его условное подключение через `DEV`-guarded dynamic import в `main.tsx`.

Основные выводы:

- **SQL-идемпотентность корректна** для обоих сценариев (fresh install и существующая БД с применённой 0038). Последовательность `DELETE → INSERT OR IGNORE → ALTER TABLE ADD COLUMN` безопасна в обоих случаях благодаря тому, что `migrate.ts` создаёт `_migrations` до запуска миграций, а на fresh install к моменту 0042 запись `0041_translations.sql` уже вставлена лексикографически предшествующей миграцией.
- **Байт-идентичность ренейма** 0038→0041 подтверждена git'ом: коммит `29d2443f` показывает `R100` с `0 insertions(+), 0 deletions(-)`. Комментарии внутри `0041_translations.sql` (ссылки на "Phase 78") действительно устарели по правилу CLAUDE.md ("запрещены ссылки на фазы в комментариях"), но это существующий код, явно помеченный `out of scope` в плане 85-01 — не флагаю как нарушение текущего скоупа.
- **TS-интерфейс покрывает новую колонку полностью**: `TranslationRow.structuredJson`, `TranslationDbRow.structured_json`, маппинг в `toRow`, и оба SELECT-запроса (`exact` и `fuzzy`) явно включают `structured_json`. Порядок 9 колонок в SELECT совпадает с порядком 9 ключей в `TranslationDbRow` — проверено вручную.
- **Assertion-harness** консистентен с существующим `parse-monster.debug.ts` (паттерн `window.__pathmaid_*` + DEV-guarded import). 6 ассертов покрывают наличие колонки, её тип (`TEXT`), nullability (`notnull=0`), marker rename (0041 present, 0038 absent) и marker новой миграции (0042 present).
- **IPC-граница не нарушена**: `translations.ts` остаётся единственной точкой чтения таблицы `translations` через `shared/api/`. Дублирующий SELECT найден в `shared/i18n/pf2e-content/index.ts`, но это за пределами текущего phase-scope — отмечаю как `IN-03` для будущей консолидации.

Критичных и предупреждающих находок нет. Три Info-пункта ниже — наблюдения для будущих phase-ов, не требующие правок в 85-01.

## Info

### IN-01: Harness не возвращает статус провала наружу

**File:** `src/shared/db/migrations.debug.ts:35-111`
**Issue:** `runMigrationsDebug()` возвращает `Promise<void>` и использует `console.assert(false, ...)` для сигнализации провала. Если хоть один ассерт упал — вызов всё равно резолвится успешно, и вызывающий код (включая возможный будущий automated smoke-runner) не сможет отличить PASS от FAIL без скрейпинга консоли.

Текущее решение уместно для manual-only контракта ("не test-suite, manual smoke" — строка 17 комментария), но ограничивает переиспользование.

**Fix:** Если в будущем harness должен дёргаться из CI/скрипта — возвращать `Promise<{ passed: number; total: number }>` или бросать `Error` при `passed !== total`. Пример минимального изменения:

```ts
export async function runMigrationsDebug(): Promise<{ passed: number; total: number }> {
  // ...existing body...
  console.log(`[migrations.debug] ${passed}/${total} assertions passed`)
  if (passed !== total) {
    console.error(
      `[migrations.debug] FAILED: ${total - passed} assertion(s) did not pass`,
    )
  }
  return { passed, total }
}
```

Оставлять `void` — сознательный выбор для manual DevTools-use (согласовано с плановым контрактом `await __pathmaid_migrationsDebug()` с визуальным чтением логов). Не блокер.

### IN-02: `0041_translations.sql` содержит ссылки на фазу ("Phase 78") в комментарии

**File:** `src/shared/db/migrations/0041_translations.sql:1`
**Issue:** Первая строка содержит `-- Phase 78: Localization content store for pf2.ru-sourced translations.` — по правилу проектного CLAUDE.md ("Ссылки на фазы/версии/UAT в комментариях" запрещены, "история живёт в git blame").

**Fix:** Не править в рамках 85-01 — файл байт-идентичный ренейм (что является инвариантом плана; правка нарушит `R100` и запутает blame). Запланировать отдельный micro-phase "clean legacy migration comments" если понадобится привести в соответствие с code-style. Безопасно исполнять только после выхода `v1.7.0`, чтобы не менять применяемый SQL между RC-билдами.

Отмечаю как Info потому что задача явно вне scope по плану 85-01 и исторически безопасна (комментарии игнорируются `migrate.ts` через `replace(/--[^\n]*/g, '')`).

### IN-03: Дублирующий SELECT к `translations` вне `shared/api/`

**File:** `src/shared/i18n/pf2e-content/index.ts:105-107`
**Issue:** `shared/i18n/pf2e-content/index.ts` выполняет `db.select<...>('SELECT kind, locale, COUNT(*) as n FROM translations GROUP BY kind, locale')` — тот же запрос, что в `shared/api/translations.ts:143`. Это формальное размывание FSD-границы (`shared/api/` должна быть единственной точкой Tauri IPC).

Не относится к scope 85-01 (файл не менялся в diff-range), но всплыло при проверке "coverage маппинга `translations`". Фиксирую, чтобы не потерялось.

**Fix:** В будущем phase-е — импортировать `getTranslationCounts()` из `@/shared/api/translations` вместо локального запроса в `pf2e-content/index.ts`. Тривиальный рефакторинг, но вне текущего PR.

---

_Reviewed: 2026-04-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
