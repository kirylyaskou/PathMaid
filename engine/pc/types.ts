// ─── Pathbuilder 2e PC Types ──────────────────────────────────────────────────
// Full type coverage for Pathbuilder 2e JSON export format.
// Covers all fields needed by Phase 44 (skills, equipment, spells, feats, specials, mods).

export interface PathbuilderAbilities {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface PathbuilderAttributes {
  ancestryhp: number
  classhp: number
  bonushp: number
  bonushpPerLevel: number
  speed: number
  speedBonus: number
}

export interface PathbuilderProficiencies {
  classDC: number
  perception: number
  fortitude: number
  reflex: number
  will: number
  heavy: number
  medium: number
  light: number
  unarmored: number
  advanced: number
  martial: number
  simple: number
  unarmed: number
  castingArcane: number
  castingDivine: number
  castingOccult: number
  castingPrimal: number
}

export interface PathbuilderSpellEntry {
  name: string
  magicTradition: string      // 'arcane' | 'divine' | 'occult' | 'primal'
  spellcastingType: string    // 'prepared' | 'spontaneous' | 'focus'
  ability: string             // e.g. 'int', 'wis', 'cha'
  proficiency: number
  focusPoints?: number
  spells: Array<{ spellLevel: number; list: string[] }>
  perDay: number[]
}

export interface PathbuilderWeapon {
  name: string
  qty: number
  prof: string
  die: string
  damageType: string
  pot: number
  str: string
  runes: string[]
}

export interface PathbuilderArmor {
  name: string
  qty: number
  prof: string
  pot: number
  res: string
  runes: string[]
}

export interface PathbuilderBuild {
  name: string
  class: string
  ancestry: string
  heritage: string
  background: string
  alignment: string
  gender: string
  age: string
  deity: string
  level: number
  abilities: PathbuilderAbilities
  attributes: PathbuilderAttributes
  proficiencies: PathbuilderProficiencies
  /** Not present in actual Pathbuilder JSON — skills live in proficiencies */
  skills?: Array<{ name: string; proficiency: number; ability: string }>
  /** Array of [name, proficiency] */
  lores: Array<[string, number]>
  /** Array of [name, source, type, level, note?] */
  feats: Array<[string, string | null, string, number, string?]>
  /** Array of class feature names */
  specials: string[]
  /** Array of [name, qty, containerOrInvested?] */
  equipment: Array<[string, number, string?]>
  spellCasters: PathbuilderSpellEntry[]
  weapons: PathbuilderWeapon[]
  armor: PathbuilderArmor[]
  focusPoints: number
  focus: Record<string, unknown>
  mods: Record<string, unknown>
  formula: unknown[]
  languages: string[]
  resistances: unknown[]
  traits: string[]
  acTotal: {
    acProfBonus: number
    acAbilityBonus: number
    acItemBonus: number
  }
  pets: unknown[]
}

/** Top-level Pathbuilder 2e JSON export wrapper */
export interface PathbuilderExport {
  success: boolean
  build: PathbuilderBuild
}
