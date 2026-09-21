import type { Combatant } from '../model/types'

export function resetCombatant(combatant: Combatant): Combatant {
  const maxHp = combatant.baseMaxHp ?? combatant.maxHp
  const reset = { ...combatant, hp: maxHp, maxHp, tempHp: 0, initiative: 0 }
  delete reset.baseMaxHp
  if (reset.kind === 'npc') {
    delete reset.permaDead
    delete reset.shieldRaised
    delete reset.mapIndex
  }
  return reset
}
