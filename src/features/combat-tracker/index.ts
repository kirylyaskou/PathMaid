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
