// Phase 68 D-68-04: classify a spell effect as buff/debuff/neutral so the
// picker can default-select a sensible allegiance bucket.
//
// Heuristic over the spell_effects.rules_json payload (the same rule set
// parsed by the engine's FlatModifier reader):
//
//   buff   — at least one FlatModifier with positive value and NO `target:*`
//            predicate atom. Default selection = caster's allies.
//   debuff — at least one FlatModifier with negative value, OR any predicate
//            atom starting with `target:`. Default selection = caster's
//            enemies.
//   self   — otherwise (no FlatModifier signal; cantrip-style utility).
//            Default selection = caster.
//
// The predicate DSL is walked shallowly; nested {and/or/not} nodes are traversed
// so `target:*` inside an inner combinator still tags the rule as debuff.

export type EffectKind = 'buff' | 'debuff' | 'self'

export function classifyEffectKind(rulesJson: string): EffectKind {
  let rules: unknown[]
  try {
    rules = JSON.parse(rulesJson)
  } catch {
    return 'self'
  }
  if (!Array.isArray(rules)) return 'self'

  let hasPositiveBuff = false
  let hasNegative = false
  let touchesTarget = false

  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    if (r.key !== 'FlatModifier') continue

    const predicate = Array.isArray(r.predicate) ? r.predicate : undefined
    const predicateHitsTarget = predicate ? predicateReferencesTarget(predicate) : false
    if (predicateHitsTarget) touchesTarget = true

    // Only numeric values give us a sign we can read. String expression values
    // (Heroism ternary etc.) are treated as positive for default-selection —
    // they invariably scale upward with rank.
    const value = r.value
    if (typeof value === 'number') {
      if (value > 0 && !predicateHitsTarget) hasPositiveBuff = true
      else if (value < 0) hasNegative = true
    } else if (typeof value === 'string' && !predicateHitsTarget) {
      hasPositiveBuff = true
    }
  }

  if (hasNegative || touchesTarget) return 'debuff'
  if (hasPositiveBuff) return 'buff'
  return 'self'
}

function predicateReferencesTarget(predicate: unknown[]): boolean {
  for (const atom of predicate) {
    if (typeof atom === 'string' && atom.startsWith('target:')) return true
    if (atom && typeof atom === 'object') {
      const obj = atom as Record<string, unknown>
      for (const k of ['and', 'or', 'not', 'nor', 'xor']) {
        const inner = obj[k]
        if (Array.isArray(inner) && predicateReferencesTarget(inner)) return true
        if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
          // e.g. {not: {something}} — wrap as array for the walk.
          if (predicateReferencesTarget([inner])) return true
        } else if (typeof inner === 'string' && inner.startsWith('target:')) {
          return true
        }
      }
    }
  }
  return false
}
