---
gsd_state_version: 1.0
milestone: v1.5.0
milestone_name: — In-App Updater
status: executing
stopped_at: Phase 73 Plan 01 complete — shared/api/updater + updater-store shipped
last_updated: "2026-04-20T14:55:54Z"
last_activity: 2026-04-20 -- Phase 73 Plan 01 executed
progress:
  total_phases: 46
  completed_phases: 0
  total_plans: 1
  completed_plans: 1
  percent: 0
---

# STATE.md - PathMaid (Pathfinder 2e DM Assistant)

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-20)

**Core value:** Feature-complete PF2e DM tool — accurate game logic engine powering a React frontend with real Foundry VTT data.
**Current focus:** Phase 74 — Settings Updater UI + UpdateDialog (unblocked by Phase 73)

## Current Position

Phase: 73 (complete) → 74 (next)
Plan: 73-01 complete
Status: Ready to execute Phase 74
Last activity: 2026-04-20 -- Phase 73 Plan 01 executed

Progress: [░░░░░░░░░░] 0% (phase-level progress — Phase 73 is 1 of 46)

## Accumulated Context

### v1.5.0 Key Decisions

- macOS auto-update отключён на уровне frontend (Option A): darwin guard в startup hook и кнопка Открыть страницу релиза в Settings. Нотаризация Apple — future milestone.
- NSIS выбран как canonical Windows updater format: updaterJsonPreferNsis: true в tauri-action.
- Android job вырезается в Phase 71 (вместе с Signing Setup) — до добавления plugin в Cargo.toml, чтобы избежать CI compile failure window.
- db.close() перед install() — обязательно, делается в Phase 76 (REL-02).
- shared/api/updater.ts — единственный файл с импортом @tauri-apps/plugin-updater (FSD constraint).
- Phases 74 и 75 parallel-safe: разные файлы (widgets/+pages/ vs app/hooks/).
- Phase 72 Plan 01: exact pin per plugin — @tauri-apps/plugin-updater@2.10.1 + @tauri-apps/plugin-process@2.3.1 (независимые npm version lines). Rust side "2" caret-like, target-gated `[target."cfg(not(any(target_os = \"android\", target_os = \"ios\")))".dependencies]` block. plugins.updater.dialog НЕ добавляется (removed в Tauri v2 schema).
- Phase 73 Plan 01 (2026-04-20): OQ-1 locked — downloadAndInstallUpdate re-calls check() inside (stateless, retry-safe; no module-scope Update cache). OQ-2 locked — checkForUpdate classifies+throws on network/signature; null reserved ONLY for dev-guard + legitimate "no update". D-01..D-11 все implemented from recommended options. Closure progress accumulator pattern — reusable template для Tauri plugins с incremental events. ES2020-native Error subclassing — no Object.setPrototypeOf hack.

### Carry-forward architectural invariants

- createHashRouter mandatory (no HTML5 history in Tauri WebView)
- FSD: useShallow mandatory для Zustand object selectors
- shared/api/ — единственный Tauri IPC boundary
- Engine остаётся вне FSD, @engine alias
- import.meta.glob для Drizzle migrations

### Pending Todos

None.

### Blockers/Concerns

- TAURI_SIGNING_PRIVATE_KEY требует однократной ручной настройки в GitHub repo Settings — без него Phase 71 не завершится.
- Надо проверить exact API для db.close() в shared/api/ перед Phase 76 (не исследовалось в research).

## Session Continuity

Last session: 2026-04-20T14:55:54Z
Stopped at: Phase 73 Plan 01 complete — shared/api/updater.ts + updater-store.ts + barrel update
Next step: /gsd-execute-phase 74 (Settings Updater UI + UpdateDialog)
Resume file: .planning/phases/73-shared-api-store/73-01-SUMMARY.md
