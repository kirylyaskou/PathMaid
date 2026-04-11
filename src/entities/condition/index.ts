export { useConditionStore } from './model/store'
export type { ConditionState } from './model/store'
export type { ActiveCondition, ConditionSlug, ValuedCondition } from './model/types'
export { ConditionBadge } from './ui/ConditionBadge'
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
