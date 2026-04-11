/** Spell rank display label: 0 → "Cantrips", N → "Rank N" */
export function rankLabel(rank: number): string {
  return rank === 0 ? 'Cantrips' : `Rank ${rank}`
}

/** PF2e action cost glyph: 1→◆, 2→◆◆, 3→◆◆◆, "free"→◇, "reaction"→↺ */
export function actionCostLabel(cost: string | null): string {
  if (!cost) return ''
  if (cost === 'free') return '◇'
  if (cost === 'reaction') return '↺'
  const n = parseInt(cost)
  if (n === 1) return '◆'
  if (n === 2) return '◆◆'
  if (n === 3) return '◆◆◆'
  return cost
}

/** Proficiency rank abbreviation: 0→"U", 2→"T", 4→"E", 6→"M", 8+→"L" */
export function profRankLabel(prof: number): string {
  if (prof >= 8) return 'L'
  if (prof >= 6) return 'M'
  if (prof >= 4) return 'E'
  if (prof >= 2) return 'T'
  return 'U'
}

/** CSS classes for proficiency rank badges */
export const PROF_RANK_CLASS: Record<string, string> = {
  U: 'bg-muted text-muted-foreground',
  T: 'bg-pf-threat-low/15 text-pf-threat-low',
  E: 'bg-pf-skill-expert/15 text-pf-skill-expert',
  M: 'bg-pf-rarity-rare/15 text-pf-rarity-rare',
  L: 'bg-pf-gold/15 text-pf-gold',
}
