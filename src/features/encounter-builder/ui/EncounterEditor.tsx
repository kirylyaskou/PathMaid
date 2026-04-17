import { useState, useEffect } from 'react'
import { X, AlertTriangle, Skull, Pencil, ArrowUpDown, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDroppable } from '@dnd-kit/core'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
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
import { saveEncounterCombatants, resetEncounterCombat, updateEncounterName, loadEncounterStagingCombatants } from '@/shared/api'
import type { EncounterCombatantRow } from '@/shared/api'
import { logErrorWithToast } from '@/shared/lib/error'
import {
  loadEncounterIntoCombat, teardownEncounterAutoSave, flushEncounterSave,
  teardownAutoSave, useCombatTrackerStore,
  useEncounterTabsStore, snapshotFromGlobalStores,
} from '@/features/combat-tracker'
import { StatBlockModal } from '@/entities/creature'
import { PATHS } from '@/shared/routes'
import { calculateCreatureXP, getHazardXp } from '@engine'
import { useCombatantStore } from '@/entities/combatant'
import type { StagingCombatant, Combatant } from '@/entities/combatant'
import { StagingTable } from './StagingTable'

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
  // 63-03: dedup — when loading an encounter that already has an open tab,
  // offer Open / Refresh / Cancel rather than silently opening a duplicate.
  const [dedupTargetTabId, setDedupTargetTabId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(encounter?.name ?? '')
  // FEAT-12 (52-03 follow-up): clicking a creature name opens its stat block.
  const [statBlockCreatureId, setStatBlockCreatureId] = useState<string | null>(null)

  const { setNodeRef: dropRef, isOver } = useDroppable({ id: 'encounter-drop-zone' })

  // Load staging pool from DB when encounter selection changes so StagingTable reflects this encounter's staged creatures.
  useEffect(() => {
    let cancelled = false
    loadEncounterStagingCombatants(encounterId)
      .then((rows) => {
        if (cancelled) return
        const staging: StagingCombatant[] = rows.map((row) => ({
          combatant: {
            kind: row.kind,
            id: row.id,
            creatureRef: row.creatureRef,
            displayName: row.displayName,
            initiative: 0,
            hp: row.hp,
            maxHp: row.maxHp,
            tempHp: row.tempHp,
            ...(row.creatureLevel ? { level: row.creatureLevel } : {}),
          } as Combatant,
          round: row.round ?? undefined,
          sortOrder: row.sortOrder,
        }))
        useCombatantStore.getState().setStagingCombatants(staging)
      })
      .catch(logErrorWithToast('staging-load'))
    return () => {
      cancelled = true
    }
  }, [encounterId])

  if (!encounter) return null

  async function doLoadIntoCombat() {
    setLoading(true)
    try {
      // Save current active tab before loading the new encounter
      const tracker = useCombatTrackerStore.getState()
      if (tracker.isRunning && tracker.isEncounterBacked) {
        await flushEncounterSave()
      }
      teardownAutoSave()
      teardownEncounterAutoSave()

      // Save current active tab snapshot so it survives the store mutation below
      useEncounterTabsStore.getState().updateActiveSnapshot()

      const ok = await loadEncounterIntoCombat(encounterId)
      if (!ok) return

      // Open a NEW tab for the loaded encounter — do not overwrite the active tab.
      // Use openTabFromSnapshot: the old tab's snapshot was already saved above via
      // updateActiveSnapshot(), and global stores now contain the new encounter's data,
      // so we must NOT call updateActiveSnapshot() again (it would corrupt the old tab).
      const snapshot = snapshotFromGlobalStores()
      useEncounterTabsStore.getState().openTabFromSnapshot({
        encounterId,
        name: encounter?.name ?? 'Encounter',
        snapshot,
        // 63-03: pass the load-time snapshot as the template so Refresh reverts
        // to pristine pre-start state; isStarted defaults to false via the store.
        templateSnapshot: snapshot,
      })

      navigate(PATHS.COMBAT)
    } finally {
      setLoading(false)
    }
  }

  function handleLoadClick() {
    // 63-03: dedup — if a tab is already open for this encounter, offer
    // Open-existing / Refresh-existing / Cancel instead of silently duplicating.
    const existing = useEncounterTabsStore
      .getState()
      .openTabs.find((t) => t.encounterId === encounterId)
    if (existing) {
      setDedupTargetTabId(existing.id)
      return
    }
    const { isRunning } = useCombatTrackerStore.getState()
    if (isRunning) {
      // Any active combat (ad-hoc or encounter-backed): confirm before loading
      // because the user may not realise a new tab is about to be opened
      setShowLoadConfirm(true)
    } else {
      doLoadIntoCombat()
    }
  }

  // 63-03: dedup actions
  function handleDedupOpen() {
    if (!dedupTargetTabId) return
    useEncounterTabsStore.getState().setActiveTab(dedupTargetTabId)
    setDedupTargetTabId(null)
    navigate(PATHS.COMBAT)
  }

  async function handleDedupRefresh() {
    if (!dedupTargetTabId) return
    const tabId = dedupTargetTabId
    setDedupTargetTabId(null)
    await useEncounterTabsStore.getState().resetTab(tabId)
    useEncounterTabsStore.getState().setActiveTab(tabId)
    navigate(PATHS.COMBAT)
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
      hazardType: r.hazardType,
    }))
    setEncounterCombatants(encounterId, updated)
    useCombatantStore.getState().setStagingCombatants([])
    if (encounter) {
      upsertEncounter({ ...encounter, round: 0, turn: 0, activeCombatantId: null, isRunning: false, combatants: updated })
    }
  }

  const combatants = encounter.combatants

  async function handleSaveName() {
    setEditingName(false)
    if (!nameValue.trim() || nameValue === encounter?.name) return
    await updateEncounterName(encounterId, nameValue.trim())
    upsertEncounter({ ...encounter!, name: nameValue.trim() })
  }

  async function handleSortByLevel() {
    const sorted = [...combatants].sort((a, b) => b.creatureLevel - a.creatureLevel)
    const rows = sorted.map((c, i) => ({
      id: c.id, encounterId: c.encounterId, creatureRef: c.creatureRef,
      displayName: c.displayName, initiative: c.initiative, hp: c.hp,
      maxHp: c.maxHp, tempHp: c.tempHp, isNPC: c.isNPC,
      weakEliteTier: c.weakEliteTier, creatureLevel: c.creatureLevel,
      sortOrder: i, isHazard: c.isHazard ?? false, hazardRef: c.hazardRef ?? null,
      hazardType: c.hazardType,
    }))
    await saveEncounterCombatants(encounterId, rows)
    setEncounterCombatants(encounterId, sorted.map((c, i) => ({ ...c, sortOrder: i })))
  }

  async function handleClearAll() {
    await saveEncounterCombatants(encounterId, [])
    setEncounterCombatants(encounterId, [])
  }

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
      hazardType: c.hazardType,
    }))
    await saveEncounterCombatants(encounterId, rows)
    setEncounterCombatants(encounterId, remaining.map((c, i) => ({ ...c, sortOrder: i })))
  }

  return (
    <div ref={dropRef} className={cn('flex flex-col h-full', isOver && 'border-dashed border border-primary/40 bg-primary/5')}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 shrink-0">
        {editingName ? (
          <Input
            autoFocus
            className="text-base font-semibold bg-transparent border-b border-primary rounded-none border-x-0 border-t-0 px-0 h-auto outline-none focus-visible:ring-0 w-full"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName()
              if (e.key === 'Escape') { setEditingName(false); setNameValue(encounter?.name ?? '') }
            }}
          />
        ) : (
          <button
            className="text-base font-semibold hover:text-primary transition-colors flex items-center gap-1 truncate"
            onClick={() => setEditingName(true)}
          >
            {encounter.name}
            <Pencil className="w-3 h-3 opacity-50 shrink-0" />
          </button>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-2 border-b border-border/50 flex items-center gap-2 shrink-0 flex-wrap">
        <Button variant="default" size="sm" className="h-8 text-sm" onClick={handleLoadClick} disabled={loading}>
          Load into Combat
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-sm text-destructive hover:text-destructive" onClick={() => setShowResetConfirm(true)}>
          Reset
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs ml-auto" onClick={handleSortByLevel}>
          <ArrowUpDown className="w-3 h-3" />
          Sort by Level
        </Button>
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-destructive/70 hover:text-destructive" onClick={handleClearAll}>
          <Trash2 className="w-3 h-3" />
          Clear
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
              ? getHazardXp(c.creatureLevel, effectivePartyLevel, c.hazardType ?? 'simple')
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
                {isHazard || !c.creatureRef ? (
                  <span className="flex-1 text-sm font-medium truncate">{c.displayName}</span>
                ) : (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setStatBlockCreatureId(c.creatureRef)
                    }}
                    className="flex-1 text-sm font-medium truncate text-left hover:text-pf-gold transition-colors"
                    title="View stat block"
                  >
                    {c.displayName}
                  </button>
                )}
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

      {/* Staging pool — creatures queued to enter combat later */}
      <div className="px-3 pb-3 shrink-0">
        <StagingTable encounterId={encounterId} combatMode={false} />
      </div>

      {/* Load into Combat — confirm when combat is active */}
      <AlertDialog open={showLoadConfirm} onOpenChange={setShowLoadConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open in New Tab?</AlertDialogTitle>
            <AlertDialogDescription>
              A combat is already in progress. The encounter will open as a new tab alongside the current fight.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowLoadConfirm(false); doLoadIntoCombat() }}
            >
              Open New Tab
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 63-03: Duplicate tab — offer Open / Refresh / Cancel */}
      <AlertDialog
        open={dedupTargetTabId !== null}
        onOpenChange={(o) => !o && setDedupTargetTabId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tab Already Open</AlertDialogTitle>
            <AlertDialogDescription>
              A combat tab for this encounter is already open. Choose what to do.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-muted text-foreground hover:bg-muted/80"
              onClick={handleDedupOpen}
            >
              Open Existing Tab
            </AlertDialogAction>
            <AlertDialogAction onClick={handleDedupRefresh}>
              Refresh + Focus
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

      {/* Creature stat block modal — opens when a creature row name is clicked */}
      <StatBlockModal
        creatureId={statBlockCreatureId}
        open={statBlockCreatureId !== null}
        onOpenChange={(open) => { if (!open) setStatBlockCreatureId(null) }}
      />
    </div>
  )
}
