import { useEffect } from 'react'
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
} from '@/features/encounter-builder'
import { loadEncounterCombatants } from '@/shared/api'
import { calculateXP } from '@engine'

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

  // XP Budget: compute from selected encounter's combatants
  const selectedEncounter = encounters.find((e) => e.id === selectedId)
  const adjustedLevels = selectedEncounter?.combatants.map((c) =>
    c.weakEliteTier === 'elite' ? c.creatureLevel + 1
    : c.weakEliteTier === 'weak' ? c.creatureLevel - 1
    : c.creatureLevel
  ) ?? []
  const totalXp = selectedEncounter
    ? calculateXP(adjustedLevels, [], selectedEncounter.partyLevel, selectedEncounter.partySize).totalXp
    : 0
  const xpPartySize = selectedEncounter?.partySize ?? partySize

  return (
    <div className="flex flex-col h-full">
      {/* Party config + XP summary */}
      <PartyConfigBar />
      <div className="px-4 py-2 border-b border-border/50">
        <XPBudgetBar currentXP={totalXp} partySize={xpPartySize} />
      </div>

      {/* Main split: list (left) + editor (right) */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={22} minSize={15} maxSize={35}>
          <SavedEncounterList />
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={78} minSize={50}>
          {selectedId ? (
            <EncounterEditor encounterId={selectedId} partyLevel={partyLevel} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">Select an encounter to edit its creature list.</p>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
