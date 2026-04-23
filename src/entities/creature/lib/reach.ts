// Base melee reach (feet) for a creature's display size. Custom-creature
// strikes don't populate strike.reach at build time, so the UI falls back
// to this mapping to render the "Reach N ft" badge. Must match the
// size→reach rules used by toCreatureStatBlockData for Foundry docs.
export function baseReachFromDisplaySize(size: string): number {
  switch (size) {
    case 'Tiny': return 0
    case 'Small':
    case 'Medium': return 5
    case 'Large': return 10
    case 'Huge': return 15
    case 'Gargantuan': return 20
    default: return 5
  }
}

// Extract reach (feet) declared by weapon traits. Returns undefined when
// traits carry no reach information — caller falls back to baseReach.
export function reachFromTraits(traits: string[], baseReach: number): number | undefined {
  for (const t of traits) {
    const m = /^reach-(\d+)$/.exec(t)
    if (m) return parseInt(m[1], 10)
  }
  if (traits.includes('reach')) return baseReach + 5
  return undefined
}
