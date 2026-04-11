/** Format a numeric modifier as "+N" / "-N" string */
export function formatModifier(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

/** Build a d20 roll formula string: formatRollFormula(5) → "1d20+5", formatRollFormula(-2) → "1d20-2" */
export function formatRollFormula(modifier: number): string {
  return `1d20${modifier >= 0 ? '+' : ''}${modifier}`
}
