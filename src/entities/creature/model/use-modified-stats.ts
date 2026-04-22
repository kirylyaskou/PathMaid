// ─── useModifiedStats + resolveSpellModifiers ───
// React hook layer on top of engine computeStatModifier.
// Subscribes to useConditionStore and useEffectStore, computes modified values
// reactively from both condition and spell effect sources.

import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useConditionStore } from '@/entities/condition'
import { useEffectStore } from '@/entities/spell-effect'
import {
  computeStatModifier,
  Modifier,
  StatisticModifier,
  CONDITION_EFFECTS,
  parseSpellEffectModifiers,
  buildPredicateContext,
  evaluatePredicate,
  resolveSelector,
} from '@engine'
import type {
  ConditionInput,
  StatModifierResult,
  ConditionModifierEffect,
  InactiveModifier,
  SpellEffectModifierInput,
  PredicateContext,
  PredicateTerm,
} from '@engine'

// Re-export so callers need only one import for both
export type { StatModifierResult, InactiveModifier }

// ─── useModifiedStats ─────────────────────────────────────────────────────────

/**
 * Compute condition-based modifier results for a set of stat slugs on a combatant.
 *
 * Returns Map<statSlug, StatModifierResult> — only contains entries where
 * netModifier !== 0. Missing key = no modification for that stat.
 *
 * Returns empty Map when combatantId is undefined (bestiary view, no combat).
 *
 * @param combatantId - From encounterContext.combatantId; undefined = no modifications
 * @param statSlugs - Stat slugs to compute modifiers for. Include virtual slugs
 *   like 'strike-attack' and 'spell-dc' to receive 'all'-selector condition effects.
 *   Pass stable reference (useMemo in caller) to avoid unnecessary recomputation.
 */
export function useModifiedStats(
  combatantId: string | undefined,
  statSlugs: string[],
): Map<string, StatModifierResult> {
  // Subscribe to only this combatant's raw ActiveCondition objects (stable immer refs).
  // IMPORTANT: do NOT .map() inside the selector — that creates new ConditionInput objects
  // on every getSnapshot() call, making Object.is always false → useSyncExternalStore
  // calls forceStoreRerender on every render → infinite loop.
  const rawConditions = useConditionStore(
    useShallow((s) =>
      combatantId
        ? s.activeConditions.filter((c) => c.combatantId === combatantId)
        : [],
    ),
  )

  // Convert to ConditionInput only when rawConditions actually changed (stable immer refs)
  const conditions = useMemo(
    () =>
      rawConditions.map((c): ConditionInput => ({
        slug: c.slug as ConditionInput['slug'],
        value: c.value ?? 1,
      })),
    [rawConditions],
  )

  // Subscribe to spell effects for this combatant (same anti-pattern avoidance as conditions)
  const rawEffects = useEffectStore(
    useShallow((s) =>
      combatantId
        ? s.activeEffects.filter((e) => e.combatantId === combatantId)
        : [],
    ),
  )

  // Parse FlatModifier inputs from effect rules_json — OUTSIDE selector to avoid .map() in useShallow.
  // pass e.level for @item.level expression eval (Heroism scales bonus by spell rank).
  const spellEffectModifiers = useMemo(
    () =>
      rawEffects.flatMap((e) =>
        parseSpellEffectModifiers(e.rulesJson, e.effectId, e.effectName, e.level),
      ),
    [rawEffects],
  )

  // Build the predicate-evaluation context from the same store
  // snapshots. Target-aware atoms fall out of scope here (target-aware flow
  // is driven by the Cast→Apply pipeline) so only `self:*` atoms
  // resolve for now; `target:*` atoms evaluate to `false` without warning.
  const predicateContext = useMemo<PredicateContext>(
    () =>
      buildPredicateContext({
        conditions: rawConditions.map((c) => ({ slug: c.slug, value: c.value })),
        effects: rawEffects.map((e) => ({ effectName: e.effectName })),
      }),
    [rawConditions, rawEffects],
  )

  // Split spell-effect modifiers into active (predicate passed) and
  // inactive (predicate failed) buckets. Only active ones feed into the
  // stacking-rule engine; inactive entries are surfaced separately so the
  // tooltip can render them struck-out with a `requires: <atom>` hint.
  const { activeSpellModifiers, inactiveSpellModifiers } = useMemo(() => {
    const active: SpellEffectModifierInput[] = []
    const inactive: Array<SpellEffectModifierInput & { requires: string }> = []
    for (const m of spellEffectModifiers) {
      if (!m.predicate || m.predicate.length === 0) {
        active.push(m)
        continue
      }
      const predTerms = m.predicate as PredicateTerm[]
      if (evaluatePredicate(predTerms, predicateContext)) {
        active.push(m)
      } else {
        inactive.push({ ...m, requires: summarisePredicate(predTerms) })
      }
    }
    return { activeSpellModifiers: active, inactiveSpellModifiers: inactive }
  }, [spellEffectModifiers, predicateContext])

  // Use joined key for stable memo dependency (avoids array reference churn)
  const slugsKey = statSlugs.join(',')

  return useMemo(() => {
    const result = new Map<string, StatModifierResult>()
    if (
      !combatantId ||
      (conditions.length === 0 &&
        activeSpellModifiers.length === 0 &&
        inactiveSpellModifiers.length === 0)
    ) {
      return result
    }

    for (const statSlug of statSlugs) {
      const mod = computeStatModifier(
        conditions,
        statSlug,
        statSlugs,
        activeSpellModifiers.length > 0 ? activeSpellModifiers : undefined,
      )

      // Collect inactive modifiers whose selector targets this stat so the
      // tooltip can display them. An entry is "applicable but gated" only if
      // the selector would have resolved to statSlug.
      const inactiveForStat: InactiveModifier[] = []
      for (const im of inactiveSpellModifiers) {
        const targetSlugs = resolveSelector(im.selector, statSlugs)
        if (!targetSlugs.includes(statSlug)) continue
        inactiveForStat.push({
          slug: `effect:${im.effectId}:${statSlug}:inactive`,
          label: im.effectName,
          modifier: im.value,
          requires: im.requires,
        })
      }

      if (mod.netModifier !== 0 || inactiveForStat.length > 0) {
        result.set(statSlug, {
          ...mod,
          inactiveModifiers: inactiveForStat.length > 0 ? inactiveForStat : undefined,
        })
      }
    }

    return result
  }, [combatantId, conditions, activeSpellModifiers, inactiveSpellModifiers, slugsKey])
}

// ─── Predicate Summary Helper ─────────────────────────────────────────────────
// Collapse a predicate tree into a short human-readable atom string for the
// tooltip ("requires: persistent-damage:acid"). Keeps the UI readable without
// dumping the full DSL. Only the first terminal atom is shown when the tree
// is nested; the full tree is logged via dev tools if a power-user cares.

function summarisePredicate(predicate: PredicateTerm[]): string {
  const first = firstAtom(predicate)
  if (!first) return 'unknown'
  // Strip redundant `self:` prefix for compactness.
  return first.replace(/^self:/, '')
}

function firstAtom(terms: PredicateTerm[] | undefined): string | null {
  if (!terms) return null
  for (const t of terms) {
    if (typeof t === 'string') return t
    if (t && typeof t === 'object') {
      const nested =
        (t.and as PredicateTerm[] | undefined) ??
        (t.or as PredicateTerm[] | undefined) ??
        (t.all as PredicateTerm[] | undefined) ??
        (t.any as PredicateTerm[] | undefined) ??
        (t.some as PredicateTerm[] | undefined) ??
        (t.nand as PredicateTerm[] | undefined) ??
        (t.nor as PredicateTerm[] | undefined)
      if (nested) {
        const inner = firstAtom(nested)
        if (inner) return inner
      }
      if (typeof t.not === 'string') return `not:${t.not}`
      if (t.not && typeof t.not === 'object') {
        const inner = firstAtom([t.not])
        if (inner) return `not:${inner}`
      }
    }
  }
  return null
}

// ─── resolveSpellModifiers ────────────────────────────────────────────────────
// Spell attack/DC is NOT a statistic in the statistics Map, so resolveSelector
// cannot handle it generically. This function manually checks each condition's
// selectors against the tradition's applicable ability selectors.
//
// Tradition → ability selector mapping (PF2e rules):
//   arcane → int-based (Intelligence governs arcane spellcasting)
//   occult → int-based + cha-based (Intelligence primary, Charisma secondary)
//   divine → wis-based (Wisdom governs divine spellcasting)
//   primal → wis-based (Wisdom governs primal spellcasting)
//
// Since stupefied covers ['cha-based','int-based','wis-based'], it applies
// to ALL traditions. Frightened/sickened use 'all' — also always apply.

const TRADITION_SELECTORS: Record<string, string[]> = {
  arcane: ['all', 'int-based'],
  occult: ['all', 'int-based', 'cha-based'],
  divine: ['all', 'wis-based'],
  primal: ['all', 'wis-based'],
}

/**
 * Compute condition modifiers applicable to a spellcasting tradition's
 * attack/DC rolls. Uses tradition → ability mapping to handle stupefied
 * and other ability-specific penalties.
 *
 * Uses the same stacking rules as computeStatModifier (StatisticModifier internally).
 *
 * @param conditions - Active conditions for the combatant
 * @param tradition - 'arcane' | 'divine' | 'occult' | 'primal' | other
 * @returns StatModifierResult — { 0, [] } if no applicable modifiers
 */
export function resolveSpellModifiers(
  conditions: ConditionInput[],
  tradition: string,
): StatModifierResult {
  const applicableSelectors = TRADITION_SELECTORS[tradition] ?? ['all']
  const rawModifiers: Modifier[] = []

  for (const { slug, value } of conditions) {
    const effects = CONDITION_EFFECTS[slug]
    if (!effects) continue

    for (const effect of effects) {
      if (effect.type !== 'modifier') continue
      const modEffect = effect as ConditionModifierEffect

      const selectors = Array.isArray(modEffect.selector)
        ? modEffect.selector
        : [modEffect.selector]

      // Check if any of this effect's selectors match the tradition's applicable selectors
      if (!selectors.some((s) => applicableSelectors.includes(s))) continue

      const modValue = modEffect.fixed
        ? modEffect.valuePerLevel
        : modEffect.valuePerLevel * value

      const label =
        !modEffect.fixed && value > 1
          ? `${formatConditionLabel(slug)} ${value}`
          : formatConditionLabel(slug)

      rawModifiers.push(
        new Modifier({
          slug: `${slug}:spell-${tradition}`,
          label,
          modifier: modValue,
          type: modEffect.modifierType,
        }),
      )
    }
  }

  if (rawModifiers.length === 0) return { netModifier: 0, modifiers: [] }

  const sm = new StatisticModifier(`spell-${tradition}`, rawModifiers)
  return {
    netModifier: sm.totalModifier,
    modifiers: sm.modifiers.filter((m) => m.enabled),
  }
}

// ─── useSpellModifiers hook ───────────────────────────────────────────────────

/**
 * React hook wrapper around resolveSpellModifiers.
 * Subscribes to conditions for combatantId, recomputes when conditions change.
 */
export function useSpellModifiers(
  combatantId: string | undefined,
  tradition: string,
): StatModifierResult {
  // Same fix as useModifiedStats: filter returns stable immer refs, map outside selector
  const rawConditions = useConditionStore(
    useShallow((s) =>
      combatantId
        ? s.activeConditions.filter((c) => c.combatantId === combatantId)
        : [],
    ),
  )

  const conditions = useMemo(
    () =>
      rawConditions.map((c): ConditionInput => ({
        slug: c.slug as ConditionInput['slug'],
        value: c.value ?? 1,
      })),
    [rawConditions],
  )

  return useMemo(
    () => resolveSpellModifiers(conditions, tradition),
    [conditions, tradition],
  )
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function formatConditionLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-')
}
