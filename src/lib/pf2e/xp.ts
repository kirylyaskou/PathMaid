export type XpResult = { xp: number; outOfRange?: false } | { xp: null; outOfRange: true }
export type HazardType = 'simple' | 'complex'
export type ThreatRating = 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme'

// ─── XP Lookup Tables ────────────────────────────────────────────────────────

// Source: PF2e GM Core Table 10-2 (https://2e.aonprd.com/Rules.aspx?ID=499)
const CREATURE_XP: Record<number, number> = {
  [-4]: 10, [-3]: 15, [-2]: 20, [-1]: 30,
  [0]: 40, [1]: 60, [2]: 80, [3]: 120, [4]: 160,
}

// Source: Gamemastery Guide Table 4-18 (https://2e.aonprd.com/Rules.aspx?ID=1370)
const PWOL_CREATURE_XP: Record<number, number> = {
  [-7]: 9, [-6]: 12, [-5]: 14, [-4]: 18, [-3]: 21, [-2]: 26, [-1]: 32,
  [0]: 40, [1]: 48, [2]: 60, [3]: 72, [4]: 90, [5]: 108, [6]: 135, [7]: 160,
}

// Source: GM Core (https://2e.aonprd.com/Rules.aspx?ID=2649)
// Simple hazard XP = 1/5 of complex hazard XP (which equals creature XP)
const SIMPLE_HAZARD_XP: Record<number, number> = {
  [-4]: 2, [-3]: 3, [-2]: 4, [-1]: 6,
  [0]: 8, [1]: 12, [2]: 16, [3]: 24, [4]: 32,
}

// Complex hazard XP = creature XP at same delta (no separate table needed;
// CREATURE_XP is used directly in getHazardXp for complex hazards)

// ─── Functions ───────────────────────────────────────────────────────────────

/**
 * Returns the XP value for a single creature relative to the party level.
 *
 * - Negative creature levels are treated as level 0.
 * - Delta below table minimum returns { xp: 0 } (trivially weak).
 * - Delta above table maximum returns { xp: null, outOfRange: true }.
 * - When `pwol: true`, uses the extended Proficiency Without Level table (-7 to +7).
 */
export function calculateCreatureXP(
  creatureLevel: number,
  partyLevel: number,
  options?: { pwol?: boolean }
): XpResult {
  const level = Math.max(creatureLevel, 0)
  const delta = level - partyLevel
  const pwol = options?.pwol ?? false
  const table = pwol ? PWOL_CREATURE_XP : CREATURE_XP
  const minDelta = pwol ? -7 : -4
  const maxDelta = pwol ? 7 : 4

  if (delta < minDelta) return { xp: 0 }
  if (delta > maxDelta) return { xp: null, outOfRange: true }
  return { xp: table[delta]! }
}

/**
 * Returns the XP value for a single hazard relative to the party level.
 *
 * - Complex hazard XP equals creature XP at the same delta.
 * - Simple hazard XP equals 1/5 of complex hazard XP (floored for PWOL).
 * - Out-of-range behavior matches creatures: 0 below min, null+flag above max.
 */
export function getHazardXp(
  hazardLevel: number,
  partyLevel: number,
  type: HazardType,
  options?: { pwol?: boolean }
): XpResult {
  const level = Math.max(hazardLevel, 0)
  const delta = level - partyLevel
  const pwol = options?.pwol ?? false
  const minDelta = pwol ? -7 : -4
  const maxDelta = pwol ? 7 : 4

  if (delta < minDelta) return { xp: 0 }
  if (delta > maxDelta) return { xp: null, outOfRange: true }

  if (type === 'complex') {
    const table = pwol ? PWOL_CREATURE_XP : CREATURE_XP
    return { xp: table[delta]! }
  }

  // Simple hazard
  if (pwol) {
    return { xp: Math.floor(PWOL_CREATURE_XP[delta]! / 5) }
  }
  return { xp: SIMPLE_HAZARD_XP[delta]! }
}

// ─── Encounter Budget & Rating ──────────────────────────────────────────────

// Source: GM Core Table 10-1 (https://2e.aonprd.com/Rules.aspx?ID=498)
const BASE_BUDGETS: Record<ThreatRating, number> = {
  trivial: 40, low: 60, moderate: 80, severe: 120, extreme: 160,
}

const CHARACTER_ADJUSTMENTS: Record<ThreatRating, number> = {
  trivial: 10, low: 20, moderate: 20, severe: 30, extreme: 40,
}

/**
 * Returns encounter budget thresholds scaled for the given party size.
 *
 * Base budgets assume a party of 4. Each additional (or fewer) character
 * adjusts each threshold by a threat-level-specific amount.
 */
export function generateEncounterBudgets(partySize: number): Record<ThreatRating, number> {
  if (partySize === 0) throw new Error('Party size cannot be 0')
  const diff = partySize - 4
  return {
    trivial:  BASE_BUDGETS.trivial  + diff * CHARACTER_ADJUSTMENTS.trivial,
    low:      BASE_BUDGETS.low      + diff * CHARACTER_ADJUSTMENTS.low,
    moderate: BASE_BUDGETS.moderate  + diff * CHARACTER_ADJUSTMENTS.moderate,
    severe:   BASE_BUDGETS.severe   + diff * CHARACTER_ADJUSTMENTS.severe,
    extreme:  BASE_BUDGETS.extreme  + diff * CHARACTER_ADJUSTMENTS.extreme,
  }
}

/**
 * Maps a total encounter XP value to a threat rating string for the given party size.
 *
 * The rating is determined by finding the highest budget threshold the total XP exceeds:
 * - totalXp <= trivial -> 'trivial'
 * - totalXp <= low -> 'low'
 * - totalXp <= moderate -> 'moderate'
 * - totalXp <= severe -> 'severe'
 * - totalXp > severe -> 'extreme'
 */
export function calculateEncounterRating(totalXp: number, partySize: number): ThreatRating {
  const budgets = generateEncounterBudgets(partySize)
  if (totalXp > budgets.severe) return 'extreme'
  if (totalXp > budgets.moderate) return 'severe'
  if (totalXp > budgets.low) return 'moderate'
  if (totalXp > budgets.trivial) return 'low'
  return 'trivial'
}

// ─── Orchestrator Types & Function ──────────────────────────────────────────

export interface EncounterCreatureEntry { level: number; xp: number | null; outOfRange?: boolean }
export interface EncounterHazardEntry { level: number; type: HazardType; xp: number | null; outOfRange?: boolean }
export interface OutOfRangeWarning { type: 'outOfRange'; creatureLevel?: number; hazardLevel?: number; partyLevel: number }
export interface EncounterResult {
  totalXp: number
  rating: ThreatRating
  creatures: EncounterCreatureEntry[]
  hazards: EncounterHazardEntry[]
  warnings: OutOfRangeWarning[]
}

/**
 * Full encounter XP orchestrator. Computes per-entity XP breakdown, total XP,
 * threat rating, and out-of-range warnings.
 *
 * Propagates `pwol` option to all sub-functions automatically.
 */
export function calculateXP(
  creatures: number[],
  hazards: Array<{ level: number; type: HazardType }>,
  partyLevel: number,
  partySize: number,
  options?: { pwol?: boolean }
): EncounterResult {
  if (partySize === 0) throw new Error('Party size cannot be 0')

  const warnings: OutOfRangeWarning[] = []
  let totalXp = 0

  const creatureEntries: EncounterCreatureEntry[] = creatures.map(level => {
    const result = calculateCreatureXP(level, partyLevel, options)
    if (result.outOfRange) {
      warnings.push({ type: 'outOfRange', creatureLevel: level, partyLevel })
      return { level, xp: null, outOfRange: true }
    }
    totalXp += result.xp
    return { level, xp: result.xp }
  })

  const hazardEntries: EncounterHazardEntry[] = hazards.map(h => {
    const result = getHazardXp(h.level, partyLevel, h.type, options)
    if (result.outOfRange) {
      warnings.push({ type: 'outOfRange', hazardLevel: h.level, partyLevel })
      return { level: h.level, type: h.type, xp: null, outOfRange: true }
    }
    totalXp += result.xp
    return { level: h.level, type: h.type, xp: result.xp }
  })

  const rating = calculateEncounterRating(totalXp, partySize)

  return { totalXp, rating, creatures: creatureEntries, hazards: hazardEntries, warnings }
}

// ─── Test-only exports ───────────────────────────────────────────────────────

export const __testing = {
  CREATURE_XP,
  PWOL_CREATURE_XP,
  SIMPLE_HAZARD_XP,
}
