/** Format a numeric modifier as "+N" / "-N" string */
export function formatModifier(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}
