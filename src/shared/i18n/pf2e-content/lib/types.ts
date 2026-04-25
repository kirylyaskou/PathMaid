/**
 * Pack-native overlay shape for a localized PF2e monster entry.
 *
 * Each field is an optional dental delta from a Babele actor entry — the
 * upstream module ships only the strings that actually differ from English
 * (numeric stats, ability scores, AC/HP/save totals all stay in the engine
 * source of truth and are NOT mirrored here).
 *
 * Label strings (skill names, save labels, ability score abbreviations,
 * perception label, language slug-to-localized mapping) are NOT stored
 * per-monster — they live in dictionary getters fed from PF2E.* keys in
 * the bundled UI strings file.
 */
export interface MonsterStructuredLoc {
  blurb?: string
  description?: string
  descriptionGM?: string
  languageDetails?: string
  sensesDetails?: string
  speedDetails?: string
  hpDetails?: string
  acDetails?: string
  allSavesDetails?: string
  stealthDetails?: string
  skillsDetails?: Record<string, { details?: string }>
  items: Array<{
    id: string
    name: string
    description?: string
    rules?: Record<string, { label?: string }>
  }>
}

/**
 * Single ability/feat/spell entry attached to an actor — sourced from
 * the actor's `items[]` collection in the upstream pack.
 */
export interface AbilityLoc {
  name: string
  description?: string
}
