import { saveEncounterCombatState, loadEncounterState, loadEncounterStagingCombatants, fetchCreatureById } from '@/shared/api'
import type { EncounterConditionRow } from '@/shared/api'
import { useCombatantStore, kindFromLegacy, type Combatant, type StagingCombatant } from '@/entities/combatant'
import { useConditionStore, hydrateManager, clearAllManagers } from '@/entities/condition'
import { extractIwr } from '@/entities/creature'
import { useCombatTrackerStore } from '../model/store'
import { rollInitiative } from './initiative'
import type { ConditionSlug } from '@engine'
import { logErrorWithToast } from '@/shared/lib/error'

let unsubscribers: Array<() => void> = []
let saveTimer: ReturnType<typeof setTimeout> | null = null

function buildEncounterSavePayload() {
  const tracker = useCombatTrackerStore.getState()
  if (!tracker.combatId || !tracker.isRunning || !tracker.isEncounterBacked) return null

  const combatants = useCombatantStore.getState().combatants
  const conditions = useConditionStore.getState().activeConditions

  return {
    encounterId: tracker.combatId,
    round: tracker.round,
    turn: tracker.turn,
    activeCombatantId: tracker.activeCombatantId,
    isRunning: tracker.isRunning,
    combatants: combatants.map((c) => ({
      id: c.id,
      hp: c.hp,
      tempHp: c.tempHp,
      initiative: c.initiative,
    })),
    conditions: conditions.map((c): EncounterConditionRow => ({
      combatantId: c.combatantId,
      slug: c.slug,
      value: c.value,
      isLocked: c.isLocked,
      grantedBy: c.grantedBy,
      formula: c.formula,
    })),
  }
}

function debouncedEncounterSave(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const payload = buildEncounterSavePayload()
    if (!payload) return
    try {
      await saveEncounterCombatState(
        payload.encounterId,
        payload.round,
        payload.turn,
        payload.activeCombatantId,
        payload.isRunning,
        payload.combatants,
        payload.conditions
      )
      useCombatTrackerStore.getState().setLastSaveError(null)
    } catch (err) {
      logErrorWithToast('encounter-auto-save')(err)
      useCombatTrackerStore.getState().setLastSaveError('Auto-save failed')
    }
  }, 300)
}

export function setupEncounterAutoSave(): void {
  teardownEncounterAutoSave()
  unsubscribers.push(
    useCombatantStore.subscribe(debouncedEncounterSave),
    useConditionStore.subscribe(debouncedEncounterSave),
    useCombatTrackerStore.subscribe(debouncedEncounterSave)
  )
}

export function teardownEncounterAutoSave(): void {
  for (const unsub of unsubscribers) unsub()
  unsubscribers = []
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
}

/** Immediately persist the current encounter state (flush pending debounced save). */
export async function flushEncounterSave(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  const payload = buildEncounterSavePayload()
  if (!payload) return
  await saveEncounterCombatState(
    payload.encounterId,
    payload.round,
    payload.turn,
    payload.activeCombatantId,
    payload.isRunning,
    payload.combatants,
    payload.conditions
  )
}

/**
 * Load a saved encounter into the combat tracker stores.
 * Populates useCombatantStore + useConditionStore (via ConditionManager bridge)
 * and calls startEncounterCombat on the tracker store.
 * Does NOT navigate — caller handles navigation.
 */
export async function loadEncounterIntoCombat(encounterId: string): Promise<boolean> {
  try {
    const snapshot = await loadEncounterState(encounterId)
    if (!snapshot) return false

    // Fetch creature data for NPC combatants (initiative + IWR)
    const needsInitiative = !snapshot.isRunning && snapshot.round === 0
    const uniqueRefs = [...new Set(
      snapshot.combatants.filter((c) => c.isNPC && c.creatureRef).map((c) => c.creatureRef)
    )]
    const creatureRows = new Map<string, Awaited<ReturnType<typeof fetchCreatureById>>>()
    await Promise.all(uniqueRefs.map(async (ref) => {
      const row = await fetchCreatureById(ref)
      if (row) creatureRows.set(ref, row)
    }))

    // Build combatants with initiative rolls and IWR data
    const combatants: Combatant[] = snapshot.combatants.map((c) => {
      const row = c.creatureRef ? creatureRows.get(c.creatureRef) : null
      const iwr = row ? extractIwr(row) : null

      let initiative = c.initiative
      if (needsInitiative && (c.isNPC || c.isHazard) && row) {
        initiative = rollInitiative(row.perception ?? 0)
      }

      return {
        kind: kindFromLegacy(c.isNPC, c.isHazard ?? false),
        id: c.id,
        creatureRef: c.creatureRef,
        displayName: c.displayName,
        initiative,
        hp: c.hp,
        maxHp: c.maxHp,
        tempHp: c.tempHp,
        ...(row?.level != null ? { level: row.level } : {}),
        ...(c.weakEliteTier && c.weakEliteTier !== 'normal' ? { weakEliteTier: c.weakEliteTier } : {}),
        ...(iwr && iwr.immunities.length > 0 ? { iwrImmunities: iwr.immunities } : {}),
        ...(iwr && iwr.weaknesses.length > 0 ? { iwrWeaknesses: iwr.weaknesses } : {}),
        ...(iwr && iwr.resistances.length > 0 ? { iwrResistances: iwr.resistances } : {}),
      }
    })

    useCombatantStore.getState().setCombatants(combatants)

    // Restore staging pool from DB
    const stagingRows = await loadEncounterStagingCombatants(encounterId)
    const stagingCombatants: StagingCombatant[] = stagingRows.map((row) => ({
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
    useCombatantStore.getState().setStagingCombatants(stagingCombatants)

    // Hydrate conditions
    clearAllManagers()
    useConditionStore.getState().clearAll()

    const conditionsByComba = new Map<string, typeof snapshot.conditions>()
    for (const c of snapshot.conditions) {
      if (!conditionsByComba.has(c.combatantId)) {
        conditionsByComba.set(c.combatantId, [])
      }
      conditionsByComba.get(c.combatantId)!.push(c)
    }

    for (const [combatantId, conditions] of conditionsByComba) {
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
      const persistentConditions = conditions.filter((c) => c.slug.startsWith('persistent-'))
      for (const pc of persistentConditions) {
        useConditionStore.getState().setCondition({
          combatantId: pc.combatantId,
          slug: pc.slug,
          value: pc.value,
          isLocked: pc.isLocked,
          grantedBy: pc.grantedBy,
          formula: pc.formula,
        })
      }
    }

    // Start encounter-backed combat in tracker
    useCombatTrackerStore.getState().startEncounterCombat(
      encounterId,
      snapshot.round,
      snapshot.turn,
      snapshot.activeCombatantId
    )

    return true
  } catch (err) {
    console.error('Failed to load encounter into combat:', err)
    return false
  }
}
