# Phase 88: CreatureStatBlock Overlay Wiring — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning (express path — user pipeline)

<domain>
## Phase Boundary

`CreatureStatBlock` + 5 существующих sub-components (`CreatureAbilitiesSection`, `CreatureSkillsLine`, `CreatureSpeedLine`, `CreatureStrikesSection`, `CreatureDefensesBlock`) читают `translation.structured?.*` (Phase 87) и выводят RU labels/names/descriptions когда structured существует. Новый helper `shared/lib/render-markdown-lite.tsx` рендерит markdown-lite description из `abilitiesLoc[i].description` как React fragments (без dangerouslySetInnerHTML).

**Scope:** overlay layer поверх engine-computed значений. НЕ Phase 88: новые sub-components (существующие 5 достаточны), модификация engine, новые extractors в парсере, i18n framework changes.

</domain>

<decisions>
## Implementation Decisions

### Data Flow (D-01)

- **D-01:** Prop drilling из `CreatureStatBlock.tsx`. Parent получает `translation` через `useContentTranslation` (уже есть), передаёт под-компонентам их slice:
  - `CreatureAbilitiesSection`: prop `abilitiesLoc?: AbilityLoc[]`
  - `CreatureSkillsLine`: prop `skillsLoc?: SkillLoc[]`
  - `CreatureSpeedLine`: prop `speedsLoc?: SpeedsLoc`
  - `CreatureStrikesSection`: prop `strikesLoc?: StrikeLoc[]`
  - `CreatureDefensesBlock`: prop `defensesLoc?: { acLoc, hpLoc, savesLoc, weaknessesLoc, resistancesLoc, immunitiesLoc, perceptionLoc, languagesLoc, abilityScoresLoc }` (композит для удобства)

  Причина: явный data flow, no context overhead, легко отслеживать откуда идёт RU.

### Matching Strategies (D-02)

- **D-02:** Абилки матчатся по индексу (D-05 Phase 84): `abilitiesLoc[i]` overrides ability[i]. Если `abilitiesLoc.length < abilities.length` — остальные abilities EN. Если `abilitiesLoc[i]` undefined — EN для того индекса. Skills матчатся по `engineKey`: `skillsLoc.find(s => s.engineKey === skill.name)`. Speeds — по keys (`speedsLoc.land` для engine speed type `land`, etc.). Strikes — по индексу (упрощение для v1.7.0; если появляются mismatch — fallback to EN per strike).

### Fallback Semantics (D-03)

- **D-03:** Silent fallback на всех уровнях:
  - `structured === null` или поле undefined → EN unchanged.
  - Отдельные matches не найдены (skill/ability) → EN для того элемента.
  - Парсинг markdown-lite throw → plain text fallback (stripped markers).
  - NO console.warn на missing overlay (noisy; legitimate behavior для creatures без RU).

### Markdown-lite Renderer (D-04)

- **D-04:** Новый `src/shared/lib/render-markdown-lite.tsx` (≤35 строк включая JSDoc). Обрабатывает:
  - `**X**` → `<strong>X</strong>`
  - `*X*` → `<em>X</em>`
  - `\n` → `<br />`
  - `---` (horizontal rule marker из парсера) → visual separator (маленький `<hr>` или пустая строка)
  - Unknown patterns — сохранить как plain text (не выкидывать text).

  Contract: `renderMarkdownLite(text: string): ReactNode[]`. Без deps. Без dangerouslySetInnerHTML — используется regex-split + JSX fragments.

### Action Icons (D-05)

- **D-05:** `abilitiesLoc[i].actionCount` overrides engine-derived action count если присутствует (1/2/3). Если `actionCount === null` — fallback на engine value. Action icon rendering остаётся через existing primitives (StatItem / component-specific action icon helpers).

### Backward Compat (D-06)

- **D-06:** Legacy `nameLoc`/`traitsLoc` overlay НЕ трогаем — он продолжает работать для creatures БЕЗ structured (старые v1.5-ish translations). Phase 88 добавляет structured слой ПОВЕРХ. Порядок приоритетов:
  1. structured[field] (Phase 88 new)
  2. legacy nameLoc/traitsLoc (Phase 78-79)
  3. engine EN (baseline)

### Verification (D-07)

- **D-07:** UI-heavy phase — автоматическая верификация ограничена. Gates:
  - `pnpm tsc --noEmit` = 0
  - `pnpm lint` = 0 новых ошибок
  - `pnpm lint:arch` = 0
  - `grep` counts для новых props/imports
  - Markdown renderer — написать inline debug-smoke в `parse-monster.debug.ts` (расширение): рендер `'**bold** *italic*\nline2'` проверяется на plain-text content (assertions через ReactDOM.renderToString в debug? Или просто пропустить — достаточно ручного smoke теста).

  Ручной UAT (skippable per user fast-path): `pnpm tauri dev` → открыть Succubus → убедиться что ability cards / skills / saves / speeds / strikes / spellcasting показывают RU текст.

### Claude's Discretion

- Точные CSS classes для `<strong>`/`<em>` (могут использовать уже существующий Tailwind stack — `font-semibold`, `italic`, etc.)
- Как `<hr>` разделитель ability description рендерится (`<hr className="my-1">` или просто `\n\n`)
- Decomposition — если `CreatureDefensesBlock` props композит становится unwieldy, split в два пропа
- Variable naming для slice props

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` §Phase 88 — SC1-6
- `.planning/REQUIREMENTS.md` §TRANS-05
- `.planning/phases/84-html-parser-library/84-CONTEXT.md` — D-07/D-08 (markdown-lite contract + deferred renderer)
- `.planning/phases/87-api-hook-extension/87-CONTEXT.md` — D-02 (TranslationRow.structured shape)
- `src/shared/api/translations.ts` — source of structured data
- `src/shared/i18n/pf2e-content/lib/types.ts` — MonsterStructuredLoc + sub-types
- `src/shared/i18n/pf2e-content/lib/parse-monster.ts` — парсер (понимать markdown-lite emission pattern)
- `src/entities/creature/ui/CreatureStatBlock.tsx` — coordinator (extend)
- `src/entities/creature/ui/CreatureAbilitiesSection.tsx` — abilities renderer
- `src/entities/creature/ui/CreatureSkillsLine.tsx` — skills line
- `src/entities/creature/ui/CreatureSpeedLine.tsx` — speeds line
- `src/entities/creature/ui/CreatureStrikesSection.tsx` — strikes
- `src/entities/creature/ui/CreatureDefensesBlock.tsx` — AC/HP/saves/weaknesses/etc
- `src/shared/lib/utils.ts` — `cn` helper (может понадобиться для renderer styling)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **5 sub-components уже декомпозированы** — не создаём новых. Каждый принимает optional loc prop.
- **`translation` уже fetched в CreatureStatBlock** — Phase 87 surface `structured` через tot же hook. Parent сразу имеет доступ к `translation.structured`.
- **Tailwind `font-semibold`/`italic` classes** — markdown-lite renderer использует их.

### Established Patterns

- **`useShallow` для Zustand selectors** — обязательно (CLAUDE.md). Не релевантно для Phase 88 props, но учесть если добавляются селекторы.
- **No IIFE в JSX** — renderer должен быть pure function, не inline expression.
- **FSD: engine logic in `/engine`, components in entities/widgets** — renderer — shared lib (reusable across entities).

### Integration Points

- **Downstream нет** — Phase 88 — последняя TRANS-* фаза. Spellcasting translation уже работает через existing `useContentTranslation('spell', ...)`.

</code_context>

<deferred>
## Deferred Ideas

- **Аналогичный overlay для PC (characters)** — вне Phase 88 scope (monsters only).
- **Structured данные для spell/item/feat/action** — Phase 84 D-04 deferred (monster-only в v1.7.0).
- **Markdown-lite для inline links/tables** — текущий parser не эмитит; если понадобится — future extension рендерера.
- **Automated snapshot testing CreatureStatBlock** — No test files per CLAUDE.md; remains a manual discipline.

</deferred>

---

*Phase: 88-creaturestatblock-overlay-wiring*
*Context gathered: 2026-04-24 via express path*
