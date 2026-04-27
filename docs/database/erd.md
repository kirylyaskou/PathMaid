# Entity Relationship Diagram

```
┌─────────────────┐
│    entities     │ ◄── Foundry actor data (creatures, NPCs, hazards)
│─────────────────│
│ id PK           │
│ name            │
│ type            │     type = 'npc' | 'character' | 'hazard'
│ level           │
│ hp, ac          │
│ fort, ref, will │
│ traits, rarity  │
│ source_pack     │
│ raw_json        │
└─────────────────┘
         │ (creature_ref, optional)
         │
         ▼
┌──────────────────────┐         ┌─────────────────────────┐
│  encounter_combatants│         │   combat_combatants     │
│──────────────────────│         │─────────────────────────│
│ id PK                │         │ id PK                   │
│ encounter_id FK──┐   │         │ combat_id FK──┐         │
│ creature_ref     │   │         │ creature_ref  │         │
│ display_name     │   │         │ display_name  │         │
│ initiative       │   │         │ initiative    │         │
│ hp, max_hp       │   │         │ hp, max_hp    │         │
│ temp_hp          │   │         │ temp_hp       │         │
│ weak_elite_tier  │   │         │ is_npc        │         │
│ creature_level   │   │         │ sort_order    │         │
└──────────────────┘   │         └─────────────────────────┘
         │             │                   │
         │ 1:N         │                   │ 1:N
         ▼             │                   ▼
┌──────────────────┐   │         ┌─────────────────────┐
│encounter_conditions│  │         │  combat_conditions  │
│──────────────────│   │         │─────────────────────│
│ combatant_id FK  │   │         │ combatant_id FK      │
│ slug             │   │         │ slug                 │
│ value            │   │         │ value                │
│ is_locked        │   │         │ is_locked            │
│ granted_by       │   │         │ granted_by           │
│ formula          │   │         └─────────────────────┘
└──────────────────┘   │
         │             │         ┌─────────────────┐
         │ 1:N         │         │    combats      │
         ▼             │         │─────────────────│
┌──────────────────────┐  │         │ id PK           │
│encounter_combatant   │  │         │ name            │
│       _effects       │  │         │ round, turn     │
│──────────────────────│  │         │ is_running      │
│ id PK                │  │         └─────────────────┘
│ encounter_id         │  │
│ combatant_id FK      │  │         ┌─────────────────┐
│ effect_id FK──┐      │  │         │  party_config   │
│ applied_at    │      │  │         │─────────────────│
│ remaining_turns│     │  │         │ id = 1 (single) │
└───────────────┘  ┌───┘  │         │ party_level     │
                   │      │         │ party_size      │
                   ▼      │         └─────────────────┘
┌──────────────────────┐  │
│    encounters        │◄─┘
│──────────────────────│
│ id PK                │         ┌─────────────────┐
│ name                 │         │   characters    │
│ party_level          │         │─────────────────│
│ party_size           │         │ id PK           │
│ round, turn          │         │ name UNIQUE     │
│ is_running           │         │ class, level    │
└──────────────────────┘         │ ancestry        │
                                  │ raw_json        │
                                  │ notes           │
┌──────────────────┐              └─────────────────┘
│  spell_effects   │
│──────────────────│              ┌──────────────────┐
│ id PK            │◄──FK─────────│custom_creatures  │
│ name             │   effect_id  │──────────────────│
│ rules_json       │              │ id PK            │
│ duration_json    │              │ name, level      │
│ spell_id FK──┐   │              │ rarity           │
└──────────────┘  │              │ source_type      │
                  │              │ ability scores   │
                  ▼              │ data_json        │
┌──────────────────┐              └──────────────────┘
│     spells       │
│──────────────────│              ┌──────────────────┐
│ id PK            │              │  translations    │
│ name             │              │──────────────────│
│ level            │              │ id PK            │
│ traditions       │              │ kind             │
│ traits           │              │ name_key         │
│ raw_json         │              │ level            │
└──────────────────┘              │ locale           │
                                  │ name_loc         │
┌──────────────────┐              │ traits_loc       │
│     items        │              │ text_loc         │
│──────────────────│              │ structured_json  │
│ id PK            │              └──────────────────┘
│ name, level      │
│ bulk, price      │
│ category         │
│ raw_json         │
└──────────────────┘
```

## Notes

- `encounter_combatants.creature_ref` and `combat_combatants.creature_ref` are nullable — custom/ad-hoc combatants have no entities row
- `spell_effects.spell_id` is nullable — effects can exist independently of a spell
- `characters` table is separate from `entities` — PCs come from Pathbuilder, not Foundry
- `custom_creatures` never have an `entities` row unless explicitly exported/imported
- `translations` is a polymorphic table matching by `(kind, name_key, level, locale)` — no direct FK to content tables
