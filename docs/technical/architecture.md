# Architecture Overview

PathMaid is a Tauri 2 desktop application. The frontend runs in a WebView; the backend is a Rust process. Communication between the two happens exclusively via Tauri IPC.

## Technology Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 19 + Vite |
| Routing | React Router v7 (`createHashRouter` — required for Tauri WebView) |
| State management | Zustand |
| Styling | Tailwind 4 + shadcn/ui |
| Database | SQLite via `tauri-plugin-sql` |
| ORM / schema | Drizzle ORM (sqlite-proxy pattern) |
| Game logic | Pure TypeScript engine (`/engine`) |
| i18n | react-i18next |

## Directory Structure

```
pathmaid/
├── engine/              # Pure TS game logic — no React, no Tauri
├── src/
│   ├── app/             # App entry, router, providers, SplashScreen
│   ├── pages/           # Route-level page components
│   ├── widgets/         # Composite UI blocks (cross-entity)
│   ├── features/        # User-facing features (single-entity operations)
│   ├── entities/        # Domain entities (data + UI per entity type)
│   └── shared/          # Shared infrastructure
│       ├── api/         # ALL Tauri IPC calls — only entry point to Rust
│       ├── db/          # SQLite connection + migrations
│       ├── i18n/        # Translation config + PF2e content translations
│       ├── lib/         # Pure utilities (no React)
│       └── ui/          # Generic UI primitives
└── src-tauri/           # Rust backend (Tauri commands, sync, build config)
```

## Feature-Sliced Design (FSD)

The frontend follows FSD. Dependency flow is strictly one-way:

```
app → pages → widgets → features → entities → shared
```

- `shared/` cannot import from any layer above it
- `entities/` cannot import from `features/`, `widgets/`, or `pages/`
- Each layer imports only from layers below it

### Entity layout

Each entity in `src/entities/<name>/` follows:

```
entities/<name>/
├── index.ts          # Public barrel export
├── lib/              # Pure computation functions (no React)
├── model/            # Zustand store + reactive hooks
└── ui/               # Presentational components (props only, no store calls)
```

## IPC Constraint

All Tauri `invoke()` calls must go through `src/shared/api/`. No component, widget, or page may call `invoke()` directly. This ensures the IPC surface is auditable from one place.

## Engine

`/engine` is a pure TypeScript library. It contains all PF2e game rules (damage, conditions, XP, statistics, dice). Consumed via the `@engine` alias. It has no React imports, no Tauri imports, no side effects.

## Database Initialization

On app startup:

1. `SplashScreen` renders while DB is loading
2. `initDatabase()` (`shared/api/db.ts`) runs once — guarded by a module-level promise cache to survive React StrictMode double-invocation
3. `PRAGMA journal_mode=WAL` — enables write-ahead log for concurrent reads
4. `PRAGMA foreign_keys=OFF` — required during migrations (table-rebuild pattern)
5. `runMigrations()` applies any pending `.sql` files in lexicographic order
6. `PRAGMA foreign_keys=ON`
7. `loadContentTranslations()` seeds bundled RU translations — non-fatal on failure
8. App routes render

## Routing

`createHashRouter` is used throughout. HTML5 history (`BrowserRouter`) is not compatible with Tauri WebView file:// origins.

Routes are lazy-loaded per page via `React.lazy` + `Suspense`.
