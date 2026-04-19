// Phase 70 / D-70-03 — adapt a Foundry iconic/pregen character actor JSON
// to the Pathbuilder 2e export shape (`PathbuilderBuild`) so the existing
// PC pipeline (character sheet, combat HP math, party picker) can consume
// Paizo-shipped iconics and pregens alongside user-imported builds.
//
// Foundry's character actor is a *declarative* document — most derived
// numbers live in rules-engine computation at runtime rather than on disk.
// Consequences for this adapter:
//   - `system.abilities` ships as `null` on every iconic (observed: Amiri
//     1/3/5, Ezren, Kyra, …). The concrete +mods a PC walks around with
//     come from boost application at runtime, which we do NOT replicate.
//     We default all scores to 10 (mod 0); `build.attributes.boosts` is
//     preserved in `raw_json` for future, richer import passes.
//   - `class` / `ancestry` are not top-level fields either; they live as
//     items inside `items[]` with `type: "class"` / `type: "ancestry"`.
//   - Equipment follows the same pattern: weapons/armor/consumables are
//     child items.
//
// The function is deliberately defensive — any required field that is
// missing, of the wrong shape, or set to null still yields a usable build
// (populated with the Pathbuilder defaults) rather than throwing. It only
// returns `null` when the record is not a character at all (wrong `type`)
// or when the document has no usable `name`, in which case the caller
// should skip the row entirely.

import type {
  PathbuilderBuild,
  PathbuilderAbilities,
  PathbuilderAttributes,
  PathbuilderProficiencies,
  PathbuilderWeapon,
  PathbuilderArmor,
} from '@engine'
import { insertIconicCharacter } from '../characters'
import type { RawEntity } from './types'

interface FoundryItem {
  _id?: string
  name?: string
  type?: string
  system?: Record<string, unknown>
}

interface FoundryCharacter {
  _id?: string
  name?: string
  type?: string
  items?: FoundryItem[]
  system?: Record<string, unknown>
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}

function getPath(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj
  for (const key of path) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

function pickItem(items: FoundryItem[], type: string): FoundryItem | undefined {
  return items.find((it) => it?.type === type)
}

function pickAllItems(items: FoundryItem[], type: string): FoundryItem[] {
  return items.filter((it) => it?.type === type)
}

// Pathbuilder defaults — mirror the numbers seen on a freshly-exported
// level-1 character with no boosts so that downstream math (calculatePCMaxHP,
// sheet renderers) has a safe baseline when Foundry omits a field.
function defaultAbilities(): PathbuilderAbilities {
  return { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
}

function defaultAttributes(): PathbuilderAttributes {
  return {
    ancestryhp: 8,
    classhp: 8,
    bonushp: 0,
    bonushpPerLevel: 0,
    speed: 25,
    speedBonus: 0,
  }
}

function defaultProficiencies(): PathbuilderProficiencies {
  return {
    classDC: 0,
    perception: 0,
    fortitude: 0,
    reflex: 0,
    will: 0,
    heavy: 0,
    medium: 0,
    light: 0,
    unarmored: 0,
    advanced: 0,
    martial: 0,
    simple: 0,
    unarmed: 0,
    castingArcane: 0,
    castingDivine: 0,
    castingOccult: 0,
    castingPrimal: 0,
  }
}

function buildAbilities(raw: FoundryCharacter): PathbuilderAbilities {
  const abilities = getPath(raw.system, ['abilities']) as
    | Record<string, unknown>
    | null
    | undefined
  // Foundry frequently serializes `abilities: null` — fall back to defaults.
  if (!abilities || typeof abilities !== 'object') return defaultAbilities()
  const out = defaultAbilities()
  for (const key of Object.keys(out) as Array<keyof PathbuilderAbilities>) {
    const entry = abilities[key] as Record<string, unknown> | undefined
    if (!entry || typeof entry !== 'object') continue
    // D-70-03 reads `.mod`; translate back to a score with `mod*2 + 10` so
    // engine math that expects Pathbuilder-style scores stays intact.
    const mod = entry.mod
    if (typeof mod === 'number' && Number.isFinite(mod)) {
      out[key] = 10 + mod * 2
    }
  }
  return out
}

function mapWeapon(it: FoundryItem): PathbuilderWeapon {
  const sys = (it.system ?? {}) as Record<string, unknown>
  const damage = sys.damage as Record<string, unknown> | undefined
  const runes = sys.runes as Record<string, unknown> | undefined
  const traits = sys.traits as Record<string, unknown> | undefined
  const category = asString(sys.category, 'simple')
  return {
    name: asString(it.name, 'Unknown Weapon'),
    qty: asNumber(sys.quantity, 1),
    prof: category,
    die: asString(damage?.die, 'd4'),
    damageType: asString(damage?.damageType, 'bludgeoning'),
    pot: asNumber(runes?.potency, 0),
    str: asString(traits?.str, ''),
    runes: Array.isArray(runes?.property)
      ? (runes!.property as unknown[]).filter(
          (v): v is string => typeof v === 'string'
        )
      : [],
  }
}

function mapArmor(it: FoundryItem): PathbuilderArmor {
  const sys = (it.system ?? {}) as Record<string, unknown>
  const runes = sys.runes as Record<string, unknown> | undefined
  const category = asString(sys.category, 'unarmored')
  return {
    name: asString(it.name, 'Unknown Armor'),
    qty: asNumber(sys.quantity, 1),
    prof: category,
    pot: asNumber(runes?.potency, 0),
    res: asString(runes?.resilient, ''),
    runes: Array.isArray(runes?.property)
      ? (runes!.property as unknown[]).filter(
          (v): v is string => typeof v === 'string'
        )
      : [],
  }
}

function mapEquipmentEntry(it: FoundryItem): [string, number, string?] {
  const sys = (it.system ?? {}) as Record<string, unknown>
  const qty = asNumber(sys.quantity, 1)
  return [asString(it.name, 'Unknown Item'), qty]
}

/**
 * Adapt a Foundry character actor document to a `PathbuilderBuild`.
 * Returns `null` if the record is not a playable character (wrong type,
 * missing name). All other missing fields fall through to Pathbuilder
 * defaults.
 */
export function buildPathbuilderFromFoundryPC(
  raw: unknown
): PathbuilderBuild | null {
  if (!raw || typeof raw !== 'object') return null
  const doc = raw as FoundryCharacter
  if (doc.type !== 'character') return null
  const name = asString(doc.name, '').trim()
  if (!name) return null

  const items = Array.isArray(doc.items) ? doc.items : []

  const level = asNumber(
    getPath(doc.system, ['details', 'level', 'value']),
    1
  )

  const classItem = pickItem(items, 'class')
  const ancestryItem = pickItem(items, 'ancestry')
  const heritageItem = pickItem(items, 'heritage')
  const backgroundItem = pickItem(items, 'background')

  const deity = asString(
    getPath(doc.system, ['details', 'deity', 'value']),
    ''
  )
  const gender = asString(
    getPath(doc.system, ['details', 'gender', 'value']),
    ''
  )
  const age = asString(getPath(doc.system, ['details', 'age', 'value']), '')
  const languages = Array.isArray(
    getPath(doc.system, ['details', 'languages', 'value'])
  )
    ? (
        getPath(doc.system, ['details', 'languages', 'value']) as unknown[]
      ).filter((v): v is string => typeof v === 'string')
    : []

  const weapons = pickAllItems(items, 'weapon').map(mapWeapon)
  const armor = pickAllItems(items, 'armor').map(mapArmor)
  const equipment: Array<[string, number, string?]> = [
    ...pickAllItems(items, 'consumable').map(mapEquipmentEntry),
    ...pickAllItems(items, 'equipment').map(mapEquipmentEntry),
    ...pickAllItems(items, 'backpack').map(mapEquipmentEntry),
    ...pickAllItems(items, 'treasure').map(mapEquipmentEntry),
  ]

  return {
    name,
    class: asString(classItem?.name, ''),
    ancestry: asString(ancestryItem?.name, ''),
    heritage: asString(heritageItem?.name, ''),
    background: asString(backgroundItem?.name, ''),
    alignment: '',
    gender,
    age,
    deity,
    level,
    abilities: buildAbilities(doc),
    attributes: defaultAttributes(),
    proficiencies: defaultProficiencies(),
    lores: [],
    feats: [],
    specials: [],
    equipment,
    spellCasters: [],
    weapons,
    armor,
    focusPoints: 0,
    focus: {},
    mods: {},
    formula: [],
    languages,
    resistances: [],
    traits: [],
    acTotal: {
      acProfBonus: 0,
      acAbilityBonus: 0,
      acItemBonus: 0,
    },
    pets: [],
  }
}

/**
 * Phase 70 / D-70-05 — orchestration entry point. Walks every synced
 * `RawEntity` of type `character` (shipped only by `iconics` and
 * `paizo-pregens`), builds a Pathbuilder-shaped record from the stashed
 * `raw_json`, and routes it through `insertIconicCharacter` which handles
 * the skip-user-imports collision rule.
 *
 * `source_adventure` provenance token stored on the character:
 *   - `__iconics__` for the `iconics` pack.
 *   - the adventure slug (e.g. `beginner-box`) for paizo-pregens entries.
 * Rows missing both signals are skipped defensively (shouldn't happen in
 * practice — Rust side gates these packs before handing the entity over).
 */
export async function extractAndInsertIconicPCs(
  entities: RawEntity[]
): Promise<number> {
  let inserted = 0
  for (const e of entities) {
    if (e.entity_type !== 'character') continue
    let doc: unknown
    try {
      doc = JSON.parse(e.raw_json)
    } catch {
      continue
    }
    const build = buildPathbuilderFromFoundryPC(doc)
    if (!build) continue

    const sourceToken: string | null =
      e.source_pack === 'iconics'
        ? '__iconics__'
        : e.source_adventure ?? null
    if (sourceToken === null) {
      // Defensive: character-shaped records should always arrive with a
      // Paizo library provenance. Skip rather than pollute user imports.
      continue
    }

    const id = await insertIconicCharacter(build, sourceToken)
    if (id) inserted++
  }
  return inserted
}
