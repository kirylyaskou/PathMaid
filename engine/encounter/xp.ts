export type XpResult = { xp: number; outOfRange?: false } | { xp: null; outOfRange: true }
export type HazardType = 'simple' | 'complex'
export type ThreatRating = 'trivial' | 'low' | 'moderate' | 'severe' | 'extreme'

// ─── XP Lookup Tables ────────────────────────────────────────────────────────

// Source: PF2e GM Core Table 10-2 (https://2e.aonprd.com/Rules.aspx?ID=499)
const CREATURE_XP: Record<number, number> = {
  [-4]: 10, [-3]: 15, [-2]: 20, [-1]: 30,
  [0]: 40, [1]: 60, [2]: 80, [3]: 120, [4]: 160,
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
 * Extrapolates creature XP for delta > 4 using the table's alternating ×1.5 / ×(4/3) pattern.
 * Every 2 steps beyond +4, XP doubles (1.5 × 4/3 = 2).
 * Examples: +5 → 240, +6 → 320, +7 → 480, +9 → 960, +13 → 3840.
 */
function extrapolateCreatureXP(delta: number): number {
  const n = delta - 4
  const pairs = Math.floor(n / 2)
  return 160 * Math.pow(2, pairs) * (n % 2 === 1 ? 1.5 : 1)
}

/**
 * Returns the XP value for a single creature relative to the party level.
 *
 * - Delta below -4 returns { xp: 0 } (trivially weak, per PF2e rules).
 * - Delta -4..+4 uses the official GM Core Table 10-2 lookup.
 * - Delta above +4 extrapolates the table's alternating ×1.5 / ×(4/3) progression.
 */
export function calculateCreatureXP(
  creatureLevel: number,
  partyLevel: number,
): XpResult {
  const delta = creatureLevel - partyLevel

  if (delta < -4) return { xp: 0 }
  if (delta > 4) return { xp: extrapolateCreatureXP(delta) }
  return { xp: CREATURE_XP[delta]! }
}

/**
 * Returns the XP value for a single hazard relative to the party level.
 *
 * - Complex hazard XP equals creature XP at the same delta.
 * - Simple hazard XP equals 1/5 of complex hazard XP.
 * - Delta below -4 returns { xp: 0 } (trivially weak, per PF2e rules).
 * - Delta -4..+4 uses the official GM Core lookup tables.
 * - Delta above +4 extrapolates using the same ×1.5 / ×(4/3) progression as creatures.
 */
export function getHazardXp(
  hazardLevel: number,
  partyLevel: number,
  type: HazardType,
): XpResult {
  const level = Math.max(hazardLevel, 0)
  const delta = level - partyLevel

  if (delta < -4) return { xp: 0 }

  if (delta > 4) {
    const creatureXp = extrapolateCreatureXP(delta)
    return { xp: type === 'complex' ? creatureXp : creatureXp / 5 }
  }

  if (type === 'complex') {
    return { xp: CREATURE_XP[delta]! }
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
 */
export function calculateXP(
  creatures: number[],
  hazards: Array<{ level: number; type: HazardType }>,
  partyLevel: number,
  partySize: number,
): EncounterResult {
  if (partySize === 0) throw new Error('Party size cannot be 0')

  const warnings: OutOfRangeWarning[] = []
  let totalXp = 0

  const creatureEntries: EncounterCreatureEntry[] = creatures.map(level => {
    const result = calculateCreatureXP(level, partyLevel)
    if (result.outOfRange) {
      warnings.push({ type: 'outOfRange', creatureLevel: level, partyLevel })
      return { level, xp: null, outOfRange: true }
    }
    totalXp += result.xp
    return { level, xp: result.xp }
  })

  const hazardEntries: EncounterHazardEntry[] = hazards.map(h => {
    const result = getHazardXp(h.level, partyLevel, h.type)
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
  SIMPLE_HAZARD_XP,
}
