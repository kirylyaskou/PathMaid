// Phase 68 D-68-05: derive the declared target cap for a spell from action
// cost metadata + description prose.
//
// Sources checked (first match wins):
//   1. 3-action spells with "up to N" prose (e.g. 3-action Heal → "up to 6 willing creatures").
//   2. Generic "N (willing creatures|creatures|allies|targets)" in the description.
//   3. Fallback: 1.
//
// We do not try to parse the full PF2e target language — exotic shapes
// (cones, emanations, area-only) fall back to single-target. The picker
// treats N === 1 as single-target radio mode, N > 1 as checkbox mode.

export interface SpellWithCost {
  action_cost: string | null
  description: string | null
}

export function getMaxTargets(spell: SpellWithCost): number {
  const desc = spell.description ?? ''

  if (spell.action_cost === '3' || spell.action_cost === '[three-actions]') {
    const m = /up to (\d+)/i.exec(desc)
    if (m) {
      const n = parseInt(m[1], 10)
      if (Number.isFinite(n) && n > 0) return n
    }
  }

  const m2 = /(\d+)\s+(willing creatures|creatures|allies|targets)/i.exec(desc)
  if (m2) {
    const n = parseInt(m2[1], 10)
    if (Number.isFinite(n) && n > 0) return n
  }

  return 1
}
