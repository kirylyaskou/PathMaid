import { Play, Square, Swords, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { useCombatTrackerStore, clearAllManagers } from '@/features/combat-tracker'
import { useEncounterTabsStore } from '../model/encounter-tabs-store'
import { clearTurnSnapshot } from '../lib/turn-manager'
import { useCombatantStore } from '@/entities/combatant'
import { useShallow } from 'zustand/react/shallow'

export function CombatControls() {
  const { isRunning, round, turn, lastSaveError } = useCombatTrackerStore(
    useShallow((s) => ({ isRunning: s.isRunning, round: s.round, turn: s.turn, lastSaveError: s.lastSaveError }))
  )
  const { startCombat, endCombat, setActiveCombatant } = useCombatTrackerStore()
  const combatants = useCombatantStore(useShallow((s) => s.combatants))
  const clearAllCombatants = useCombatantStore((s) => s.clearAll)

  // 63-fix: pre-start gate — tab is opened in isStarted=false state after
  // loadEncounterIntoCombat. We show a "Start" button until the GM taps it,
  // regardless of whether the tracker is already running.
  const activeTabId = useEncounterTabsStore((s) => s.activeTabId)
  const activeTabIsStarted = useEncounterTabsStore(
    (s) => s.openTabs.find((t) => t.id === s.activeTabId)?.isStarted ?? true
  )
  const startTab = useEncounterTabsStore((s) => s.startTab)

  const handleStart = () => {
    if (combatants.length === 0) return
    // Flip the tab flag first so TurnControls un-disable synchronously.
    if (activeTabId) startTab(activeTabId)
    // If the tracker isn't already running (ad-hoc combat), boot it here.
    if (!isRunning) {
      const combatId = crypto.randomUUID()
      startCombat(combatId)
    }
    // If no active combatant yet, sort by initiative and pick the first.
    const activeId = useCombatTrackerStore.getState().activeCombatantId
    if (!activeId) {
      const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative)
      const orderedIds = sorted.map((c) => c.id)
      useCombatantStore.getState().reorderInitiative(orderedIds)
      setActiveCombatant(sorted[0].id)
    }
  }

  const handleEnd = () => {
    clearTurnSnapshot()
    endCombat()
    clearAllManagers()
    clearAllCombatants()
  }

  const showStart = !isRunning || !activeTabIsStarted

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/50">
      <Swords className="w-4 h-4 text-primary/70" />
      {isRunning && activeTabIsStarted ? (
        <Badge variant="secondary" className="text-xs font-mono">
          R{round} T{turn + 1}
        </Badge>
      ) : (
        <span className="text-sm text-muted-foreground">Combat</span>
      )}
      {lastSaveError && (
        <span title={lastSaveError} className="text-destructive">
          <AlertCircle className="w-3.5 h-3.5" />
        </span>
      )}
      <div className="flex-1" />
      {showStart && (
        <Button
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={handleStart}
          disabled={combatants.length === 0}
        >
          <Play className="w-3 h-3" />
          Start
        </Button>
      )}
      {isRunning && activeTabIsStarted && (
        <Button
          size="sm"
          variant="destructive"
          className="h-7 text-xs gap-1"
          onClick={handleEnd}
        >
          <Square className="w-3 h-3" />
          End
        </Button>
      )}
    </div>
  )
}
