# pathmaid — Claude Instructions

## Project
PF2e (Pathfinder 2e) GM Assistant. Tauri 2 desktop app.
- **Frontend:** React 19 + Zustand + Tailwind 4 + shadcn/ui + React Router v7
- **Backend:** SQLite + Drizzle ORM sqlite-proxy (via tauri-plugin-sql IPC)
- **Architecture:** FSD (Feature-Sliced Design) — `app/pages/widgets/features/entities/shared`
- **Engine:** pure TypeScript in `/engine`, consumed via `@engine` alias
- **Code graph:** 1036 nodes, 5644 edges, 253 files (TS/TSX/JS/Rust)

## CONSTRAINTS (non-negotiable)
- All Tauri IPC **only** through `shared/api/` — never call `invoke()` elsewhere
- Domain/game logic **only** in `/engine` or `entities/` — never in components, widgets, or pages
- Drizzle ORM for schema definitions — raw `getSqlite()` only for perf-critical paths (batch insert, FTS5)
- No new npm or cargo dependencies without flagging to user first
- No improvisation on architecture decisions — if not in CONTEXT.md → stop and ask
- `.gsd/` files are source of truth for active work — code must match them, not vice versa
- `useShallow` mandatory for all Zustand object selectors
- `createHashRouter` only — no HTML5 history (Tauri WebView limitation)
- `import.meta.glob` for Drizzle migrations — no Node.js `fs` in WebView context
- Engine stays outside FSD — consumed as external lib via `@engine` alias
- No test files — breaking changes expected, tests removed intentionally

## React 19 Conventions

### Запрещено (enforced by ESLint)
- **IIFE в JSX** — никаких `{(() => { ... })()}` или `{(function(){...})()}` внутри рендера. Нужна логика → хук в `model/` или чистая функция в `lib/`. Линтер ловит через `no-restricted-syntax`.
- **Inline `.map/.filter/.reduce` с > 3 строк вычислений на элемент** — выносить в под-компонент или мемоизированный хук.
- **Мутация локальных массивов через `forEach + push`** для сборки `ReactNode` — использовать декларативный `.map()` с `<Fragment key>` для разделителей.
- **Nested component definitions** в теле родителя — ловится `react/no-unstable-nested-components`.
- **Немемоизированные производные данные** в рендере — любой `Object.entries`, merge, sort на пропсах/state должен жить в `useMemo`.
- **Ссылки на фазы/версии/UAT в комментариях** — `v1.4.1`, `Phase 39`, `UAT BUG-6`, `Plan 02`, `D-09` и т.п. Комментарий объясняет WHY-инвариант, а не историю патча. История живёт в git blame и PR description.

### Обязательно
- `useShallow` для любого объектного/массивного селектора Zustand (дублирует CONSTRAINTS — здесь как напоминание в React-контексте).
- `useMemo` для derived state; `useCallback` для обработчиков, уходящих в props дочерних компонентов.
- Секции JSX > 30 строк или с собственной логикой → выносить в под-компонент.
- FSD-раскладка для декомпозиции: чистые утилиты в `entities/<X>/lib/`, реактивные хуки в `entities/<X>/model/`, презентация в `entities/<X>/ui/`.
- Комментарий пишется только когда WHY не читается из кода (скрытый инвариант, обход бага, неочевидный контракт).

### Паттерн декомпозиции сложного стата
1. Чистая функция мёржа/вычисления → `entities/<X>/lib/<name>.ts` (no React, testable).
2. Реактивный хук-адаптер → `entities/<X>/model/use-<name>.ts` (useMemo + подписки).
3. Презентационный компонент → `entities/<X>/ui/<Name>.tsx` (только props, без store-вызовов).

Эталон: `entities/spell-effect/lib/merge-resistances.ts` + использование в `widgets/combatant-detail/ui/HpControls.tsx` через `useMemo`.

## Behaviour
- When uncertain → STOP and ask, never improvise
- Read existing patterns before writing new code — match the style
- If refactoring scope creeps beyond the task → flag it, do not do it silently
- `.planning/` and `plans/` are gitignored — never commit them

## Code Graph Usage

**Graph is the primary navigation tool. Direct file reading is the last resort.**

### Navigation hierarchy (follow in order)
1. **MCP graph tools** — always try first
2. **CLI detect-changes / status** — for change scoping
3. **Direct file read** — only if graph returned insufficient context

If you find yourself reaching for Read/Grep before checking the graph — stop and use the graph first.

### During debug (mandatory flow)
Before reading any suspect file:
1. `detect-changes --brief` — scope what changed since last commit
2. MCP `get_dependents` on suspect node — who calls this
3. MCP `get_dependencies` on suspect node — what this calls
4. MCP `search_graph` — if node location is unknown
5. **Direct file read — only if steps 1–4 gave insufficient context**

### CLI
```bash
code-review-graph status                        # graph stats
code-review-graph detect-changes --brief        # what changed + blast radius (brief)
code-review-graph detect-changes --base HEAD~3  # diff vs N commits back
code-review-graph update --skip-flows           # incremental update after edits
code-review-graph build                         # full rebuild after major refactor
```

### MCP tools (preferred over CLI)
- `get_node` — file/function context
- `get_dependencies` — what this node depends on
- `get_dependents` — what depends on this node (blast radius)
- `search_graph` — semantic search across codebase
- `get_community` — module cluster this node belongs to

### Worktree + graph (mandatory — иначе граф пуст)
`code-review-graph` авто-детектит репо по `.git` и держит `graph.db` внутри текущего корня. Worktree — отдельный checkout → собственный `.code-review-graph/graph.db`, который SessionStart-hook создаёт пустым (Nodes: 0). Поэтому:

**1. На старте работы в worktree — скопировать актуальный граф из main:**
```bash
cp "D:/pathmaid/.code-review-graph/graph.db" "<worktree-path>/.code-review-graph/graph.db"
code-review-graph status   # проверка: должны быть ноды/рёбра, не нули
```

**2. Во время работы — обновлять локальную копию инкрементально:**
```bash
code-review-graph update --skip-flows   # после серии правок
```

**3. По завершении worktree (перед merge в master / удалением) — вернуть копию в main как новую базу:**
```bash
cp "<worktree-path>/.code-review-graph/graph.db" "D:/pathmaid/.code-review-graph/graph.db"
```

Так main всегда имеет свежий граф, отражающий последнее состояние кода. Без шага 3 — следующая worktree стартует с устаревшего графа и теряет ноды добавленные предыдущей.

**Никогда** не запускать `code-review-graph build` в worktree — полная сборка занимает минуты и дублирует работу. Только копирование + `update`.

## Workflow
GSD lifecycle: `gsd_plan_milestone → gsd_plan_slice → gsd_plan_task → gsd_complete_*`
GSD backend: `.gsd/` (MCP JSON-based) — milestones/slices/tasks tracked via `gsd_*` tools.
GSD agents: `C:/Users/kiryl/.claude/agents/`

### Session strategy
- Keep discuss → plan → execute in one session without `/clear` between phases
- `/clear` only after a phase is fully complete

### Parallel phases (multiple windows / worktrees)
Phases from the same milestone can run in parallel **only if they touch different files**.
Before starting parallel work:
1. Check graph blast radius of each phase: `detect-changes` + MCP `get_dependents`
2. Confirm no file overlap between phases
3. Use git worktree — one branch per parallel phase:
```bash
git worktree add ../pathmaid-phase-NN feature/phase-NN
```
4. Each Claude window works in its own worktree directory
5. Merge back to master after both phases complete and typecheck passes

**Never run two phases in parallel on the same working tree — git conflicts guaranteed.**

### Subagents
GSD may spawn subagents during execute-phase. This is expected and correct.
Subagents inherit the same CONSTRAINTS and Code Graph Usage rules.
Subagents must not read files directly if graph tools are available.

### GSD Tools (Windows)
`$HOME` intermittently empty in bash. Always use explicit path:
```bash
node "C:/Users/kiryl/.claude/get-shit-done/bin/gsd-tools.cjs" <command>
```

### Model preferences
- **Planning** (plan-phase, brainstorming): Opus
- **Everything else** (execution, debugging, review): Sonnet

## Key Files
- `.gsd/STATE.md` — current milestone/slice/task progress (`gsd_progress` for structured view)
- `.gsd/milestones/M001/M001-ROADMAP.md` — milestone plan (`gsd_roadmap` to query)
- `.gsd/DECISIONS.md` — append-only architectural decisions register
- `.gsd/REQUIREMENTS.md` — capability contract (requirements + validation status)
- `.planning/PROJECT.md` — high-level project reference (historical, read-only)
- `.planning/milestones/*.md` — archived milestone roadmaps v1.5.0–v1.7.4 (read-only)
- `.planning/phases/{84..113}-*/SUMMARY.md` — completed phase narratives (read-only)
- `src/shared/api/sync.ts` — Foundry VTT data extraction
- `src/app/styles/globals.css` — design tokens (Golden Parchment theme)

## Releasing

**Before tagging — bump the version in all three source files:**

- `package.json` → `"version"`
- `src-tauri/tauri.conf.json` → `"version"` (Tauri-bundler reads this for artifact filenames — `PathMaid_<version>_*`)
- `src-tauri/Cargo.toml` → `version` (Rust side)

`Cargo.lock` auto-updates on next `cargo build`. Commit all three as one `chore: bump version to X.Y.Z` BEFORE tagging — otherwise bundled artifacts keep the old version in their filenames regardless of the git tag.

**Then push a git tag — CI handles the rest:**

    git tag v<version>
    git push origin v<version>

GitHub Actions (`main.yml`) will build Windows/macOS/Linux/Android and create a draft release automatically.
After all jobs finish — go to GitHub Releases and click **Publish release**.

Version must follow semver. Current release: `v1.4.1`.

**Known trap:** tag without version bump = release header says `v1.4.1` but files say `PathMaid_1.2.1_*`. Always bump first.

## Known Issues
- **Superpowers broken**: v5.0.4 `"type": "module"` + `require()` conflict. Text-only brainstorming.
- **`$HOME` in bash**: intermittently empty on Windows. Use explicit `C:/Users/kiryl/` paths.

## Communication
- Respond in Russian
- No emojis unless requested
- Concise — no filler phrases