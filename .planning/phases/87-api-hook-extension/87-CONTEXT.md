# Phase 87: API + Hook Extension — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning (express path)

<domain>
## Phase Boundary

`shared/api/translations.ts` парсит `structured_json` TEXT column в typed `structured: MonsterStructuredLoc | null` на read-path. `useContentTranslation` hook возвращает этот typed field без парсинга в рантайме. Barrel `@/shared/i18n` re-exports types. Consumers получают готовую структуру; UI rendering — Phase 88.

**Scope:** API layer + hook surface + barrel re-exports. НЕ Phase 87: UI consumption (Phase 88), добавление новых extractors в парсер, изменение schema.

</domain>

<decisions>
## Implementation Decisions

### Parse Location (D-01)

- **D-01:** `JSON.parse(row.structured_json)` происходит в `toRow()` в `shared/api/translations.ts`. Hook (`use-content-translation.ts`) остаётся dumb pass-through — просто возвращает `TranslationRow` с уже-parsed `structured` полем. Причина: один read-point, один JSON.parse на row; consumers не дублируют логику.

### Field Shape (D-02)

- **D-02:** `TranslationRow` получает ДВА поля:
  - `structuredJson: string | null` — raw string из Phase 85 ОСТАЁТСЯ (escape hatch для debug / future use-cases)
  - `structured: MonsterStructuredLoc | null` — parsed typed object (public API)

  Стоимость — один лишний field в interface; польза — debug visibility, нулевой breaking change для edge-case consumers.

### Error Discipline (D-03)

- **D-03:** `toRow()` JSON.parse контракт:
  - `structured_json === null` → `structured = null`, no warn.
  - JSON.parse throws → `console.warn('[translations] structured JSON parse failed for kind=X name=Y:', err)` → `structured = null`. Caller продолжает получать остальные поля row (nameLoc, textLoc, etc.).
  - Success → `structured = parsed`.
  - НЕ делать shape validation сейчас (any JSON is accepted). Validation может быть добавлена в future если появятся множественные producers. Текущий producer — один Phase 86 loader, trusted.

### Type Imports + Barrel Exports (D-04)

- **D-04:**
  - `shared/api/translations.ts` импортирует `MonsterStructuredLoc` из `@/shared/i18n/pf2e-content/lib` (barrel).
  - `shared/i18n/index.ts` re-exports `MonsterStructuredLoc`, `AbilityLoc`, `SkillLoc`, `SpeedsLoc`, `SavesLoc`, `StrikeLoc`, `AbilityScoresLoc` (все public types из Phase 84 + 84-02 gap-closure).
  - Satisfies ROADMAP SC5.

### Hook Behavior (D-05)

- **D-05:** `useContentTranslation` не требует изменений в логике — он уже возвращает `TranslationRow`. После Phase 87 tests `TranslationRow` включает `structured` поле → hook автоматически surfaces. Единственный возможный touch — обновить JSDoc и обновить `UseContentTranslationResult` interface если он явно реэкспортирует TranslationRow. Short-circuit `locale === 'en'` preserved (SC3).

### Verification (D-06)

- **D-06:** Расширить `src/shared/db/migrations.debug.ts` новой assertion A8: после `loadContentTranslations()` выполнить `getTranslation('monster', 'Succubus', 6, 'ru')` → убедиться что `row?.structured !== null && row?.structured?.abilitiesLoc?.length > 0`. Проверяет end-to-end read-path: structured_json → JSON.parse → typed object → hook-ready shape. Увеличить итоговый счётчик в log до 8/8.

### Claude's Discretion

- Точная формулировка warn message (с X/Y placeholders)
- Сохранять ли parse result в memoized way (не нужно — parser запускается раз per row lookup, cheap)

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` §Phase 87 — SC1-5
- `.planning/REQUIREMENTS.md` §TRANS-04
- `.planning/phases/84-html-parser-library/84-CONTEXT.md` — D-01/D-02 type shape (14 fields per D-09)
- `.planning/phases/85-migration-db-schema/85-CONTEXT.md` — D-04 (raw SQL pattern)
- `.planning/phases/86-bundled-loader-integration/86-CONTEXT.md` — D-02 (write-path error discipline — mirror for read-path)
- `src/shared/api/translations.ts` — TranslationRow / TranslationDbRow / toRow (extend)
- `src/shared/i18n/use-content-translation.ts` — hook (touch JSDoc only)
- `src/shared/i18n/index.ts` — barrel (add type re-exports)
- `src/shared/i18n/pf2e-content/lib/index.ts` — types source barrel
- `src/shared/db/migrations.debug.ts` — extend with A8

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`TranslationRow` + `TranslationDbRow` + `toRow()` pattern** — from Phase 85. Phase 87 extends same pattern: add `structured` field в TranslationRow, add JSON.parse в toRow.
- **`MonsterStructuredLoc` barrel export** — from Phase 84 + 84-02 gap closure. Phase 87 consumes via import.
- **`useContentTranslation` hook** — dumb pass-through; не требует обновлений кроме JSDoc.

### Existing Consumers (backward-compat guarantee — SC4)

- `src/entities/creature/ui/CreatureCard.tsx` — читает `translation.data.nameLoc` — не затрагивается.
- `src/entities/creature/ui/CreatureStatBlock.tsx` — Phase 88 будет читать `translation.structured.*` (будущее).
- `src/entities/feat/ui/FeatInlineCard.tsx`, `src/entities/item/ui/ItemReferenceDrawer.tsx`, `src/entities/spell/ui/SpellReferenceDrawer.tsx` — читают `nameLoc`/`textLoc`; monster-kind structured не релевантен; zero regression.

### Integration Points

- Phase 88 (downstream): `CreatureStatBlock.tsx` reads `translation.structured?.abilitiesLoc[i]`, `.skillsLoc`, etc. Phase 87 gives them typed access.

</code_context>

<deferred>
## Deferred Ideas

- **Shape validation для structured_json** (zod/io-ts) — сейчас trusted single producer; validation добавится если появятся multiple producers (remote CDN, crowd-sourced edits).
- **Memoization JSON.parse** — parser уже быстрый, кэш не нужен; add if profiling shows hot path.
- **Структурированные переводы для spell/item/feat/action** — v1.7.0 scope monster-only; remove from deferred когда fixture expansion triggered (Phase 84 D-10 path).

</deferred>

---

*Phase: 87-api-hook-extension*
*Context gathered: 2026-04-24 via express path*
