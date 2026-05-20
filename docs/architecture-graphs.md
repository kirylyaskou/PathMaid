# PathMaid: архитектурные графы рефакторинга

Читатель: maintainer или новый разработчик, который выбирает следующий безопасный refactor slice.

Цель после чтения: понять, почему `useRoll` нужно вынести из `shared`, куда его переносить, и какие FSD-нарушения останутся после этого.

## Текущий запах

`useRoll` выглядит как shared hook, но фактически оркестрирует combat-level поведение. Он бросает формулу, пишет в историю бросков и читает активные эффекты combatant'а. Поэтому `shared` начинает зависеть от higher layer domain state.

```mermaid
flowchart TD
  UI["UI: кнопки, формулы, stat block"]
  SharedHook["shared hook: useRoll"]
  RollStore["shared model: roll history"]
  Engine["engine: dice + fortune plan"]
  Effects["entity: spell effects store"]
  Combatant["entity: combatant context"]

  UI --> SharedHook
  SharedHook --> RollStore
  SharedHook --> Engine
  SharedHook -. forbidden .-> Effects
  SharedHook -. implicit context .-> Combatant
```

Проблема не в том, что hook использует кубики. Проблема в том, что hook знает о боевом состоянии и эффектах, а это уже не уровень `shared`.

## Целевая раскладка бросков

`shared` должен остаться низкоуровневым: бросить формулу и сохранить результат. Combat-aware resolution должен жить выше, в widget slice, который собирает UI, roll history, combatant context и active effects.

```mermaid
flowchart TD
  UI["UI consumers"]
  WidgetRoll["widget: dice roller / roll history model"]
  Resolver["widget model: resolve roll effects"]
  SharedRoll["shared: basic roll action"]
  RollStore["shared model: roll history"]
  Engine["engine: dice + PF2e roll planning"]
  Effects["entity: spell effects"]
  Combatant["entity: combatant"]

  UI --> WidgetRoll
  WidgetRoll --> Resolver
  WidgetRoll --> SharedRoll
  SharedRoll --> RollStore
  SharedRoll --> Engine
  Resolver --> Effects
  Resolver --> Combatant
  Resolver --> Engine
```

Инвариант: `shared` не знает, почему бросок стал fortune/misfortune. Он только умеет исполнить уже подготовленный план или обычную формулу.

## Карта оставшихся FSD нарушений

После public API cleanup архитектурный gate сжат до 16 errors и 5 warnings. Оставшееся сгруппировано так:

```mermaid
flowchart LR
  Creature["entity: creature"]
  Spell["entity: spell"]
  Item["entity: item"]
  Condition["entity: condition"]
  Combatant["entity: combatant"]
  SpellEffect["entity: spell-effect"]
  EncounterBuilder["feature: encounter builder"]
  EncounterImport["feature: encounter import"]
  Spellcasting["feature: spellcasting"]
  AppShell["widget: app shell"]
  RollHistory["widget: roll history"]
  GlobalSearch["widget: global search"]

  Creature --> Spell
  Creature --> Item
  Creature --> Condition
  Creature --> Combatant
  Creature --> SpellEffect
  Condition --> Combatant
  EncounterBuilder --> EncounterImport
  EncounterImport --> EncounterBuilder
  Spellcasting --> SpellEffect
  AppShell --> RollHistory
  AppShell --> GlobalSearch
```

`shared -> entities` для роллов уже убран. Следующий приоритет: разрезать creature hub, потому что он стягивает spell, item, combatant и spell-effect в один stat block boundary.

## Порядок атаки

```mermaid
flowchart TD
  A["1. Move combat-aware useRoll out of shared: done"]
  B["2. Keep shared roll primitive small: done"]
  C["3. Rewire UI consumers to widget-level hook"]
  D["4. Split creature stat block through presentation DTOs"]
  E["5. Resolve feature-to-feature imports"]
  F["6. Decide widget slice merge or Steiger exceptions"]
  G["7. Re-run typecheck, lint, lint:arch, graph build"]

  A --> B --> C --> D --> E --> F --> G
```

`useRoll` is the next clean slice because it removes the last shared-layer upward dependency without touching the larger creature/spell coupling.

## Decision snapshot

Approved direction: treat `useRoll` as widget-level orchestration, not as shared infrastructure.

Keep in `shared`:

- dice execution primitives;
- roll history store;
- low-level UI primitives that do not know combat state.

Move above `shared`:

- active effect lookup;
- combatant-aware fortune/misfortune resolution;
- public `useRoll` hook used by combat-facing UI.
