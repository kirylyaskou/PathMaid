import { useState } from 'react'
import { Play, Info } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useEncounterTabsStore } from '../model/encounter-tabs-store'
import { useCombatantStore } from '@/entities/combatant'
import { useCombatTrackerStore } from '../model/store'
import { PreCombatSetupSheet } from './PreCombatSetupSheet'

// 63-02: floating Start + Info overlay rendered on top of a pre-start combat
// panel. Clicking Start flips the tab's isStarted flag and, if combat hasn't
// begun yet, kicks off initiative.
export function StartGateOverlay({ tabId }: { tabId: string }) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleStart = () => {
    const combatants = useCombatantStore.getState().combatants
    const tracker = useCombatTrackerStore.getState()
    // Flip the tab flag first so UI un-blurs even if the tracker is already running.
    useEncounterTabsStore.getState().startTab(tabId)
    if (combatants.length === 0) return
    // If combat hasn't actually started (no combatId or not running), run the same
    // initiative-start flow as CombatControls.handleStart.
    if (!tracker.isRunning) {
      const newCombatId = tracker.combatId ?? crypto.randomUUID()
      tracker.startCombat(newCombatId)
    }
    if (!tracker.activeCombatantId) {
      const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative)
      useCombatantStore.getState().reorderInitiative(sorted.map((c) => c.id))
      useCombatTrackerStore.getState().setActiveCombatant(sorted[0].id)
    }
  }

  return (
    <>
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 pointer-events-auto">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shadow-md bg-card"
          onClick={() => setSheetOpen(true)}
          aria-label="Open pre-combat setup"
          title="Pre-combat setup (effects, conditions, HP)"
        >
          <Info className="w-4 h-4" />
        </Button>
        <Button
          size="lg"
          className="gap-2 shadow-lg"
          onClick={handleStart}
          aria-label="Start combat"
        >
          <Play className="w-4 h-4" />
          Start
        </Button>
      </div>
      <PreCombatSetupSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
