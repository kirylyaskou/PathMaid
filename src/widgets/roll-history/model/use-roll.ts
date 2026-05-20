import { useCallback } from 'react'
import { planFortuneRoll, parseSpellEffectRollTwice } from '@engine'
import type {
  RollContext,
  Roll,
  FortuneRollDisplay,
  FortuneRollEntry,
} from '@engine'
import { useRoll as useSharedRoll } from '@/shared/hooks'
import { useRollStore } from '@/shared/model'
import { useEffectStore } from '@/entities/spell-effect'

/**
 * Widget-level roll orchestrator. Callers pass the final base formula;
 * this hook adds live combat context such as fortune and misfortune.
 */
export function useRoll(
  source?: string,
  combatId?: string,
  combatantId?: string,
  rollContext?: RollContext['type'],
) {
  const addRoll = useRollStore((s) => s.addRoll)
  const rollFormula = useSharedRoll(source, combatId)
  return useCallback(
    (formula: string, label?: string): Roll => {
      if (!combatantId || !rollContext) {
        return rollFormula(formula, label)
      }

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

      const plan = planFortuneRoll(
        formula,
        combatantId,
        { type: rollContext },
        { fortune, misfortune },
      )

      if (plan.kind === 'normal') {
        return rollFormula(plan.formula, label)
      }

      const combinedLabel = (engineLabel: string) =>
        label ? `${label} — ${engineLabel}` : engineLabel

      if (plan.kind === 'assurance') {
        return rollFormula(plan.formula, combinedLabel(plan.label))
      }

      const first = rollFormula(plan.formula, undefined, { record: false })
      const second = rollFormula(plan.formula, undefined, { record: false })
      const chosenIdx: 0 | 1 =
        plan.kind === 'fortune'
          ? first.total >= second.total ? 0 : 1
          : first.total <= second.total ? 0 : 1
      const chosenRoll = chosenIdx === 0 ? first : second

      const toEntry = (r: Roll): FortuneRollEntry => {
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
    [addRoll, combatantId, rollContext, rollFormula],
  )
}
