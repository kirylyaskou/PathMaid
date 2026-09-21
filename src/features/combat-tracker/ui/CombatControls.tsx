import { useState } from 'react'
import { Play, Square, Swords, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { useCombatTrackerStore } from '../model/store'
import { useEncounterTabsStore } from '../model/encounter-tabs-store'
import { startActiveCombat, finishActiveCombat } from '../lib/combat-lifecycle'
import { logErrorWithToast } from '@/shared/lib/error'
import { useCombatantStore } from '@/entities/combatant'
import { useShallow } from 'zustand/react/shallow'

export function CombatControls() {
  const { t } = useTranslation('common')
  const { isRunning, round, turn, lastSaveError } = useCombatTrackerStore(
    useShallow((s) => ({ isRunning: s.isRunning, round: s.round, turn: s.turn, lastSaveError: s.lastSaveError }))
  )
  const [busy, setBusy] = useState(false)
  const combatants = useCombatantStore(useShallow((s) => s.combatants))

  const isStarted = useEncounterTabsStore((s) => s.openTabs.find((tab) => tab.id === s.activeTabId)?.isStarted ?? true)
  const handleStart = async () => {
    if (busy) return
    setBusy(true)
    try { await startActiveCombat() }
    catch (err) { logErrorWithToast('combat.start')(err) }
    finally { setBusy(false) }
  }

  const handleEnd = async () => {
    if (busy) return
    setBusy(true)
    try { await finishActiveCombat() }
    catch (err) { logErrorWithToast('combat.finish')(err) }
    finally { setBusy(false) }
  }

  const showStart = !isRunning || !isStarted

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border/50">
      <Swords className="w-4 h-4 text-primary/70" />
      {isRunning && isStarted ? (
        <Badge variant="secondary" className="text-xs font-mono">
          R{round} T{turn + 1}
        </Badge>
      ) : (
        <span className="text-sm text-muted-foreground">{t('combatTracker.label')}</span>
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
          disabled={busy || combatants.length === 0}
        >
          <Play className="w-3 h-3" />
          {t('combatTracker.start')}
        </Button>
      )}
      {isRunning && isStarted && (
        <Button
          size="sm"
          variant="destructive"
          className="h-7 text-xs gap-1"
          onClick={handleEnd}
          disabled={busy}
        >
          <Square className="w-3 h-3" />
          {t('combatTracker.end')}
        </Button>
      )}
    </div>
  )
}
