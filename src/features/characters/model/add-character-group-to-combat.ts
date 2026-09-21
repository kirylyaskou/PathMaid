import { insertEncounterCombatant, type CharacterRecord } from '@/shared/api'
import { createCharacterGroupCombatants, toEncounterCombatant, useCombatantStore } from '@/entities/combatant'
import { useCombatTrackerStore, useEncounterTabsStore, snapshotFromGlobalStores } from '@/features/combat-tracker'

export async function addCharacterGroupToCombat(characters: CharacterRecord[], groupName: string): Promise<number> {
  const tabs = useEncounterTabsStore.getState()
  if (!tabs.activeTabId) {
    const snapshot = snapshotFromGlobalStores()
    tabs.openTab({
      encounterId: snapshot.isEncounterBacked ? snapshot.combatId : null,
      name: groupName,
      snapshot,
      isStarted: snapshot.isRunning,
    })
  }
  const existing = useCombatantStore.getState().combatants
  const added = createCharacterGroupCombatants(characters, existing)
  const { combatId, isEncounterBacked } = useCombatTrackerStore.getState()
  for (const combatant of added) {
    if (isEncounterBacked && combatId) {
      const row = toEncounterCombatant(combatant, combatId, useCombatantStore.getState().combatants.length)
      await insertEncounterCombatant(combatId, row, row.sortOrder)
    }
    useCombatantStore.getState().addCombatant(combatant)
  }
  useEncounterTabsStore.getState().updateActiveSnapshot()
  return added.length
}
