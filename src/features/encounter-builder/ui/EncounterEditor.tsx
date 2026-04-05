import { useState } from 'react'
import { X, AlertTriangle, Skull } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDroppable } from '@dnd-kit/core'
import { Button } from '@/shared/ui/button'
import { LevelBadge } from '@/shared/ui/level-badge'
import { ScrollArea } from '@/shared/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { cn } from '@/shared/lib/utils'
import { useEncounterStore } from '@/entities/encounter'
import { saveEncounterCombatants, resetEncounterCombat } from '@/shared/api'
import type { EncounterCombatantRow } from '@/shared/api'
import { loadEncounterIntoCombat, teardownEncounterAutoSave, flushEncounterSave } from '@/features/combat-tracker/lib/encounter-persistence'
import { teardownAutoSave } from '@/features/combat-tracker/lib/combat-persistence'
import { useCombatTrackerStore } from '@/features/combat-tracker/model/store'
import { PATHS } from '@/shared/routes'
import { calculateCreatureXP, getHazardXp } from '@engine'

interface Props {
  encounterId: string
  partyLevel: number
}

export function EncounterEditor({ encounterId, partyLevel }: Props) {
  const encounter = useEncounterStore((s) => s.encounters.find((e) => e.id === encounterId))
  const setEncounterCombatants = useEncounterStore((s) => s.setEncounterCombatants)
  const upsertEncounter = useEncounterStore((s) => s.upsertEncounter)
  const navigate = useNavigate()
  const [showLoadConfirm, setShowLoadConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const { setNodeRef: dropRef, isOver } = useDroppable({ id: 'encounter-drop-zone' })

  if (!encounter) return null

  async function doLoadIntoCombat() {
    setLoading(true)
    try {
      // Save current encounter state before switching
      const tracker = useCombatTrackerStore.getState()
      if (tracker.isRunning && tracker.isEncounterBacked) {
        await flushEncounterSave()
      }
      teardownAutoSave()
      teardownEncounterAutoSave()
      await loadEncounterIntoCombat(encounterId)
      navigate(PATHS.COMBAT)
    } finally {
      setLoading(false)
    }
  }

  function handleLoadClick() {
    const { isRunning, isEncounterBacked } = useCombatTrackerStore.getState()
    if (isRunning && !isEncounterBacked) {
      // Ad-hoc combat will be lost — confirm
      setShowLoadConfirm(true)
    } else {
      // No combat or encounter-backed (state auto-saved) — switch directly
      doLoadIntoCombat()
    }
  }

  async function handleReset() {
    await resetEncounterCombat(encounterId)
    const rows = await (await import('@/shared/api')).loadEncounterCombatants(encounterId)
    const updated = rows.map((r) => ({
      id: r.id,
      encounterId: r.encounterId,
      creatureRef: r.creatureRef,
      displayName: r.displayName,
      initiative: r.initiative,
      hp: r.hp,
      maxHp: r.maxHp,
      tempHp: r.tempHp,
      isNPC: r.isNPC,
      weakEliteTier: r.weakEliteTier as 'normal' | 'weak' | 'elite',
      creatureLevel: r.creatureLevel,
      sortOrder: r.sortOrder,
      isHazard: r.isHazard,
      hazardRef: r.hazardRef,
    }))
    setEncounterCombatants(encounterId, updated)
    if (encounter) {
      upsertEncounter({ ...encounter, round: 0, turn: 0, activeCombatantId: null, isRunning: false, combatants: updated })
    }
  }

  const combatants = encounter.combatants

  async function handleRemove(instanceId: string) {
    const remaining = combatants.filter((c) => c.id !== instanceId)
    const rows: EncounterCombatantRow[] = remaining.map((c, i) => ({
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
    }))
    await saveEncounterCombatants(encounterId, rows)
    setEncounterCombatants(encounterId, remaining.map((c, i) => ({ ...c, sortOrder: i })))
  }

  return (
    <div ref={dropRef} className={cn('flex flex-col h-full', isOver && 'border-dashed border border-primary/40 bg-primary/5')}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 shrink-0">
        <p className="text-base font-semibold truncate">{encounter.name}</p>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-2 border-b border-border/50 flex items-center gap-2 shrink-0">
        <Button
          variant="default"
          size="sm"
          className="h-8 text-sm"
          onClick={handleLoadClick}
          disabled={loading}
        >
          Load into Combat
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-sm text-destructive hover:text-destructive"
          onClick={() => setShowResetConfirm(true)}
        >
          Reset
        </Button>
      </div>

      {/* Creature list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {combatants.length > 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              {combatants.length} creature{combatants.length !== 1 ? 's' : ''}
            </p>
          )}

          {combatants.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No creatures added yet.
            </p>
          )}

          {combatants.map((c) => {
            const effectivePartyLevel = partyLevel
            const adjustedLevel =
              c.weakEliteTier === 'elite' ? c.creatureLevel + 1
              : c.weakEliteTier === 'weak' ? c.creatureLevel - 1
              : c.creatureLevel
            const isHazard = c.isHazard === true
            const xpResult = isHazard
              ? getHazardXp(c.creatureLevel, effectivePartyLevel, 'simple')
              : calculateCreatureXP(adjustedLevel, effectivePartyLevel)

            return (
              <div
                key={c.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md group ${
                  isHazard
                    ? 'border-l-2 border-amber-600/60 bg-amber-950/30 hover:bg-amber-950/50'
                    : 'bg-secondary/30 hover:bg-secondary/50'
                }`}
              >
                {isHazard && (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <LevelBadge level={adjustedLevel} size="sm" />
                {!isHazard && c.weakEliteTier !== 'normal' && (
                  <span
                    className={`text-[10px] px-1 rounded ${
                      c.weakEliteTier === 'elite'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {c.weakEliteTier === 'elite' ? 'E' : 'W'}
                  </span>
                )}
                <span className="flex-1 text-sm font-medium truncate">{c.displayName}</span>
                {xpResult.xp != null
                  ? <span className="text-xs font-mono text-muted-foreground">{xpResult.xp} XP</span>
                  : <span className="flex items-center gap-1 text-red-500"><Skull className="w-3 h-3 shrink-0" /><span className="text-xs font-mono">???</span></span>
                }
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemove(c.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Load into Combat — confirm when combat is active */}
      <AlertDialog open={showLoadConfirm} onOpenChange={setShowLoadConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Current Combat?</AlertDialogTitle>
            <AlertDialogDescription>
              An active combat is in progress. Loading this encounter will end it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Current</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setShowLoadConfirm(false); doLoadIntoCombat() }}
            >
              Discard & Load
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Encounter — confirm */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Encounter?</AlertDialogTitle>
            <AlertDialogDescription>
              All creatures return to full HP. Conditions and round state are cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setShowResetConfirm(false); handleReset() }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
