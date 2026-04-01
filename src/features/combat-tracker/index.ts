export { useCombatTrackerStore } from './model/store'
export type { CombatTrackerState } from './model/store'
export {
  applyCondition,
  removeCondition,
  endTurnConditions,
  setConditionValue,
  setConditionLocked,
  clearCombatantManager,
  clearAllManagers,
  getManagerState,
  hydrateManager,
} from './lib/condition-bridge'
export { advanceTurn, reverseTurn, canReverseTurn, clearTurnSnapshot } from './lib/turn-manager'
export { setupAutoSave, teardownAutoSave, loadActiveCombat } from './lib/combat-persistence'
export { AddPCDialog } from './ui/AddPCDialog'
export { CombatControls } from './ui/CombatControls'
export { TurnControls } from './ui/TurnControls'
export { rollInitiative, autoName, createCombatantFromCreature, createPCCombatant } from './lib/initiative'
