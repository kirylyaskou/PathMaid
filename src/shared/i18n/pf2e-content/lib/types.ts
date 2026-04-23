/**
 * Structured localization output for a parsed PF2e monster stat block.
 *
 * WHY numeric values are absent:
 *   Bonuses (+16), damage dice (2d8+8), HP totals, AC values, DC numbers —
 *   all are computed and owned by the engine (engine.creature.*). The RU
 *   overlay touches only textual labels and names. Parsing numeric values
 *   from HTML would duplicate engine-authoritative data and create a
 *   two-source-of-truth risk. Consumers read the structured fields here
 *   and fall back to engine for all numeric rendering.
 */
export interface MonsterStructuredLoc {
  abilitiesLoc: AbilityLoc[]
  skillsLoc: SkillLoc[]
  speedsLoc: SpeedsLoc
  savesLoc: SavesLoc
  acLoc: { label: string }
  hpLoc: { label: string }
  weaknessesLoc: string[]
  resistancesLoc: string[]
  immunitiesLoc: string[]
  perceptionLoc: { label: string; senses: string }
  languagesLoc: string[]
  strikesLoc: StrikeLoc[]
  spellcastingLoc: { headingLabel: string }
  abilityScoresLoc: AbilityScoresLoc
}

/**
 * Six ability-score labels as rendered in the RU stat block.
 * pf2.ru uses 2-3 letter Cyrillic abbreviations; the exact spelling
 * varies by source (e.g. "Лвк" vs "Лов" for Dexterity). Parser reads
 * whatever the HTML ships and maps positionally — bonuses are omitted
 * because the engine owns numeric values.
 */
export interface AbilityScoresLoc {
  /** Strength label — pf2.ru typically "Сил" */
  strLabel: string
  /** Dexterity label — pf2.ru typically "Лвк" */
  dexLabel: string
  /** Constitution label — pf2.ru typically "Вын" */
  conLabel: string
  /** Intelligence label — pf2.ru typically "Инт" */
  intLabel: string
  /** Wisdom label — pf2.ru typically "Мдр" */
  wisLabel: string
  /** Charisma label — pf2.ru typically "Хар" */
  chaLabel: string
}

export interface AbilityLoc {
  name: string
  /** markdown-lite: **bold** / *italic* / \n for line breaks */
  description: string
  actionCount: 1 | 2 | 3 | null
  traits: string[]
}

export interface SkillLoc {
  /** RU display name (e.g. "Акробатика") */
  name: string
  /** EN lookup key (e.g. "Acrobatics") — canonical engine.creature.skills[].name */
  engineKey: string
  /** parsed from HTML for debug verification; UI consumers use engine value, not this */
  bonus: number
}

export interface SpeedsLoc {
  /** RU-formatted string: "25 футов" */
  land?: string
  /** "35 футов" */
  fly?: string
  climb?: string
  burrow?: string
  swim?: string
}

export interface SavesLoc {
  /** "Стойкость" */
  fortLabel: string
  /** "Реакция" */
  refLabel: string
  /** "Воля" */
  willLabel: string
}

export interface StrikeLoc {
  /** "когти" / "огненный шар" */
  name: string
  /** "режущий" / "огонь" */
  damageType: string
}
