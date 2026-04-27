# Technical Reference

## Contents

- [Architecture Overview](architecture.md) — stack, FSD, IPC constraint, DB init
- [Engine API](engine.md) — all PF2e game logic modules and functions
- [Shared API](shared-api.md) — all Tauri IPC functions by module

## Key Constraints

- **IPC only through `shared/api/`** — `invoke()` nowhere else
- **Game logic only in `/engine` or `entities/`** — never in components or pages
- **`createHashRouter` only** — HTML5 history incompatible with Tauri WebView
- **`useShallow` mandatory** for all Zustand object/array selectors
- **`import.meta.glob`** for migrations — no Node.js `fs` in WebView
- **No test files** — breaking changes expected, tests removed intentionally

## Pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Party config, active combat summary |
| `/combat` | Combat | Initiative tracker, HP, conditions, effects |
| `/bestiary` | Bestiary | Search and browse creatures |
| `/encounters` | Encounters | Saved encounters, encounter builder |
| `/actions` | Actions | PF2e action reference |
| `/conditions` | Conditions | Condition reference with descriptions |
| `/hazards` | Hazards | Hazard reference |
| `/spells` | Spells | Spell reference with filter |
| `/items` | Items | Item reference with filter |
| `/characters` | Characters | PC management (Pathbuilder import) |
| `/custom-creatures` | Custom Creatures | Homebrew creature builder |
| `/settings` | Settings | Foundry sync, app preferences |
