import { useState, useCallback } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { useCombatTrackerStore } from '../model/store'
import { useEncounterTabsStore } from '../model/encounter-tabs-store'
import { advanceTurn, reverseTurn, canReverseTurn } from '../lib/turn-manager'
import { useShallow } from 'zustand/react/shallow'

export function TurnControls() {
  const { isRunning } = useCombatTrackerStore(
    useShallow((s) => ({ isRunning: s.isRunning }))
  )
  // 63-fix: turn controls disabled until the active tab is explicitly started.
  // Loading an encounter sets isRunning=true but keeps the tab isStarted=false
  // so the GM can arrange conditions / effects before clicking Start.
  const activeTabIsStarted = useEncounterTabsStore(
    (s) => s.openTabs.find((t) => t.id === s.activeTabId)?.isStarted ?? true
  )
  const [, setTick] = useState(0)

  const handleNext = useCallback(() => {
    advanceTurn()
    setTick((t) => t + 1)
  }, [])

  const handlePrevious = useCallback(() => {
    reverseTurn()
    setTick((t) => t + 1)
  }, [])

  if (!isRunning) return null

  return (
    <div className="flex items-center gap-1.5 p-2 border-t border-border/50">
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1 flex-1"
        onClick={handlePrevious}
        disabled={!activeTabIsStarted || !canReverseTurn()}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Previous
      </Button>
      <Button
        size="sm"
        className="h-7 text-xs gap-1 flex-1"
        onClick={handleNext}
        disabled={!activeTabIsStarted}
        title={!activeTabIsStarted ? 'Press Start to begin combat' : undefined}
      >
        Next Turn
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}
