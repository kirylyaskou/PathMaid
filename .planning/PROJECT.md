# PathMaid — Project Reference

**Updated:** 2026-04-24 (начат v1.7.1)
**Repo:** github.com/kirylyaskou/PathMaid
**Current version:** v1.7.0 (shipped 2026-04-24) · v1.7.1 (в работе)

## Current Milestone: v1.7.1 Translation Dictionaries

**Goal:** Расширить RU-покрытие `CreatureStatBlock` до всего textual content (кроме numerics) через dictionary-based i18n независимого от HTML parser output. Фиксим spell translation regression из v1.7.0. Source of truth: pf2.ru/rules/player-core (author-authorized partner integration reference).

**Target features:**
- Structural stat-block labels переведены через i18next (HP/AC/Fort/Ref/Will/Perception/Speed/Senses/Languages/Skills/Strikes/Abilities/Spellcasting/Damage/Recall Knowledge + tabs)
- 17-skill dictionary вынесен в shared module, применяется к ВСЕМ скиллам при locale=ru
- ~25 PF2e languages dictionary
- ~60 core traits dictionary (labels + tooltip descriptions из pf2.ru)
- Spell RU rendering regression restored (формат pre-v1.7.0 baseline)

**Out of scope:**
- Automated sync/scrape от pf2.ru — ТОЛЬКО manual authoring reference для compile-time dict
- PC/character sheets translation — monsters only
- Full trait coverage (все 500+) — scope только ~60 core; rest deferred
- LLM/remote translation — remains out
- macOS notarization / Android разморозка

## Completed Milestones

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
