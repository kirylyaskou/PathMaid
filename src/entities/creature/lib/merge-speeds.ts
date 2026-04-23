import type { SpeedType } from '@engine'

// Effect-provided speeds that don't exist on the base creature get appended;
// ones that do get the max of base + effect — an effect never reduces an
// existing higher base speed (Fly, Adapt Self, Angelic Wings, …).
export function mergeCreatureSpeeds(
  base: Record<string, number | null | undefined>,
  effect: Partial<Record<SpeedType, number>>,
): Record<string, number> {
  const merged: Record<string, number> = {}
  for (const [type, value] of Object.entries(base)) {
    if (typeof value === 'number' && value > 0) merged[type] = value
  }
  for (const [type, value] of Object.entries(effect)) {
    if (typeof value !== 'number' || value <= 0) continue
    merged[type] = Math.max(merged[type] ?? 0, value)
  }
  return merged
}

// PF2e min-floor: a creature's speed never drops below a single Stride (5 ft).
export function applySpeedModifier(base: number, net: number): number {
  return Math.max(5, base + net)
}
