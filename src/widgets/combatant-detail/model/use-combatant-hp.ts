import { useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useCombatantStore, isNpc } from '@/entities/combatant'
import { useConditionStore, applyCondition, removeCondition, clearCombatantManager, getManagerState } from '@/entities/condition'
import { getDyingValueOnKnockout, getWoundedValueAfterStabilize } from '@engine'
import type { ConditionSlug } from '@engine'

/** Standalone: increment dying for any combatant id without needing the hook.
 *  Used by PersistentDamageDialog which operates outside component tree context. */
export function incrementDyingForCombatant(combatantId: string): void {
  const conditions = useConditionStore.getState().activeConditions
  const dying = conditions.find((c) => c.combatantId === combatantId && c.slug === 'dying')
  const wounded = conditions.find((c) => c.combatantId === combatantId && c.slug === 'wounded')
  const currentDying = dying?.value ?? 0
  const woundedVal = wounded?.value ?? 0
  // If already dying: bump by 1. Otherwise: apply knockout start value (1 + wounded).
  const next = currentDying > 0
    ? currentDying + 1
    : getDyingValueOnKnockout(woundedVal)
  applyCondition(combatantId, 'dying' as ConditionSlug, next)
}

/** Single source of truth for a combatant's HP + dying/wounded state machine. */
export function useCombatantHp(combatantId: string) {
  // Reactive snapshot — used only for return values (UI rendering).
  const combatant = useCombatantStore(useShallow((s) => s.combatants.find((c) => c.id === combatantId)))
  const updateHp = useCombatantStore((s) => s.updateHp)
  const updateTempHp = useCombatantStore((s) => s.updateTempHp)

  const { dyingValue, doomedValue, woundedValue } = useConditionStore(
    useShallow((s) => {
      const conds = s.activeConditions.filter((c) => c.combatantId === combatantId)
      return {
        dyingValue: conds.find((c) => c.slug === 'dying')?.value ?? 0,
        doomedValue: conds.find((c) => c.slug === 'doomed')?.value ?? 0,
        woundedValue: conds.find((c) => c.slug === 'wounded')?.value ?? 0,
      }
    })
  )

  const deathThreshold = 4 - doomedValue
  const permaDead = combatant && isNpc(combatant) ? combatant.permaDead === true : false
  const isDead = permaDead || (dyingValue > 0 && dyingValue >= deathThreshold)

  /** Apply effective damage (post-IWR). Absorbs temp HP first, then triggers dying on knockout
   *  (or permaDead for mortal combatants). */
  const applyDamage = useCallback((effectiveDamage: number) => {
    const current = useCombatantStore.getState().combatants.find((c) => c.id === combatantId)
    if (!current) return
    let remaining = effectiveDamage
    if (current.tempHp > 0) {
      const absorbed = Math.min(current.tempHp, remaining)
      updateTempHp(combatantId, current.tempHp - absorbed)
      remaining -= absorbed
    }
    const hpBefore = current.hp
    if (remaining > 0) updateHp(combatantId, -remaining)
    const newHp = Math.max(0, hpBefore - remaining)
    if (newHp === 0 && hpBefore > 0) {
      if (current.kind === 'hazard') return
      // Mortal toggle: skip dying flow, set permaDead instantly.
      if (isNpc(current) && current.mortal === true) {
        useCombatantStore.getState().updateCombatant(combatantId, { permaDead: true })
        return
      }
      // CRB pg.460: on HP → 0 auto-apply dying (1 + wounded).
      const wounded = useConditionStore.getState().activeConditions
        .find((c) => c.combatantId === combatantId && c.slug === 'wounded')?.value ?? 0
      applyCondition(combatantId, 'dying' as ConditionSlug, getDyingValueOnKnockout(wounded))
    }
  }, [combatantId, updateHp, updateTempHp])

  /** Heal HP. State-machine for wounded + downed-conditions:
   *  - Full heal (hp reaches max) with wounded > 0 → wounded → 0 (project rule)
   *  - Wake up from 0 hp while still dying (not yet stabilized) → wounded += 1 (recovery from dying)
   *  - Wake up from 0 hp (stabilized or otherwise) → remove dying + unconscious + blinded
   *  - Prone stays (player decision: handle separately)
   */
  const applyHeal = useCallback((amount: number) => {
    const current = useCombatantStore.getState().combatants.find((c) => c.id === combatantId)
    if (!current) return

    const wasDown = current.hp <= 0
    const newHp = Math.min(current.maxHp, current.hp + amount)
    const wokeUp = wasDown && newHp > 0

    updateHp(combatantId, amount)

    const conds = useConditionStore.getState().activeConditions
    const curDying = conds.find((c) => c.combatantId === combatantId && c.slug === 'dying')?.value ?? 0
    const curWounded = conds.find((c) => c.combatantId === combatantId && c.slug === 'wounded')?.value ?? 0

    if (newHp >= current.maxHp && curWounded > 0) {
      removeCondition(combatantId, 'wounded' as ConditionSlug)
    } else if (wokeUp && curDying > 0) {
      applyCondition(combatantId, 'wounded' as ConditionSlug, getWoundedValueAfterStabilize(curWounded))
    }

    if (wokeUp) {
      if (curDying > 0) removeCondition(combatantId, 'dying' as ConditionSlug)
      removeCondition(combatantId, 'unconscious' as ConditionSlug)
      removeCondition(combatantId, 'blinded' as ConditionSlug)
    }
  }, [combatantId, updateHp])

  /** Set temp HP to max(current, amount). */
  const applyTempHp = useCallback((amount: number) => {
    const current = useCombatantStore.getState().combatants.find((c) => c.id === combatantId)
    if (!current) return
    updateTempHp(combatantId, Math.max(current.tempHp, amount))
  }, [combatantId, updateTempHp])

  /** Stabilize a dying creature: wounded +1, snapshot cascade conditions, remove dying, re-apply lost cascades. */
  const stabilize = useCallback(() => {
    const curWounded = useConditionStore.getState().activeConditions
      .find((c) => c.combatantId === combatantId && c.slug === 'wounded')?.value ?? 0
    applyCondition(combatantId, 'wounded' as ConditionSlug, getWoundedValueAfterStabilize(curWounded))

    // Snapshot conditions that must survive dying removal cascade.
    const CASCADE_PRESERVE: ConditionSlug[] = ['unconscious', 'prone', 'blinded', 'off-guard'] as ConditionSlug[]
    const managerState = getManagerState(combatantId)
    const preserveSet = new Map<ConditionSlug, number>()
    for (const slug of CASCADE_PRESERVE) {
      const cond = managerState.find((c) => c.slug === slug)
      if (cond) preserveSet.set(slug, cond.value)
    }

    // Remove dying — cascades remove unconscious → blinded, off-guard.
    removeCondition(combatantId, 'dying' as ConditionSlug)

    // Re-apply any conditions lost in the cascade.
    const afterSlugs = new Set(getManagerState(combatantId).map((c) => c.slug))
    for (const [slug, value] of preserveSet) {
      if (!afterSlugs.has(slug)) applyCondition(combatantId, slug, value)
    }
  }, [combatantId])

  /** Resurrect (GM fiat): clear all conditions, set HP to 1.
   *  No-op for mortal combatants that have already permaDied — death is final. */
  const resurrect = useCallback(() => {
    const current = useCombatantStore.getState().combatants.find((c) => c.id === combatantId)
    if (!current) return
    if (isNpc(current) && current.permaDead === true) return
    clearCombatantManager(combatantId)
    updateHp(combatantId, 1 - current.hp)
  }, [combatantId, updateHp])

  /** Apply dying at standard knockout value (1 + wounded). */
  const knockOut = useCallback(() => {
    const wounded = useConditionStore.getState().activeConditions
      .find((c) => c.combatantId === combatantId && c.slug === 'wounded')?.value ?? 0
    applyCondition(combatantId, 'dying' as ConditionSlug, getDyingValueOnKnockout(wounded))
  }, [combatantId])

  /** Apply dying at crit-knockout value (2 + wounded per CRB crit rules). */
  const critKnockOut = useCallback(() => {
    const wounded = useConditionStore.getState().activeConditions
      .find((c) => c.combatantId === combatantId && c.slug === 'wounded')?.value ?? 0
    applyCondition(combatantId, 'dying' as ConditionSlug, getDyingValueOnKnockout(wounded) + 1)
  }, [combatantId])

  /** Increment dying by 1 (or apply knockout value if not currently dying). */
  const incrementDying = useCallback(() => {
    incrementDyingForCombatant(combatantId)
  }, [combatantId])

  return {
    hp: combatant?.hp ?? 0,
    maxHp: combatant?.maxHp ?? 0,
    tempHp: combatant?.tempHp ?? 0,
    dyingValue,
    doomedValue,
    woundedValue,
    deathThreshold,
    isDead,
    applyDamage,
    applyHeal,
    applyTempHp,
    stabilize,
    resurrect,
    knockOut,
    critKnockOut,
    incrementDying,
  }
}
