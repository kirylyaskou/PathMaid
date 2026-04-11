import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Combatant } from '@/entities/combatant'
import { useCombatantStore, kindFromLegacy } from '@/entities/combatant'
import { useCombatTrackerStore } from './store'

export interface TabSnapshot {
  combatants: Combatant[]
  combatId: string | null
  activeCombatantId: string | null
  round: number
  turn: number
  isRunning: boolean
  isEncounterBacked: boolean
}

export interface EncounterTab {
  id: string                     // unique tab instance id
  encounterId: string | null     // null = blank/ad-hoc encounter
  name: string
  snapshot: TabSnapshot          // last saved state for this tab
}

export interface EncounterTabsState {
  openTabs: EncounterTab[]
  activeTabId: string | null
  splitMode: boolean

  openTab: (tab: { encounterId: string | null; name: string; snapshot: TabSnapshot }) => string
  /**
   * Add a new tab with a pre-built snapshot and activate it WITHOUT calling
   * updateActiveSnapshot() for the previously active tab. Use this when the
   * caller has already persisted the old tab's snapshot and the global stores
   * now contain the new tab's data (e.g. after loadEncounterIntoCombat).
   */
  openTabFromSnapshot: (tab: { encounterId: string | null; name: string; snapshot: TabSnapshot }) => string
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  updateActiveSnapshot: () => void
  resetTab: (tabId: string) => Promise<void>
  addCombatantToTab: (tabId: string, combatant: Combatant) => void
  getActiveTab: () => EncounterTab | undefined
  toggleSplitMode: () => void
}

export function createEmptySnapshot(): TabSnapshot {
  return {
    combatants: [],
    combatId: null,
    activeCombatantId: null,
    round: 0,
    turn: 0,
    isRunning: false,
    isEncounterBacked: false,
  }
}

export function snapshotFromGlobalStores(): TabSnapshot {
  const tracker = useCombatTrackerStore.getState()
  const { combatants } = useCombatantStore.getState()
  return {
    combatants: [...combatants],
    combatId: tracker.combatId,
    activeCombatantId: tracker.activeCombatantId,
    round: tracker.round,
    turn: tracker.turn,
    isRunning: tracker.isRunning,
    isEncounterBacked: tracker.isEncounterBacked,
  }
}

export function restoreSnapshotToGlobalStores(snapshot: TabSnapshot): void {
  useCombatantStore.getState().setCombatants(snapshot.combatants)
  useCombatTrackerStore.getState().restoreState({
    combatId: snapshot.combatId,
    activeCombatantId: snapshot.activeCombatantId,
    round: snapshot.round,
    turn: snapshot.turn,
    isRunning: snapshot.isRunning,
    isEncounterBacked: snapshot.isEncounterBacked,
  })
}

export const useEncounterTabsStore = create<EncounterTabsState>()(
  immer((set, get) => ({
    openTabs: [],
    activeTabId: null,
    splitMode: false,

    openTab: (tabInput) => {
      const id = crypto.randomUUID()
      set((state) => {
        state.openTabs.push({ id, ...tabInput })
      })
      get().setActiveTab(id)
      return id
    },

    openTabFromSnapshot: (tabInput) => {
      const id = crypto.randomUUID()
      // Save current tab's snapshot using the provided snapshot data (caller already
      // updated it before mutating global stores), then switch to the new tab.
      // We do NOT call updateActiveSnapshot() here because global stores already
      // contain the new tab's data — calling it would corrupt the old tab's snapshot.
      set((state) => {
        state.openTabs.push({ id, ...tabInput })
        state.activeTabId = id
      })
      return id
    },

    closeTab: (tabId) => {
      const { activeTabId } = get()
      const isActive = tabId === activeTabId
      set((state) => {
        state.openTabs = state.openTabs.filter((t) => t.id !== tabId)
      })
      if (isActive) {
        const remaining = get().openTabs
        if (remaining.length > 0) {
          get().setActiveTab(remaining[remaining.length - 1].id)
        } else {
          set((state) => {
            state.activeTabId = null
          })
          // Clear global stores when no tabs remain
          useCombatantStore.getState().setCombatants([])
          useCombatTrackerStore.getState().restoreState(createEmptySnapshot())
        }
      }
      // Auto-disable split mode when fewer than 2 tabs remain
      if (get().openTabs.length < 2) {
        set((state) => { state.splitMode = false })
      }
    },

    setActiveTab: (tabId) => {
      const { activeTabId } = get()
      // Save current tab state before switching
      if (activeTabId && activeTabId !== tabId) {
        get().updateActiveSnapshot()
      }
      set((state) => {
        state.activeTabId = tabId
      })
      // Restore target tab's snapshot to global stores
      const targetTab = get().openTabs.find((t) => t.id === tabId)
      if (targetTab) {
        restoreSnapshotToGlobalStores(targetTab.snapshot)
      }
    },

    updateActiveSnapshot: () => {
      const { activeTabId } = get()
      if (!activeTabId) return
      const snapshot = snapshotFromGlobalStores()
      set((state) => {
        const tab = state.openTabs.find((t) => t.id === activeTabId)
        if (tab) tab.snapshot = snapshot
      })
    },

    resetTab: async (tabId) => {
      const tab = get().openTabs.find((t) => t.id === tabId)
      if (!tab) return

      let freshSnapshot: TabSnapshot

      if (!tab.encounterId) {
        // Blank encounter: just clear
        freshSnapshot = createEmptySnapshot()
      } else {
        // Blueprint-backed: reload from DB
        try {
          const { loadEncounterCombatants } = await import('@/shared/api')
          const encounterCombatants = await loadEncounterCombatants(tab.encounterId)
          const combatants: Combatant[] = encounterCombatants.map((ec) => ({
            id: crypto.randomUUID(),
            creatureRef: ec.creatureRef,
            displayName: ec.displayName,
            initiative: ec.initiative,
            hp: ec.maxHp,
            maxHp: ec.maxHp,
            tempHp: 0,
            kind: kindFromLegacy(ec.isNPC, ec.isHazard ?? false),
          }))
          freshSnapshot = {
            combatants,
            combatId: tab.encounterId,
            activeCombatantId: null,
            round: 1,
            turn: 0,
            isRunning: false,
            isEncounterBacked: true,
          }
        } catch (err) {
          console.error('Failed to reset tab from blueprint:', err)
          return
        }
      }

      set((state) => {
        const t = state.openTabs.find((t) => t.id === tabId)
        if (t) t.snapshot = freshSnapshot
      })

      // If resetting the active tab, also restore to global stores
      if (get().activeTabId === tabId) {
        restoreSnapshotToGlobalStores(freshSnapshot)
      }
    },

    addCombatantToTab: (tabId, combatant) => {
      const clone: Combatant = { ...combatant, id: crypto.randomUUID() }
      set((state) => {
        const tab = state.openTabs.find((t) => t.id === tabId)
        if (tab) tab.snapshot.combatants.push(clone)
      })
      // If the target tab is active, also push to the global combatant store
      if (get().activeTabId === tabId) {
        useCombatantStore.getState().addCombatant(clone)
      }
    },

    toggleSplitMode: () => {
      set((state) => {
        state.splitMode = !state.splitMode
      })
    },

    getActiveTab: () => {
      const { openTabs, activeTabId } = get()
      return openTabs.find((t) => t.id === activeTabId)
    },
  }))
)
