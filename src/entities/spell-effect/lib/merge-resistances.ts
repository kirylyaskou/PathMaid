// ─── Resistance Merge Utility (Phase 56, D-06) ────────────────────────────────
// Merges spell effect resistances with a creature's base resistances using
// take-max-per-type strategy per PF2e rules:
// "If you have a resistance from a spell and a resistance from a magic item,
//  only the higher resistance applies."
//
// Consumer: useModifiedStats or IWR preview component that wants to show
// effective resistances including those from active spell effects.

/**
 * Merge spell effect resistances into base creature resistances.
 * For each damage type, keeps the higher value (take max per type).
 *
 * @param base     - Base creature resistances (from creature stat block)
 * @param overlays - Additional resistances from active spell effects
 * @returns Merged resistance array with one entry per type, each at max value
 */
export function mergeResistances(
  base: { type: string; value: number }[],
  overlays: { type: string; value: number }[],
): { type: string; value: number }[] {
  const map = new Map(base.map((r) => [r.type, r.value]))
  for (const r of overlays) {
    const current = map.get(r.type) ?? 0
    if (r.value > current) map.set(r.type, r.value)
  }
  return Array.from(map.entries()).map(([type, value]) => ({ type, value }))
}
