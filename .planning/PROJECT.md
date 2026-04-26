# PathMaid — Project Reference

**Updated:** 2026-04-26 (v1.7.2 feature-complete, v1.7.3 starting)
**Repo:** github.com/kirylyaskou/PathMaid
**Current version:** v1.7.0 (shipped 2026-04-24) · v1.7.1 + v1.7.2 (feature-complete, not yet tagged — held for combined release after v1.7.3) · v1.7.3 (в работе)

## Current Milestone: v1.7.3 — Strike Names + UI Shell + Item Surface Audit

**Goal:** Закрыть остатки RU translation coverage по всему UI. После этого milestone v1.7.x чист и tag-able.

**Target features (объединили v1.7.3+v1.7.4+v1.7.5 в один milestone):**

A. Strike Names + Spell Surface Polish:
- `entity_items` denormalization для id-based RU strike name lookup (closes Phase 91 G-3 deferral)
- Strike rendering surfaces RU names + damage type RU labels через TraitPill
- Spell drawer traditions/save type/damage type chips через dict (replaces hardcoded EN spans)

B. UI Shell + Toast Localization:
- Audit + close common.json gaps (toast notifications, Settings page strings, sidebar gaps, updater states)
- Wire `useTranslation` в недостающих компонентах (modal dialogs, error overlays, dice roller, encounter builder)

C. Action/Feat/Item UI Surface Audit:
- Verify Phase 100 seeded data actually surfaces в ActionsPage, FeatInlineCard, ItemReferenceDrawer, conditions reference UI
- Fix gaps where useContentTranslation lookups silent-fail или not wired

**Out of scope:**
- `entity_items` for spells/feats (only weapons/strikes in v1.7.3)
- Effects packs ingest — v1.8+
- AP-specific bestiaries vendor — v1.8+
- macOS notarization / Android distribution
- Custom creature translation pipeline

## Completed Milestones

### v1.7.2 — Translation Polish + Tech Debt (feature-complete 2026-04-25, not yet tagged)

Phases 96-101 — paragraph spacing fix + orphan rows cleanup + spell-side untranslated badge + strike/ability TraitPill migration + item-shaped pack family ingest + structured spell overlay shape. Full details: [`.planning/milestones/v1.7.2-ROADMAP.md`](./milestones/v1.7.2-ROADMAP.md).

### v1.7.1 — pf2-locale-ru Migration (feature-complete 2026-04-25, not yet tagged)

Phases 90-95 — vendor pf2-locale-ru content + 4 LICENSES + ingest pipeline replacing HTML parser + 5 dictionary getters + UI wiring + untranslated badge + spell migration. Full details: [`.planning/milestones/v1.7.1-ROADMAP.md`](./milestones/v1.7.1-ROADMAP.md). Release blocked on paragraph spacing bug + 5 tech debts → v1.7.2 cycle.

### v1.7.0 — Monster Translation (shipped 2026-04-24)

Phases 84-89 — HTML→structured parser (native DOMParser, zero deps), migration 0041/0042/0043 (structured_json column + RU FTS5 denormalization), bundled loader integration, typed API + hook surface, CreatureStatBlock overlay wiring + markdown-lite renderer, use-spellcasting facade trim. Full details: [`.planning/milestones/v1.7.0-ROADMAP.md`](./milestones/v1.7.0-ROADMAP.md).

---

## What This Is

Pathfinder 2e GM Assistant — десктопное приложение для ведения игровых сессий. Импорт данных из Foundry VTT, точный PF2e rules engine, UI поверх SQLite.

Платформы: Windows + Linux (desktop canonical), macOS (через shell.open для update flow, notarization отложена), Android (удалён из CI в v1.5.0).

## Core Value

**Точность + скорость** — чистый TypeScript engine для PF2e-математики (damage, IWR, conditions, heightening) + React frontend с live-данными реальных Foundry-паков. GM не считает руками, не листает PDFs, не переключается между табами.

## Tech Stack

- **Frontend:** React 19, Zustand (w/ `useShallow` mandatory для object selectors), Tailwind 4, shadcn/ui, React Router v7 (`createHashRouter` only — Tauri WebView constraint)
- **Backend:** SQLite via `tauri-plugin-sql` IPC, Drizzle ORM (sqlite-proxy), migrations через `import.meta.glob`
- **Architecture:** FSD (Feature-Sliced Design) — `app/pages/widgets/features/entities/shared`; engine — external lib via `@engine` alias (stays outside FSD)
- **Desktop:** Tauri 2, Rust backend, ed25519 signing, GitHub Releases self-update (tauri-plugin-updater)

## Requirements

### Validated (shipped in v1.X)

- ✓ **PF2e rules engine** — damage/IWR/conditions/heightening в чистом TS — v1.0+
- ✓ **Foundry VTT import** — bestiary, spells, equipment, hazards, actions — v0.9
- ✓ **Combat tracker** — inicitive, conditions, effects, @-token resolution — v1.0
- ✓ **Encounter builder** — dual combat view, encounter persistence — v1.2
- ✓ **PC support** — characters page, PC sheet, combat integration — v1.3
- ✓ **Effect rules engine** — predicate evaluator, cast → target → apply flow, encounter export, Paizo library import — v1.4
- ✓ **In-app updater** — ed25519 signing, UpdateDialog, startup auto-check, darwin-gate — v1.5.0
- ✓ **Spellcasting deep fix** — castType dispatcher (prepared/innate/spontaneous/focus), heightening preview + persistence, @item.level cast-rank, FSD migration, innate frequency — v1.6.0

### Active (v1.7.0 scope)

- [ ] **TRANS-01** Parser `parseMonsterRuHtml(text, rus_text)` — pure TS, native DOMParser
- [ ] **TRANS-02** Migration `0041_translation_structured_json.sql` + rename `0038_translations.sql`
- [ ] **TRANS-03** Bundled loader populates `translations.structured_json` on seed
- [ ] **TRANS-04** `useContentTranslation` returns typed `structured` field
- [ ] **TRANS-05** `CreatureStatBlock` wires RU abilities / skills / saves / speeds / strikes с fallback на EN
- [ ] **DEBT-01** `use-spellcasting.ts` <100 строк (carryover from v1.6.0 audit)
- [ ] **DEBT-02** Per-phase SUMMARY.md / VERIFICATION.md / UAT.md — reinstate для каждой v1.7.0 фазы

### Deferred (future milestones)

- Integration regression tests для FSD-миграций — v1.8+
- macOS notarization + full in-app updater для darwin — требует Apple Developer ID
- Android build разморозка — только если спрос
- Spell/item/feat/action structured RU — оценить после релиза v1.7.0, решение данные-driven

### Out of Scope

- **Online multiplayer / cloud sync** — PathMaid остаётся local-first desktop app. GMs работают локально с Foundry-экспортами.
- **Character-side play** — инструмент для GM, не для игроков. PC sheet существует для combat automation GM'а, не для самостоятельной игры.
- **Mobile-first UI** — desktop canonical (Windows/Linux), mobile responsive — not priority.
- **Custom rule authoring UI** — PF2e rules hardcoded в `/engine`. Homebrew через data override, не через UI-редактор правил.

## Context

- **Codebase size (post v1.6.0):** ~253 files (TS/TSX/JS/Rust), 1036 nodes / 5644 edges в code graph
- **CI/CD:** GitHub Actions — `ci.yml` (lint + tsc on push/PR), `main.yml` (Windows + Linux builds on tag, signed, release drafts)
- **Known architectural invariants:**
  - `shared/api/` — единственный Tauri IPC boundary; `invoke()` больше нигде
  - Engine outside FSD, `@engine` alias
  - `createHashRouter` only (Tauri WebView constraint)
  - `useShallow` mandatory для Zustand object selectors
  - `import.meta.glob` для Drizzle migrations (no Node.js fs в WebView)
  - Drizzle ORM для schema; raw `getSqlite()` only для perf-critical paths (batch insert, FTS5)
- **Development workflow:** GSD (discuss-phase → ui-phase → plan-phase → execute-phase); model split — Opus для планирования, Sonnet для execution/debug.

## Key Decisions (history of major calls)

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| FSD architecture | Predictable layering для long-lived desktop app | ✓ Good — Steiger lint enforces |
| Engine outside FSD | Pure rules engine не relates к UI layers | ✓ Good — tested in isolation |
| `createHashRouter` only | Tauri WebView hard constraint | ✓ Good — no alternatives |
| Drizzle + sqlite-proxy | Type-safe queries через Tauri IPC | ✓ Good — migrations через `import.meta.glob` |
| Remove all test files | Breaking changes expected, tests stale | ⚠️ Revisit — не хватало для v1.6.0 hotfix-regressions |
| ed25519 signing (v1.5) | tauri-plugin-updater-native | ✓ Good |
| NSIS canonical Windows updater | `updaterJsonPreferNsis: true` | ✓ Good — .msi не поддерживает in-place |
| castType dispatcher (v1.6) | prepared/innate/spontaneous/focus UX расходились | ✓ Good — 4 views чище одного монолита |
| Inline plans в v1.6.0 | 6 взаимозависимых фаз на одной теме | ⚠️ Revisit — затруднил audit, teach rolled back для v1.7 |
| Migration 0038 collision | Параллельная RU-ветка + Phase 79 оба взяли 0038 | — Pending — rename на следующем touch |

## Constraints (current)

- No new npm / cargo dependencies без явного флажка
- Domain / game logic только в `/engine` или `entities/` — никогда в components / widgets / pages
- React 19 conventions: no IIFE в JSX, derived state через `useMemo`, декомпозиция по FSD (`lib → model → ui`)
- No comments про версии / фазы / UAT в коде — история живёт в git blame + PR description
- Code Graph Usage — MCP graph tools первичны, `Read`/`Grep` — last resort

---

_Last updated: 2026-04-24 — v1.7.0 Monster Translation kickoff_
