# PathMaid: вводный документ для разработчика

Документ рассчитан на разработчика, который впервые открывает проект. После чтения он должен уметь запустить приложение, понять архитектурные границы, выбрать правильный модуль для изменения и не нарушить проектные ограничения.

## Что делает проект

PathMaid — офлайн-ассистент мастера PF2e, упакованный как Tauri 2 desktop app. Приложение работает с локальным игровым контентом, энкаунтерами, боевым состоянием, stat block существ, заклинаниями, предметами, опасностями, персонажами, hotkeys, global search и импортом данных из Foundry/Pathbuilder-подобных источников.

Frontend: React 19, Zustand, Tailwind 4, shadcn/Radix-style primitives, React Router v7. Локальный backend: SQLite через `tauri-plugin-sql`. Правила PF2e вынесены в чистый TypeScript engine вне Feature-Sliced Design дерева.

## Первый запуск

Используй существующий набор зависимостей. Не добавляй npm/cargo пакеты без явного согласования.

```bash
npm install
npm run dev
```

Основные проверки:

```bash
npm run typecheck
npm run lint
npm run lint:arch
npm run test
```

Проверенное состояние на 2026-05-20:

- `npm run typecheck` проходит.
- `npm run lint` проходит с предупреждениями: в основном `console.log` в миграциях/загрузке переводов и один устаревший eslint-disable.
- `npm run lint:arch` падает на известных FSD-нарушениях: 16 errors и 5 warnings.
- Code graph пересобран 2026-05-20: 461 files, 2059 nodes, 16095 edges.
- Архитектурные схемы текущего refactor slice: [architecture-graphs.md](architecture-graphs.md).

## Основная архитектура

Проект следует Feature-Sliced Design внутри `src`:

- `app`: bootstrap, providers, routing, startup checks, global styles.
- `pages`: route-level композиция.
- `widgets`: крупные page-level блоки: app shell, initiative list, combatant detail, global search.
- `features`: пользовательские workflows: encounter builder, combat tracker, spellcasting editor, import dialogs.
- `entities`: состояние, типы, mappers и UI для стабильных доменных понятий: creature, combatant, spell, item, condition, encounter.
- `shared`: API, DB, UI primitives, i18n, config, hooks и низкоуровневые утилиты.
- `engine`: чистая TypeScript-логика PF2e, подключается через `@engine`.
- `src-tauri`: Rust shell, Tauri plugins и регистрация IPC commands.

Ментальная модель: UI собирает workflows; workflows обращаются к entity/shared API; правила игры живут в `engine` или entity-level model/lib; Tauri IPC скрыт за `shared/api`.

## Жесткие границы

Это правила проекта, а не вкусовщина:

- Tauri IPC вызовы допускаются только в `shared/api`.
- Domain/game logic должен жить в `engine` или `entities`, не в pages/widgets/components.
- Используется только `createHashRouter`; не переходить на browser history routing.
- Миграции в WebView грузятся через `import.meta.glob`; не использовать Node `fs`.
- Для Zustand selectors, которые возвращают объекты или массивы, нужен `useShallow`.
- Новые зависимости добавляются только после согласования.
- Активные `.gsd` документы важнее догадок по коду.

## Data и startup flow

Порядок запуска:

1. React монтирует `AppProviders`.
2. Splash screen инициализирует SQLite.
3. DB layer открывает `sqlite:pathmaid.db`, включает WAL, отключает foreign keys на время миграций, выполняет SQL migrations, включает foreign keys обратно и загружает bundled content translations.
4. После готовности DB hash router рендерит app shell и lazy route pages.

Миграции — это SQL-файлы, загружаемые через `import.meta.glob`. Держи их append-only и по возможности idempotent. Если миграция пересобирает таблицы, сохраняй invariant: foreign keys выключены на время schema changes.

## API boundary

Frontend должен брать операции с данными из `shared/api`. Этот слой закрывает SQLite access, sync/import поведение, updater/platform helpers, global search, hotkeys и content queries.

Аудит нашел только один прямой Tauri `invoke`, и он находится внутри `shared/api/sync`. Это соответствует проектному ограничению.

## Engine boundary

Engine не зависит от React. В него попадают PF2e calculations, conditions, damage/IWR, encounter XP, degree of success, creature-building math, effects, action data и spellcasting rules, если логика не привязана к persisted app state.

Когда React нужен результат engine, предпочитай узкий adapter:

1. чистая функция в `engine` или `entities/<domain>/lib`;
2. hook/store adapter в `entities/<domain>/model`;
3. presentation UI в `entities/<domain>/ui`, `features` или `widgets`.

## UI conventions

PathMaid — плотный desktop tool, не landing page. Предпочитай стабильные информационные layouts, предсказуемые controls и общие UI primitives перед локальными компонентами.

Большие route/widget файлы стоит раскладывать на:

- чистые helpers для data shaping;
- hooks для derived state и store subscriptions;
- маленькие presentation components.

Не прячь domain calculations в render body. Тяжелые derived data должны жить в `useMemo`; handlers, уходящие в children, — в `useCallback`.

## Localization и content

В проекте есть англо- и русскоязычные UI/content paths. Bundled PF2e translation content загружается в SQLite при старте. Ошибки загрузки переводов считаются non-fatal: приложение должно продолжить запуск.

На Windows PowerShell часть русских документов может отображаться mojibake, даже если файл сохранен как UTF-8.

## Code graph workflow

Code graph — основной инструмент навигации по проекту.

Типовые команды:

```bash
code-review-graph status
code-review-graph detect-changes --brief
code-review-graph update --skip-flows
```

На 2026-05-20 incremental update установленного graph tool упал с `sqlite3.OperationalError: cannot start a transaction within a transaction`. Безопасный workaround, использованный для аудита:

1. остановить зависшие `code-review-graph serve` процессы;
2. переместить generated `.code-review-graph/graph.db` рядом как backup;
3. выполнить `code-review-graph build`.

Директория графа — generated state. Не коммить ее.

## Текущий GSD context

Активный milestone на момент аудита: `M003: Hotkeys, Global Search & Circular Deps Fix`, slice `S06`, phase `evaluating-gates`. Requirements: 23 validated, 0 active, 0 deferred, 0 out of scope.

В рабочем дереве уже были uncommitted changes в Cargo metadata и encounter import файлах. Считай их чужой работой, если тебе явно не назначили эту область.

## Безопасный порядок изменения

1. Прочитай активный `.gsd` context перед архитектурным решением.
2. Используй graph для dependents/dependencies и changed-file blast radius.
3. Определи слой изменения: `engine`, `entities`, `features`, `widgets` или `shared/api`.
4. Держи IPC за `shared/api`.
5. Не заноси PF2e rules в React components.
6. Запусти `typecheck`, `lint` и релевантный test/architecture gate.
7. Если изменение затронуло graph-visible code, обнови или пересобери граф перед handoff.
