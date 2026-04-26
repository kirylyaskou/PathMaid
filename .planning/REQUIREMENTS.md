# PathMaid v1.7.5 — Requirements: AP Bestiaries + Item-id RU + Special Abilities Coverage

**Milestone goal:** Закрыть translation coverage gaps по AP-specific bestiaries + special abilities + per-instance items. После v1.7.5 — все известные creature surfaces в продукте рендерятся RU когда vendor pack содержит запись; все breach'и closed для tag-able combined v1.7.x release.

**Definition of done:**
- 36 bestiary packs (включая `outlaws-of-alkenstar-bestiary`, `abomination-vaults-bestiary`, etc., + `npc-gallery`, + `battlecry-bestiary`) добавлены в vendor и автоматически ingested
- License compliance: per-AP copyright lines из upstream `pf2-locale-ru/COPYRIGHT.md` манипулированы в `LICENSES/OGL-SECTION-15.md`
- `entity_items` table расширена `description_loc` columnом — special abilities (kind=action items внутри creature `entries.<creature>.items[]`) хранят RU description
- Creature ability surfaces (AbilityCard / CreatureAbilityRow / strike rows) consume `getCreatureItem(creatureName, itemId, locale)` API с EN fallback
- Spell entries из bestiary `items[]` (kind=spell, per-monster spellcasting) маппятся на spell rows
- 🚫RU badge остаётся для homebrew/custom creatures без vendor entry — single source of truth = vendor

**Reference repros (from user-reported state 2026-04-26):**
- `"Lucky" Lanks` (outlaws-of-alkenstar-bestiary) рендерится EN с 🚫RU, несмотря на full RU entry в upstream pack (name "Счастливчик Лэнкс" + 9 items including "Shortsword" → "Короткий меч" + 2 abilities "Финт негодяя", "Внезапная атака")
- `"Abendego Brute"` (agents-of-edgewatch-bestiary) тот же баг — RU name + items + ability "Brute Strength" present in upstream

**Architectural shift:** Никакого. Code путь Phase 91 + Phase 102 + Phase 100 поддерживает новые packs **автоматически** через existing `isActorPack`/`isSpellPack` filters + glob wildcard. Основной scope = data + license + minor schema extension.

---

## v1.7.5 Requirements

### Vendor Pack Expansion (`PACK-*`)

- [ ] **PACK-01**: 36 bestiary packs скопированы из upstream `pf2-locale-ru/pf2e/packs/*-bestiary.json` + `npc-gallery.json` + `battlecry-bestiary.json` в `vendor/pf2e-locale-ru/pf2e/packs/`
- [ ] **PACK-02**: `vendor/pf2e-locale-ru/VERSION.txt` обновлён — новый upstream SHA + date + scope note ("expanded to 55 packs")
- [ ] **PACK-03**: `LICENSES/pf2-locale-ru-CONTRIBUTORS.md` обновлён — version SHA + scope note
- [ ] **PACK-04**: `LICENSES/OGL-SECTION-15.md` манипулировано — per-AP copyright lines добавлены из upstream `pf2-locale-ru/COPYRIGHT.md` для каждого добавленного pack (Outlaws of Alkenstar, Abomination Vaults, Agents of Edgewatch, Age of Ashes, Blood Lords, Kingmaker, Gatewalkers, Extinction Curse, Fists of the Ruby Phoenix, Quest for the Frozen Flame, Strength of Thousands, Howl of the Wild, Rage of Elements, Battlecry, etc.)

### Cold-Boot Performance (`PERF-*`)

- [ ] **PERF-01**: Baseline cold-boot seed time замерен (current 19 packs)
- [ ] **PERF-02**: Post-add cold-boot seed time замерен; rost ≤ +50% (vendor вырастет с 35MB до ~60MB; 55 packs vs 19)
- [ ] **PERF-03**: Если PERF-02 > +50% — chunked seed timeslicing introduced (микро-таски через `requestIdleCallback` / `queueMicrotask` chunks между packs); UI splash остаётся responsive

### Spell Coverage Extension (`SPELL-AP-*`)

- [ ] **SPELL-AP-01**: Bestiary pack `entries.<creature>.items[]` элементы с `kind=spell` (`type === 'spell'` в Foundry semantics, identifiable via `items[].rules` или другой эвристикой) маппятся на spell rows в translations table
- [ ] **SPELL-AP-02**: Spell lookup chain: `spells-srd[name]` → bestiary per-creature spells → engine EN fallback. Untranslated spell detection works для AP-only spells.
- [ ] **SPELL-AP-03**: Reference repro: AP-specific spells из bestiary creatures (например, любой unique spellcaster из outlaws-of-alkenstar) рендерятся RU в SpellReferenceDrawer когда vendor entry существует

### Item-ID RU Coverage Extension (`ITEM-ID-*`)

- [ ] **ITEM-ID-01**: Migration `0045_entity_items_description.sql` — `ALTER TABLE entity_items ADD COLUMN description_loc TEXT NULL`
- [ ] **ITEM-ID-02**: `entity_items` loader (Phase 102 code path) populates `description_loc` для каждого item в creature `entries.<creature>.items[]` где description присутствует (special abilities mostly — weapons обычно без description override)
- [ ] **ITEM-ID-03**: `getCreatureItem(creatureName: string, itemId: string, locale: SupportedLocale): { name: string; description: string | null } | null` API в `src/shared/api/translations.ts` (расширение existing `getEntityItemName`)

### Ability Surface Wiring (`ABIL-*`)

- [ ] **ABIL-01**: AbilityCard component reads description через `getCreatureItem` lookup chain (когда есть creature context); falls back к existing actionspf2e dictionary lookup; falls back к engine EN
- [ ] **ABIL-02**: CreatureAbilityRow consumes RU name + RU description одновременно (single query, нет N+1)
- [ ] **ABIL-03**: Strike row description (для special strike abilities like "Финт негодяя", "Внезапная атака", "Brute Strength") consumes `getCreatureItem` для description text
- [ ] **ABIL-04**: Reference repro: Lucky Lanks renders "Финт негодяя" с full RU description ("Когда Лэнкс успешно Финтит, его цель Застигнута врасплох..."); Brute Strength для Abendego Brute renders RU description

### Untranslated Detection (`UNTRANS-*`)

- [ ] **UNTRANS-01**: 🚫RU badge logic unchanged — based on `useContentTranslation('creature', name, level) === null`. Pack expansion automatically reduces badge count (creatures из new packs становятся translated).
- [ ] **UNTRANS-02**: Custom (homebrew) creatures без vendor entry continue to show 🚫RU. Никакого fabrication, никаких heuristics.

### Verification (`VERIFY-*`)

- [ ] **VERIFY-01**: Smoke test — manual list of 10+ AP creatures (по 1 на каждый major AP pack) renders RU при locale=ru (name + subtitle + items + abilities)
- [ ] **VERIFY-02**: Smoke test — homebrew creature (custom encounter) показывает 🚫RU (regression check для UNTRANS-02)
- [ ] **VERIFY-03**: Migration chain `0044_entity_items.sql` → `0045_entity_items_description.sql` runs cleanly on warm boot (existing column preserved, new column NULL для старых rows)

### Process (`DEBT-*`)

- [ ] **DEBT-02 carryover**: Per-phase SUMMARY/VERIFICATION discipline preserved (process invariant from v1.7.0)

---

## Out of Scope (explicit)

- **Effects packs ingest** (`bestiary-effects.json`, `feat-effects.json`, `equipment-effects.json`, `spell-effects.json`) — deferred к v1.8+. Effects packs предоставляют active effects descriptions при applied conditions, не первичные creature/spell content; их UI surface ещё не оформлена.
- **Ancestries / classes / heritages / backgrounds packs** — PC content, не GM-side priority. Deferred к v1.8+ когда PC sheet translation станет приоритетом.
- **Hazards pack translation** — Foundry `hazards.json` существует в upstream но текущий PathMaid hazards UI не интегрирован с translation system (v0.8.0-pre-alpha legacy). Deferred.
- **Adventure-specific actions** (`adventure-specific-actions.json`) — niche scope, deferred.
- **Programmatic upstream sync** с pf2-locale-ru — vendor at point-in-time. Future automated CI sync — v1.8+.
- **Custom (homebrew) creature translation pipeline** — out by definition (single source of truth = vendor).
- **macOS notarization / Android distribution** — orthogonal к translation scope.
- **Integration regression tests** для FSD migrations — v1.6.0 carryover deferral preserved.
- **Spell description content fixes для Foundry pack drift** (если spell name renamed upstream) — handled organically через next vendor refresh, not v1.7.5 scope.

---

## Future Requirements (deferred to v1.8+)

- Effects packs ingest + active-effects UI surface
- Ancestries / classes / heritages / backgrounds (PC translation)
- Hazards translation integration
- Adventure-specific actions / GMG-SRD packs
- Programmatic upstream sync mechanism (community module → PathMaid pull) с CI integration
- PC/character sheet translation
- Search by RU content (FTS5 расширение поверх expanded pack scope)
- macOS notarization + full in-app updater для darwin (требует Apple Developer ID)
- Android build разморозка
- Drizzle ORM migration для всех raw `getSqlite()` callers (v1.7.0 D-04 deferred)
- Integration regression tests для FSD migrations

---

## Traceability

_Roadmapper fills this section after ROADMAP.md creation._

| REQ-ID | Phase | Status |
|--------|-------|--------|
| PACK-01..04 | TBD | Not started |
| PERF-01..03 | TBD | Not started |
| SPELL-AP-01..03 | TBD | Not started |
| ITEM-ID-01..03 | TBD | Not started |
| ABIL-01..04 | TBD | Not started |
| UNTRANS-01..02 | TBD | Not started |
| VERIFY-01..03 | TBD | Not started |
| DEBT-02 | All phases | Process-level |

---

## Completed Milestones (archive reference)

- **v1.7.4** — Broad i18n Coverage + Tech Cleanup (Phase 108 + sweep): see [`milestones/v1.7.4-ROADMAP.md`](./milestones/v1.7.4-ROADMAP.md)
- **v1.7.3** — Strike Names + UI Shell + Item Surface Audit (Phases 102-107): see [`milestones/v1.7.3-ROADMAP.md`](./milestones/v1.7.3-ROADMAP.md)
- **v1.7.2** — Translation Polish + Tech Debt (Phases 96-101): see [`milestones/v1.7.2-ROADMAP.md`](./milestones/v1.7.2-ROADMAP.md)
- **v1.7.1** — pf2-locale-ru Migration (Phases 90-95): see [`milestones/v1.7.1-ROADMAP.md`](./milestones/v1.7.1-ROADMAP.md)
- **v1.7.0** — Monster Translation (Phases 84-89, shipped 2026-04-24, tag `v1.7.0`): see [`milestones/v1.7.0-ROADMAP.md`](./milestones/v1.7.0-ROADMAP.md)
- **v1.6.0** — Spellcasting Deep Fix (Phases 77-83): see archive
- **v1.5.0** — In-App Updater (Phases 71-76): see archive

---

_Created: 2026-04-26 — v1.7.5 AP Bestiaries + Item-id RU + Special Abilities Coverage_
