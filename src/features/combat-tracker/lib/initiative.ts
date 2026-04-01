import type { Combatant } from '@/entities/combatant'

export function rollInitiative(perception: number): number {
  return perception + Math.floor(Math.random() * 20) + 1
}

export function autoName(baseName: string, existingCombatants: Combatant[]): string {
  const pattern = new RegExp(`^${escapeRegex(baseName)}(\\s+\\d+)?$`)
  const matches = existingCombatants.filter((c) => pattern.test(c.displayName))
  if (matches.length === 0) return baseName
  let max = 0
  for (const c of matches) {
    const match = c.displayName.match(/\s+(\d+)$/)
    if (match) {
      max = Math.max(max, parseInt(match[1], 10))
    } else {
      max = Math.max(max, 1)
    }
  }
  return `${baseName} ${max + 1}`
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function createCombatantFromCreature(
  creatureId: string,
  creatureName: string,
  perception: number,
  hp: number,
  existingCombatants: Combatant[]
): Combatant {
  return {
    id: crypto.randomUUID(),
    creatureRef: creatureId,
    displayName: autoName(creatureName, existingCombatants),
    initiative: rollInitiative(perception),
    hp,
    maxHp: hp,
    tempHp: 0,
    isNPC: true,
  }
}

export function createPCCombatant(
  name: string,
  initiative: number,
  maxHp: number
): Combatant {
  return {
    id: crypto.randomUUID(),
    creatureRef: '',
    displayName: name,
    initiative,
    hp: maxHp,
    maxHp,
    tempHp: 0,
    isNPC: false,
  }
}
