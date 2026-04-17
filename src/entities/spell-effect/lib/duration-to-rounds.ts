export function durationToRounds(durationJson: string): number {
  let d: { unit?: string; value?: number } = {}
  try { d = JSON.parse(durationJson) } catch { return 9999 }
  const val = d.value ?? 1
  switch (d.unit) {
    case 'rounds': return val
    case 'minutes': return val * 10
    case 'hours': return val * 600
    case 'days': return val * 14400
    case 'unlimited':
    case 'until-encounter-end':
    default: return 9999
  }
}

export function formatRemainingTurns(turns: number): string {
  if (turns >= 9999) return 'unlimited'
  if (turns > 10) return `~${Math.floor(turns / 10)} min`
  return `${turns} turns`
}
