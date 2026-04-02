import { useState, useEffect, useRef, useCallback } from 'react'
import { Shield } from 'lucide-react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shared/ui/resizable'
import { InitiativeList } from '@/widgets/initiative-list'
import { BestiarySearchPanel } from '@/widgets/bestiary-search'
import { CombatantDetail } from '@/widgets/combatant-detail'
import { PersistentDamageDialog } from '@/widgets/combatant-detail/ui/PersistentDamageDialog'
import { CombatControls, AddPCDialog } from '@/features/combat-tracker'
import { TurnControls } from '@/features/combat-tracker/ui/TurnControls'
import { useCombatTrackerStore } from '@/features/combat-tracker/model/store'
import { setupAutoSave, teardownAutoSave, loadActiveCombat } from '@/features/combat-tracker/lib/combat-persistence'
import { setupEncounterAutoSave, teardownEncounterAutoSave } from '@/features/combat-tracker/lib/encounter-persistence'
import { useCombatantStore } from '@/entities/combatant'
import { CreatureStatBlock, toCreatureStatBlockData } from '@/entities/creature'
import type { CreatureStatBlockData } from '@/entities/creature'
import { fetchCreatureById } from '@/shared/api'
import { useShallow } from 'zustand/react/shallow'

export function CombatPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lastNpcStatBlock, setLastNpcStatBlock] = useState<CreatureStatBlockData | null>(null)
  const [statBlockLoading, setStatBlockLoading] = useState(false)
  const statBlockCache = useRef<Map<string, CreatureStatBlockData>>(new Map())

  const pendingPersistentDamage = useCombatTrackerStore((s) => s.pendingPersistentDamage)
  const setPendingPersistentDamage = useCombatTrackerStore((s) => s.setPendingPersistentDamage)

  const combatants = useCombatantStore(useShallow((s) => s.combatants))

  useEffect(() => {
    const { isRunning, isEncounterBacked } = useCombatTrackerStore.getState()

    // Only auto-load from DB if no combat is already running in stores.
    // (When encounter was just loaded via loadEncounterIntoCombat, stores are
    //  already populated — do not overwrite with stale ad-hoc combat from DB.)
    if (!isRunning) {
      loadActiveCombat()
    }

    if (isEncounterBacked) {
      setupEncounterAutoSave()
      return () => teardownEncounterAutoSave()
    } else {
      setupAutoSave()
      return () => teardownAutoSave()
    }
  }, [])

  const handleSelect = useCallback(async (id: string) => {
    setSelectedId(id)

    const combatant = combatants.find((c) => c.id === id)
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
      const row = await fetchCreatureById(combatant.creatureRef)
      if (row) {
        const data = toCreatureStatBlockData(row)
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
  }, [combatants])

  return (
    <div className="flex flex-col h-full">
      <PersistentDamageDialog
        pending={pendingPersistentDamage}
        onClose={() => setPendingPersistentDamage(null)}
      />
      <ResizablePanelGroup direction="horizontal" className="flex-1">

        {/* Left panel — Bestiary search */}
        <ResizablePanel defaultSize={22} minSize={16} maxSize={32}>
          <BestiarySearchPanel />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center panel — Initiative list + Combatant detail */}
        <ResizablePanel defaultSize={38} minSize={28}>
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
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel — Creature stat card */}
        <ResizablePanel defaultSize={40} minSize={28}>
          <div className="h-full overflow-y-auto">
            {lastNpcStatBlock ? (
              <CreatureStatBlock creature={lastNpcStatBlock} className="rounded-none border-x-0 border-t-0" />
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
    </div>
  )
}
