// engine/creature-building/getBenchmark.ts
//
// Public lookup + inverse-classifier for creature benchmark tables.
// Consumed by BenchmarkHint (dropdown "Set to tier..."), sanity checker,
// role-apply, and Design Review.

import { BENCHMARK_TABLES, SAFE_ITEM_LEVEL_TABLE } from './benchmarks'
import type { StatKind, Tier, DamageBenchmark } from './types'

export { BENCHMARK_TABLES, SAFE_ITEM_LEVEL_TABLE } from './benchmarks'

// D-05: overloads so strikeDamage / areaDamage return DamageBenchmark,
// all other simple stats return number.
export function getBenchmark(stat: 'strikeDamage', level: number, tier: Tier): DamageBenchmark
export function getBenchmark(stat: 'areaDamage', level: number, _tier?: Tier, frequency?: 'unlimited' | 'limited'): DamageBenchmark
export function getBenchmark(stat: 'safeItemLevel', level: number): number
export function getBenchmark(
  stat: Exclude<StatKind, 'strikeDamage' | 'areaDamage'>,
  level: number,
  tier: Tier
): number
export function getBenchmark(
  stat: StatKind | 'safeItemLevel',
  level: number,
  tier?: Tier,
  frequency?: 'unlimited' | 'limited'
): number | DamageBenchmark {
  const L = Math.max(-1, Math.min(24, level))
  if (stat === 'safeItemLevel') return SAFE_ITEM_LEVEL_TABLE[L]
  if (stat === 'strikeDamage') return BENCHMARK_TABLES.strikeDamage[L][tier!]
  if (stat === 'areaDamage') {
    return frequency === 'limited'
      ? BENCHMARK_TABLES.areaDamageLimited[L]
      : BENCHMARK_TABLES.areaDamageUnlimited[L]
  }
  // StatKind -> BENCHMARK_TABLES key mapping. `attackBonus` is stored under `strikeAttack`.
  const key = (stat === 'attackBonus' ? 'strikeAttack' : stat) as
    | 'abilityMod' | 'perception' | 'skill' | 'ac' | 'save' | 'hp'
    | 'resistanceWeakness' | 'strikeAttack' | 'spellDC' | 'spellAttack'
  const table = BENCHMARK_TABLES[key]
  return table[L][tier!]
}

// D-06: nearest-tier inverse. Linear scan over 5 tiers, pick the tier with the
// smallest absolute delta. Works uniformly for all numeric stats (including HP
// because benchmarks.ts stores HP as midpoints, not ranges).
// If value is below all thresholds the scan still returns the closest tier,
// which in practice is 'terrible' — matching the D-28 contract (D-06: "falls
// back to 'terrible' below all thresholds").
export function classifyStat(
  stat: Exclude<StatKind, 'strikeDamage' | 'areaDamage'>,
  level: number,
  value: number
): Tier {
  const L = Math.max(-1, Math.min(24, level))
  const tiers: Tier[] = ['extreme', 'high', 'moderate', 'low', 'terrible']
  const key = (stat === 'attackBonus' ? 'strikeAttack' : stat) as
    | 'abilityMod' | 'perception' | 'skill' | 'ac' | 'save' | 'hp'
    | 'resistanceWeakness' | 'strikeAttack' | 'spellDC' | 'spellAttack'
  const entry = BENCHMARK_TABLES[key][L]
  let bestTier: Tier = 'terrible'
  let bestDiff = Number.POSITIVE_INFINITY
  for (const t of tiers) {
    const diff = Math.abs(value - entry[t])
    if (diff < bestDiff) {
      bestDiff = diff
      bestTier = t
    }
  }
  // D-06 explicit fallback: if value is strictly below the terrible threshold,
  // force 'terrible' regardless of what rounding picked.
  if (value < entry.terrible) return 'terrible'
  return bestTier
}
