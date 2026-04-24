# PathMaid v1.7.1 — Requirements: UI Translation Dictionaries

**Milestone goal:** Расширить RU-покрытие `CreatureStatBlock` до всего, что не является numerical value. Dictionary-based i18n независимо от HTML parser output (который покрывает только monster-specific данные). Использовать pf2.ru/rules/player-core как canonical RU reference.

**Definition of done:** Суккуб (и прочие монстры) отображается с RU-переводом во ВСЕХ textual полях stat block — structural labels (HP/AC/Fort/Ref/Will/Perception/Speed/Senses/Languages/Skills/Strikes/Abilities/Spellcasting), skill names (все 17), language names, trait labels + tooltip descriptions, damage types. Numbers/rolls/formulas остаются как есть. Spell RU rendering восстановлен до pre-v1.7.0 baseline formatting (регрессия после Phase 87/88 исследуется и фиксится).

---

## v1.7.1 Requirements

### Dictionary Layer (`DICT-*`)

- [ ] **DICT-01**: Structural stat-block labels переведены через i18next
  - `src/shared/i18n/locales/ru/common.json` расширяется секцией `statblock.*` — HP, AC, Fort/Ref/Will, Perception, Speed, Senses, Languages, Skills, Strikes, Abilities, Spellcasting, Damage, Recall Knowledge, Offensive/Other tabs
  - `CreatureStatBlock` + 5 sub-components используют `t('statblock.*')` вместо hardcoded строк
  - Fallback: missing i18next key → EN (default i18next behavior); no console.warn в production

- [ ] **DICT-02**: 17-skill dictionary как shared module
  - Extract `SKILL_RU_TO_EN` map из `src/shared/i18n/pf2e-content/lib/parse-monster.ts` в `src/shared/i18n/pf2e-content/dictionaries/skills.ts` (single source)
  - `CreatureSkillsLine` при `locale === 'ru'` применяет RU-перевод к ВСЕМ 17 skills независимо от того, был ли match с parser'овским `skillsLoc[]`
  - Тест: монстр без structured translation (напр. Foundry-only) — skills всё равно RU
  - Parser `parse-monster.ts` переключается на импорт из new shared dict module

- [ ] **DICT-03**: PF2e languages dictionary (~25 common)
  - Новый `src/shared/i18n/pf2e-content/dictionaries/languages.ts` с парами EN→RU: common→общий, draconic→драконий, chthonian→хтонический, empyrean→эмпирейский, undercommon→подобщий, celestial→небесный, infernal→инфернальный, abyssal→абиссальный, elvish→эльфийский, dwarvish→гномий, elven/dwarven/halfling/goblin/orcish/gnollish/petran/iruxi/sakvroth/etc. — actual list sourced from pf2.ru
  - `Languages` row в `CreatureStatBlock` при `locale === 'ru'` применяет dictionary к каждому language token
  - Fallback: unknown language → original EN string (silent)

- [ ] **DICT-04**: Core traits dictionary (~60 labels + tooltip descriptions)
  - Новый `src/shared/i18n/pf2e-content/dictionaries/traits.ts` — `{ [traitId]: { label: string; description: string } }`
  - Scope ~60 core traits: rarity (common/uncommon/rare/unique), size tokens, origin (fiend/demon/celestial/undead/etc.), combat (agile/finesse/reach/thrown/versatile/etc.), damage types (slashing/piercing/bludgeoning + energy), ability traits (attack/manipulate/concentrate/move/etc.), misc (nonlethal/backup/magical/unholy/holy/etc.)
  - `TraitPill` + trait tooltip render RU labels + RU descriptions при `locale === 'ru'`
  - Source: pf2.ru/rules/traits (author-authorized partner integration reference)
  - Attribution header JSDoc в `traits.ts`: canonical RU terms sourced from pf2.ru

- [ ] **DICT-05**: Fallback discipline
  - Missing dictionary entry → silent EN fallback (no console.warn)
  - DEV-mode opt-in: helper function `__pathmaid_logMissingTranslations()` доступна через window (like Phase 84 debug pattern) — один раз дампит missing keys в Console
  - Matches Phase 88 D-03 silent-fallback rule

### Spell Regression (`SPELL-REG-*`)

- [ ] **SPELL-REG-01**: Spell RU rendering восстановлен до pre-v1.7.0 форматирования
  - Investigate: `SpellReferenceDrawer.tsx` / `SpellInlineCard.tsx` — как они используют `translation.textLoc` / `nameLoc` / `traitsLoc`
  - Compare git blame pre-v1.7.0 (commit `614172c5` v1.6.0 archive) vs current master
  - Identify regression: Phase 87 `toRow` JSON.parse изменения могли сломать spell translation path; или Phase 88 style changes
  - Fix: восстановить прежний rendering pipeline (`<SafeHtml>` / markdown-lite / whatever был) для spell description — НЕ менять API контракт (`structured` is monster-only, spells продолжают на `textLoc`)
  - Verify: screenshot "Кислотная хватка" shows full RU description with pre-regression formatting

### Out of Scope (explicit)

- **Automated sync/scrape от pf2.ru** — pf2.ru используется ТОЛЬКО как manual authoring reference для compile-time dict построения. No runtime API calls.
- **PC/character sheets translation** — только monsters в v1.7.1
- **Trait list full coverage (все 500+ PF2e traits)** — scope ~60 core; rest deferred
- **LLM/remote translation at sync-time** — remains out
- **Integration regression tests для FSD migrations** — v1.6.0 carryover DEBT-02, remains deferred

### Carryover из v1.7.0

- **DEBT-02 (process)**: per-phase SUMMARY/VERIFICATION/UAT discipline — already established in v1.7.0, continues in v1.7.1 (not a separate REQ)

---

## Future Requirements (deferred to v1.8+)

- Integration regression tests для FSD-миграций (Phase 82 hotfix 706ffed6 был бы пойман)
- Structured translation для spell/item/feat/action — evaluate after v1.7.1 dictionary foundation stabilizes
- macOS notarization + full in-app updater (Apple Developer ID required)
- Android build разморозка (conditional on demand)
- Drizzle ORM migration (v1.7.0 D-04 deferred)
- Full trait coverage (all 500+ PF2e traits) after v1.7.1 core-60 validates the pattern

---

## Traceability

_Roadmapper fills this section after ROADMAP.md creation._

| REQ-ID | Phase | Status |
|--------|-------|--------|
| DICT-01 | Phase 91 | Not started |
| DICT-02 | Phase 90 | Not started |
| DICT-03 | Phase 90 | Not started |
| DICT-04 | Phase 90 + Phase 92 | Not started |
| DICT-05 | All phases | Not started (process-level) |
| SPELL-REG-01 | Phase 93 | Not started |

---

## Completed Milestones (archive reference)

- **v1.7.0** — Monster Translation (Phases 84-89, shipped 2026-04-24): TRANS-01..05 + DEBT-01 + DEBT-02 — see [`milestones/v1.7.0-ROADMAP.md`](./milestones/v1.7.0-ROADMAP.md)
- **v1.6.0** — Spellcasting Deep Fix (Phases 77-83): see archive
- **v1.5.0** — In-App Updater (Phases 71-76): see archive

---

_Created: 2026-04-24 — v1.7.1 kickoff (UI Translation Dictionaries)_
