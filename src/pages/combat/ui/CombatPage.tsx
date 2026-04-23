import { useState, useEffect, useRef, useCallback } from 'react'
import { Shield } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shared/ui/resizable'
import { Button } from '@/shared/ui/button'
import { InitiativeList } from '@/widgets/initiative-list'
import { BestiarySearchPanel } from '@/widgets/bestiary-search'
import { CombatantDetail } from '@/widgets/combatant-detail'
import { PersistentDamageDialog } from '@/widgets/combatant-detail/ui/PersistentDamageDialog'
import { DyingCascadeDialog } from '@/widgets/combatant-detail/ui/DyingCascadeDialog'
import { SickenedFortitudeSaveDialog } from '@/widgets/combatant-detail/ui/SickenedFortitudeSaveDialog'
import { StagingDeployDialog } from '@/widgets/initiative-list/ui/StagingDeployDialog'
import {
  CombatControls, AddPCDialog, QuickAddCombatantForm, createCombatantFromCreature,
  useEncounterTabsStore, snapshotFromGlobalStores, useCombatTrackerStore,
  TurnControls, setupAutoSave, teardownAutoSave,
  setupEncounterAutoSave, teardownEncounterAutoSave,
} from '@/features/combat-tracker'
import type { EncounterTab } from '@/features/combat-tracker'
import { useCombatantStore } from '@/entities/combatant'
import type { NpcCombatant, StagingCombatant } from '@/entities/combatant'
import { useEncounterStore } from '@/entities/encounter'
import { CreatureStatBlock, toCreature, extractIwr } from '@/entities/creature'
import type { WeakEliteTier } from '@/entities/creature'
import { SpellcastingBlock } from '@/features/spellcasting'
import { getHpAdjustment, applyTierToStatBlock } from '@engine'
import { PCCombatCard } from '@/features/characters'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '@/shared/lib/utils'
import { saveEncounterStagingCombatants } from '@/shared/api'
import type { EncounterStagingRow } from '@/shared/api'
import { StagingTable } from '@/features/encounter-builder/ui/StagingTable'
import { logErrorWithToast } from '@/shared/lib/error'
import { useCombatDetailLoader } from '../model/use-combat-detail-loader'
import { EncounterTabBar } from './EncounterTabBar'
import { BlueprintSelectorDialog } from './BlueprintSelectorDialog'

function toRowsInline(encounterId: string, staging: StagingCombatant[]): EncounterStagingRow[] {
  return staging.map((sc, i) => ({
    id: sc.combatant.id,
    encounterId,
    kind: sc.combatant.kind,
    creatureRef: 'creatureRef' in sc.combatant ? (sc.combatant as NpcCombatant).creatureRef : '',
    displayName: sc.combatant.displayName,
    hp: sc.combatant.hp,
    maxHp: sc.combatant.maxHp,
    tempHp: sc.combatant.tempHp,
    creatureLevel: sc.combatant.level ?? 0,
    weakEliteTier: 'normal' as const,
    round: sc.round ?? null,
    sortOrder: i,
  }))
}

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
          <div className="flex items-center gap-2 px-2 border-b border-border/50">
            <QuickAddCombatantForm mode="creature" />
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
      <div className="flex-1 overflow-y-auto">
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
      </div>
    </div>
  )
}

export function CombatPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSelector, setShowSelector] = useState(false)
  const { lastNpcStatBlock, statBlockLoading, selectedPcBuild, pcBuildLoading, loadForCombatant, refreshShieldBonus } =
    useCombatDetailLoader()

  // require 8px of movement before dnd-kit starts a
  // drag, so clicks on the "+ Add" button inside <DraggableBestiaryRow> are
  // not swallowed as drag-starts. Previously the first creature add appeared
  // to "do nothing" because dnd-kit ate the click as a zero-distance drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const pendingPersistentDamage = useCombatTrackerStore((s) => s.pendingPersistentDamage)
  const setPendingPersistentDamage = useCombatTrackerStore((s) => s.setPendingPersistentDamage)
  const pendingRecoveryCheck = useCombatTrackerStore((s) => s.pendingRecoveryCheck)
  const setPendingRecoveryCheck = useCombatTrackerStore((s) => s.setPendingRecoveryCheck)
  const pendingSickenedSave = useCombatTrackerStore((s) => s.pendingSickenedSave)
  const setPendingSickenedSave = useCombatTrackerStore((s) => s.setPendingSickenedSave)
  const { combatId, isEncounterBacked, currentRound } = useCombatTrackerStore(
    useShallow((s) => ({ combatId: s.combatId, isEncounterBacked: s.isEncounterBacked, currentRound: s.round }))
  )

  // Auto-deploy state for staging creatures scheduled by round
  const [autoDeployTarget, setAutoDeployTarget] = useState<{
    combatantId: string
    creatureRef: string
    displayName: string
  } | null>(null)
  const [autoDialogOpen, setAutoDialogOpen] = useState(false)
  const prevRoundRef = useRef<number>(currentRound)

  // Auto-trigger: when round advances, release staging creatures scheduled for that round
  useEffect(() => {
    if (currentRound <= 1 && prevRoundRef.current <= 1) {
      prevRoundRef.current = currentRound
      return
    }
    if (currentRound !== prevRoundRef.current) {
      prevRoundRef.current = currentRound
      const staging = useCombatantStore.getState().stagingCombatants
      const due = staging.filter((s) => s.round === currentRound)
      if (due.length > 0 && combatId) {
        const first = due[0]
        const released = useCombatantStore.getState().releaseFromStaging(first.combatant.id)
        if (released) {
          const updated = useCombatantStore.getState().stagingCombatants
          saveEncounterStagingCombatants(combatId, toRowsInline(combatId, updated)).catch(logErrorWithToast('staging-save'))
          setAutoDeployTarget({
            combatantId: released.id,
            creatureRef: 'creatureRef' in released ? (released as NpcCombatant).creatureRef : '',
            displayName: released.displayName,
          })
          setAutoDialogOpen(true)
        }
      }
    }
  }, [currentRound, combatId])

  const combatants = useCombatantStore(useShallow((s) => s.combatants))
  const { reorderInitiative } = useCombatantStore()
  const openTabs = useEncounterTabsStore((s) => s.openTabs)
  const activeTabId = useEncounterTabsStore((s) => s.activeTabId)
  const splitMode = useEncounterTabsStore((s) => s.splitMode)
  const setActiveTab = useEncounterTabsStore((s) => s.setActiveTab)
  const selectedCombatant = selectedId ? combatants.find((x) => x.id === selectedId) : null
  const spellcastingEncounter = isEncounterBacked && combatId && selectedId
    ? {
        encounterId: combatId,
        combatantId: selectedId,
        onInventoryChanged: () => refreshShieldBonus(selectedId, combatId),
      }
    : undefined

  // Mount: migrate existing running combat to a tab, then setup auto-save per active tab
  useEffect(() => {
    // Migration: if combat is running but no tabs exist, create a tab from current state
    const { isRunning, isEncounterBacked: isBacked, combatId: cId } = useCombatTrackerStore.getState()
    const { openTabs: tabs } = useEncounterTabsStore.getState()
    if (isRunning && tabs.length === 0) {
      const snapshot = snapshotFromGlobalStores()
      useEncounterTabsStore.getState().openTab({
        encounterId: isBacked ? cId : null,
        name: isBacked ? (useEncounterStore.getState().encounters.find((e) => e.id === cId)?.name ?? 'Encounter') : 'Ad-hoc Combat',
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

  // 63-fix: pre-start gate reduced to disabling turn controls; blur overlay
  // removed (see TurnControls + CombatControls for the disabled-state logic).

  const handleSelect = useCallback(async (id: string) => {
    setSelectedId(id)
    await loadForCombatant(id)
  }, [loadForCombatant])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const overId = String(over.id)
    const dragData = active.data.current as {
      type?: string
      row?: import('@/shared/api').CreatureRow
      hazardRow?: import('@/shared/api').HazardRow
      tier?: WeakEliteTier
    } | undefined

    // Route 0: Bestiary creature add
    if (dragData?.type === 'bestiary-add' && dragData.row) {
      const { row, tier = 'normal' } = dragData
      const creature = toCreature(row)
      const hpDelta = getHpAdjustment(tier, creature.level)
      const adjustedHp = Math.max(1, creature.hp + hpDelta)
      const iwr = extractIwr(row)
      const c = createCombatantFromCreature(
        creature.id,
        creature.name,
        creature.perception,
        adjustedHp,
        useCombatantStore.getState().combatants,
        creature.level,
        tier,
      )
      c.maxHp = adjustedHp
      c.iwrImmunities = iwr.immunities
      c.iwrWeaknesses = iwr.weaknesses
      c.iwrResistances = iwr.resistances
      useCombatantStore.getState().addCombatant(c)
      return
    }

    // Route 0.5: Hazard add from HazardSearchPanel drag
    if (dragData?.type === 'hazard-add' && dragData.hazardRow) {
      const hr = dragData.hazardRow
      useCombatantStore.getState().addCombatant({
        id: crypto.randomUUID(),
        creatureRef: `hazard-${hr.id}`,
        displayName: hr.name,
        initiative: 0,
        hp: hr.hp ?? 0,
        maxHp: hr.hp ?? 0,
        tempHp: 0,
        kind: 'hazard',
        initiativeBonus: hr.stealth_dc ?? 0,
      })
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

  // Memoize: stable activate callbacks passed as props to CombatColumn in split mode; avoids re-renders on tab switches
  const handleActivateTab0 = useCallback(() => {
    if (openTabs[0] && activeTabId !== openTabs[0].id) setActiveTab(openTabs[0].id)
  }, [openTabs, activeTabId, setActiveTab])
  const handleActivateTab1 = useCallback(() => {
    if (openTabs[1] && activeTabId !== openTabs[1].id) setActiveTab(openTabs[1].id)
  }, [openTabs, activeTabId, setActiveTab])

  return (
    <div className="flex flex-col h-full">
      <PersistentDamageDialog
        pending={pendingPersistentDamage}
        onClose={() => setPendingPersistentDamage(null)}
      />
      <SickenedFortitudeSaveDialog
        pending={pendingSickenedSave}
        onClose={() => setPendingSickenedSave(null)}
      />
      <DyingCascadeDialog
        open={!!pendingRecoveryCheck}
        onClose={() => setPendingRecoveryCheck(null)}
        combatantId={pendingRecoveryCheck?.combatantId ?? ''}
        combatantName={pendingRecoveryCheck?.combatantName ?? ''}
      />
      {autoDeployTarget && (
        <StagingDeployDialog
          open={autoDialogOpen}
          onOpenChange={setAutoDialogOpen}
          combatantId={autoDeployTarget.combatantId}
          creatureRef={autoDeployTarget.creatureRef}
          displayName={autoDeployTarget.displayName}
        />
      )}
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                    onActivate={handleActivateTab0}
                    onSelect={handleSelect}
                    className="flex-1 border-r border-border/50"
                  />
                  <CombatColumn
                    tab={openTabs[1]}
                    isActive={openTabs[1].id === activeTabId}
                    onActivate={handleActivateTab1}
                    onSelect={handleSelect}
                    className="flex-1"
                  />
                </div>
              ) : (
                // Single column mode
                <div className="flex flex-col h-full">
                  {/* Center header: combat controls + add buttons (share the same border-b) */}
                  <div className="flex items-stretch shrink-0">
                    <div className="flex-1">
                      <CombatControls />
                    </div>
                    <div className="flex items-center gap-2 px-2 border-b border-border/50">
                      <QuickAddCombatantForm mode="creature" />
                      <AddPCDialog />
                    </div>
                  </div>

                  {/* Nested vertical split: initiative list (top) + combatant detail (bottom) */}
                  <ResizablePanelGroup direction="vertical" id="combat-center-vertical" className="flex-1">
                    <ResizablePanel defaultSize={35} minSize={20}>
                      <div className="flex flex-col h-full overflow-y-auto">
                        <InitiativeList selectedId={selectedId} onSelect={handleSelect} />
                        {isEncounterBacked && combatId && (
                          <div className="px-2 py-2 shrink-0">
                            <StagingTable encounterId={combatId} combatMode={true} />
                          </div>
                        )}
                      </div>
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

            {/* Right panel — Creature stat card / PC build */}
            <ResizablePanel defaultSize={40} minSize={28}>
              <div className="h-full overflow-y-auto">
                {/* PC selected */}
                {selectedPcBuild && selectedCombatant && (
                  <PCCombatCard build={selectedPcBuild} combatant={selectedCombatant} encounterId={isEncounterBacked && combatId ? combatId : undefined} />
                )}

                {/* NPC selected — apply Weak/Elite tier adjustment to displayed
                    stat values per Monster Core pg. 6-7. HP is already baked
                    in at add-time via getHpAdjustment so applyTierToStatBlock
                    deliberately skips it. */}
                {!selectedPcBuild && lastNpcStatBlock && (
                  <CreatureStatBlock
                    creature={applyTierToStatBlock(
                      lastNpcStatBlock,
                      (selectedCombatant && selectedCombatant.kind === 'npc' && selectedCombatant.weakEliteTier) || 'normal',
                    )}
                    className="rounded-none border-x-0 border-t-0"
                    encounterContext={spellcastingEncounter}
                    renderSpellcasting={(section, level, name) => (
                      <SpellcastingBlock
                        key={section.entryId}
                        section={section}
                        creatureLevel={level}
                        creatureName={name}
                        encounterContext={spellcastingEncounter}
                      />
                    )}
                  />
                )}

                {/* Loading */}
                {(statBlockLoading || pcBuildLoading) && !lastNpcStatBlock && !selectedPcBuild && (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                )}

                {/* Empty */}
                {!selectedPcBuild && !lastNpcStatBlock && !statBlockLoading && !pcBuildLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                    <Shield className="w-8 h-8 opacity-30" />
                    <p className="text-sm">Select a creature to view its stat block</p>
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
