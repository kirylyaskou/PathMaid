# PathMaid v1.7.0 — Requirements: Monster Translation

**Milestone goal:** Отрендерить полный RU-перевод stat block монстров в существующем `CreatureStatBlock` через load-time HTML→structured парсинг. Runtime остаётся structured — никакого HTML-парсинга в UI.

**Definition of done:** Суккуб (и прочие монстры с переводом из `pf2e-content/monster.json`) отображается в Bestiary / Combat / Builder с RU текстом в ability cards / skills / saves / speeds / strikes — при сохранении кликабельных roll'ов, MAP, spellcasting editor и engine-powered overlays. Без перевода — английский fallback without regression.

---

## v1.7.0 Requirements

### Translation (`TRANS-*`)

- [x] **TRANS-01**: Parser `parseMonsterRuHtml(text, rus_text)` извлекает структурированный RU объект из HTML пары
  - Возвращает: `{abilitiesLoc[], skillsLoc[], speedsLoc, savesLoc, strikesLoc[], spellcastingLoc, perceptionLoc, languagesLoc, hpLoc, acLoc, weaknessesLoc, resistancesLoc, abilityScoresLoc} | null`
  - Pair-parse EN+RU для matching по index (порядок `<span class="in-box-ability">` совпадает)
  - Pure TS module в `shared/i18n/pf2e-content/lib/parse-monster.ts`, native `DOMParser`, zero new deps
  - Unit-covered на Succubus + 5 other monsters (из `monster.json`) — 100% parse success, no throws на unknown markup
  - Graceful degradation: malformed HTML → `null` (вызывающий код фолбэкится на EN)

- [x] **TRANS-02**: Migration `0041_translation_structured_json.sql`
  - Добавляет column `structured_json TEXT NULL` на `translations` table
  - **Renames** `0038_translations.sql` → `0041_translations.sql` (resolves migration 0038 prefix collision с Phase 79's `0038_spell_overrides_heightened.sql` — tech debt из v1.6.0 audit)
  - Fresh-install seed: loader populates `structured_json` для всех monster rows
  - Existing installs: structured_json starts NULL, получает populate на ближайшем seed-refresh

- [x] **TRANS-03**: Bundled loader (`shared/i18n/pf2e-content/index.ts`) вызывает `parseMonsterRuHtml` при seed'e translations table
  - Parser ошибки логируются через `console.warn`, не ломают loader
  - `structured_json` = JSON.stringify результата parser'a; NULL если parser вернул null
  - Loader idempotent: повторный seed перезаписывает `structured_json` (текущая логика uses `INSERT OR REPLACE`)

- [x] **TRANS-04**: `useContentTranslation` возвращает typed `structured` поле
  - Type: `structured: MonsterStructuredLoc | null` (union types для future spell/item structured support)
  - API layer (`shared/api/translations.ts`) парсит `structured_json` → typed object на read path
  - Backward compat: существующие consumers (FeatInlineCard, ItemReferenceDrawer, etc.) продолжают использовать только `nameLoc` — не затрагиваются

- [x] **TRANS-05**: `CreatureStatBlock` читает structured RU перевод с fallback на EN
  - Ability cards: `abilitiesLoc[i].description` overrides `ability.description`; `abilitiesLoc[i].name` overrides `ability.name`; action icon (`[one-action]` / `[two-actions]` / `[three-actions]`) парсится и ложится на actionCount
  - Skills row: `skillsLoc.find(s => matchSkillName(s, skill)).name` overrides `skill.name`; bonus остаётся engine-computed
  - Saves / AC / HP / Weaknesses / Resistances: бейджи используют RU лейблы (`Стойкость` / `Реакция` / `Воля` / `КБ` / `ПЗ` / `Уязвимости` / `Сопротивления`) из structured; цифры остаются engine
  - Speeds: `speedsLoc.land` / `fly` / etc. — RU-названия типов скоростей в строке; цифры engine
  - Strikes: strike name RU (`когти` vs `claw`), damage type RU (`режущий` vs `slashing`); bonus / damage / traits kept engine-computed
  - Spellcasting block: spell names RU если translation для spell существует (через existing `useContentTranslation('spell', …)` — уже работает); block heading RU (`Врождённые сакральные заклинания`)
  - Fallback: любой отсутствующий structured-field → EN без warnings
  - Existing `nameLoc`/`traitsLoc` overlay сохраняется — теперь идёт поверх structured; нет регрессий на монстров без structured RU (старая RU-branch data)

### Tech Debt Carryover (`DEBT-*`)

- [ ] **DEBT-01**: `src/features/spellcasting/model/use-spellcasting.ts` <100 строк
  - Carryover из v1.6.0 audit (Phase 80 goal was <100, landed 119)
  - Выделить `resolveCastMode` в отдельный pure helper в `features/spellcasting/lib/`; progress computation в sub-hook
  - Zero user-visible regressions — все existing v1.6.0 спеллкастинг сценарии проходят

- [ ] **DEBT-02**: Per-phase `SUMMARY.md` / `VERIFICATION.md` / `UAT.md` артефакты для каждой фазы v1.7.0
  - Carryover из v1.6.0 audit (inline plans blocked retroactive audit)
  - Template comes from GSD workflow; пишется в конце каждой phase's execute-phase
  - UAT goal: ловить description-rendering regressions (как hotfixes после Phase 79/81) до version bump

---

## Future Requirements (deferred to v1.8+)

- Integration regression tests для FSD-миграций (Phase 82 hotfix 706ffed6 был бы пойман)
- Spell/item/feat/action structured RU overlay — оценить after v1.7.0 ships, data-driven
- macOS notarization + full in-app updater (Apple Developer ID required)
- Android build разморозка (conditional on demand)

---

## Out of Scope (explicit exclusions)

- **LLM-powered translation at sync-time** — v1.7.0 uses only pre-translated bundled data из pf2e-content. No runtime API calls to Claude/Gemini/etc.
- **Crowd-sourced translation editor** — write path остаётся read-only bundled JSON
- **Translation UX toggle per creature** — language switch глобальный через Settings (already shipped)
- **Parser reuse для spell/item/feat/action** — architecture supports it, но реализация out of scope; phase-scoped для `parseMonsterRuHtml` only
- **FSD move `shared/i18n/pf2e-content/` → `features/translations/`** — FSD-корректно, но scope-creep; обсуждается в v1.8+

---

## Traceability

_Roadmapper fills this section after ROADMAP.md creation._

| REQ-ID | Phase | Status |
|--------|-------|--------|
| TRANS-01 | Phase 84 | Not started |
| TRANS-02 | Phase 85 | Not started |
| TRANS-03 | Phase 86 | Not started |
| TRANS-04 | Phase 87 | Not started |
| TRANS-05 | Phase 88 | Not started |
| DEBT-01  | Phase 89 | Not started |
| DEBT-02  | all phases | Not started (process-level) |

---

_Created: 2026-04-24 — v1.7.0 kickoff_
