# PathMaid — Claude Instructions

## Project
PF2e (Pathfinder 2e) DM Assistant. Tauri 2 desktop app.
- **Frontend:** React 19 + Zustand + Tailwind 4 + shadcn/ui + React Router v7
- **Backend:** SQLite + Drizzle ORM sqlite-proxy (via tauri-plugin-sql IPC)
- **Architecture:** FSD (Feature-Sliced Design) — `app/pages/widgets/features/entities/shared`
- **Engine:** pure TypeScript in `/engine`, consumed via `@engine` alias

## Workflow: GSD (Get Shit Done)
All feature work follows the GSD lifecycle:
```
/gsd:discuss-phase N  →  /gsd:ui-phase N  →  /gsd:plan-phase N  →  /gsd:execute-phase N --interactive
```

### GSD Tools path (Windows)
`$HOME` is sometimes empty in bash. Always use the explicit path:
```bash
node "C:/Users/kiryl/.claude/get-shit-done/bin/gsd-tools.cjs" <command>
```
Agents live at: `C:/Users/kiryl/.claude/agents/`

### Subagents
`parallelization` is set to `true` in `.planning/config.json`.
- GSD workflows spawn subagents/Task() calls normally
- Do **not** use `--interactive` flag unless explicitly requested

### Model preferences
- **Planning** (`plan-phase`, `write-plan`, `brainstorming`): Opus
- **Everything else** (discussion, execution, debugging, code review): Sonnet
- Config in `.planning/config.json` — planner=opus, checker=haiku

## Code Conventions
- `shared/api/` — sole Tauri IPC boundary, all `invoke()` calls here
- `getSqlite()` raw SQL for performance paths (batch insert, FTS5)
- `useShallow` mandatory for Zustand object selectors
- `createHashRouter` (no HTML5 history in Tauri WebView)
- `import.meta.glob` for Drizzle migrations (no Node.js `fs` in WebView)
- Engine stays outside FSD, consumed as external lib via `@engine` alias
- No test files — breaking changes expected, tests removed intentionally
- `.planning/` and `plans/` are gitignored (local only, never commit)

## Key Files
- `.planning/STATE.md` — current phase/progress
- `.planning/ROADMAP.md` — all phases
- `.planning/phases/NN-name/NN-CONTEXT.md` — phase decisions
- `.planning/phases/NN-name/NN-UI-SPEC.md` — UI design contract
- `src/shared/api/sync.ts` — Foundry VTT data extraction (spell/item/creature sync)
- `src/app/styles/globals.css` — design tokens (Golden Parchment theme)

## Known Issues
- **Visual companion broken**: superpowers 5.0.4 has `"type": "module"` + `require()` conflict in `server.js`. Use text-based brainstorming only.
- **`$HOME` in bash**: intermittently empty in Claude Code on Windows. Use explicit `C:/Users/kiryl/` paths for GSD tools.

## Communication
- User communicates in Russian, respond in Russian
- No emojis unless explicitly requested
- Concise responses
- User is not in a rush — prefer token efficiency over speed
