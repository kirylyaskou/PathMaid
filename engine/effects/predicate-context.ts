// ─── Predicate Context Builder (Phase 66, D-66-02) ────────────────────────────
// Pure-function builder that shapes raw store snapshots into the fact bag the
// predicate evaluator understands.
//
// Important: this module is inside `/engine`, so it MUST NOT import from
// React, Zustand or any Tauri/Drizzle adapter. The consumer (see
// `src/entities/spell-effect/lib/…` or `use-modified-stats.ts`) reads the
// stores, hands the snapshots in, and receives a plain-old context object.
//
// Why not read stores in here? The engine is consumed in tests and potentially
// in non-React contexts. Keeping it pure makes unit testing trivial (supply a
// literal fact bag) and matches the D-65-04 pattern: engine stays pure,
// `entities/` adapters bridge to stores.

// ─── Public Types ─────────────────────────────────────────────────────────────

/**
 * All the indexed facts the predicate evaluator can resolve against a single
 * actor (self or target). Flattened into Sets / Map for O(1) atom lookup.
 */
export interface PredicateActorFacts {
  /** Condition slugs that are active at any value (e.g. "frightened"). */
  conditions: Set<string>
  /**
   * Condition values keyed by slug. Entries exist for every condition in
   * `conditions`; non-valued conditions default to 1 so `frightened:2` style
   * threshold atoms are comparable without special-casing.
   */
  conditionValues: Map<string, number>
  /** Active spell / feat / feature effect slugs (normalised, no prefix). */
  effects: Set<string>
  /** Creature traits (e.g. "undead", "animal"). */
  traits: Set<string>
  /** Persistent-damage types currently on the actor (e.g. "acid", "fire"). */
  persistentDamage: Set<string>
}

export interface PredicateContext {
  self: PredicateActorFacts
  /** Omitted when the rule is evaluated outside a target-aware flow. */
  target?: PredicateActorFacts
}

// ─── Raw Inputs ──────────────────────────────────────────────────────────────
// Minimal structural shapes used as inputs. Intentionally narrower than the
// full ActiveCondition / ActiveEffect types so the engine has no coupling to
// the richer frontend types (id, combatantId, remainingTurns, …).

export interface RawConditionInput {
  slug: string
  value?: number
}

export interface RawEffectInput {
  /** The raw effect name (e.g. "Spell Effect: Rage"); prefix is stripped. */
  effectName: string
  /** Optional direct slug override when caller already computed one. */
  slug?: string
}

export interface RawActorSnapshot {
  conditions?: readonly RawConditionInput[]
  effects?: readonly RawEffectInput[]
  traits?: readonly string[]
}

// ─── Builders ────────────────────────────────────────────────────────────────

/**
 * Normalise a human-readable effect name into a predicate-lookup slug.
 *
 * Strips the common "Spell Effect: " / "Effect: " prefix, lowercases the
 * tail and converts whitespace to hyphens. Mirrors the convention used by
 * the PF2e data pack slugs (`spell-effect-rage` → `rage`).
 */
export function slugifyEffectName(name: string): string {
  const stripped = name
    .replace(/^\s*spell effect:\s*/i, '')
    .replace(/^\s*effect:\s*/i, '')
    .trim()
    .toLowerCase()
  return stripped.replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/**
 * Build the fact bag for a single actor from raw store snapshots.
 *
 * Persistent-damage conditions are split out: a condition with a slug that
 * starts with `persistent-damage-<type>` contributes the `<type>` to
 * `persistentDamage` while still appearing in `conditions` so both atom
 * shapes (`self:condition:persistent-damage:acid` and the raw condition slug)
 * resolve as the GM would expect.
 */
export function buildActorFacts(snapshot: RawActorSnapshot): PredicateActorFacts {
  const conditions = new Set<string>()
  const conditionValues = new Map<string, number>()
  const effects = new Set<string>()
  const traits = new Set<string>()
  const persistentDamage = new Set<string>()

  for (const c of snapshot.conditions ?? []) {
    if (!c.slug) continue
    conditions.add(c.slug)
    conditionValues.set(c.slug, c.value ?? 1)

    // "persistent-damage-acid" → persistentDamage has "acid".
    // Foundry stores persistent-damage as one condition per type in our
    // store (see ConditionManager + condition-bridge).
    if (c.slug.startsWith('persistent-damage-')) {
      const type = c.slug.slice('persistent-damage-'.length)
      if (type) persistentDamage.add(type)
    }
  }

  for (const e of snapshot.effects ?? []) {
    const slug = e.slug ?? slugifyEffectName(e.effectName)
    if (slug) effects.add(slug)
  }

  for (const t of snapshot.traits ?? []) {
    if (t) traits.add(t.toLowerCase())
  }

  return { conditions, conditionValues, effects, traits, persistentDamage }
}

/**
 * Assemble the two-actor context the evaluator expects.
 *
 * Pass `target` as `undefined` when the rule is being evaluated outside a
 * target-aware flow; `target:*` atoms will then fail-closed without firing
 * a warning (a self-only rule legitimately has no target).
 */
export function buildPredicateContext(
  self: RawActorSnapshot,
  target?: RawActorSnapshot,
): PredicateContext {
  return {
    self: buildActorFacts(self),
    target: target ? buildActorFacts(target) : undefined,
  }
}

/**
 * Convenience constant for callers that need an "empty" context (e.g. no
 * combatant selected). All Sets are empty so predicates evaluate to false
 * unless they explicitly allow that (unlikely in v1.4 rules).
 */
export function emptyPredicateContext(): PredicateContext {
  return {
    self: {
      conditions: new Set(),
      conditionValues: new Map(),
      effects: new Set(),
      traits: new Set(),
      persistentDamage: new Set(),
    },
  }
}
