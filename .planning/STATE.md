---
gsd_state_version: 1.0
milestone: v1.7.1
milestone_name: — Translation Dictionaries
status: defining_requirements
stopped_at: v1.7.1 kickoff — REQUIREMENTS.md + ROADMAP.md updated for Phase 90-93. Next: /gsd-discuss-phase 90 or /gsd-plan-phase 90.
last_updated: "2026-04-25T00:00:00Z"
last_activity: 2026-04-25 — Completed quick task 260425-bq2: Degree-of-success highlights in spell/item/ability descriptions
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# STATE.md - PathMaid (Pathfinder 2e DM Assistant)

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-24 for v1.7.1 kickoff)

**Core value:** Точность + скорость — чистый TS engine для PF2e-математики + React frontend с live Foundry-данными.
**Current focus:** v1.7.1 Translation Dictionaries — расширить RU-покрытие `CreatureStatBlock` до всего textual content через dictionary-based i18n независимого от HTML parser output. Fix spell translation regression.

## Current Position

Milestone: v1.7.1 Translation Dictionaries
Phase: Not started (defining requirements)
Plan: —
Status: Requirements defined, roadmap drafted — ready для `/gsd-discuss-phase 90` or `/gsd-plan-phase 90`
Last activity: 2026-04-24 — v1.7.1 kickoff

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Shipped Milestones

- v1.7.0 — Monster Translation (Phases 84-89) — archived [v1.7.0-ROADMAP.md](./milestones/v1.7.0-ROADMAP.md)
- v1.6.0 — Spellcasting Deep Fix (Phases 77-83) — archived [v1.6.0-ROADMAP.md](./milestones/v1.6.0-ROADMAP.md), audit [v1.6.0-MILESTONE-AUDIT.md](./milestones/v1.6.0-MILESTONE-AUDIT.md)
- v1.5.0 — In-App Updater (Phases 71-76) — archived retroactively [v1.5.0-ROADMAP.md](./milestones/v1.5.0-ROADMAP.md)

### Carry-forward architectural invariants

- `createHashRouter` mandatory (no HTML5 history в Tauri WebView)
- FSD: `useShallow` mandatory для Zustand object selectors
- `shared/api/` — единственный Tauri IPC boundary
- Engine остаётся вне FSD, `@engine` alias
- `import.meta.glob` для Drizzle migrations
- No IIFE в JSX; derived state через `useMemo`; декомпозиция по FSD (`lib → model → ui`)
- **Translation IPC boundary:** `shared/api/translations.ts` — единственный consumer DB translations; `shared/i18n/use-content-translation.ts` — единственный React-hook

### v1.7.0 Technical Decisions

- **HTML parser:** native `DOMParser` (доступен в Tauri WebView) — zero new deps, stable querySelector API, safer than regex
- **Migration:** `0041_translation_structured_json.sql` добавляет `structured_json TEXT NULL` на `translations` table **и** ренеймит `0038_translations.sql` → `0041_translations.sql` в том же touch (resolve migration 0038 collision с Phase 79's `0038_spell_overrides_heightened.sql`)
- **Matching strategy:** EN/RU парсинг парой (оба HTML), match abilities по index (порядок гарантирован в pf2.ru source), fallback на bolded-name match через normalized lowercase
- **Runtime:** zero parsing в UI — `useContentTranslation` returns ready-made structured object; parser живёт только в `shared/i18n/pf2e-content/` loader code path
- **Phase 85 schema decisions:** `_migrations` cleanup идёт в `0042_*` (не в `0041_*`) — ALTER TABLE должен выполняться после CREATE TABLE; `structuredJson: string | null` в raw SQL pattern — JSON.parse деферред в Phase 87; `migrations.debug.ts` co-located в `shared/db/` без новых deps

### Known Tech Debt (v1.6.0 audit carryover — scoped into v1.7.0)

- ✓ Migration 0038 collision → fix в Phase 85 (DEBT via rename in same migration touch)
- ✓ `use-spellcasting.ts` = 119 строк → trim <100 (DEBT-01, Phase 89)
- ✓ Per-phase SUMMARY/VERIFICATION/UAT artifacts reinstated (DEBT-02, process-level for each v1.7 phase)
- → Integration regression tests для FSD-миграций — deferred to v1.8+
- → Post-milestone hotfixes (UAT gap в description rendering) — covered by DEBT-02 UAT discipline

### Pending Todos

- Push `614172c5` (v1.6.0 archive commit) на origin/master — ожидание решения пользователя

### Blockers/Concerns

None.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260425-ayz | Multi-encounter `.pathmaid` export bundle + adapt import + file picker | 2026-04-25 | 2c8ea780 | [260425-ayz-pathmaid-pathmaid-file-picker](./quick/260425-ayz-pathmaid-pathmaid-file-picker/) |
| 260425-bq2 | Degree-of-success highlights (bold + PF2e color) in spell/item/ability descriptions | 2026-04-25 | 8d882a88 | [260425-bq2-highlight-degree-of-success-labels-bold-](./quick/260425-bq2-highlight-degree-of-success-labels-bold-/) |

## Session Continuity

Last session: 2026-04-24T07:56:57.817Z
Stopped at: Completed 89-01 use-spellcasting trim
Next step: Draft REQUIREMENTS.md → ROADMAP.md → commit kickoff → `/gsd-discuss-phase 84` or `/gsd-plan-phase 84`.
