import { Play, Square, Swords, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { useCombatTrackerStore, clearAllManagers } from '@/features/combat-tracker'
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

  const handleStart = () => {
    if (combatants.length === 0) return
    const combatId = crypto.randomUUID()
    startCombat(combatId)
    const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative)
    const orderedIds = sorted.map((c) => c.id)
    useCombatantStore.getState().reorderInitiative(orderedIds)
    setActiveCombatant(sorted[0].id)
  }

  const handleEnd = () => {
    clearTurnSnapshot()
    endCombat()
    clearAllManagers()
    clearAllCombatants()
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/50">
      <Swords className="w-4 h-4 text-primary/70" />
      {isRunning ? (
        <>
          <Badge variant="secondary" className="text-xs font-mono">
            R{round} T{turn + 1}
          </Badge>
          {lastSaveError && (
            <span title={lastSaveError} className="text-destructive">
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs gap-1"
            onClick={handleEnd}
          >
            <Square className="w-3 h-3" />
            End
          </Button>
        </>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">Combat</span>
          <div className="flex-1" />
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleStart}
            disabled={combatants.length === 0}
          >
            <Play className="w-3 h-3" />
            Start
          </Button>
        </>
      )}
    </div>
  )
}
