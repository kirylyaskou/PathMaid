import type { Combatant, NpcCombatant, PcCombatant } from '@/entities/combatant'
import type { WeakEliteTier } from '@engine'

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
  existingCombatants: Combatant[],
  level?: number,
  tier?: WeakEliteTier,
): NpcCombatant {
  return {
    kind: 'npc',
    id: crypto.randomUUID(),
    creatureRef: creatureId,
    displayName: autoName(creatureName, existingCombatants),
    initiative: rollInitiative(perception),
    hp,
    maxHp: hp,
    tempHp: 0,
    ...(level !== undefined ? { level } : {}),
    ...(tier && tier !== 'normal' ? { weakEliteTier: tier } : {}),
  }
}

/**
 * Multiple Attack Penalty calculator.
 * Source: PF2e CRB — second attack costs -5 (-4 with agile), third attack -10 (-8 with agile).
 *
 * @param mapIndex 0 = first attack (no penalty), 1 = second, 2 = third+
 * @param isAgile whether the weapon has the Agile trait
 */
export function getMAPPenalty(mapIndex: number, isAgile: boolean): number {
  if (mapIndex <= 0) return 0
  if (isAgile) return mapIndex === 1 ? -4 : -8
  return mapIndex === 1 ? -5 : -10
}

export function createPCCombatant(
  name: string,
  initiative: number,
  maxHp: number,
  creatureRef = '',
): PcCombatant {
  return {
    kind: 'pc',
    id: crypto.randomUUID(),
    creatureRef,
    displayName: name,
    initiative,
    hp: maxHp,
    maxHp,
    tempHp: 0,
  }
}
