// ─── Spell Effect Modifier Parser (Phase 56, D-05, D-06, D-07, D-08) ──────────
// Parses FlatModifier and Resistance rule elements from spell effect rules_json.
// Only processes numeric FlatModifier values — skips @item.badge.value and similar
// dynamic references that cannot be resolved without a live actor context (D-08).
//
// Predicates are stored but NOT evaluated — this engine layer has no actor context
// to resolve predicate expressions against. Predicates are stored for future use
// if actor-context evaluation is added (D-07).

import type { ModifierType } from '../modifiers/modifiers'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A parsed FlatModifier rule element from a spell effect's rules_json.
 * Represents a single modifier contribution to a stat selector.
 */
export interface SpellEffectModifierInput {
  effectId: string        // for slug uniqueness (e.g., 'shield:ac')
  effectName: string      // human-readable label (e.g., 'Shield')
  selector: string | string[]
  modifierType: ModifierType  // 'status' | 'circumstance' | 'item' | 'untyped'
  value: number               // numeric value only
  predicate?: unknown[]       // stored but NOT evaluated (D-07)
}

// ─── FlatModifier Parser ──────────────────────────────────────────────────────

/**
 * Parse FlatModifier rule elements from a spell effect's rules_json string.
 *
 * Numeric values: used verbatim (Bane: -1, Shield: +1).
 * String values: attempted evaluation via {@link evalValueExpression}; supports
 *   `ternary(gte(@item.level,N),A,B)` patterns (Heroism-style scaling).
 *   On eval failure, the rule is skipped.
 *
 * Skips:
 * - Rules where key !== 'FlatModifier'
 * - Rules without a selector
 * - Rules with unevaluatable dynamic references (e.g., `@item.badge.value`, `@actor.*`)
 * - Malformed JSON
 *
 * @param rulesJson   - The rules_json string from encounter_combatant_effects
 * @param effectId    - Effect ID for unique slug generation
 * @param effectName  - Human-readable name for modifier label
 * @param level       - Effect's @item.level (spell rank for spell effects; 1 as fallback)
 * @returns Array of parsed SpellEffectModifierInput entries, empty on parse failure
 */
export function parseSpellEffectModifiers(
  rulesJson: string,
  effectId: string,
  effectName: string,
  level: number = 1,
): SpellEffectModifierInput[] {
  let rules: unknown[]
  try {
    rules = JSON.parse(rulesJson)
  } catch {
    return []
  }
  if (!Array.isArray(rules)) return []

  const result: SpellEffectModifierInput[] = []
  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    if (r.key !== 'FlatModifier') continue
    const selector = r.selector as string | string[] | undefined
    if (!selector) continue

    // Evaluate value: numeric → use as-is; string → try expression eval (Heroism-style ternary)
    let value: number
    if (typeof r.value === 'number') {
      value = r.value
    } else if (typeof r.value === 'string') {
      const evaluated = evalValueExpression(r.value, level)
      if (evaluated === null) continue  // unevaluatable dynamic ref (e.g., @actor.level, @item.badge.value)
      value = evaluated
    } else {
      continue
    }

    result.push({
      effectId,
      effectName,
      selector,
      modifierType: (r.type as ModifierType) ?? 'untyped',
      value,
      predicate: Array.isArray(r.predicate) ? r.predicate : undefined,
    })
  }
  return result
}

// ─── Value Expression Evaluator (60-02) ────────────────────────────────────────
// Foundry PF2e uses a small DSL for dynamic FlatModifier values. The most common
// pattern is scaling based on spell rank:
//
//   "ternary(gte(@item.level,9),3,ternary(gte(@item.level,6),2,1))"   (Heroism)
//
// We support:
//   ternary(cond, ifTrue, ifFalse)  — conditional
//   gte(a, b) / lte / gt / lt / eq  — comparisons (boolean)
//   @item.level                     — spell rank from DB
//   integer literals                — -3, 0, 1, 2, etc.
//
// We do NOT support: @actor.*, @item.badge.*, math operators (+,-,*,/),
// min/max/floor/ceil, or any other DSL features. Such expressions return null
// and the rule is skipped (same as before — no regression vs v1.2.1).
//
// Recursive-descent parser — not regex — so nested ternary works correctly.

/**
 * Evaluate a Foundry PF2e value expression string.
 * Returns the numeric result, or `null` if the expression references data we
 * cannot resolve (most @actor.* / @item.badge.* refs).
 */
export function evalValueExpression(expr: string, level: number): number | null {
  const trimmed = expr.trim()
  if (trimmed === '') return null

  try {
    const parser = new ExprParser(trimmed, level)
    const result = parser.parseExpression()
    parser.expectEnd()
    return typeof result === 'number' ? result : null
  } catch {
    return null
  }
}

// Internal: single-use recursive-descent parser.
class ExprParser {
  private pos = 0
  constructor(
    private readonly src: string,
    private readonly level: number,
  ) {}

  parseExpression(): number | boolean {
    this.skipWs()
    // Function call?  name(args)
    const funcMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/.exec(this.src.slice(this.pos))
    if (funcMatch) {
      const name = funcMatch[1]
      this.pos += funcMatch[0].length  // consume 'name('
      const args = this.parseArgs()
      this.expect(')')
      return this.applyFunction(name, args)
    }

    // @-reference? (only @item.level supported)
    if (this.src[this.pos] === '@') {
      const refMatch = /^@[a-zA-Z0-9_.]+/.exec(this.src.slice(this.pos))
      if (!refMatch) throw new Error('bad @-ref')
      const ref = refMatch[0]
      this.pos += ref.length
      if (ref === '@item.level') return this.level
      throw new Error(`unsupported @-ref: ${ref}`)
    }

    // Integer literal (supports negative)
    const numMatch = /^-?\d+/.exec(this.src.slice(this.pos))
    if (numMatch) {
      this.pos += numMatch[0].length
      return parseInt(numMatch[0], 10)
    }

    throw new Error(`unexpected token at ${this.pos}: ${this.src.slice(this.pos)}`)
  }

  private parseArgs(): Array<number | boolean> {
    const args: Array<number | boolean> = []
    this.skipWs()
    if (this.src[this.pos] === ')') return args
    while (true) {
      args.push(this.parseExpression())
      this.skipWs()
      if (this.src[this.pos] === ',') {
        this.pos += 1
        this.skipWs()
      } else break
    }
    return args
  }

  private applyFunction(name: string, args: Array<number | boolean>): number | boolean {
    switch (name) {
      case 'ternary': {
        if (args.length !== 3) throw new Error('ternary arity')
        return args[0] ? (args[1] as number) : (args[2] as number)
      }
      case 'gte': return (args[0] as number) >= (args[1] as number)
      case 'lte': return (args[0] as number) <= (args[1] as number)
      case 'gt':  return (args[0] as number) >  (args[1] as number)
      case 'lt':  return (args[0] as number) <  (args[1] as number)
      case 'eq':  return (args[0] as number) === (args[1] as number)
      default: throw new Error(`unsupported function: ${name}`)
    }
  }

  private skipWs(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) this.pos += 1
  }

  private expect(ch: string): void {
    this.skipWs()
    if (this.src[this.pos] !== ch) throw new Error(`expected ${ch} at ${this.pos}`)
    this.pos += 1
  }

  expectEnd(): void {
    this.skipWs()
    if (this.pos !== this.src.length) throw new Error(`trailing input at ${this.pos}`)
  }
}

// ─── Resistance Parser ────────────────────────────────────────────────────────

/**
 * Parse Resistance rule elements from a spell effect's rules_json string.
 *
 * Returns `{ type, value }` tuples — consumer merges with base creature resistances
 * using take-max-per-type strategy (see mergeResistances in entities/spell-effect).
 *
 * @param rulesJson - The rules_json string from encounter_combatant_effects
 * @returns Array of { type, value } resistance entries, empty on parse failure
 */
export function parseSpellEffectResistances(
  rulesJson: string,
): { type: string; value: number }[] {
  let rules: unknown[]
  try {
    rules = JSON.parse(rulesJson)
  } catch {
    return []
  }
  if (!Array.isArray(rules)) return []

  return rules
    .filter((r) => (r as Record<string, unknown>).key === 'Resistance')
    .map((r) => {
      const rec = r as Record<string, unknown>
      return { type: String(rec.type ?? ''), value: Number(rec.value ?? 0) }
    })
    .filter((r) => r.type && r.value > 0)
}
