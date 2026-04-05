import { useState, useEffect, useRef, useCallback } from 'react'
import { Shield } from 'lucide-react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shared/ui/resizable'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Button } from '@/shared/ui/button'
import { InitiativeList } from '@/widgets/initiative-list'
import { BestiarySearchPanel } from '@/widgets/bestiary-search'
import { CombatantDetail } from '@/widgets/combatant-detail'
import { PersistentDamageDialog } from '@/widgets/combatant-detail/ui/PersistentDamageDialog'
import { CombatControls, AddPCDialog, createCombatantFromCreature } from '@/features/combat-tracker'
import { TurnControls } from '@/features/combat-tracker/ui/TurnControls'
import { useCombatTrackerStore } from '@/features/combat-tracker/model/store'
import {
  useEncounterTabsStore,
  snapshotFromGlobalStores,
} from '@/features/combat-tracker'
import type { EncounterTab } from '@/features/combat-tracker'
import { setupAutoSave, teardownAutoSave } from '@/features/combat-tracker/lib/combat-persistence'
import { setupEncounterAutoSave, teardownEncounterAutoSave } from '@/features/combat-tracker/lib/encounter-persistence'
import { useCombatantStore } from '@/entities/combatant'
import { CreatureStatBlock, fetchCreatureStatBlockData, toCreature, extractIwr } from '@/entities/creature'
import type { CreatureStatBlockData, WeakEliteTier } from '@/entities/creature'
import { getHpAdjustment } from '@engine'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/shared/lib/utils'
import { EncounterTabBar } from './EncounterTabBar'
import { BlueprintSelectorDialog } from './BlueprintSelectorDialog'

// ---------------------------------------------------------------------------
// CombatColumn — renders one encounter's initiative list + detail + controls
// Used in split mode only.
//
// ARCHITECTURE: In split mode both columns must be independently interactive.
// The global Zustand stores (useCombatTrackerStore, useCombatantStore) can only
// hold one encounter's state at a time. To keep both columns live:
//
//  - The ACTIVE column renders its widgets against the live global stores.
//    A SnapshotSyncEffect inside the active column continuously writes back to
//    the tab snapshot on every store change so the snapshot stays current.
//
//  - The INACTIVE column renders a prop-driven read-only view from its tab
//    snapshot. Because the active column continuously updates its snapshot,
//    when focus switches the formerly-inactive column's snapshot is up-to-date
//    and the global stores are restored from that snapshot.
//
//  - Clicking anywhere in the inactive column calls onActivate(), which:
//      1. Saves the current active tab's snapshot via updateActiveSnapshot()
//      2. Sets the new activeTabId (restores the clicked tab's snapshot into
//         global stores via restoreSnapshotToGlobalStores)
//    After this, the clicked column becomes active (live global store view)
//    and the other column becomes inactive (read-only snapshot view, which
//    was kept current by SnapshotSyncEffect so it shows the latest state).
// ---------------------------------------------------------------------------

// SnapshotSyncEffect — subscribes to global store mutations and continuously
// writes them back to the active tab's snapshot so the snapshot never goes stale.
function SnapshotSyncEffect({ tabId }: { tabId: string }) {
  useEffect(() => {
    // Sync on every combatant store change
    const unsubCombatants = useCombatantStore.subscribe(() => {
      const { activeTabId } = useEncounterTabsStore.getState()
      if (activeTabId === tabId) {
        useEncounterTabsStore.getState().updateActiveSnapshot()
      }
    })
    // Sync on every tracker store change
    const unsubTracker = useCombatTrackerStore.subscribe(() => {
      const { activeTabId } = useEncounterTabsStore.getState()
      if (activeTabId === tabId) {
        useEncounterTabsStore.getState().updateActiveSnapshot()
      }
    })
    return () => {
      unsubCombatants()
      unsubTracker()
    }
  }, [tabId])

  return null
}

interface CombatColumnProps {
  tab: EncounterTab
  isActive: boolean
  onActivate: () => void
  onSelect: (id: string) => void
  className?: string
}

function CombatColumn({ tab, isActive, onActivate, onSelect, className }: CombatColumnProps) {
  const [columnSelectedId, setColumnSelectedId] = useState<string | null>(null)

  // When this column becomes active, restore its snapshot to global stores
  // (setActiveTab already does this, but we need selectedId to remain valid)
  const prevIsActive = useRef(isActive)
  useEffect(() => {
    if (isActive && !prevIsActive.current) {
      // Column just became active — global stores were already restored by setActiveTab.
      // If the previously-selected combatant no longer exists in the restored snapshot,
      // clear the selection to avoid showing stale detail panel.
      const combatantIds = tab.snapshot.combatants.map((c) => c.id)
      if (columnSelectedId && !combatantIds.includes(columnSelectedId)) {
        setColumnSelectedId(null)
      }
    }
    prevIsActive.current = isActive
  }, [isActive, tab.snapshot.combatants, columnSelectedId])

  const handleColumnSelect = useCallback(
    (id: string) => {
      setColumnSelectedId(id)
      onSelect(id)
    },
    [onSelect]
  )

  if (isActive) {
    // Active column — full interactive widgets backed by global stores.
    // SnapshotSyncEffect keeps the tab snapshot in sync with live mutations.
    return (
      <div
        className={cn('flex flex-col h-full border-t-2 border-t-primary', className)}
      >
        <SnapshotSyncEffect tabId={tab.id} />
        <div className="flex items-stretch shrink-0">
          <div className="flex-1">
            <CombatControls />
          </div>
          <div className="flex items-center px-2 border-b border-border/50">
            <AddPCDialog />
          </div>
        </div>
        <ResizablePanelGroup direction="vertical" className="flex-1">
          <ResizablePanel defaultSize={35} minSize={20}>
            <InitiativeList selectedId={columnSelectedId} onSelect={handleColumnSelect} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={65} minSize={30}>
            <div className="flex flex-col h-full">
              {columnSelectedId ? (
                <div className="flex-1 min-h-0">
                  <CombatantDetail combatantId={columnSelectedId} />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">Select a combatant</p>
                </div>
              )}
              <TurnControls />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    )
  }

  // Inactive column — read-only view from tab snapshot.
  // The snapshot is kept current by SnapshotSyncEffect on the active column,
  // so when the user clicks here and focus switches, the data is up-to-date.
  const combatants = tab.snapshot.combatants
  return (
    <div
      className={cn('flex flex-col h-full opacity-80 cursor-pointer', className)}
      onClick={onActivate}
    >
      {/* Minimal header showing round/state */}
      <div className="px-3 py-1.5 border-b border-border/50 text-xs text-muted-foreground shrink-0">
        {tab.snapshot.isRunning ? `Round ${tab.snapshot.round}` : 'Not started'}
        <span className="ml-2 text-muted-foreground/60">(click to focus)</span>
      </div>
      {/* Read-only initiative list from snapshot */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {combatants.map((c) => (
            <div
              key={c.id}
              className={cn(
                'flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer hover:bg-secondary/30',
                c.id === tab.snapshot.activeCombatantId && 'bg-primary/10 border-l-2 border-primary',
                c.id === columnSelectedId && 'bg-secondary/40'
              )}
              onClick={(e) => {
                e.stopPropagation()
                setColumnSelectedId(c.id)
                onActivate()
                onSelect(c.id)
              }}
            >
              <span className="text-xs font-mono text-muted-foreground w-6 text-right">
                {c.initiative}
              </span>
              <span className="flex-1 truncate">{c.displayName}</span>
              <span className="text-xs text-muted-foreground">
                {c.hp}/{c.maxHp}
              </span>
            </div>
          ))}
          {combatants.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No combatants</p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export function CombatPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lastNpcStatBlock, setLastNpcStatBlock] = useState<CreatureStatBlockData | null>(null)
  const [statBlockLoading, setStatBlockLoading] = useState(false)
  const [showSelector, setShowSelector] = useState(false)
  const statBlockCache = useRef<Map<string, CreatureStatBlockData>>(new Map())

  const pendingPersistentDamage = useCombatTrackerStore((s) => s.pendingPersistentDamage)
  const setPendingPersistentDamage = useCombatTrackerStore((s) => s.setPendingPersistentDamage)
  const { combatId, isEncounterBacked } = useCombatTrackerStore(
    useShallow((s) => ({ combatId: s.combatId, isEncounterBacked: s.isEncounterBacked }))
  )

  const combatants = useCombatantStore(useShallow((s) => s.combatants))
  const { reorderInitiative } = useCombatantStore()
  const openTabs = useEncounterTabsStore((s) => s.openTabs)
  const activeTabId = useEncounterTabsStore((s) => s.activeTabId)
  const splitMode = useEncounterTabsStore((s) => s.splitMode)
  const setActiveTab = useEncounterTabsStore((s) => s.setActiveTab)

  // Mount: migrate existing running combat to a tab, then setup auto-save per active tab
  useEffect(() => {
    // Migration: if combat is running but no tabs exist, create a tab from current state
    const { isRunning, isEncounterBacked: isBacked, combatId: cId } = useCombatTrackerStore.getState()
    const { openTabs: tabs } = useEncounterTabsStore.getState()
    if (isRunning && tabs.length === 0) {
      const snapshot = snapshotFromGlobalStores()
      useEncounterTabsStore.getState().openTab({
        encounterId: isBacked ? cId : null,
        name: isBacked ? 'Loaded Encounter' : 'Ad-hoc Combat',
        snapshot,
      })
    }
  }, [])

  // Re-setup auto-save whenever active tab changes
  useEffect(() => {
    if (isEncounterBacked) {
      setupEncounterAutoSave()
      return () => teardownEncounterAutoSave()
    } else {
      setupAutoSave()
      return () => teardownAutoSave()
    }
  }, [activeTabId, isEncounterBacked])

  const handleSelect = useCallback(async (id: string) => {
    setSelectedId(id)

    // Read combatants directly from the store (not the closed-over snapshot) so
    // that in split mode — where setActiveTab may have just swapped global store
    // contents — we look up the combatant in the freshly-restored encounter data.
    const combatant = useCombatantStore.getState().combatants.find((c) => c.id === id)
    if (!combatant?.isNPC || !combatant.creatureRef) return

    // Cache hit
    const cached = statBlockCache.current.get(combatant.creatureRef)
    if (cached) {
      setLastNpcStatBlock(cached)
      return
    }

    // Cache miss — fetch from SQLite
    setStatBlockLoading(true)
    try {
      const data = await fetchCreatureStatBlockData(combatant.creatureRef)
      if (data) {
        // Keep cache bounded to last 10 entries
        if (statBlockCache.current.size >= 10) {
          const firstKey = statBlockCache.current.keys().next().value
          if (firstKey !== undefined) statBlockCache.current.delete(firstKey)
        }
        statBlockCache.current.set(combatant.creatureRef, data)
        setLastNpcStatBlock(data)
      }
    } finally {
      setStatBlockLoading(false)
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const overId = String(over.id)
    const dragData = active.data.current as { type?: string; row?: import('@/shared/api').CreatureRow; tier?: WeakEliteTier } | undefined

    // Route 0: Bestiary creature add
    if (dragData?.type === 'bestiary-add' && dragData.row) {
      const { row, tier = 'normal' } = dragData
      const creature = toCreature(row)
      const hpDelta = getHpAdjustment(tier, creature.level)
      const adjustedHp = Math.max(1, creature.hp + hpDelta)
      const iwr = extractIwr(row)
      const c = createCombatantFromCreature(creature.id, creature.name, creature.perception, adjustedHp, useCombatantStore.getState().combatants)
      c.maxHp = adjustedHp
      c.iwrImmunities = iwr.immunities
      c.iwrWeaknesses = iwr.weaknesses
      c.iwrResistances = iwr.resistances
      useCombatantStore.getState().addCombatant(c)
      return
    }

    // Route 1: Cross-tab drop (tab header droppable)
    if (overId.startsWith('tab-drop-')) {
      const tabId = overId.replace('tab-drop-', '')
      const combatant = active.data.current?.combatant
      if (combatant) {
        useEncounterTabsStore.getState().addCombatantToTab(tabId, combatant)
      }
      return
    }

    // Route 2: Initiative reorder
    if (active.id !== over.id) {
      const oldIndex = combatants.findIndex((c) => c.id === active.id)
      const newIndex = combatants.findIndex((c) => c.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(
          combatants.map((c) => c.id),
          oldIndex,
          newIndex
        )
        reorderInitiative(reordered)
      }
    }
  }, [combatants, reorderInitiative])

  return (
    <div className="flex flex-col h-full">
      <PersistentDamageDialog
        pending={pendingPersistentDamage}
        onClose={() => setPendingPersistentDamage(null)}
      />
      {openTabs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <Shield className="w-12 h-12 opacity-30" />
          <p className="text-sm">No encounters open</p>
          <Button variant="outline" onClick={() => setShowSelector(true)}>
            Open Encounter
          </Button>
          <BlueprintSelectorDialog open={showSelector} onOpenChange={setShowSelector} />
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <EncounterTabBar />
          <ResizablePanelGroup direction="horizontal" className="flex-1">

            {/* Left panel — Bestiary search */}
            <ResizablePanel defaultSize={22} minSize={16} maxSize={32}>
              <BestiarySearchPanel />
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Center panel — Initiative list + Combatant detail (single or split) */}
            <ResizablePanel defaultSize={38} minSize={28}>
              {splitMode && openTabs.length >= 2 ? (
                // Split mode: two equal columns side by side
                <div className="flex h-full">
                  <CombatColumn
                    tab={openTabs[0]}
                    isActive={openTabs[0].id === activeTabId}
                    onActivate={() => {
                      if (activeTabId !== openTabs[0].id) setActiveTab(openTabs[0].id)
                    }}
                    onSelect={handleSelect}
                    className="flex-1 border-r border-border/50"
                  />
                  <CombatColumn
                    tab={openTabs[1]}
                    isActive={openTabs[1].id === activeTabId}
                    onActivate={() => {
                      if (activeTabId !== openTabs[1].id) setActiveTab(openTabs[1].id)
                    }}
                    onSelect={handleSelect}
                    className="flex-1"
                  />
                </div>
              ) : (
                // Single column mode
                <div className="flex flex-col h-full">
                  {/* Center header: combat controls + add PC (share the same border-b) */}
                  <div className="flex items-stretch shrink-0">
                    <div className="flex-1">
                      <CombatControls />
                    </div>
                    <div className="flex items-center px-2 border-b border-border/50">
                      <AddPCDialog />
                    </div>
                  </div>

                  {/* Nested vertical split: initiative list (top) + combatant detail (bottom) */}
                  <ResizablePanelGroup direction="vertical" id="combat-center-vertical" className="flex-1">
                    <ResizablePanel defaultSize={35} minSize={20}>
                      <InitiativeList selectedId={selectedId} onSelect={handleSelect} />
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    <ResizablePanel defaultSize={65} minSize={30}>
                      <div className="flex flex-col h-full">
                        {selectedId ? (
                          <div className="flex-1 min-h-0">
                            <CombatantDetail combatantId={selectedId} />
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <p className="text-sm">Select a combatant to view details</p>
                          </div>
                        )}
                        <TurnControls />
                      </div>
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              )}
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right panel — Creature stat card */}
            <ResizablePanel defaultSize={40} minSize={28}>
              <div className="h-full overflow-y-auto">
                {lastNpcStatBlock ? (
                  <CreatureStatBlock
                    creature={lastNpcStatBlock}
                    className="rounded-none border-x-0 border-t-0"
                    encounterContext={
                      isEncounterBacked && combatId && selectedId
                        ? { encounterId: combatId, combatantId: selectedId }
                        : undefined
                    }
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    {statBlockLoading ? (
                      <p className="text-sm">Loading...</p>
                    ) : (
                      <>
                        <Shield className="w-8 h-8 opacity-30" />
                        <p className="text-sm">Select a creature to view its stat block</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </ResizablePanel>

          </ResizablePanelGroup>
        </DndContext>
      )}
    </div>
  )
}
