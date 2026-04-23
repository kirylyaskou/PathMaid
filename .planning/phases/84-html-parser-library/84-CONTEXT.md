# Phase 84: HTML Parser Library — Context

**Gathered:** 2026-04-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Pure TypeScript модуль `parseMonsterRuHtml(textEn, rusText)` → `MonsterStructuredLoc | null`, извлекающий структурированный перевод из пары EN+RU HTML stat blocks в `pf2e-content/monster.json`. Zero new deps, native `DOMParser`, graceful degradation на malformed HTML.

**Scope:** только парсер + типы. Integration с DB / loader / hook — последующие фазы (85-87).

</domain>

<decisions>
## Implementation Decisions

### Data Shape (D-01 to D-04)

- **D-01:** Minimum viable scope — парсим только поля, которые Phase 88 рендерит в `CreatureStatBlock`. Не пытаемся покрыть full PF2e stat block taxonomy сразу; type расширяется через union или optional fields когда нужно.
- **D-02:** Type signature для v1.7.0:
  ```ts
  interface MonsterStructuredLoc {
    abilitiesLoc: AbilityLoc[]
    skillsLoc: SkillLoc[]
    speedsLoc: SpeedsLoc
    savesLoc: SavesLoc       // labels only: "Стойкость" / "Реакция" / "Воля"
    acLoc: { label: string } // "КБ"
    hpLoc: { label: string } // "ПЗ"
    weaknessesLoc: string[]
    resistancesLoc: string[]
    immunitiesLoc: string[]
    perceptionLoc: { label: string; senses: string }
    languagesLoc: string[]
    strikesLoc: StrikeLoc[]
    spellcastingLoc: { headingLabel: string }
  }
  interface AbilityLoc { name: string; description: string; actionCount: 1 | 2 | 3 | null; traits: string[] }
  interface SkillLoc   { name: string; bonus: number }   // bonus для lookup, не для render
  interface StrikeLoc  { name: string; damageType: string } // bonus/damage остаются engine-computed
  ```
- **D-03:** Numeric values (bonus +16, damage 2d8+8, DC 26, HP 100, AC 23) — НЕ парсим. Engine ими владеет, они interactive/clickable. RU overlay касается только текстовых меток и названий.
- **D-04:** `null` для whole result когда DOMParser бросает или `rus_text` отсутствует. Partial-parse (некоторые поля = null внутри объекта) допустим для отдельных секций.

### Matching Strategy (D-05)

- **D-05:** Name-match first, index fallback для abilities / skills / speeds.
  - **Abilities:** normalize bolded-title (lowercase, collapse whitespace, strip action markers) → lookup table RU↔EN. Если RU ability не найден по имени — fallback на i-й по порядку. Если counts mismatch и index тоже не даёт однозначного матча → ability без overlay (EN fallback).
  - **Skills:** RU name (Акробатика) mapped к EN canonical name (Acrobatics) через hardcoded dictionary в `parse-monster.ts` (17 pf2e skills).
  - **Speeds:** RU key phrases (`Скорость`, `полёт`, `лазание`, `рытьё`, `плавание`) → engine speed types (land/fly/climb/burrow/swim).

### Testing Discipline (D-06)

- **D-06:** Debug script вместо unit test framework. `parse-monster.debug.ts` рядом с `parse-monster.ts`, запускается через `pnpm tsx src/shared/i18n/pf2e-content/lib/parse-monster.debug.ts`. Fixtures — Succubus + 5 other monsters из `monster.json`. Использует `console.assert`. Zero new deps. Не executed в CI. Glob `*.debug.ts` добавить в ESLint ignore если жалуется.

### Inline Markup Handling (D-07, D-08)

- **D-07:** Markdown-lite формат в parser output. Conversions:
  - `<b>X</b>` → `**X**`
  - `<i>X</i>` → `*X*`
  - `<br>` → `\n`
  - `[one-action]` → extracted в `AbilityLoc.actionCount=1`, удалено из description
  - `[two-actions]` → `actionCount=2`
  - `[three-actions]` → `actionCount=3`
  - `<hr>` → разделитель блоков (не в description)
  - `<span class="in-box-ability">` — контейнер ability block; его content проходит conversions
  - Unknown HTML tags → stripped (текст сохраняется)
- **D-08:** Renderer для markdown-lite — НЕ Phase 84 scope. Parser выдаёт строки с markdown-lite; Phase 88 добавит `shared/lib/render-markdown-lite.tsx` (~15 lines regex→React fragments). Zero deps, no SafeHtml required.

### Claude's Discretion

- Внутренняя структура `parse-monster.ts` (helper functions, section splitters) — builder decides.
- Regex patterns для section boundaries — builder tunes на fixtures.
- Unit-level naming в debug script — builder decides.
- Exact list of 5 additional fixture monsters помимо Succubus — builder picks repr sample (prepared caster, spontaneous caster, non-caster, multi-strike, no-spellcasting).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Source

- `.planning/ROADMAP.md` §Phase 84 — phase goal + success criteria + file list
- `.planning/REQUIREMENTS.md` §TRANS-01 — requirement spec

### Data Source

- `src/shared/i18n/pf2e-content/monster.json` — fixture source, 10 entries inc. Succubus
- `src/shared/i18n/pf2e-content/index.ts` — existing loader (Phase 86 extends this)
- `src/shared/db/migrations/0038_translations.sql` (soon-to-be-renamed `0041_translations.sql`) — schema для translations table; column naming convention для структурированного JSON

### Type References

- `src/entities/creature/model/types.ts` (or similar) — engine Creature type; fields RU overlay targets (abilities/skills/speeds/saves/hp/ac/weaknesses/resistances/immunities)
- `src/entities/spell-effect/model/types.ts` — не релевантно Phase 84, but carryover pattern

### Convention

- `CLAUDE.md` §React 19 Conventions — no IIFE, derived state через useMemo (применяется к downstream Phase 88, не Phase 84)
- `CLAUDE.md` §Code Graph Usage — MCP graph tools первичны при navigation

### Archived Milestones

- `.planning/milestones/v1.6.0-MILESTONE-AUDIT.md` — source of `use-spellcasting.ts` tech debt (Phase 89) и migration 0038 collision (Phase 85)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/shared/api/translations.ts`** — уже имеет `TranslationRow` type с `textLoc: string`. Phase 87 добавит `structured: MonsterStructuredLoc | null` в этот интерфейс.
- **`src/shared/i18n/use-content-translation.ts`** — hook-адаптер, already typed. Phase 87 surface'ит structured через existing return shape.
- **`pf2e-content/monster.json` schema** — `{ name, rus_name, traits, rus_traits, text, rus_text, level }` — pair-parse input для parseMonsterRuHtml.

### Established Patterns

- **Pure module под `shared/*/lib/`** — precedent: `entities/spell-effect/lib/merge-resistances.ts`, `entities/creature/lib/` — pure functions, no React, typed, co-located with domain. Parser следует этому.
- **Barrel exports через `index.ts`** — `src/shared/i18n/pf2e-content/lib/index.ts` re-exports `parseMonsterRuHtml` + types.
- **No test files** — parser исключение через debug script convention.

### Integration Points

- **Downstream (Phase 86):** `pf2e-content/index.ts` loader вызывает parser при seed'e translations.
- **Downstream (Phase 87):** `shared/api/translations.ts` `JSON.parse(row.structured_json)` → typed `MonsterStructuredLoc`. Parser output shape = DB JSON shape.
- **Downstream (Phase 88):** `CreatureStatBlock.tsx` reads `translation.structured.abilitiesLoc[i]`, etc.

</code_context>

<specifics>
## Specific Ideas

- **Fixture set для debug script:** Succubus (prepared caster with focus spells), + 5 других из monster.json (hand-picked для coverage: spontaneous caster, innate-only, no-spellcasting, multi-strike with ranged, short-description no-abilities). Точный подбор — builder picks when file sees all entries.
- **DOMParser quirks:** `DOMParser.parseFromString(html, 'text/html')` wrappit в `<html><body>…</body></html>`. Parser читает `document.body.childNodes`.
- **Whitespace normalization:** `rus_text` из pf2.ru содержит `\n`, `\t`, multiple spaces — parser normalizes через `text.replace(/\s+/g, ' ').trim()` перед matching.

</specifics>

<deferred>
## Deferred Ideas

- **Parser для spell/item/feat/action structured RU** — scope-creep для v1.7.0; TRANS-01 ограничен monster-only. Future milestone решение data-driven после shipping v1.7.0.
- **SafeHtml component** — изначально планировался в Phase 79 RU-branch, но с D-07 (markdown-lite) не нужен. Если future milestone будет рендерить raw HTML — вернуться к этой идее.
- **LLM-powered translation at sync-time** — explicitly out of scope REQUIREMENTS.md.
- **CI integration для debug script** — не в v1.7.0; debug runs on builder discretion.

</deferred>

---

*Phase: 84-html-parser-library*
*Context gathered: 2026-04-24*
