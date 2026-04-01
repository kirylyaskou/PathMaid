export { useCombatTrackerStore } from './model/store'
export type { CombatTrackerState } from './model/store'
export {
  applyCondition,
  removeCondition,
  endTurnConditions,
  setConditionLocked,
  clearCombatantManager,
  clearAllManagers,
  getManagerState,
  hydrateManager,
} from './lib/condition-bridge'
export { AddPCDialog } from './ui/AddPCDialog'
export { CombatControls } from './ui/CombatControls'
export { rollInitiative, autoName, createCombatantFromCreature, createPCCombatant } from './lib/initiative'
