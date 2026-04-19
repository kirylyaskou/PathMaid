// ─── Predicate Evaluator (Phase 66, D-66-01) ─────────────────────────────────
// Recursive evaluator for the PF2e Foundry rules-predicate DSL.
//
// Surface shipped in v1.4:
//   - String atoms (`scope:key[:value]`):
//       self:condition:<slug>                 — active condition on self
//       self:condition:<slug>:<n>             — active condition on self with
//                                               value ≥ n (e.g. frightened:2)
//       self:condition:persistent-damage:<t>  — self has persistent damage of
//                                               type <t>
//       self:effect:<slug>                    — active spell-effect slug on self
//       self:trait:<slug>                     — creature trait on self
//       target:condition:<slug>               — same on the target entry
//       target:effect:<slug>                  — same
//       target:trait:<slug>                   — same
//       target:condition:persistent-damage:<t>
//   - Boolean combinators (object nodes):
//       { and: [...] }         — every child true
//       { or: [...] }          — at least one child true
//       { not: <term> }        — one child inverted
//       { nand: [...] }        — negation of and
//       { nor: [...] }         — negation of or
//   - Aliases used elsewhere in the PF2e dataset:
//       all: → and, any: → or, some: → or
//
// Fail-closed policy (D-66-04): atoms not recognised by the evaluator return
// `false` and log a single `console.warn` per unique atom so the GM can see
// what's missing without a crash. This means new/unmapped atoms silently
// disable the modifier rather than leaking a partial-true result.
//
// Pure: no React, no Zustand, no IO. The caller must build a PredicateContext
// via `buildPredicateContext` (see predicate-context.ts) and hand it in.

import type { PredicateContext, PredicateActorFacts } from './predicate-context'

// ─── Public Types ─────────────────────────────────────────────────────────────

/**
 * A predicate term is either a bare string atom or a boolean-node object.
 * Unknown shapes are treated as `false` by the evaluator.
 */
export type PredicateTerm = string | PredicateNode

export interface PredicateNode {
  and?: PredicateTerm[]
  or?: PredicateTerm[]
  not?: PredicateTerm
  nand?: PredicateTerm[]
  nor?: PredicateTerm[]
  // Aliases — PF2e data sometimes uses these instead of and/or.
  all?: PredicateTerm[]
  any?: PredicateTerm[]
  some?: PredicateTerm[]
}

// ─── Warn-once Dedup ─────────────────────────────────────────────────────────
// Module-level Set so the same unknown atom only warns once per process.

const warnedAtoms = new Set<string>()

/** Exposed for tests only. Not part of the public API. */
export function __resetPredicateWarnCache(): void {
  warnedAtoms.clear()
}

function warnUnknownAtom(atom: string): void {
  if (warnedAtoms.has(atom)) return
  warnedAtoms.add(atom)
  // eslint-disable-next-line no-console
  console.warn(`[predicate-evaluator] unresolvable atom: "${atom}" — treating as false`)
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Evaluate a PF2e predicate array (the shape stored on FlatModifier /
 * RollTwice / Note rules) against a resolved context. An empty / missing
 * predicate is treated as an implicit `and` of zero terms → `true`, matching
 * Foundry's "no predicate means always on" semantics.
 *
 * @param predicate - Predicate array as stored on the rule, or undefined.
 * @param ctx       - Resolved fact context for self (and optionally target).
 */
export function evaluatePredicate(
  predicate: readonly PredicateTerm[] | undefined,
  ctx: PredicateContext,
): boolean {
  if (!predicate || predicate.length === 0) return true
  // Top-level array = implicit AND (Foundry convention).
  return predicate.every((term) => evaluateTerm(term, ctx))
}

// ─── Internals ────────────────────────────────────────────────────────────────

function evaluateTerm(term: PredicateTerm, ctx: PredicateContext): boolean {
  if (typeof term === 'string') return evaluateAtom(term, ctx)
  if (term && typeof term === 'object') return evaluateNode(term, ctx)
  // null, number, boolean, anything else — fail-closed.
  return false
}

function evaluateNode(node: PredicateNode, ctx: PredicateContext): boolean {
  // and / all
  const andTerms = node.and ?? node.all
  if (andTerms) {
    if (!Array.isArray(andTerms)) return false
    return andTerms.every((t) => evaluateTerm(t, ctx))
  }

  // or / any / some
  const orTerms = node.or ?? node.any ?? node.some
  if (orTerms) {
    if (!Array.isArray(orTerms)) return false
    return orTerms.some((t) => evaluateTerm(t, ctx))
  }

  // not
  if (node.not !== undefined) {
    return !evaluateTerm(node.not, ctx)
  }

  // nand
  if (node.nand) {
    if (!Array.isArray(node.nand)) return false
    return !node.nand.every((t) => evaluateTerm(t, ctx))
  }

  // nor
  if (node.nor) {
    if (!Array.isArray(node.nor)) return false
    return !node.nor.some((t) => evaluateTerm(t, ctx))
  }

  // Unknown combinator — fail-closed.
  return false
}

// ─── Atom Resolution ──────────────────────────────────────────────────────────
// Atoms are lowercase, colon-separated paths: `scope:kind[:value][:extra]`.
// We support scopes `self` and `target` and kinds `condition` / `effect` /
// `trait`. Everything else (roll:*, item:*, target:flanked, …) falls through
// to the warn+false branch.

function evaluateAtom(atom: string, ctx: PredicateContext): boolean {
  const parts = atom.split(':')
  if (parts.length < 2) {
    warnUnknownAtom(atom)
    return false
  }

  const [scope, kind, ...rest] = parts
  const facts = resolveScope(scope, ctx)
  if (!facts) {
    // scope == 'target' but no target supplied is a legitimate false,
    // not an "unknown" — the rule simply doesn't fire without a target.
    if (scope === 'target') return false
    warnUnknownAtom(atom)
    return false
  }

  switch (kind) {
    case 'condition':
      return resolveConditionAtom(rest, facts)
    case 'effect':
      return rest.length > 0 && facts.effects.has(rest.join(':'))
    case 'trait':
      return rest.length > 0 && facts.traits.has(rest.join(':'))
    default:
      warnUnknownAtom(atom)
      return false
  }
}

function resolveScope(
  scope: string,
  ctx: PredicateContext,
): PredicateActorFacts | undefined {
  if (scope === 'self') return ctx.self
  if (scope === 'target') return ctx.target
  return undefined
}

/**
 * `rest` is the colon-tail after `scope:condition`. Shapes:
 *   [slug]                                      → condition active at any value
 *   [slug, '<n>']                               → condition active with value ≥ n
 *   ['persistent-damage', type]                 → persistent damage of <type>
 *   ['persistent-damage', type, moreTypeBits]   → joined with ':' to support
 *                                                 hyphenated damage-type-like
 *                                                 tails, though rare in data.
 */
function resolveConditionAtom(rest: string[], facts: PredicateActorFacts): boolean {
  if (rest.length === 0) return false

  // persistent-damage branch: `condition:persistent-damage:<type>`.
  if (rest[0] === 'persistent-damage') {
    if (rest.length < 2) return false
    const type = rest.slice(1).join(':')
    return facts.persistentDamage.has(type)
  }

  const slug = rest[0]
  if (!facts.conditions.has(slug)) return false

  // Optional threshold (`frightened:2` = "at least frightened 2").
  if (rest.length === 1) return true
  const threshold = Number(rest[1])
  if (!Number.isFinite(threshold)) return false
  const actual = facts.conditionValues.get(slug) ?? 1
  return actual >= threshold
}
