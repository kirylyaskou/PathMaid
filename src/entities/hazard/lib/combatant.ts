import type { HazardRow } from '@/shared/api'

export function createCombatantFromHazard(hazard: HazardRow) {
  const hp = hazard.has_health ? hazard.hp ?? 0 : 0
  return {
    id: crypto.randomUUID(),
    creatureRef: hazard.id,
    displayName: hazard.name_loc ?? hazard.name,
    initiative: Math.floor(Math.random() * 20) + 1 + (hazard.stealth_dc ?? 0),
    initiativeBonus: hazard.stealth_dc ?? 0,
    hp,
    maxHp: hp,
    tempHp: 0,
    level: hazard.level,
    kind: 'hazard' as const,
    side: 'enemy' as const,
  }
}
