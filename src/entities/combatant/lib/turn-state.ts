import { isNpc, type Combatant } from '../model/types'

export function shouldSkipTurn(combatant: Combatant): boolean {
  return (isNpc(combatant) && combatant.mortal === true && combatant.hp <= 0)
    || (combatant.kind === 'hazard' && (combatant.hazardDisabled === true || (combatant.maxHp > 0 && combatant.hp <= 0)))
}
