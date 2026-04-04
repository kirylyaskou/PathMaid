import { useEffect, useState } from 'react'
import { DndContext, DragOverlay, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/shared/ui/resizable'
import { XPBudgetBar } from '@/entities/encounter'
import { useEncounterStore } from '@/entities/encounter'
import {
  useEncounterBuilderStore,
  PartyConfigBar,
  SavedEncounterList,
  EncounterEditor,
  CreatureSearchSidebar,
} from '@/features/encounter-builder'
import { loadEncounterCombatants, saveEncounterCombatants } from '@/shared/api'
import type { CreatureRow, HazardRow, EncounterCombatantRow } from '@/shared/api'
import type { WeakEliteTier } from '@/entities/creature'
import { calculateXP, getHpAdjustment } from '@engine'

type DragData =
  | { type: 'creature'; row: CreatureRow; tier: WeakEliteTier }
  | { type: 'hazard'; hazard: HazardRow }

export function EncountersPage() {
  const encounters = useEncounterStore((s) => s.encounters)
  const selectedId = useEncounterStore((s) => s.selectedId)
  const loadEncounters = useEncounterStore((s) => s.loadEncounters)
  const setEncounterCombatants = useEncounterStore((s) => s.setEncounterCombatants)

  // Party config from global store (shared with encounter builder)
  const partyLevel = useEncounterBuilderStore((s) => s.partyLevel)
  const partySize = useEncounterBuilderStore((s) => s.partySize)
  const isLoaded = useEncounterBuilderStore((s) => s.isLoaded)
  const loadConfig = useEncounterBuilderStore((s) => s.loadConfig)

  // Drag-and-drop state
  const [activeDragData, setActiveDragData] = useState<DragData | null>(null)
  const [dropTooltip, setDropTooltip] = useState(false)

  // Load party config + encounters on mount
  useEffect(() => {
    loadConfig()
    loadEncounters()
  }, [loadConfig, loadEncounters])

  // Load combatants for selected encounter (lazy, on selection change)
  useEffect(() => {
    if (!selectedId) return
    const enc = encounters.find((e) => e.id === selectedId)
    if (!enc || enc.combatants.length > 0) return  // already loaded
    loadEncounterCombatants(selectedId).then((rows) => {
      setEncounterCombatants(selectedId, rows.map((r) => ({
        id: r.id,
        encounterId: r.encounterId,
        creatureRef: r.creatureRef,
        displayName: r.displayName,
        initiative: r.initiative,
        hp: r.hp,
        maxHp: r.maxHp,
        tempHp: r.tempHp,
        isNPC: r.isNPC,
        weakEliteTier: r.weakEliteTier,
        creatureLevel: r.creatureLevel,
        sortOrder: r.sortOrder,
        isHazard: r.isHazard,
        hazardRef: r.hazardRef,
      })))
    })
  }, [selectedId, encounters, setEncounterCombatants])

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Loading...</p>
      </div>
    )
  }

  // XP Budget: compute from selected encounter's combatants (hazards use base level)
  const selectedEncounter = encounters.find((e) => e.id === selectedId)
  const adjustedLevels = selectedEncounter?.combatants.map((c) =>
    c.isHazard ? c.creatureLevel
    : c.weakEliteTier === 'elite' ? c.creatureLevel + 1
    : c.weakEliteTier === 'weak' ? c.creatureLevel - 1
    : c.creatureLevel
  ) ?? []
  const totalXp = selectedEncounter
    ? calculateXP(adjustedLevels, [], selectedEncounter.partyLevel, selectedEncounter.partySize).totalXp
    : 0
  const xpPartySize = selectedEncounter?.partySize ?? partySize

  // Add creature to currently selected encounter
  async function handleAddCreature(row: CreatureRow, tier: WeakEliteTier) {
    if (!selectedId) return
    const enc = encounters.find((e) => e.id === selectedId)
    if (!enc) return

    const baseLevel = row.level ?? 0
    const baseHp = row.hp ?? 0
    const hpDelta = getHpAdjustment(tier, baseLevel)
    const adjustedHp = Math.max(1, baseHp + hpDelta)

    const newRow: EncounterCombatantRow = {
      id: crypto.randomUUID(),
      encounterId: selectedId,
      creatureRef: row.id,
      displayName: row.name,
      initiative: 0,
      hp: adjustedHp,
      maxHp: adjustedHp,
      tempHp: 0,
      isNPC: true,
      weakEliteTier: tier,
      creatureLevel: baseLevel,
      sortOrder: enc.combatants.length,
      isHazard: false,
      hazardRef: null,
    }

    const updatedRows: EncounterCombatantRow[] = [
      ...enc.combatants.map((c, i) => ({
        id: c.id,
        encounterId: c.encounterId,
        creatureRef: c.creatureRef,
        displayName: c.displayName,
        initiative: c.initiative,
        hp: c.hp,
        maxHp: c.maxHp,
        tempHp: c.tempHp,
        isNPC: c.isNPC,
        weakEliteTier: c.weakEliteTier,
        creatureLevel: c.creatureLevel,
        sortOrder: i,
        isHazard: c.isHazard ?? false,
        hazardRef: c.hazardRef ?? null,
      })),
      newRow,
    ]

    await saveEncounterCombatants(selectedId, updatedRows)
    setEncounterCombatants(selectedId, updatedRows.map((r) => ({
      ...r,
      weakEliteTier: r.weakEliteTier as 'normal' | 'weak' | 'elite',
    })))
  }

  // Add hazard to currently selected encounter
  async function handleAddHazard(hazard: HazardRow) {
    if (!selectedId) return
    const enc = encounters.find((e) => e.id === selectedId)
    if (!enc) return

    const newRow: EncounterCombatantRow = {
      id: crypto.randomUUID(),
      encounterId: selectedId,
      creatureRef: '',
      displayName: hazard.name,
      initiative: 0,
      hp: hazard.hp ?? 0,
      maxHp: hazard.hp ?? 0,
      tempHp: 0,
      isNPC: true,
      weakEliteTier: 'normal',
      creatureLevel: hazard.level,
      sortOrder: enc.combatants.length,
      isHazard: true,
      hazardRef: hazard.id,
    }

    const updatedRows: EncounterCombatantRow[] = [
      ...enc.combatants.map((c, i) => ({
        id: c.id,
        encounterId: c.encounterId,
        creatureRef: c.creatureRef,
        displayName: c.displayName,
        initiative: c.initiative,
        hp: c.hp,
        maxHp: c.maxHp,
        tempHp: c.tempHp,
        isNPC: c.isNPC,
        weakEliteTier: c.weakEliteTier,
        creatureLevel: c.creatureLevel,
        sortOrder: i,
        isHazard: c.isHazard ?? false,
        hazardRef: c.hazardRef ?? null,
      })),
      newRow,
    ]

    await saveEncounterCombatants(selectedId, updatedRows)
    setEncounterCombatants(selectedId, updatedRows.map((r) => ({
      ...r,
      weakEliteTier: r.weakEliteTier as 'normal' | 'weak' | 'elite',
    })))
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragData(event.active.data.current as DragData)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragData(null)
    if (!event.over || event.over.id !== 'encounter-drop-zone') return
    if (!selectedId) {
      setDropTooltip(true)
      setTimeout(() => setDropTooltip(false), 1500)
      return
    }
    const data = event.active.data.current as DragData
    if (data?.type === 'creature') handleAddCreature(data.row, data.tier)
    if (data?.type === 'hazard') handleAddHazard(data.hazard)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Party config + XP summary */}
      <PartyConfigBar />
      <div className="px-4 py-2 border-b border-border/50">
        <XPBudgetBar currentXP={totalXp} partySize={xpPartySize} />
      </div>

      {/* 3-panel layout wrapped in DndContext */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left: Saved encounters list */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <SavedEncounterList />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Middle: Creature/hazard search */}
          <ResizablePanel defaultSize={32} minSize={22} maxSize={45}>
            <CreatureSearchSidebar
              onAddCreature={handleAddCreature}
              onAddHazard={handleAddHazard}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right: Encounter editor (drop target) */}
          <ResizablePanel defaultSize={48} minSize={30}>
            {selectedId ? (
              <EncounterEditor encounterId={selectedId} partyLevel={partyLevel} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">Select an encounter to edit its creature list.</p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>

        <DragOverlay>
          {activeDragData && (
            <div className="opacity-80 pointer-events-none">
              {activeDragData.type === 'creature' ? (
                <div className="px-3 py-2 bg-card rounded-md border border-border text-sm font-medium shadow-lg">
                  {activeDragData.row.name}
                </div>
              ) : (
                <div className="px-3 py-2 bg-card rounded-md border-l-2 border-amber-600/60 border border-border text-sm font-medium shadow-lg text-amber-100/90">
                  {activeDragData.hazard.name}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Drop no-op tooltip */}
      {dropTooltip && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-muted text-sm rounded-md shadow-lg border border-border/50 z-50">
          Select an encounter first
        </div>
      )}
    </div>
  )
}
