export function formatPrice(gp: number | null): string {
  if (gp === null) return '\u2014'
  if (gp >= 1) return `${gp} gp`
  if (gp >= 0.1) return `${Math.round(gp * 10)} sp`
  return `${Math.round(gp * 100)} cp`
}
