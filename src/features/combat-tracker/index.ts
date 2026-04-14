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
} from '@/entities/condition'
export { advanceTurn, reverseTurn, canReverseTurn, clearTurnSnapshot } from './lib/turn-manager'
export { setupAutoSave, teardownAutoSave, loadActiveCombat } from './lib/combat-persistence'
export { AddPCDialog } from './ui/AddPCDialog'
export { QuickAddCombatantForm } from './ui/QuickAddCombatantForm'
export { CombatControls } from './ui/CombatControls'
export { TurnControls } from './ui/TurnControls'
export { rollInitiative, autoName, createCombatantFromCreature, createPCCombatant, getMAPPenalty } from './lib/initiative'
export { useEncounterTabsStore, createEmptySnapshot, snapshotFromGlobalStores, restoreSnapshotToGlobalStores } from './model/encounter-tabs-store'
export type { EncounterTabsState } from './model/encounter-tabs-store'
export type { EncounterTab, TabSnapshot } from './model/encounter-tabs-store'
export type { PendingPersistentDamage } from './model/store'
export { ConditionCombobox } from './ui/ConditionCombobox'
export { EffectPickerDialog } from './ui/EffectPickerDialog'
export {
  setupEncounterAutoSave,
  teardownEncounterAutoSave,
  loadEncounterIntoCombat,
  flushEncounterSave,
} from './lib/encounter-persistence'
