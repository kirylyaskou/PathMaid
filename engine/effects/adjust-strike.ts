// ─── AdjustStrike / DamageDice (Phase 65, D-65-03) ───────────────────────────
// Parse PF2e rule-element forms that reshape a combatant's strike-damage roll.
// Specifically: step-up / step-down on the weapon's damage-die size and direct
// die-size overrides. Foundry exposes this under two rule keys:
//
//   1. `AdjustStrike` with property `damage-die-size` or `weapon-damage-dice`
//      (mode `upgrade`/`downgrade`/`override`).
//   2. `DamageDice` with an `override` block carrying
//      `{ upgrade: true }` (step up), `{ downgrade: true }` (step down), or
//      `{ dieSize: 'd8' }` (direct override).
//
// We normalize both shapes into a single `AdjustStrikeInput` surface so the
// strike-damage rendering code can walk a single list. Parser is pure —
// no store / IPC dependency, no actor context.

import { DIE_FACES, type DieFace } from '../damage/damage'
import { nextDamageDieSize } from '../damage/damage-helpers'

/** Normalized strike adjustment. */
export interface AdjustStrikeInput {
  /** Effect id — for dedupe + UI provenance. */
  effectId: string
  /** Effect name — for debug / tooltip labeling. */
  effectName: string
  /** Foundry selector(s) the rule targets, e.g. "strike-damage" or "mace-damage". */
  selector: string | string[]
  /** Ordered operations applied to a matching strike's damage die. */
  damageDie?: 'step-up' | 'step-down' | DieFace
  /** Optional explicit slug (used for idempotency; defaults to `${effectId}:${selector}`). */
  slug?: string
}

const DIE_PATTERN = /^d(4|6|8|10|12)$/i

function coerceDieFace(value: unknown): DieFace | null {
  if (typeof value !== 'string') return null
  const lower = value.toLowerCase()
  const match = DIE_PATTERN.exec(lower)
  if (!match) return null
  const candidate = `d${match[1]}` as DieFace
  return (DIE_FACES as readonly string[]).includes(candidate) ? candidate : null
}

/**
 * Parse AdjustStrike + DamageDice (die-size flavor) rules from an effect's
 * `rules_json` string. Non-damage-die AdjustStrike variants (traits,
 * property-runes, materials, etc.) are NOT yet supported and are dropped
 * silently — see rule-type-audit report for coverage detail.
 */
export function parseSpellEffectAdjustStrikes(
  rulesJson: string,
  effectId: string,
  effectName: string,
): AdjustStrikeInput[] {
  let rules: unknown[]
  try {
    rules = JSON.parse(rulesJson)
  } catch {
    return []
  }
  if (!Array.isArray(rules)) return []

  const out: AdjustStrikeInput[] = []
  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    const key = r.key
    const rawSelector = (r.selector ?? r.selectors) as string | string[] | undefined
    if (!rawSelector) continue

    // --- Shape 1: AdjustStrike + property:"damage-die-size" / "damage-dice-faces"
    if (key === 'AdjustStrike') {
      const prop = typeof r.property === 'string' ? r.property : null
      if (prop !== 'damage-die-size' && prop !== 'damage-dice-faces') continue
      const mode = typeof r.mode === 'string' ? r.mode : null
      if (mode === 'upgrade') {
        out.push({
          effectId,
          effectName,
          selector: rawSelector,
          damageDie: 'step-up',
        })
      } else if (mode === 'downgrade') {
        out.push({
          effectId,
          effectName,
          selector: rawSelector,
          damageDie: 'step-down',
        })
      } else if (mode === 'override') {
        const die = coerceDieFace(r.value)
        if (die) {
          out.push({ effectId, effectName, selector: rawSelector, damageDie: die })
        }
      }
      continue
    }

    // --- Shape 2: DamageDice with an override block toggling upgrade/downgrade/die-size
    if (key === 'DamageDice') {
      const ov = (r.override ?? null) as Record<string, unknown> | null
      if (!ov) continue
      if (ov.upgrade === true) {
        out.push({
          effectId,
          effectName,
          selector: rawSelector,
          damageDie: 'step-up',
        })
      } else if (ov.downgrade === true) {
        out.push({
          effectId,
          effectName,
          selector: rawSelector,
          damageDie: 'step-down',
        })
      } else {
        const die = coerceDieFace(ov.dieSize)
        if (die) {
          out.push({ effectId, effectName, selector: rawSelector, damageDie: die })
        }
      }
      continue
    }
  }
  return out
}

/**
 * A strike-damage surface that `applyAdjustStrikes` operates on.
 *
 * `selectors` is the list of selector strings the renderer can match
 * AdjustStrike rules against (e.g. `["strike-damage", "longsword-damage"]`).
 */
export interface StrikeDamage {
  selectors: string[]
  /** Current damage-die size, e.g. `"d6"`. */
  dieSize: DieFace
  /** Stable provenance log of applied adjustments, for tooltip rendering. */
  appliedAdjustments?: Array<{ effectId: string; from: DieFace; to: DieFace }>
}

/**
 * Post-step that walks a combatant's AdjustStrike inputs and mutates the
 * strike's damage-die size. Idempotent per `effectId` — re-running with the
 * same inputs yields the same die (dedupes by effectId).
 *
 * Foundry semantics (applied in order of appearance):
 *   - step-up  → next larger die size in DIE_FACES (stops at d12)
 *   - step-down→ next smaller die size (stops at d4)
 *   - explicit → assigned outright
 */
export function applyAdjustStrikes(
  strike: StrikeDamage,
  inputs: AdjustStrikeInput[],
): StrikeDamage {
  const matching = inputs.filter((input) => matchSelector(strike.selectors, input.selector))
  if (matching.length === 0) return strike

  const applied = new Set<string>()
  let die = strike.dieSize
  const log: Array<{ effectId: string; from: DieFace; to: DieFace }> = [
    ...(strike.appliedAdjustments ?? []),
  ]

  for (const input of matching) {
    const slug = input.slug ?? `${input.effectId}:${String(input.selector)}`
    if (applied.has(slug)) continue
    const from = die
    let next: DieFace = die
    if (input.damageDie === 'step-up') {
      next = nextDamageDieSize(die, 1)
    } else if (input.damageDie === 'step-down') {
      next = nextDamageDieSize(die, -1)
    } else if (input.damageDie) {
      next = input.damageDie
    }
    if (next !== from) {
      die = next
      log.push({ effectId: input.effectId, from, to: next })
    }
    applied.add(slug)
  }

  return { ...strike, dieSize: die, appliedAdjustments: log }
}

function matchSelector(
  strikeSelectors: string[],
  ruleSelector: string | string[],
): boolean {
  const list = Array.isArray(ruleSelector) ? ruleSelector : [ruleSelector]
  return list.some((s) => strikeSelectors.includes(s))
}
