import type { Creature } from '@/types/combat'

export function sortByInitiative(creatures: Creature[]): Creature[] {
  return [...creatures].sort((a, b) => {
    if (b.initiative !== a.initiative) {
      return b.initiative - a.initiative
    }
    return (b.dexMod || 0) - (a.dexMod || 0)
  })
}

export function getNextCreatureIndex(currentTurnIndex: number, totalCreatures: number): number {
  if (totalCreatures === 0) return -1
  return (currentTurnIndex + 1) % totalCreatures
}
