import { insertEncounterCombatant, loadEncounterCombatants, type CharacterRecord } from '@/shared/api'
import { createCharacterGroupCombatants, kindFromLegacy, toEncounterCombatant } from '@/entities/combatant'
import { useEncounterStore } from './store'

export async function addCharacterGroupToEncounter(encounterId: string, characters: CharacterRecord[]): Promise<number> {
  const existing = await loadEncounterCombatants(encounterId)
  const combatants = existing.map((c) => ({
    ...c,
    kind: kindFromLegacy(c.isNPC, c.isHazard),
  }))
  const added = createCharacterGroupCombatants(characters, combatants)
  for (const combatant of added) {
    const row = toEncounterCombatant(combatant, encounterId, existing.length)
    await insertEncounterCombatant(encounterId, row, row.sortOrder)
    existing.push(row)
    useEncounterStore.getState().setEncounterCombatants(encounterId, [...existing])
  }
  return added.length
}
