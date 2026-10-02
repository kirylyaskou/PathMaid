export { rankLabel, actionCostLabel } from '@/shared/lib/pf2e-display'

export const TRADITION_COLORS: Record<string, string> = {
  arcane:  'bg-blue-500/20 text-blue-300 border-blue-500/40',
  divine:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  occult:  'bg-purple-500/20 text-purple-300 border-purple-500/40',
  primal:  'bg-green-500/20 text-green-300 border-green-500/40',
}

export function resolveSpellDamageFormula(formula: string, rank: number): string {
  return formula.replace(/@item\.rank/g, String(rank))
}

export function parseDamageDisplay(damageJson: string | null, rank?: number): string {
  if (!damageJson) return '—'
  try {
    const dmg = JSON.parse(damageJson) as Record<string, { formula?: string; damage?: string; damageType?: string; type?: string }>
    const first = Object.values(dmg)[0]
    if (!first) return '—'
    const formula = first.formula ?? first.damage ?? '?'
    return `${rank == null ? formula : resolveSpellDamageFormula(formula, rank)} ${first.damageType ?? first.type ?? ''}`.trim() || '—'
  } catch {
    return '—'
  }
}

export function parseAreaDisplay(areaJson: string | null): string | null {
  if (!areaJson) return null
  try {
    const a = JSON.parse(areaJson) as { type?: string; value?: number }
    return a.value ? `${a.value}-foot ${a.type}` : null
  } catch {
    return null
  }
}
