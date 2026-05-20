# PathMaid: инженерный аудит и план рефакторинга

Дата аудита: 2026-05-20.

Читатель: maintainer или новый разработчик, выбирающий следующий участок улучшений. После чтения он должен понимать, что чинить первым и какие архитектурные границы нельзя ломать.

## Проверенное состояние

- Code graph успешно пересобран: 461 files, 2059 nodes, 16095 edges.
- `npm run typecheck`: проходит.
- `npm run lint`: проходит с 37 warnings.
- `npm run lint:arch`: улучшен с 92 errors / 68 warnings до 16 errors / 5 warnings.
- Прямой Tauri IPC usage находится только в `shared/api/sync`.
- В рабочем дереве уже были uncommitted changes; текущий проход добавил documentation/public API/refactor edits поверх них.
- Графическое представление следующего refactor slice: [architecture-graphs.md](architecture-graphs.md).

## Самые рискованные зоны

### 1. FSD boundary drift

Architecture gate — главный текущий quality risk. Нарушения группируются вокруг:

- entity-to-entity cross imports, особенно creature/spell/condition/combatant coupling;
- shared modules, которые импортируют вверх из entities;
- page/widget imports в обход public API;
- feature-to-feature cross imports в encounter builder/import и spellcasting;
- missing public APIs для некоторых shared/widget segments;
- exceptions в Steiger config, завязанных на историю фаз вместо устойчивых invariants.

План:

1. Создать или починить public API для shared config, global search modal, i18n helpers и entity utilities.
2. Код из `shared`, который импортирует entities, перенести вниз в entities или вверх в feature/widget adapter.
3. Валидные cross-slice imports перевести на public API imports.
4. Невалидные зависимости разрезать через нейтральные contracts в `shared` или engine-level types только там, где contract действительно общий.
5. Убрать phase-history comments из architecture config и заменить их объяснением текущего invariant.

Критерий успеха: `npm run lint:arch` проходит, либо оставшиеся exceptions явные и актуальные.

### 2. Oversized UI/workflow components

Граф нашел много компонентов больше 200 строк. Самые крупные:

- `CreatureStatBlock`: примерно 461 строка.
- `CombatPage`: примерно 450 строк.
- `CreatureSearchSidebar`: примерно 368 строк.
- `HpControls`: примерно 362 строки.
- `EncounterEditor`: примерно 356 строк.
- `ConditionCombobox`: примерно 333 строки.
- `PCCombatCard`, `SpellcastingBlock` и catalog/search panels: около 300 строк.

Эти файлы не обязательно плохие, но они дорогие для изменений: store subscriptions, derived data, UI branching и command handlers находятся слишком близко друг к другу.

План:

1. Начать с `CombatPage`: он связывает много workflows и фигурирует в FSD failures.
2. Вынести route-level state orchestration в model hooks.
3. Разделить panel/dialog wiring через widget или feature public APIs.
4. Перенести чистые list transformations и stat formatting в `entities/<domain>/lib`.
5. Делать visual components prop-driven и по возможности store-free.

Критерий успеха: route/widget файлы становятся composition shells, а graph large-function output больше не показывает route components выше 250 строк.

### 3. Coupling вокруг creature/spell/item presentation

Creature stat block UI импортирует spell, item, combatant, spell-effect, i18n и engine-adjacent helpers. Это превращает creature presentation в hub для чужих доменных деталей.

План:

1. Определить стабильные presentation DTO для spell previews, item/equipment rows, strike rows, defenses и spellcasting sections.
2. Вынести Foundry/raw entity mapping из UI-facing components.
3. Экспортировать spell/item formatting через entity public APIs.
4. Держать battle form и effect overlays в model hook, который возвращает уже merged view data.

Критерий успеха: creature UI потребляет prepared view data и shared UI primitives, а не internals других entities.

### 4. Shared layer зависит от higher layers

Часть shared modules зависит от entity types/stores. Так `shared` перестает быть infrastructure layer и превращается в скрытый domain layer.

План:

1. Проверить каждый `shared` import из `entities`.
2. Если module domain-specific, перенести его в owning entity или feature.
3. Если type действительно общий, выделить узкий shared contract без store dependency.
4. Держать `shared/api` как persistence/query boundary, не как UI state layer.

Критерий успеха: Steiger больше не сообщает о `shared -> entities` imports.

### 5. Zustand selector consistency

Проект требует `useShallow` для selectors, возвращающих objects/arrays. Много мест уже соответствует правилу, но audit output показывает direct array selectors и object selectors, которые стоит пересмотреть.

План:

1. Добавить focused grep/script gate для Zustand selectors, возвращающих arrays/objects без `useShallow`.
2. Сначала исправить object selectors: они чаще всего дают лишние rerenders.
3. Не делать `.map()` или object construction внутри selectors; выбирать raw state и derive через `useMemo`.

Критерий успеха: все object/array selectors либо shallow-wrapped, либо документированы как scalar/reference-safe.

### 6. Migration и translation logging

ESLint warnings сосредоточены в DB migrations и PF2e content translation loading. Часть logs полезна операционно, но текущее правило считает их warnings.

План:

1. Решить, нужны ли startup migration/content logs в production.
2. Если да, ввести небольшой approved logger wrapper или rule override для этих modules.
3. Если нет, оставить только `warn`/`error`, routine progress logs убрать.
4. Удалить устаревший `react/no-danger` eslint-disable в safe HTML handling.

Критерий успеха: `npm run lint` чистый и при этом не скрывает полезные diagnostics.

### 7. Graph tooling reliability

Граф — центральный инструмент repo, но incremental updater сломался во время аудита. Workaround годится для разового аудита, но не для ежедневного workflow.

План:

1. Воспроизвести transaction failure на clean graph backup.
2. Исправить или обновить `code-review-graph`, чтобы stale-file cleanup коммитился до per-file storage transactions.
3. Оставить короткий troubleshooting section в developer docs.
4. Не использовать full rebuild в обычном worktree flow, если incremental update работает.

Критерий успеха: `code-review-graph update --skip-flows` работает после обычных code edits.

## Предлагаемый порядок работ

1. Починить public API и очевидные Steiger autofix items.
2. Убрать invalid `shared -> entities` imports.
3. Разделить `CombatPage` и точки композиции combat widgets.
4. Разделить `CreatureStatBlock` через presentation DTO.
5. Нормализовать Zustand selector patterns.
6. Очистить lint warnings в migration/i18n logging.
7. Починить reliability incremental graph update.

## Чего не делать при рефакторинге

- Не переносить rules logic в React components ради удобства imports.
- Не добавлять dependencies для решения FSD-структуры.
- Не менять routing с `createHashRouter`.
- Не обходить `shared/api` для Tauri IPC.
- Не удалять существующие tests или generated planning artifacts без явного задания.
