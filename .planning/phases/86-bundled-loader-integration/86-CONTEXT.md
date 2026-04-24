# Phase 86: Bundled Loader Integration — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning (express path — user chain-executed Phase 85 без отдельного discuss)

<domain>
## Phase Boundary

`src/shared/i18n/pf2e-content/index.ts` loader дёргает `parseMonsterRuHtml` (Phase 84) на monster-records при seed'e и пишет `JSON.stringify(result)` в колонку `translations.structured_json` (Phase 85). Legacy поля `name_loc` / `traits_loc` / `text_loc` работают без изменений.

**Scope:** loader extension + write-path. API enrichment (JSON.parse на read) — Phase 87. UI rendering — Phase 88.

</domain>

<decisions>
## Implementation Decisions

### Parser Invocation Strategy (D-01, D-02)

- **D-01:** Parser вызывается ВНУТРИ существующего main-loop loader'а условно по kind. Условия: `kind === 'monster'` AND `record.text` truthy AND `record.rus_text` truthy. Никакой реструктуризации loader — extend one branch.
- **D-02:** Error discipline:
  - Parser returns `null` (expected "cannot parse"): `structured_json = null`, no warn.
  - Parser throws (unexpected): `console.warn('[translations] parser failed for <name>:', err)`, `structured_json = null`. Loader продолжает работу для остальных records.
  - Parser returns object: `structured_json = JSON.stringify(result)`.
  - Non-monster kinds: parser не вызывается, `structured_json = null` по умолчанию.

### SQL Write Path (D-03)

- **D-03:** `INSERT OR REPLACE INTO translations` расширяется с 8 колонок до 9 — добавить `structured_json` в конец column list и `?` в values. Существующая `INSERT OR REPLACE` semantics (conflict по unique key → overwrite row) покрывает idempotency SC3.

### Verification Strategy (D-04)

- **D-04:** Расширить существующий `src/shared/db/migrations.debug.ts` (Phase 85) новой assertion A7: `SELECT COUNT(*) FROM translations WHERE kind='monster' AND structured_json IS NOT NULL` ≥ 1 после cold start. Не создавать отдельный loader.debug.ts — meta фокус migrations.debug ("DB schema + seed state check") покрывает обе фазы.

### Performance (D-05)

- **D-05:** Performance SC4 ("seed 100+ monsters < 500ms") — не актуален в v1.7.0 т.к. `monster.json` содержит 1 fixture (Succubus). Маркер SC4 переводится в deferred ("re-measure when fixture set expands in future milestone"). Не добавляем timing instrumentation сейчас.

### Claude's Discretion

- Exact variable naming в loader (`structuredJson`, `parsed`, `structuredResult` — builder picks)
- Whether to extract parser-call block в helper function (builder decides if inlining становится unreadable)
- Assertion wording в A7

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` §Phase 86 — success criteria 1-5
- `.planning/REQUIREMENTS.md` §TRANS-03 — loader contract
- `.planning/phases/84-html-parser-library/84-CONTEXT.md` — D-07 (markdown-lite structured JSON shape)
- `.planning/phases/85-migration-db-schema/85-CONTEXT.md` — D-04 (raw SQL pattern, no Drizzle)
- `src/shared/i18n/pf2e-content/index.ts` — loader being extended (113 lines)
- `src/shared/i18n/pf2e-content/lib/index.ts` — barrel exposing `parseMonsterRuHtml`
- `src/shared/db/migrations.debug.ts` — verification harness to extend

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Loader pattern `import.meta.glob + INSERT OR REPLACE`** — already idempotent; D-03 piggybacks on it.
- **`parseMonsterRuHtml` via `@/shared/i18n/pf2e-content/lib`** — barrel export, ready to import.
- **`migrations.debug.ts`** — window attach + DEV-guarded; extend with A7 following same pattern.

### Established Patterns

- **Per-record try/catch с console.warn** — loader уже использует warn для невалидных records (строки 72, 76, 82). D-02 следует этой конвенции.

### Integration Points

- Phase 87 (downstream) читает `structured_json` через `translations.ts` API, делает JSON.parse → `MonsterStructuredLoc`.

</code_context>

<deferred>
## Deferred Ideas

- **Performance measurement для seed'a 100+ monsters** — не актуально пока `monster.json` имеет 1 fixture. Re-visit когда fixture set расширен (будущий milestone).
- **Drizzle typed inserts для INSERT OR REPLACE** — Phase 85 D-04 deferred до v1.8+.
- **Batch-mode parser invocation для huge fixture sets** — premature optimization.

</deferred>

---

*Phase: 86-bundled-loader-integration*
*Context gathered: 2026-04-24 via express path (no discuss-phase session)*
