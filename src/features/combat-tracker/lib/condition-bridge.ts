// ConditionManager bridge — connects engine condition logic to React/Zustand state.
// Each combatant gets its own ConditionManager instance (module-level Map).
// Bridge functions mutate the engine ConditionManager then sync state to useConditionStore.

import { ConditionManager, VALUED_CONDITIONS } from '@engine'
import type { ConditionSlug } from '@engine'
import { useConditionStore } from '@/entities/condition'
import type { ActiveCondition } from '@/entities/condition'
import { useCombatantStore } from '@/entities/combatant'

const managers = new Map<string, ConditionManager>()

/**
 * Recompute drained maxHp reduction after drained value changes.
 * PF2e Drained: reduces maxHp by (level × drained value). Restores when removed.
 * Uses combatant.baseMaxHp as invariant so the reduction is always reversible.
 */
function recomputeDrainedHp(combatantId: string): void {
  const cm = managers.get(combatantId)
  if (!cm) return
  const drainedValue = cm.get('drained') ?? 0

  const state = useCombatantStore.getState()
  const combatant = state.combatants.find((c) => c.id === combatantId)
  if (!combatant) return

  // PF2e: Drained max-HP reduction = level (min 1) × drained value.
  const level = Math.max(1, combatant.level ?? 1)
  // Lazily initialize baseMaxHp to current maxHp the first time drained is applied.
  const baseMaxHp = combatant.baseMaxHp ?? combatant.maxHp
  if (combatant.baseMaxHp === undefined) {
    // Persist baseMaxHp on first drained application via direct mutation through setMaxHp.
    // Since setMaxHp doesn't touch baseMaxHp, push it via setCombatants.
    useCombatantStore.setState((s) => {
      const c = s.combatants.find((c) => c.id === combatantId)
      if (c) c.baseMaxHp = baseMaxHp
    })
  }

  const reduction = level * drainedValue
  const newMaxHp = Math.max(1, baseMaxHp - reduction)

  // Delta from current maxHp → apply same delta to current HP (CRB: not damage).
  const maxHpDelta = newMaxHp - combatant.maxHp
  state.setMaxHp(combatantId, newMaxHp)

  if (maxHpDelta !== 0) {
    const newHp = Math.max(0, Math.min(newMaxHp, combatant.hp + maxHpDelta))
    useCombatantStore.setState((s) => {
      const c = s.combatants.find((c) => c.id === combatantId)
      if (c) c.hp = newHp
    })
  }
}

function getOrCreate(combatantId: string): ConditionManager {
  let cm = managers.get(combatantId)
  if (!cm) {
    cm = new ConditionManager()
    managers.set(combatantId, cm)
  }
  return cm
}

function syncToStore(combatantId: string): void {
  const cm = managers.get(combatantId)
  if (!cm) {
    useConditionStore.getState().clearCombatantConditions(combatantId)
    return
  }
  const conditions: ActiveCondition[] = cm
    .getAll()
    .filter(({ slug }) => !slug.startsWith('persistent-'))
    .map(({ slug, value }) => ({
      combatantId,
      slug,
      value: (VALUED_CONDITIONS as readonly string[]).includes(slug) ? value : undefined,
      isLocked: cm.isProtected(slug) || undefined,
      grantedBy: cm.getGranter(slug),
    }))
  useConditionStore.getState().syncEngineConditions(combatantId, conditions)
}

export function applyCondition(
  combatantId: string,
  slug: ConditionSlug,
  value?: number
): ConditionSlug[] {
  const cm = getOrCreate(combatantId)
  const before = new Set(cm.getAll().map((c) => c.slug))
  cm.add(slug, value ?? 1)
  const after = cm.getAll().map((c) => c.slug)
  const granted = after.filter((s) => !before.has(s) && s !== slug)
  syncToStore(combatantId)
  if (slug === 'drained') recomputeDrainedHp(combatantId)
  return granted as ConditionSlug[]
}

export function removeCondition(
  combatantId: string,
  slug: ConditionSlug
): ConditionSlug[] {
  const cm = managers.get(combatantId)
  if (!cm) return []
  const before = new Set(cm.getAll().map((c) => c.slug))
  cm.remove(slug)
  const after = new Set(cm.getAll().map((c) => c.slug))
  const removed = [...before].filter((s) => !after.has(s) && s !== slug)
  syncToStore(combatantId)
  if (slug === 'drained') recomputeDrainedHp(combatantId)
  return removed as ConditionSlug[]
}

export function endTurnConditions(
  combatantId: string
): Array<{ slug: string; from: number; to: number | null }> {
  const cm = managers.get(combatantId)
  if (!cm) return []
  const before = new Map(cm.getAll().map((c) => [c.slug, c.value]))
  cm.endTurn()
  const after = new Map(cm.getAll().map((c) => [c.slug, c.value]))
  const changes: Array<{ slug: string; from: number; to: number | null }> = []
  for (const [slug, fromVal] of before) {
    const toVal = after.get(slug)
    if (toVal === undefined) {
      changes.push({ slug, from: fromVal, to: null })
    } else if (toVal !== fromVal) {
      changes.push({ slug, from: fromVal, to: toVal })
    }
  }
  syncToStore(combatantId)
  return changes
}

/** Set a condition's value directly without gain logic (no wounded added for dying). */
export function setConditionValue(
  combatantId: string,
  slug: ConditionSlug,
  value: number
): void {
  const cm = managers.get(combatantId)
  if (!cm) return
  cm.setValue(slug, value)
  syncToStore(combatantId)
  if (slug === 'drained') recomputeDrainedHp(combatantId)
}

export function setConditionLocked(
  combatantId: string,
  slug: ConditionSlug,
  locked: boolean
): void {
  const cm = managers.get(combatantId)
  if (!cm) return
  cm.setProtected(slug, locked)
  syncToStore(combatantId)
}

export function getManagerState(
  combatantId: string
): Array<{ slug: ConditionSlug; value: number; isLocked: boolean; grantedBy?: ConditionSlug }> {
  const cm = managers.get(combatantId)
  if (!cm) return []
  return cm.getAll().map(({ slug, value }) => ({
    slug,
    value,
    isLocked: cm.isProtected(slug),
    grantedBy: cm.getGranter(slug),
  }))
}

export function hydrateManager(
  combatantId: string,
  conditions: Array<{ slug: ConditionSlug; value: number; isLocked: boolean; grantedBy?: ConditionSlug }>
): void {
  const cm = getOrCreate(combatantId)
  for (const c of conditions) {
    cm.add(c.slug, c.value)
    if (c.isLocked) cm.setProtected(c.slug, true)
  }
  syncToStore(combatantId)
}

export function clearCombatantManager(combatantId: string): void {
  managers.delete(combatantId)
  useConditionStore.getState().clearCombatantConditions(combatantId)
}

export function clearAllManagers(): void {
  managers.clear()
  useConditionStore.getState().clearAll()
}
