import { saveCombatState, loadCombatState, listCombats } from '@/shared/api'
import type { CombatSnapshot } from '@/shared/api'
import { useCombatantStore } from '@/entities/combatant'
import { useConditionStore } from '@/entities/condition'
import { useCombatTrackerStore } from '../model/store'
import { hydrateManager, clearAllManagers } from '@/entities/condition'
import type { ConditionSlug } from '@engine'

let unsubscribers: Array<() => void> = []
let saveTimer: ReturnType<typeof setTimeout> | null = null

function buildSnapshot(): CombatSnapshot | null {
  const tracker = useCombatTrackerStore.getState()
  if (!tracker.combatId || !tracker.isRunning) return null

  const combatants = useCombatantStore.getState().combatants
  const conditions = useConditionStore.getState().activeConditions

  return {
    id: tracker.combatId,
    name: 'Combat',
    round: tracker.round,
    turn: tracker.turn,
    activeCombatantId: tracker.activeCombatantId,
    isRunning: tracker.isRunning,
    combatants: combatants.map((c) => ({ ...c, level: c.level ?? null })),
    conditions,
  }
}

function debouncedSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const snapshot = buildSnapshot()
    if (snapshot) {
      try {
        await saveCombatState(snapshot)
      } catch (err) {
        console.error('Auto-save failed:', err)
      }
    }
  }, 300)
}

export function setupAutoSave(): void {
  teardownAutoSave()

  unsubscribers.push(
    useCombatantStore.subscribe(debouncedSave),
    useConditionStore.subscribe(debouncedSave),
    useCombatTrackerStore.subscribe(debouncedSave)
  )
}

export function teardownAutoSave(): void {
  for (const unsub of unsubscribers) unsub()
  unsubscribers = []
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
}

export async function loadActiveCombat(): Promise<boolean> {
  try {
    const combats = await listCombats()
    const running = combats.find((c) => c.isRunning)
    if (!running) return false

    const snapshot = await loadCombatState(running.id)
    if (!snapshot) return false

    useCombatantStore.getState().setCombatants(
      snapshot.combatants.map((c) => ({ ...c, level: c.level ?? undefined }))
    )
    useCombatTrackerStore.getState().setCombatId(snapshot.id)
    useCombatTrackerStore.getState().setRound(snapshot.round)
    useCombatTrackerStore.getState().setTurn(snapshot.turn)
    useCombatTrackerStore.getState().setActiveCombatant(snapshot.activeCombatantId)

    if (snapshot.isRunning) {
      useCombatTrackerStore.setState({ isRunning: true })
    }

    clearAllManagers()
    const conditionsByCombatant = new Map<string, typeof snapshot.conditions>()
    for (const c of snapshot.conditions) {
      if (!conditionsByCombatant.has(c.combatantId)) {
        conditionsByCombatant.set(c.combatantId, [])
      }
      conditionsByCombatant.get(c.combatantId)!.push(c)
    }
    for (const [combatantId, conditions] of conditionsByCombatant) {
      // Hydrate engine-managed conditions only (not persistent-*)
      const engineConditions = conditions.filter((c) => !c.slug.startsWith('persistent-'))
      hydrateManager(
        combatantId,
        engineConditions.map((c) => ({
          slug: c.slug as ConditionSlug,
          value: c.value ?? 1,
          isLocked: !!c.isLocked,
          grantedBy: c.grantedBy as ConditionSlug | undefined,
        }))
      )
      // Restore persistent conditions directly to store (preserves formula)
      const persistentConditions = conditions.filter((c) => c.slug.startsWith('persistent-'))
      for (const pc of persistentConditions) {
        useConditionStore.getState().setCondition(pc)
      }
    }

    return true
  } catch (err) {
    console.error('Failed to load combat:', err)
    return false
  }
}
