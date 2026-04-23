// adapt a Foundry iconic/pregen character actor JSON
// to the Pathbuilder 2e export shape (`PathbuilderBuild`) so the existing
// PC pipeline (character sheet, combat HP math, party picker) can consume
// Paizo-shipped iconics and pregens alongside user-imported builds.
//
// this adapter now delegates all computation to the shared
// `parseFoundryCharacterDoc` so the character-sheet path and the iconic-as-
// NPC path share a single source of truth. The function's contract stays
// the same — returns `null` when the record is not a character or has no
// name — but the derived numbers now honor the full PF2e boost-replay,
// proficiency-rank, and strike math rules (see the shared parser).

import type {
  PathbuilderBuild,
  PathbuilderAttributes,
  PathbuilderProficiencies,
  PathbuilderWeapon,
  PathbuilderArmor,
} from '@engine'
import { insertIconicCharacter } from '../characters'
import type { RawEntity } from './types'
import { parseFoundryCharacterDoc } from './foundry-pc-parser'
import type { ParsedPc } from './foundry-pc-parser'

// ─── Mappers from ParsedPc → Pathbuilder types ────────────────────────────

function toPathbuilderAttributes(pc: ParsedPc): PathbuilderAttributes {
  // calculatePCMaxHP(build) = ancestryhp + (classhp + bonushp + CON_mod) × level.
  // To make the sheet's computed HP match the authored parsed.hp exactly,
  // absorb any gap (e.g. ancestry HP quirks, level-up temp bumps) into
  // bonushp so the classhp stays semantically correct.
  const conMod = Math.floor((pc.abilities.con - 10) / 2)
  const pureFormula = pc.ancestryHp + (pc.classHp + conMod) * pc.level
  const gap = pc.hp - pureFormula
  return {
    ancestryhp: pc.ancestryHp,
    classhp: pc.classHp,
    bonushp: gap !== 0 ? gap : 0,
    bonushpPerLevel: 0,
    speed: pc.ancestrySpeed,
    speedBonus: 0,
  }
}

function toPathbuilderProficiencies(pc: ParsedPc): PathbuilderProficiencies & Record<string, number> {
  // PathbuilderBuild.proficiencies is a fixed shape, but PCCombatCard and
  // PCSheetPanel read skill ranks by `proficiencies[skillSlug]` via a
  // `Record<string, number>` cast — so we merge the skill slugs into the
  // same object. TypeScript's struct typing allows this because the runtime
  // shape is a plain record.
  const base: PathbuilderProficiencies = {
    classDC: pc.proficiencies.classDC,
    perception: pc.proficiencies.perception,
    fortitude: pc.proficiencies.fortitude,
    reflex: pc.proficiencies.reflex,
    will: pc.proficiencies.will,
    heavy: pc.proficiencies.heavy,
    medium: pc.proficiencies.medium,
    light: pc.proficiencies.light,
    unarmored: pc.proficiencies.unarmored,
    advanced: pc.proficiencies.advanced,
    martial: pc.proficiencies.martial,
    simple: pc.proficiencies.simple,
    unarmed: pc.proficiencies.unarmed,
    castingArcane: pc.proficiencies.castingArcane,
    castingDivine: pc.proficiencies.castingDivine,
    castingOccult: pc.proficiencies.castingOccult,
    castingPrimal: pc.proficiencies.castingPrimal,
  }
  // Merge skill ranks as extra keys.
  return { ...base, ...pc.skills } as PathbuilderProficiencies &
    Record<string, number>
}

function toPathbuilderWeapons(pc: ParsedPc): PathbuilderWeapon[] {
  // Map striking rank (0..3) to Pathbuilder's `str` string label.
  const STRIKING_LABEL: Record<number, string> = {
    0: '',
    1: 'striking',
    2: 'greaterStriking',
    3: 'majorStriking',
  }
  return pc.weapons.map((w) => ({
    name: w.name,
    qty: w.qty,
    prof: w.category,
    die: w.die,
    damageType: w.damageType,
    pot: w.potency,
    str: STRIKING_LABEL[w.striking] ?? '',
    runes: w.runes,
  }))
}

function toPathbuilderArmor(pc: ParsedPc): PathbuilderArmor[] {
  return pc.armor.map((a) => ({
    name: a.name,
    qty: a.qty,
    prof: a.category,
    pot: a.potency,
    res: a.resilient,
    runes: a.runes,
  }))
}

function toPathbuilderLores(pc: ParsedPc): Array<[string, number]> {
  // Background lore skills are trained at creation (rank 1).
  return pc.backgroundLoreSkills.map((name) => [name, 1])
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Adapt a Foundry character actor document to a `PathbuilderBuild`.
 * Returns `null` if the record is not a playable character (wrong type,
 * missing name). All derivation is delegated to the shared parser.
 */
export function buildPathbuilderFromFoundryPC(
  raw: unknown
): PathbuilderBuild | null {
  const pc = parseFoundryCharacterDoc(raw)
  if (!pc) return null

  const doc = (raw as { system?: Record<string, unknown> }) ?? {}
  const system = (doc.system ?? {}) as Record<string, unknown>
  const details = (system.details ?? {}) as Record<string, unknown>

  const deity =
    typeof (details.deity as { value?: unknown })?.value === 'string'
      ? ((details.deity as { value: string }).value)
      : ''
  const gender =
    typeof (details.gender as { value?: unknown })?.value === 'string'
      ? ((details.gender as { value: string }).value)
      : ''
  const age =
    typeof (details.age as { value?: unknown })?.value === 'string'
      ? ((details.age as { value: string }).value)
      : ''

  const equipment: Array<[string, number, string?]> = [
    ...pc.consumables.map((c): [string, number] => [c.name, c.qty]),
    ...pc.equipment.map((e): [string, number] => [e.name, e.qty]),
  ]

  return {
    name: pc.name,
    class: pc.className,
    ancestry: pc.ancestryName,
    heritage: pc.heritageName,
    background: pc.backgroundName,
    alignment: '',
    gender,
    age,
    deity,
    level: pc.level,
    abilities: pc.abilities,
    attributes: toPathbuilderAttributes(pc),
    proficiencies: toPathbuilderProficiencies(pc),
    lores: toPathbuilderLores(pc),
    feats: [],
    specials: [],
    equipment,
    spellCasters: [],
    weapons: toPathbuilderWeapons(pc),
    armor: toPathbuilderArmor(pc),
    focusPoints: 0,
    focus: {},
    mods: {},
    formula: [],
    languages: pc.languages,
    resistances: [],
    traits: [],
    acTotal: {
      acProfBonus: pc.acBreakdown.profBonus,
      acAbilityBonus: pc.acBreakdown.abilityBonus,
      acItemBonus: pc.acBreakdown.itemBonus,
    },
    pets: [],
  }
}

/**
 * orchestration entry point. Walks every synced
 * `RawEntity` of type `character` (shipped only by `iconics` and
 * `paizo-pregens`), builds a Pathbuilder-shaped record from the stashed
 * `raw_json`, and routes it through `insertIconicCharacter` which handles
 * the skip-user-imports collision rule.
 *
 * the caller now also stores the raw Foundry JSON on the
 * `characters` row so the load path can re-derive stats without a
 * re-sync when parsing logic changes (migration 0037).
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

    // Pass the raw Foundry JSON through so the DB layer can persist it
    // alongside the derived PathbuilderBuild for re-derivation on load.
    const id = await insertIconicCharacter(build, sourceToken, e.raw_json)
    if (id) inserted++
  }
  return inserted
}
