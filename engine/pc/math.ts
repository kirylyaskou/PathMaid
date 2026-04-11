/** PF2e ability modifier: floor((score - 10) / 2) */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** PF2e proficiency modifier: abilityMod + level + profBonus (or just abilityMod if untrained) */
export function proficiencyModifier(profBonus: number, abilityScore: number, level: number): number {
  const mod = abilityModifier(abilityScore)
  return profBonus > 0 ? mod + level + profBonus : mod
}
