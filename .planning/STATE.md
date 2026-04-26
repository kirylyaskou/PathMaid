---
gsd_state_version: 1.0
milestone: v1.7.5
milestone_name: — AP Bestiaries + Item-id RU + Special Abilities Coverage
status: verifying
stopped_at: Completed 114-01-PLAN.md — SMOKE-LIST.md + AUTOMATED-VERIFY.md + HUMAN-UAT.md for v1.7.5 verification surface
last_updated: "2026-04-26T17:12:41.774Z"
last_activity: 2026-04-26
progress:
  total_phases: 71
  completed_phases: 5
  total_plans: 8
  completed_plans: 7
  percent: 88
---

# STATE.md - PathMaid (Pathfinder 2e DM Assistant)

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-26 для v1.7.5 kickoff)

**Core value:** Точность + скорость — чистый TS engine для PF2e-математики + React frontend с live Foundry-данными.
**Current focus:** Phase 114 — Verification + Untranslated Regression

## Current Position

Milestone: v1.7.5 AP Bestiaries + Item-id RU + Special Abilities Coverage
Phase: 999.1
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-04-26

Progress: [█████░░░░░] 50%

### Phase Map (v1.7.5)

| Phase | Name | Requirements |
|-------|------|--------------|
| 109 | Vendor Pack Expansion + License Compliance | PACK-01..04 |
| 110 | Cold-Boot Performance Validation | PERF-01..03 |
| 111 | Item-ID Description Schema + API | ITEM-ID-01..03 |
| 112 | Special Ability Surface Wiring | ABIL-01..04 |
| 113 | AP Spell Coverage Extension | SPELL-AP-01..03 |
| 114 | Verification + Untranslated Regression | UNTRANS-01..02, VERIFY-01..03 |

DEBT-02 — process invariant, applied across all 6 phases.

## Accumulated Context

### Shipped + Feature-Complete Milestones

- v1.7.4 — Broad i18n Coverage + Tech Cleanup (Phase 108 + sweep) — feature-complete 2026-04-26, NOT TAGGED — [archive](./milestones/v1.7.4-ROADMAP.md)
- v1.7.3 — Strike Names + UI Shell + Item Surface Audit (Phases 102-107) — feature-complete 2026-04-26, NOT TAGGED — [archive](./milestones/v1.7.3-ROADMAP.md)
- v1.7.2 — Translation Polish + Tech Debt (Phases 96-101) — feature-complete 2026-04-25, NOT TAGGED — [archive](./milestones/v1.7.2-ROADMAP.md)
- v1.7.1 — pf2-locale-ru Migration (Phases 90-95) — feature-complete 2026-04-25, NOT TAGGED — [archive](./milestones/v1.7.1-ROADMAP.md)
- v1.7.0 — Monster Translation (Phases 84-89) — shipped 2026-04-24, tag `v1.7.0` — [archive](./milestones/v1.7.0-ROADMAP.md)
- v1.6.0 — Spellcasting Deep Fix (Phases 77-83) — archived [v1.6.0-ROADMAP.md](./milestones/v1.6.0-ROADMAP.md)
- v1.5.0 — In-App Updater (Phases 71-76) — archived [v1.5.0-ROADMAP.md](./milestones/v1.5.0-ROADMAP.md)

### Carry-forward architectural invariants

- `createHashRouter` mandatory (no HTML5 history в Tauri WebView)
- FSD: `useShallow` mandatory для Zustand object selectors
- `shared/api/` — единственный Tauri IPC boundary
- Engine остаётся вне FSD, `@engine` alias
- `import.meta.glob` для Drizzle migrations + для vendor pack ingest (`@vendor` alias)
- No IIFE в JSX; derived state через `useMemo`; декомпозиция по FSD (`lib → model → ui`)
- Translation IPC boundary: `shared/api/translations.ts` — единственный consumer DB translations; `shared/i18n/use-content-translation.ts` — единственный React-hook
- `entity_items` table denormalization для id-based item RU lookup (Phase 102) — расширяется в Phase 111 колонкой `description_loc`
- LICENSES requirement: vendor pack additions требуют OGL Section 15 update + COPYRIGHT chain check

### v1.7.x Translation Architecture (current state)

**Vendor:** `pf2-locale-ru/pf2e/packs/*.json` (Babele format) — 72 packs total в repo, **19 ingested** (base PF2e content); 50+ AP-specific packs **NOT ingested** → v1.7.5 Phase 109 scope.

**Pipeline:** vendor pack → `pack-adapter.ts` → `MonsterStructuredLoc | SpellStructuredLoc | ItemStructuredLoc` → DB `translations.structured_json` → `useContentTranslation` hook → UI render через SafeHtml + dictionary getters (TraitPill, getTraitLabel, getSkillLabel, etc.).

**Per-instance items:** Pack `entries.<creature>.items[]` array содержит {id, name, description?} для weapons + special abilities. Phase 102 `entity_items` table denormalizes id→name lookup для weapons. **Special abilities (kind=action items с description) НЕ маппятся** на ability rows → English fallback в AbilityCard / strike row → v1.7.5 Phase 111+112 scope.

### v1.7.4 Known Tech Debt → v1.7.5 Scope

1. AP-specific bestiaries packs (`outlaws-of-alkenstar-bestiary`, `abomination-vaults-bestiary`, etc., 50+ файлов) НЕ ingested → монстры рендерятся EN с 🚫RU несмотря на наличие RU в vendor → **Phase 109**
2. Item-id RU lookup только для weapons из base packs → **Phase 109 (data) + Phase 111 (description col)**
3. Special ability descriptions (Brute Strength, Финт негодяя, Внезапная атака) НЕ переведены — даже когда есть в pack `entries.<creature>.items[]` → **Phase 111 (API) + Phase 112 (UI wiring)**
4. AP-specific spell entries в bestiary `items[]` (kind=spell) не подхватываются как spell rows → **Phase 113**

Reference repro: `"Lucky" Lanks` из `outlaws-of-alkenstar-bestiary.json` — full RU entry в vendor (name "Счастливчик Лэнкс" + 9 items + 2 abilities), но рендерится EN с 🚫RU badge.

### Pending Todos

- Push накопленные v1.7.1-v1.7.4 commits на origin/master — ожидание решения пользователя
- Tag всех v1.7.x после v1.7.5 (combined release decision)

### Decisions

- 109-01: SHA ebd1a53a9ab072b12ef8d86c055cd23714334026 confirmed from local pf2-locale-ru checkout
- 109-01: Byte-identical vendor copy — no JSON reformatting; LF/CRLF handled by git autocrlf
- 109-02: Safe minimum OGL §6 form for all new entries — no author lists, no issue numbers, no per-volume titles
- 109-02: Year omitted for Revenge of the Runelords, Malevolence, Hellbreakers — insufficient certainty; OGL §6 minimum satisfied by Title + Copyright Holder
- 110-01: DEV gate via PERF_DEV constant (import.meta.env.DEV) — Vite tree-shakes all perf logs in prod build
- 110-01: PERF-MEASUREMENT.md not committed — .planning/ is gitignored per CLAUDE.md project rules
- [Phase 111]: locale: string (not SupportedLocale) in getCreatureItem — consistency with getStrikeRuName; dual skip-gate covers post-migration reseed scenario; CHUNK_SIZE 240→199 for 5-col rows
- [Phase 112]: useCreatureItem short-circuits on localFallback !== undefined before locale check — covers ~100% CreatureStatBlock usage
- [Phase 112]: Tier-2 action-dict gated by null name to useContentTranslation — zero DB queries on Tier-1 hit
- [Phase 112]: Single Map.get per strike in CreatureStrikesSection.map() — const loc before return
- [Phase 113]: SPELL_REF_DESC_MAX_CHARS=180 — covers reference notes without admitting ability-length descriptions (250+ chars)
- [Phase 113]: Signal C at call site (not in detector) — collision check requires canonical dedup map in scope
- [Phase 113]: bestiaryAdded=0 expected — by construction Signal A → name in canonical → collision suppressed; zero rows is correct conservative outcome
- [Phase 114-01]: Version bump 1.7.4→1.7.5 user-gated — executor made no version file edits; HUMAN-UAT.md Option 1/2/3 deferred to user
- [Phase 114-01]: Task 3 checkpoint:human-verify auto-approved (auto_advance=true) — HUMAN-UAT.md template created, plan marked complete

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260425-ayz | Multi-encounter `.pathmaid` export bundle + adapt import + file picker | 2026-04-25 | 2c8ea780 | [260425-ayz-pathmaid-pathmaid-file-picker](./quick/260425-ayz-pathmaid-pathmaid-file-picker/) |
| 260425-bq2 | Degree-of-success highlights (bold + PF2e color) in spell/item/ability descriptions | 2026-04-25 | 8d882a88 | [260425-bq2-highlight-degree-of-success-labels-bold-](./quick/260425-bq2-highlight-degree-of-success-labels-bold-/) |

## Session Continuity

Last session: 2026-04-26T17:11:16.937Z
Stopped at: Completed 114-01-PLAN.md — SMOKE-LIST.md + AUTOMATED-VERIFY.md + HUMAN-UAT.md for v1.7.5 verification surface
Next step: Fill PERF-MEASUREMENT.md with cold-boot dev run timings, then execute 110-02-PLAN.md (read verdict, strip instrumentation or add microtask yields).
