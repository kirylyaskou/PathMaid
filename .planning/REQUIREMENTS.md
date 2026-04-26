# PathMaid v1.7.1 — Requirements: pf2-locale-ru Migration

**Milestone goal:** Заменить v1.7.0 HTML-parser-based RU translation на прямой ingest из community Foundry locale module `pf2-locale-ru`. Расширить покрытие с manually-authored monster overlay до community-maintained translations покрывающих все PF2e core content (traits, skills, languages, monsters, spells, actions, conditions, equipment).

**Definition of done:**
- Весь RU текст в CreatureStatBlock + bestiary search + spell rendering приходит из `pf2-locale-ru` (никакого fabrication)
- Foundry locale module vendored под `vendor/pf2e-locale-ru/` с полной OGL 1.0a + Paizo CUP attribution в репозитории
- Монстры/spells без translation entry показывают «🚫RU» badge в верхнем правом углу stat block (no silent fallback)
- HTML parser code path (`parse-monster.ts`) удалён; bundled `monster.json`/`spell.json`/`action.json`/`feat.json`/`item.json` заменены на pack-derived data

**Architectural shift:** v1.7.0 канал «pf2.ru → HTML parse → structured_json» заменяется на «pf2-locale-ru pack JSON → adapter → structured_json». Существующая `structured_json` shape (Phase 87 column + Phase 88 sub-component contracts) сохраняется через adapter layer — UI consumers не переписываются.

---

## v1.7.1 Requirements

### Vendoring (`VENDOR-*`)

- [ ] **VENDOR-01**: Selected pf2-locale-ru content под `vendor/pf2e-locale-ru/` committed to repo
  - `pf2e/pf2e.json` — UI strings (Foundry i18n format; 17 skills + 174 languages + 6 sizes + 892 trait labels + 501 trait descriptions)
  - `pf2e/packs/mapping.json` — Babele path mapping spec
  - Bestiary packs: `pathfinder-monster-core.json`, `pathfinder-monster-core-2.json`, `pathfinder-bestiary.json`, `pathfinder-bestiary-2.json`, `pathfinder-bestiary-3.json`, `pathfinder-npc-core.json`, `npc-gallery.json`, `bestiary-ability-glossary-srd.json`, `bestiary-family-ability-glossary.json`, `bestiary-effects.json`
  - Other content packs: `spells-srd.json`, `actionspf2e.json`, `conditionitems.json`, `equipment-srd.json`, `feats-srd.json`, `feat-effects.json`, `equipment-effects.json`, `spell-effects.json`
  - Total raw size ≈ 25-30 MB (минимум-pack scope; AP-specific bestiaries deferred к v1.8+)

- [ ] **VENDOR-02**: License files под `LICENSES/`
  - `OGL-1.0a.txt` — full Open Game License v1.0a text (mandatory per OGL §10)
  - `PAIZO-COMMUNITY-USE.md` — Paizo Community Use Policy disclaimer (not endorsed; no charging)
  - `OGL-SECTION-15.md` — Section 15 COPYRIGHT NOTICE chain (Pathfinder Core Rulebook 2nd Edition + all referenced Paizo and Tome of Horrors works из pf2-locale-ru COPYRIGHT)
  - `pf2-locale-ru-CONTRIBUTORS.md` — community module attribution + source URL + version SHA at vendor time

- [ ] **VENDOR-03**: License disclosure в UI
  - Settings → About страница (новая или extension)
  - Sections: Software (PathMaid license / repo), Game Content (OGL 1.0a + Paizo CUP disclaimer), RU Translation Source (pf2-locale-ru attribution + version)
  - В footer: «This product is not published, endorsed, or specifically approved by Paizo Publishing»

- [ ] **VENDOR-04**: Vendor versioning
  - `vendor/pf2e-locale-ru/VERSION.txt` с git SHA + date + source URL
  - Bump procedure documented в README

### Ingest (`INGEST-*`)

- [ ] **INGEST-01**: Adapter pipeline pack entry → existing `structured_json` shape
  - New `src/shared/i18n/pf2e-content/ingest/pack-adapter.ts`: takes Babele pack entry, produces `MonsterStructuredLoc` matching Phase 87 contract
  - Mapping using `vendor/pf2e-locale-ru/pf2e/packs/mapping.json` paths

- [ ] **INGEST-02**: Drop HTML parser
  - `src/shared/i18n/pf2e-content/lib/parse-monster.ts` removed
  - `src/shared/i18n/pf2e-content/lib/parse-monster.debug.ts` removed
  - All 48+9 debug assertions gone (replaced with pack adapter unit checks)

- [ ] **INGEST-03**: Drop bundled JSON authoring artifacts
  - `src/shared/i18n/pf2e-content/{monster,spell,action,feat,item}.json` removed
  - `loadContentTranslations` rewritten to read pack JSONs from `vendor/pf2e-locale-ru/pf2e/packs/*.json` via `import.meta.glob` (matches existing migration pattern)

- [ ] **INGEST-04**: DB schema unchanged (`translations` table keeps `structured_json TEXT NULL` column from Phase 85)
  - Migration 0042 stays (RU FTS5 denormalization path preserved)
  - No new migration needed — only data path changes

- [ ] **INGEST-05**: Index API в `src/shared/i18n/pf2e-content/index.ts`
  - `getTraitLabel(slug: string, locale: SupportedLocale): string`
  - `getTraitDescription(slug: string, locale: SupportedLocale): string | null`
  - `getSkillLabel(en: string, locale: SupportedLocale): string`
  - `getLanguageLabel(slug: string, locale: SupportedLocale): string`
  - `getSizeLabel(slug: string, locale: SupportedLocale): string`
  - `getMonsterTranslation(name: string, level: number | null, locale: SupportedLocale): MonsterStructuredLoc | null`
  - All return EN-string fallback (or `null` for description) if no entry found — no console.warn в production

### UI Wiring (`WIRE-*`)

- [ ] **WIRE-01**: TraitPill consumes `getTraitLabel` + `getTraitDescription` (Radix Tooltip wrapper остаётся из Phase 92 attempt — но переподключается к новому API)
- [ ] **WIRE-02**: CreatureSkillsLine consumes `getSkillLabel` always-on при locale=ru
- [ ] **WIRE-03**: Languages row consumes `getLanguageLabel(token.toLowerCase(), locale)` per-token
- [ ] **WIRE-04**: Statblock structural labels (HP/AC/Fort/Ref/Will/Perception/Speed/Senses/Languages/Skills/Strikes/Abilities/Spellcasting/Damage/RecallKnowledge) — два варианта (decided in discuss-phase 93):
  - (a) сохраняем `common.json statblock.*` секцию как PathMaid-owned UI strings (fast, no rework)
  - (b) переходим на прямой `useTranslation` с pf2-locale-ru pf2e.json keys (например `PF2E.Hit Points`)
- [ ] **WIRE-05**: Creature subtitle (`${size} ${type}`) consumes `getTraitLabel` for size + type
- [ ] **WIRE-06**: RK DC line dynamic content (`{type}` + `{skills}`) consumes `getTraitLabel(type)` + `getSkillLabel(skill)` inline через useMemo

### Untranslated Detection (`UNTRANS-*`)

- [ ] **UNTRANS-01**: Detection logic — monster `name` + `level` matched через `getMonsterTranslation`; null result = untranslated
- [ ] **UNTRANS-02**: «🚫RU» badge component
  - Top-right corner CreatureStatBlock CardHeader (absolute positioned)
  - Top-right corner CreatureCard compact + full variants
  - Tooltip: «Этот монстр не переведён в pf2-locale-ru»
  - Visible ONLY at locale=ru (locale=en doesn't show)
  - Styling: small badge, red/gray with strikethrough RU letters

### Spell Content (`SPELL-*`)

- [ ] **SPELL-01**: Spell rendering reads from `vendor/pf2e-locale-ru/pf2e/packs/pf2e.spells-srd.json` pack entries
- [ ] **SPELL-02**: «Кислотная хватка» (regression reference из v1.7.0 carryover) renders с полным RU description and proper formatting (Critical Success / Success / Failure / Heightened blocks разделены)
- [ ] **SPELL-03**: Untranslated spell shows «🚫RU» badge same as monsters

### Process (`DEBT-*`)

- [ ] **DEBT-02 carryover**: Per-phase SUMMARY/VERIFICATION/UAT discipline preserved (process invariant from v1.7.0)

---

## Out of Scope (explicit)

- **pf2.ru как source** — ENTIRELY DROPPED. Никаких HTML scraping / API calls. v1.7.0 монстр overlay через HTML parser удаляется полностью (см. INGEST-02).
- **Manual translation authoring** — DROPPED. Никаких hand-authored RU strings в коде или в bundled JSON. Single source of truth = pf2-locale-ru.
- **Programmatic sync to upstream pf2-locale-ru** — vendor at point-in-time. Future "ребята договорятся" sync — v1.8+.
- **Custom creature translation** — uses Foundry document name match; if not in pack → 🚫RU badge. Никакого fabrication для custom creatures.
- **AP-specific bestiaries** не входящие в base PF2e (Abomination Vaults Bestiary, Kingmaker, etc.) — deferred к v1.8+ per scope cut в VENDOR-01.
- **PC/character sheet translation** — monsters + spells only в v1.7.1.
- **LLM/remote translation at sync-time** — out.
- **Integration regression tests для FSD migrations** — v1.6.0 carryover DEBT-02, остаётся deferred.

---

## Future Requirements (deferred to v1.8+)

- AP bestiaries coverage extension (Abomination Vaults, Kingmaker, etc.)
- Programmatic upstream sync mechanism (community module → PathMaid pull) с CI integration
- Item / equipment / feat tooltips (когда UI поверхность вырастет)
- PC/character sheet translation
- Search by RU content (FTS5 расширение поверх pf2-locale-ru pack data)
- macOS notarization + full in-app updater (Apple Developer ID required)
- Drizzle ORM migration (v1.7.0 D-04 deferred)
- Integration regression tests для FSD migrations

---

## Traceability

_Roadmapper fills this section after ROADMAP.md creation._

| REQ-ID | Phase | Status |
|--------|-------|--------|
| VENDOR-01 | Phase 90 | Not started |
| VENDOR-02 | Phase 90 | Not started |
| VENDOR-03 | Phase 90 | Not started |
| VENDOR-04 | Phase 90 | Not started |
| INGEST-01 | Phase 91 | Not started |
| INGEST-02 | Phase 91 | Not started |
| INGEST-03 | Phase 91 | Not started |
| INGEST-04 | Phase 91 | Not started |
| INGEST-05 | Phase 91 + Phase 92 | Not started |
| WIRE-01..06 | Phase 93 | Not started |
| UNTRANS-01..02 | Phase 94 | Not started |
| SPELL-01..03 | Phase 93 + Phase 94 | Not started |
| DEBT-02 | All phases | Process-level |

---

## Completed Milestones (archive reference)

- **v1.7.0** — Monster Translation (Phases 84-89, shipped 2026-04-24): TRANS-01..05 + DEBT-01 + DEBT-02 — see [`milestones/v1.7.0-ROADMAP.md`](./milestones/v1.7.0-ROADMAP.md)
- **v1.6.0** — Spellcasting Deep Fix (Phases 77-83): see archive
- **v1.5.0** — In-App Updater (Phases 71-76): see archive

---

## v1.7.1 History

- **2026-04-24:** Original v1.7.1 plan (DICT-01..05 + SPELL-REG-01) created. Phases 90-91-92 implemented. **ROLLED BACK** к старту 2026-04-25 после обнаружения false attribution в `traits.ts` / `languages.ts` JSDoc — описания были AI-generated с заявлением `Source: pf2.ru/rules/traits` без реального fetch.
- **2026-04-25:** Replanned as E1 architecture (drop pf2.ru, vendor pf2-locale-ru, drop HTML parser). New scope ниже.

_Replanned: 2026-04-25 — v1.7.1 E1 (pf2-locale-ru migration)_

---

## v1.7.2 Requirements (Translation Polish + Tech Debt)

**Milestone goal:** Закрыть блокеры релиза v1.7.1: paragraph spacing bug в spell drawer + 5 tech-debt items накопленных за phases 91-95. После этого v1.7.2 tag-able.

### Polish (`POLISH-*`)

- [ ] **POLISH-01**: SpellReferenceDrawer description renders `<p>` paragraph blocks с visible vertical separation (Crit/Success/Fail/Heightened читаемы как отдельные смысловые секции, не сплошной текст). Вероятная причина: Tailwind preflight `p { margin: 0 }` побеждает специфичность `.pf2e-safe-html p { margin: 0.5rem 0 }`. Fix через scope-up или `!important` или Tailwind layer ordering.

- [ ] **POLISH-02**: Strike + ability trait pills route through `<TraitPill>` (Phase 93 SC9 deferral closure). Файлы: `CreatureStrikeRow.tsx`, `AbilityCard.tsx`. После migration RU labels + tooltips везде, не только на header pills.

### Ingest Family (`INGEST-FAMILY-*`)

- [ ] **INGEST-FAMILY-01**: Item-shaped pack ingest для action / feat / equipment / condition packs. Extends `isItemPack` family detection. Adapter writes rows с appropriate `kind` (action/feat/item/condition).

- [ ] **INGEST-FAMILY-02**: Each consumer UI surface (action page, feat inline card, item drawer) consumes translation row через existing `useContentTranslation`. SafeHtml renders pack `description` HTML.

### Spell Structure (`SPELL-STRUCT-*`)

- [ ] **SPELL-STRUCT-01**: Structured spell overlay shape — `SpellStructuredLoc { range?, target?, duration?, time?, cost?, requirements?, heightening? }`. Extends adapter to populate `structured_json` for spell rows.

- [ ] **SPELL-STRUCT-02**: SpellReferenceDrawer reads structured fields and surfaces them in dedicated UI rows (вместо хардкода EN range/duration).

- [ ] **SPELL-STRUCT-03**: Spell-side untranslated badge slot — top-right corner SpellReferenceDrawer header. Detection: `useContentTranslation('spell', name, rank) === null && locale === 'ru'`.

### Cleanup (`CLEAN-*`)

- [ ] **CLEAN-01**: Orphan rows со старым `source='pf2.ru'` явно удаляются на boot — one-shot `DELETE FROM translations WHERE source = 'pf2.ru'` перед seed loop. Phase 95 left them inert; v1.7.2 removes them entirely для clarity.

### Process (`DEBT-*`)

- [ ] **DEBT-02 carryover**: Per-phase SUMMARY/VERIFICATION/UAT discipline preserved.


---

## v1.7.3 Requirements (Strike Names + UI Shell + Item Surface Audit)

**Milestone goal:** Закрыть остатки RU translation coverage по всему UI после ядра v1.7.1+v1.7.2. После tag — milestone готов к release.

### Strike + Spell Polish (`STRIKE-*`, `SPELL-CHIPS-*`)

- [ ] **STRIKE-01**: `entity_items` table — id-based denormalization для weapon name RU lookup. Migration adds new table; loader populates from pack `.items[]` arrays.
- [ ] **STRIKE-02**: CreatureStrikeRow renders RU strike name when entity_items has matching row для current creature + weapon id; engine EN fallback otherwise.
- [ ] **STRIKE-03**: Strike damage type labels render через TraitPill (`piercing`/`slashing`/`fire`/etc.) — currently raw inline span.
- [ ] **SPELL-CHIPS-01**: Spell traditions chips (ARCANE/PRIMAL/DIVINE/OCCULT) routed через getTraitLabel — currently hardcoded TRADITION_COLORS map English text.
- [ ] **SPELL-CHIPS-02**: Spell save type label (Reflex/Will/Fortitude) routed через dict — currently raw `capitalize(save_stat)` EN.
- [ ] **SPELL-CHIPS-03**: Spell trait pills в drawer routed через TraitPill (currently inline span).

### UI Shell + Toast (`SHELL-*`)

- [ ] **SHELL-01**: Audit `src/shared/i18n/locales/{en,ru}/common.json` для всех toast.* / settings.* / updater.* / errors.* сегментов; добавить недостающие ключи.
- [ ] **SHELL-02**: Toast notifications (sync/import success/error, updater state) routed через `useTranslation`.
- [ ] **SHELL-03**: SettingsPage — все `Data Source` / `Sync Foundry VTT Data` / `Import Local` / status messages routed через `useTranslation`.
- [ ] **SHELL-04**: Sidebar nav, header buttons (theme toggle, language switcher), splash screen labels — gap audit.
- [ ] **SHELL-05**: Modal dialogs / error overlays / confirmation prompts — translation audit.

### Action/Feat/Item Surface Audit (`AUDIT-*`)

- [ ] **AUDIT-01**: ActionsPage consumes `useContentTranslation('action', name, null)` correctly; verify entry rendering shows RU at locale=ru.
- [ ] **AUDIT-02**: FeatInlineCard consumes `useContentTranslation('feat', name, level)`; verify.
- [ ] **AUDIT-03**: ItemReferenceDrawer consumes `useContentTranslation('item', name, level)`; verify.
- [ ] **AUDIT-04**: Conditions reference UI (page or modal) consumes `useContentTranslation('condition', name, null)`; verify.
- [ ] **AUDIT-05**: Where data is seeded (Phase 100) but UI consumer not wired — wire it. Where wired but locale wrapper missing — add.

### Process (`DEBT-*`)

- [ ] **DEBT-02 carryover**: Per-phase SUMMARY/VERIFICATION discipline preserved.

