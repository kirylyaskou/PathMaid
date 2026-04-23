type IntervalHeighten = { type: 'interval'; perRanks: number; damage: Record<string, string> }
type FixedHeighten = { type: 'fixed'; levels: Record<string, unknown> }
type HeightenSpec = IntervalHeighten | FixedHeighten

export interface HeightenPreviewEntry {
  damageType: string | null
  deltaFormula: string
}

/**
 * Preview heighten damage delta for a spell cast at a rank above its base.
 *
 * Only `interval` heighten is supported here — `fixed` heighten (magic missile-
 * style) returns `null` because its damage transformation is not expressible
 * as a uniform delta per increment.
 *
 * `damageJson` is the `SpellRow.damage` JSON blob (Foundry shape:
 * `Record<key, { damageType, ... }>`). Keys in `heightened.damage` refer to
 * the same entries — we look up the damage type for each.
 */
export function computeHeightenPreview(args: {
  baseRank: number
  heightenedJson: string | null
  damageJson: string | null
  targetRank: number
}): HeightenPreviewEntry[] | null {
  const { baseRank, heightenedJson, damageJson, targetRank } = args
  if (!heightenedJson) return null
  if (targetRank <= baseRank) return null

  let spec: HeightenSpec | null = null
  try {
    spec = JSON.parse(heightenedJson) as HeightenSpec
  } catch {
    return null
  }
  if (!spec || spec.type !== 'interval') return null

  const perRanks = Math.max(1, spec.perRanks)
  const increments = Math.floor((targetRank - baseRank) / perRanks)
  if (increments <= 0) return null

  let damageByKey: Record<string, { damageType?: string; type?: string }> | null = null
  if (damageJson) {
    try {
      damageByKey = JSON.parse(damageJson) as typeof damageByKey
    } catch {
      damageByKey = null
    }
  }

  const entries: HeightenPreviewEntry[] = []
  for (const [key, addFormula] of Object.entries(spec.damage)) {
    const damageEntry = damageByKey?.[key]
    const damageType = damageEntry?.damageType ?? damageEntry?.type ?? null
    entries.push({
      damageType,
      deltaFormula: multiplyDice(addFormula, increments),
    })
  }
  return entries.length > 0 ? entries : null
}

/**
 * `'2d6' × 5` → `'10d6'`. `'1d4+2' × 3` → `'3d4+6'`. Only multiplies the
 * leading dice term and any trailing constant — other terms fall through
 * as joined additions (e.g. `'2d6+1d4' × 2` → `'2d6+1d4+2d6+1d4'`).
 */
function multiplyDice(formula: string, n: number): string {
  if (n <= 0) return ''
  if (n === 1) return `+${formula.trim()}`
  const trimmed = formula.trim()
  const diceMatch = trimmed.match(/^(\d+)d(\d+)(?:\s*\+\s*(\d+))?$/i)
  if (diceMatch) {
    const count = Number(diceMatch[1]) * n
    const sides = diceMatch[2]
    const constant = diceMatch[3] ? Number(diceMatch[3]) * n : null
    return `+${count}d${sides}${constant !== null ? `+${constant}` : ''}`
  }
  return `+${Array<string>(n).fill(trimmed).join('+')}`
}
