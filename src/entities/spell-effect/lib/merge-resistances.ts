/**
 * Merge spell effect resistances into base creature resistances.
 * For each damage type, keeps the higher value (take max per type).
 * New types from overlays are added if not present in base.
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
