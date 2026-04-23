import { useCallback } from 'react'
import { planFortuneRoll, parseSpellEffectRollTwice, rollDice } from '@engine'
import type {
  RollContext,
  Roll,
  FortuneRollDisplay,
  FortuneRollEntry,
} from '@engine'
import { useRollStore } from '@/shared/model/roll-store'
import { useEffectStore } from '@/entities/spell-effect'

/**
 * Returns a stable callback that rolls a formula, pushes the result to
 * the shared roll history, and returns the Roll for further inspection.
 * Optionally tags the roll with a source name and combat encounter id.
 *
 * when `combatantId` is supplied, the hook
 * inspects every active effect on that combatant for `RollTwice` rules
 * whose selector matches `rollContext`. At least one `keep: "higher"`
 * → fortune; `keep: "lower"` → misfortune. Both cancel.
 *
 * `planFortuneRoll` returns a
 * structured plan instead of a rewritten `2d20kh1+mod` string. The hook
 * then executes:
 *   - `normal` → roll the formula once (legacy path)
 *   - `fortune` → roll `1d20+mod` twice independently, attach both
 *                    rolls to the primary Roll's `.fortune` field, keep
 *                    the higher total as the "chosen" roll
 *   - `misfortune`→ same, but keep the lower total
 *   - `assurance` → emit a dice-less Roll with `total = 10 + prof`
 * The primary Roll's `total` / `modifier` / `dice` reflect the chosen
 * roll so legacy code that reads `.total` keeps working.
 */
export function useRoll(
  source?: string,
  combatId?: string,
  combatantId?: string,
  rollContext?: RollContext['type'],
) {
  const addRoll = useRollStore((s) => s.addRoll)
  return useCallback(
    (formula: string, label?: string): Roll => {
      // Fast path: no combatant context → no fortune evaluation.
      if (!combatantId || !rollContext) {
        const roll = rollDice(formula, label, { source, combatId })
        addRoll(roll)
        return roll
      }

      // 1. Collect fortune / misfortune flags from RollTwice rules.
      const activeEffects = useEffectStore
        .getState()
        .activeEffects.filter((e) => e.combatantId === combatantId)
      let fortune = false
      let misfortune = false
      const selectorTarget =
        rollContext === 'attack' ? 'attack-roll'
        : rollContext === 'save' ? 'saving-throw'
        : rollContext === 'skill' ? 'skill-check'
        : rollContext === 'perception' ? 'perception'
        : ''
      for (const eff of activeEffects) {
        const rules = parseSpellEffectRollTwice(eff.rulesJson)
        for (const r of rules) {
          const selectors = Array.isArray(r.selector) ? r.selector : [r.selector]
          if (!selectors.some((s) => s === selectorTarget || s === 'all')) continue
          if (r.keep === 'higher') fortune = true
          else misfortune = true
        }
      }

      // 2. Ask the engine what to do with this roll.
      const plan = planFortuneRoll(
        formula,
        combatantId,
        { type: rollContext },
        { fortune, misfortune },
      )

      // 3. Dispatch on the plan's kind. Each branch returns a Roll whose
      //    `total`/`modifier`/`dice` reflect the chosen result so downstream
      //    consumers (damage calculators, crit/fumble detection) behave
      //    identically to a normal single roll.
      if (plan.kind === 'normal') {
        const roll = rollDice(plan.formula, label, { source, combatId })
        addRoll(roll)
        return roll
      }

      const combinedLabel = (engineLabel: string) =>
        label ? `${label} — ${engineLabel}` : engineLabel

      if (plan.kind === 'assurance') {
        // Assurance short-circuits dice entirely: total is the flat value.
        const roll: Roll = {
          id: crypto.randomUUID(),
          formula: plan.formula,
          dice: [],
          modifier: plan.value,
          total: plan.value,
          label: combinedLabel(plan.label),
          ...(source !== undefined ? { source } : {}),
          ...(combatId !== undefined ? { combatId } : {}),
          timestamp: Date.now(),
        }
        addRoll(roll)
        return roll
      }

      // kind === 'fortune' | 'misfortune' — roll the SAME base formula
      // twice independently. Each execution produces its own dice array,
      // its own modifier resolution, and its own total.
      const first = rollDice(plan.formula, undefined, { source, combatId })
      const second = rollDice(plan.formula, undefined, { source, combatId })
      const chosenIdx: 0 | 1 =
        plan.kind === 'fortune'
          ? first.total >= second.total ? 0 : 1
          : first.total <= second.total ? 0 : 1
      const chosenRoll = chosenIdx === 0 ? first : second

      const toEntry = (r: Roll): FortuneRollEntry => {
        // The primary d20 is always the first 20-sided die. PF2e fortune is
        // d20-only so we expect exactly one d20 in the dice array; fall
        // back to 0 defensively if somehow absent.
        const d20 = r.dice.find((d) => d.sides === 20)?.value ?? 0
        return { d20, modifier: r.modifier, total: r.total }
      }

      const fortuneDisplay: FortuneRollDisplay = {
        kind: plan.kind,
        rolls: [toEntry(first), toEntry(second)],
        chosen: chosenIdx,
      }

      const roll: Roll = {
        ...chosenRoll,
        label: combinedLabel(plan.label),
        fortune: fortuneDisplay,
      }
      addRoll(roll)
      return roll
    },
    [addRoll, source, combatId, combatantId, rollContext],
  )
}
