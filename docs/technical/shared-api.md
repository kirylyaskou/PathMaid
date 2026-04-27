# Shared API Reference

All Tauri IPC calls are routed through `src/shared/api/`. Nothing outside this directory may call `invoke()` directly.

Import from the barrel: `import { ... } from '@/shared/api'`

---

## Database (`db.ts`)

```ts
initDatabase(): Promise<void>
// Runs migrations, enables WAL, seeds translations.
// Safe to call multiple times — cached after first call.

closeDatabase(): Promise<void>
// Closes the SQLite connection before OS-level install/update.
// Resets the init cache so subsequent queries re-initialize.

getSyncMetadata(key: string): Promise<string | null>
setSyncMetadata(key: string, value: string): Promise<void>
// Key-value store in sync_metadata table.
```

---

## Creatures (`creatures.ts`)

```ts
interface CreatureRow {
  id: string
  name: string
  type: string           // 'npc' | 'character' | 'hazard'
  level: number | null
  hp: number | null
  ac: number | null
  fort: number | null
  ref: number | null
  will: number | null
  perception: number | null
  traits: string | null  // comma-separated
  rarity: string | null
  size: string | null
  source_pack: string | null
  raw_json: string       // full Foundry JSON
  source_name: string | null
  source_adventure: string | null
}

fetchCreatures(limit?: number, offset?: number): Promise<CreatureRow[]>
fetchCreatureById(id: string): Promise<CreatureRow | null>
fetchPregenCreatureByName(name: string): Promise<CreatureRow | null>
searchCreatures(query: string, limit?: number): Promise<CreatureRow[]>
// FTS5 full-text search on name + traits
```

---

## Combat (`combat.ts`)

```ts
// Active combat tracker (legacy — see also encounters.ts for persistence)

fetchActiveCombat(): Promise<CombatRow | null>
createCombat(name?: string): Promise<string>  // returns id
updateCombat(id: string, patch: Partial<CombatRow>): Promise<void>
deleteCombat(id: string): Promise<void>

addCombatant(combatId: string, data: NewCombatantData): Promise<string>
updateCombatant(id: string, patch: Partial<CombatantRow>): Promise<void>
removeCombatant(id: string): Promise<void>

setCondition(combatantId: string, slug: string, value?: number): Promise<void>
removeCondition(combatantId: string, slug: string): Promise<void>
getConditions(combatantId: string): Promise<ConditionRow[]>
```

---

## Encounters (`encounters.ts`)

```ts
// Persistent encounter store with full combatant + effect state

createEncounter(name: string, partyLevel: number, partySize: number): Promise<string>
fetchEncounters(): Promise<EncounterRow[]>
fetchEncounterById(id: string): Promise<EncounterRow | null>
updateEncounter(id: string, patch: Partial<EncounterRow>): Promise<void>
deleteEncounter(id: string): Promise<void>

addEncounterCombatant(encounterId: string, data: NewEncounterCombatantData): Promise<string>
updateEncounterCombatant(id: string, patch: Partial<EncounterCombatantRow>): Promise<void>
removeEncounterCombatant(id: string): Promise<void>

// Conditions
setEncounterCondition(combatantId: string, slug: string, value?: number, formula?: string): Promise<void>
removeEncounterCondition(combatantId: string, slug: string): Promise<void>
getEncounterConditions(combatantId: string): Promise<EncounterConditionRow[]>

// Spell effects
addCombatantEffect(data: NewCombatantEffectData): Promise<string>
removeCombatantEffect(id: string): Promise<void>
getCombatantEffects(encounterId: string, combatantId: string): Promise<CombatantEffectRow[]>
```

---

## Spells (`spells.ts`)

```ts
fetchSpells(limit?: number, offset?: number): Promise<SpellRow[]>
fetchSpellById(id: string): Promise<SpellRow | null>
searchSpells(query: string): Promise<SpellRow[]>
fetchSpellsByIds(ids: string[]): Promise<SpellRow[]>

interface SpellRow {
  id: string
  name: string
  level: number
  traditions: string | null   // JSON array: ["arcane","primal"]
  traits: string | null
  school: string | null
  source_pack: string | null
  raw_json: string
}
```

---

## Items (`items.ts`)

```ts
fetchItems(limit?: number, offset?: number): Promise<ItemRow[]>
fetchItemById(id: string): Promise<ItemRow | null>
searchItems(query: string): Promise<ItemRow[]>

interface ItemRow {
  id: string
  name: string
  level: number | null
  price: number | null
  bulk: string | null
  traits: string | null
  category: string | null
  source_pack: string | null
  raw_json: string
}
```

---

## Conditions (`conditions.ts`)

```ts
// Reference data for all PF2e conditions
fetchConditionReference(slug: string): Promise<ConditionReferenceRow | null>
fetchAllConditionReferences(): Promise<ConditionReferenceRow[]>
```

---

## Hazards (`hazards.ts`)

```ts
fetchHazards(limit?: number, offset?: number): Promise<HazardRow[]>
fetchHazardById(id: string): Promise<HazardRow | null>
searchHazards(query: string): Promise<HazardRow[]>
```

---

## Actions (`actions.ts`)

```ts
fetchActions(limit?: number, offset?: number): Promise<ActionRow[]>
fetchActionById(id: string): Promise<ActionRow | null>
searchActions(query: string): Promise<ActionRow[]>
```

---

## Characters (`characters.ts`)

```ts
// PC characters imported from Pathbuilder

fetchCharacters(): Promise<CharacterRow[]>
fetchCharacterById(id: string): Promise<CharacterRow | null>
createCharacter(data: NewCharacterData): Promise<string>
updateCharacter(id: string, patch: Partial<CharacterRow>): Promise<void>
deleteCharacter(id: string): Promise<void>

interface CharacterRow {
  id: string
  name: string
  class: string | null
  level: number | null
  ancestry: string | null
  raw_json: string         // full Pathbuilder export JSON
  notes: string
  created_at: string
}
```

---

## Custom Creatures (`custom-creatures.ts`)

```ts
fetchCustomCreatures(): Promise<CustomCreatureRow[]>
fetchCustomCreatureById(id: string): Promise<CustomCreatureRow | null>
createCustomCreature(data: NewCustomCreatureData): Promise<string>
updateCustomCreature(id: string, data: Partial<CustomCreatureData>): Promise<void>
deleteCustomCreature(id: string): Promise<void>

interface CustomCreatureRow {
  id: string
  name: string
  level: number
  rarity: string
  source_type: string    // 'original' | 'modified'
  created_at: string
  updated_at: string
  str: number | null
  // ... other ability scores
  data_json: string      // full stat block JSON
}
```

---

## Feats (`feats.ts`)

```ts
fetchFeatById(id: string): Promise<FeatRow | null>
searchFeats(query: string): Promise<FeatRow[]>
```

---

## Translations (`translations.ts`)

```ts
// RU localization for PF2e content

fetchTranslation(
  kind: TranslationKind,
  nameKey: string,
  locale?: string,
  level?: number
): Promise<TranslationRow | null>

// kind: 'monster' | 'spell' | 'item' | 'feat' | 'action'

interface TranslationRow {
  id: number
  kind: string
  name_key: string
  level: number | null
  locale: string
  name_loc: string
  traits_loc: string | null
  text_loc: string           // HTML string
  structured_json: string | null  // parsed stat block JSON
  source: string | null
}
```

---

## Party Config (`party-config.ts`)

```ts
getPartyConfig(): Promise<PartyConfig>
updatePartyConfig(patch: Partial<PartyConfig>): Promise<void>

interface PartyConfig {
  party_level: number   // 1–20
  party_size: number    // typically 4
}
```

---

## Platform (`platform.ts`)

```ts
getPlatform(): Promise<'windows' | 'macos' | 'linux' | 'android' | 'ios'>
openUrl(url: string): Promise<void>
```

---

## Updater (`updater.ts`)

```ts
checkForUpdate(): Promise<UpdateInfo | null>
downloadAndInstallUpdate(): Promise<void>
// Closes DB connection before download to release WAL lock
```

---

## Sync (`sync/`)

Foundry VTT data extraction. Reads a Foundry user data directory and imports creature/spell/item packs into the local SQLite database.

```ts
syncFromFoundry(dataPath: string): Promise<SyncResult>
// Scans packs/, reads JSON compendium files, upserts into entities/spells/items tables
```
