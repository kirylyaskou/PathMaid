import {
  loadCombatStartSnapshot, saveCombatStartSnapshot, saveCombatState,
  saveEncounterCombatants, saveEncounterStagingCombatants, resetEncounterCombat,
} from '@/shared/api'
import { useCombatantStore, resetCombatant, toEncounterCombatant } from '@/entities/combatant'
import { clearCombatantManager } from '@/entities/condition'
import { useBattleFormOverridesStore, useRollOptionsStore, useEffectStore } from '@/entities/spell-effect'
import { useEncounterStore } from '@/entities/encounter'
import { useCombatTrackerStore } from '../model/store'
import { useEncounterTabsStore, snapshotFromGlobalStores, restoreSnapshotToGlobalStores, type TabSnapshot } from '../model/encounter-tabs-store'
import { clearTurnSnapshot } from './turn-manager'
import { stopEncounterAutoSave, setupEncounterAutoSave } from './encounter-persistence'
import { stopAutoSave, setupAutoSave } from './combat-persistence'

export async function startActiveCombat(): Promise<void> {
  const tabs = useEncounterTabsStore.getState()
  const tab = tabs.getActiveTab()
  const snapshot = snapshotFromGlobalStores()
  if (snapshot.combatants.length === 0) return
  snapshot.combatId = tab?.encounterId ?? snapshot.combatId ?? crypto.randomUUID()
  await saveCombatStartSnapshot(snapshot.combatId, JSON.stringify(snapshot))
  if (useEncounterTabsStore.getState().activeTabId !== tabs.activeTabId) return

  const tracker = useCombatTrackerStore.getState()
  if (tab?.encounterId) {
    tracker.startEncounterCombat(tab.encounterId, snapshot.round, snapshot.turn, snapshot.activeCombatantId)
  } else {
    tracker.startCombat(snapshot.combatId)
  }
  if (tab) tabs.startTab(tab.id, snapshot)
  if (!snapshot.activeCombatantId) {
    const sorted = [...snapshot.combatants].sort((a, b) => b.initiative - a.initiative)
    useCombatantStore.getState().reorderInitiative(sorted.map((c) => c.id))
    tracker.setActiveCombatant(sorted[0].id)
  }
}

export async function finishActiveCombat(): Promise<void> {
  const tabs = useEncounterTabsStore.getState()
  const tab = tabs.getActiveTab()
  const current = snapshotFromGlobalStores()
  if (!current.combatId) return
  const saved = await loadCombatStartSnapshot(current.combatId)
  const original: TabSnapshot = saved ? JSON.parse(saved) as TabSnapshot : tab?.templateSnapshot ?? current
  const fresh: TabSnapshot = {
    ...original,
    combatId: current.combatId,
    isEncounterBacked: current.isEncounterBacked,
    combatants: original.combatants.map(resetCombatant),
    stagingCombatants: original.stagingCombatants.map((s) => ({ ...s, combatant: resetCombatant(s.combatant) })),
    activeCombatantId: null,
    round: 0,
    turn: 0,
    isRunning: false,
  }
  if (useEncounterTabsStore.getState().activeTabId !== tabs.activeTabId) return
  await stopEncounterAutoSave()
  await stopAutoSave()
  try {
    if (current.isEncounterBacked) {
      const rows = fresh.combatants.map((c, index) => toEncounterCombatant(c, current.combatId!, index))
      await saveEncounterCombatants(current.combatId, rows)
      await resetEncounterCombat(current.combatId)
      await saveEncounterStagingCombatants(current.combatId, fresh.stagingCombatants.map((s) => ({
        ...toEncounterCombatant(s.combatant, current.combatId!, s.sortOrder),
        kind: s.combatant.kind,
        round: s.round ?? null,
      })))
      useEncounterStore.getState().setEncounterCombatants(current.combatId, rows)
    } else {
      await saveCombatState({
        id: current.combatId, name: tab?.name ?? 'Combat', round: 0, turn: 0,
        activeCombatantId: null, isRunning: false, conditions: [],
        combatants: fresh.combatants.map((c) => ({ ...c, isNPC: c.kind !== 'pc', level: c.level ?? null })),
      })
    }

    const ids = new Set([...current.combatants, ...fresh.combatants].map((c) => c.id))
    for (const id of ids) {
      clearCombatantManager(id)
      useEffectStore.getState().clearCombatantEffects(id)
      useBattleFormOverridesStore.getState().clearCombatant(id)
      useRollOptionsStore.getState().clearCombatant(id)
    }
    if (tab) {
      useEncounterTabsStore.setState((state) => ({
        openTabs: state.openTabs.map((entry) => entry.id === tab.id
          ? { ...entry, snapshot: fresh, templateSnapshot: fresh, isStarted: false, inventoryVersion: entry.inventoryVersion + 1 }
          : entry),
      }))
    }
    if (useEncounterTabsStore.getState().activeTabId === tabs.activeTabId) {
      clearTurnSnapshot()
      restoreSnapshotToGlobalStores(fresh)
    }
  } finally {
    if (useCombatTrackerStore.getState().isEncounterBacked) setupEncounterAutoSave()
    else setupAutoSave()
  }
}
