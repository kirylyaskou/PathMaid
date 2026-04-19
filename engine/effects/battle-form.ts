// ─── BattleForm / CreatureSize (Phase 65, D-65-04) ───────────────────────────
// Parse Foundry PF2e rule elements that reshape a combatant's physical form.
//
//   - `CreatureSize` with a literal `value` ("tiny" / "sm" / "med" / "lg" /
//     "huge" / "grg") — produces a size override.
//   - `BattleForm` with an `overrides` block carrying size / AC / strikes —
//     produces a full battle-form override (AC is required to be numeric;
//     Foundry sometimes stores it as an expression string like "18 + @actor.level"
//     which we flag as unresolvable and skip the AC piece while keeping the
//     strikes + size).
//
// Dynamic references (`{item|flags.system.rulesSelections…}`) are NOT resolved
// by the parseSpellEffectCreatureSize / parseSpellEffectBattleForm parsers —
// caller is expected to resolve them via ChoiceSet selections before
// dispatching. We skip any rule whose resolved size is not a literal PF2e size
// token. Strikes with non-numeric dice/die values are dropped.
//
// Enlarge-class bug fix (v1.4 UAT): parseSpellEffectSizeShift resolves the
// Enlarge ChoiceSet pattern locally — the rules block carries a ChoiceSet
// whose choices are `[{predicate:[{gte:[parent:level,4]}], value:{size:huge,damage:4,reach:15}}, {predicate:[{or:[{lte:parent:level,3},{gte:parent:level,6}]}], value:{size:large,damage:2,reach:10}}]`.
// Given the caller-supplied effect level we pick the matching choice and
// surface (a) the resolved size, (b) the resolved melee-strike-damage status
// bonus, (c) a `resizeEquipment` flag mirroring Foundry's encoding.
//
// RULES NOTE (PF2e Player Core pg. 329): Enlarge does NOT step weapon damage
// dice. Its only melee effect is a +2/+4 status bonus to damage (plus reach
// and the clumsy 1 condition). Foundry's `resizeEquipment: true` flag is a
// Foundry-internal detail for item size display — consumers should apply the
// returned `meleeDamageBonus` as a flat constant and leave dice untouched.
// Legitimate die-step-up effects (Giant Instinct, etc.) emit AdjustStrike
// rules and are handled by `parseSpellEffectAdjustStrikes`, not this helper.

import type { CreatureSize } from '../types'
import type { BattleFormStrikeOverride } from './battle-form-types'

// Re-export the strike override shape so consumers can import from a single module.
export type { BattleFormStrikeOverride } from './battle-form-types'

export interface CreatureSizeInput {
  effectId: string
  effectName: string
  size: CreatureSize
}

export interface BattleFormInput {
  effectId: string
  effectName: string
  size?: CreatureSize
  /** Numeric AC value (string expressions skipped). */
  ac?: number
  strikes?: BattleFormStrikeOverride[]
}

// Foundry PF2e size tokens (pre-remaster "tiny"/"sm"/…; post-remaster uses
// full words). Normalize either form to our CreatureSize ('tiny' | 'sm' | ...).
const SIZE_ALIASES: Record<string, CreatureSize> = {
  tiny: 'tiny',
  sm: 'sm',
  small: 'sm',
  med: 'med',
  medium: 'med',
  lg: 'lg',
  large: 'lg',
  huge: 'huge',
  grg: 'grg',
  gargantuan: 'grg',
}

function coerceSize(value: unknown): CreatureSize | null {
  if (typeof value !== 'string') return null
  const lower = value.toLowerCase().trim()
  return SIZE_ALIASES[lower] ?? null
}

const DIE_PATTERN = /^d(4|6|8|10|12)$/i

function coerceStrike(
  name: string,
  entry: Record<string, unknown>,
): BattleFormStrikeOverride | null {
  const dmg = entry.damage as Record<string, unknown> | undefined
  if (!dmg) return null
  const dieRaw = typeof dmg.die === 'string' ? dmg.die.toLowerCase() : ''
  if (!DIE_PATTERN.test(dieRaw)) return null
  const die = dieRaw as BattleFormStrikeOverride['dieSize']
  const dice = typeof dmg.dice === 'number' ? dmg.dice : 1
  const damageType = typeof dmg.damageType === 'string' ? dmg.damageType : undefined
  return { name, dieSize: die, diceNumber: dice, damageType }
}

/**
 * Parse CreatureSize rules with literal size values. Rules with unresolved
 * `{item|flags…}` references are skipped.
 */
export function parseSpellEffectCreatureSize(
  rulesJson: string,
  effectId: string,
  effectName: string,
): CreatureSizeInput[] {
  let rules: unknown[]
  try {
    rules = JSON.parse(rulesJson)
  } catch {
    return []
  }
  if (!Array.isArray(rules)) return []

  const out: CreatureSizeInput[] = []
  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    if (r.key !== 'CreatureSize') continue
    const size = coerceSize(r.value)
    if (!size) continue
    out.push({ effectId, effectName, size })
  }
  return out
}

/**
 * Parse BattleForm rules — returns the first concrete override block
 * (BattleForm is not meant to stack with itself). Returns null when no
 * BattleForm rule is present or when its `overrides` block is unresolvable.
 */
export function parseSpellEffectBattleForm(
  rulesJson: string,
  effectId: string,
  effectName: string,
): BattleFormInput | null {
  let rules: unknown[]
  try {
    rules = JSON.parse(rulesJson)
  } catch {
    return null
  }
  if (!Array.isArray(rules)) return null

  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    if (r.key !== 'BattleForm') continue
    const overrides = (r.overrides ?? null) as Record<string, unknown> | null
    if (!overrides) continue

    const size = coerceSize(overrides.size)

    // AC: Foundry sometimes stores as `{ modifier: <number> }`; sometimes as
    // an expression string we can't resolve. Keep only the numeric shape.
    let ac: number | undefined
    const acBlock = overrides.armorClass as
      | { modifier?: unknown }
      | number
      | undefined
    if (typeof acBlock === 'number') {
      ac = acBlock
    } else if (acBlock && typeof acBlock === 'object') {
      const mod = acBlock.modifier
      if (typeof mod === 'number') ac = mod
      // else: string expression — unresolvable; skip AC
    }

    // Strikes are a record keyed by name.
    const strikes: BattleFormStrikeOverride[] = []
    const strikesBlock = overrides.strikes as Record<string, unknown> | undefined
    if (strikesBlock && typeof strikesBlock === 'object') {
      for (const [name, raw] of Object.entries(strikesBlock)) {
        if (!raw || typeof raw !== 'object') continue
        const strike = coerceStrike(name, raw as Record<string, unknown>)
        if (strike) strikes.push(strike)
      }
    }

    return {
      effectId,
      effectName,
      size: size ?? undefined,
      ac,
      strikes: strikes.length > 0 ? strikes : undefined,
    }
  }
  return null
}

// ─── Size-shift helper (v1.4 UAT fix) ──────────────────────────────────────
// Enlarge / Rouse Skeletons / similar effects encode the result via a pair:
//
//   {
//     key: 'ChoiceSet',
//     flag: 'enlarge',
//     choices: [
//       { predicate: [{ gte: ['parent:level', 4] }],
//         value: { size: 'huge', damage: 4, reach: 15 } },
//       { predicate: [{ or: [{ lte:['parent:level',3] }, { gte:['parent:level',6] }] }],
//         value: { size: 'large', damage: 2, reach: 10 } },
//     ],
//   },
//   { key: 'CreatureSize',
//     value: '{item|flags.system.rulesSelections.enlarge.size}',
//     resizeEquipment: true },
//   { key: 'FlatModifier',
//     selector: ['melee-strike-damage'],
//     value: '{item|flags.system.rulesSelections.enlarge.damage}' },
//
// We resolve the ChoiceSet choice against the caller-supplied effect level
// (same semantics Foundry uses for `parent:level`) and surface the resolved
// size + melee-damage bonus. Non-dynamic CreatureSize rules (with a literal
// value) are also supported — they yield `damageBonus=0`.
export interface SpellEffectSizeShift {
  /** Foundry size token: tiny | sm | med | lg | huge | grg */
  size: CreatureSize
  /** Status bonus to `melee-strike-damage` selector (0 when none). */
  meleeDamageBonus: number
  /**
   * Additive reach bonus applied on top of the strike's resolved reach
   * (Enlarge rank 2 = +5, rank 4 = +10). 0 when the effect doesn't shift
   * reach. Per PF2e Player Core pg. 329 and ground-truth spec: Enlarge adds
   * a +5/+10 reach buff on top of weapon reach — this is additive even for
   * weapons carrying `reach-N` absolute traits.
   */
  reachBonus: number
  /**
   * Mirrors Foundry's `resizeEquipment` flag. Retained for contract fidelity;
   * PF2e Enlarge does NOT step weapon damage dice, so the CreatureStatBlock
   * consumer ignores this. Future consumers may use it for equipment-size
   * display concerns.
   */
  resizeEquipment: boolean
}

/**
 * Returns the resolved size + melee damage bonus from an Enlarge-class effect,
 * or `null` when the rules block doesn't describe a size shift.
 *
 * `effectLevel` is the spell/effect level — the caller usually passes
 * `ActiveEffect.level` (spell rank) which maps to Foundry's `parent:level`
 * for ChoiceSet predicate resolution.
 */
export function parseSpellEffectSizeShift(
  rulesJson: string,
  effectLevel: number,
): SpellEffectSizeShift | null {
  let rules: unknown[]
  try {
    rules = JSON.parse(rulesJson)
  } catch {
    return null
  }
  if (!Array.isArray(rules)) return null

  // --- Pass 1: collect ChoiceSet selections keyed by flag.
  const selections: Record<
    string,
    { size?: CreatureSize; damage?: number; reach?: number }
  > = {}
  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    if (r.key !== 'ChoiceSet') continue
    const flag = typeof r.flag === 'string' ? r.flag : null
    if (!flag) continue
    const choices = Array.isArray(r.choices) ? r.choices : []
    const chosen = pickChoiceByLevel(choices, effectLevel)
    if (!chosen) continue
    const val = chosen.value as Record<string, unknown> | undefined
    if (!val || typeof val !== 'object') continue
    const size = coerceSize(val.size)
    const damage = typeof val.damage === 'number' ? val.damage : undefined
    const reach = typeof val.reach === 'number' ? val.reach : undefined
    selections[flag] = {
      ...(size ? { size } : {}),
      ...(damage !== undefined ? { damage } : {}),
      ...(reach !== undefined ? { reach } : {}),
    }
  }

  // --- Pass 2: find the CreatureSize rule (literal or dynamic-ref).
  let resolvedSize: CreatureSize | null = null
  let resize = false
  let creatureReachOverride: number | null = null
  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    if (r.key !== 'CreatureSize') continue
    const raw = r.value
    if (typeof raw === 'string') {
      const literal = coerceSize(raw)
      if (literal) {
        resolvedSize = literal
      } else {
        // Dynamic: {item|flags.system.rulesSelections.<flag>.size}
        const flag = extractSelectionFlag(raw, 'size')
        if (flag && selections[flag]?.size) {
          resolvedSize = selections[flag].size ?? null
        }
      }
    }
    // Foundry's Enlarge shape also carries a reach override:
    //   { key: 'CreatureSize', reach: { override: '{item|flags…enlarge.reach}' } }
    // We don't need to resolve the ChoiceSet reference here — Pass 1 already
    // collected the numeric `reach` value into selections[flag].reach. But if
    // a literal numeric reach override is present, honor it.
    const reachBlock = r.reach as Record<string, unknown> | undefined
    if (reachBlock && typeof reachBlock === 'object') {
      const ovr = reachBlock.override
      if (typeof ovr === 'number') {
        creatureReachOverride = ovr
      } else if (typeof ovr === 'string') {
        const flag = extractSelectionFlag(ovr, 'reach')
        if (flag && typeof selections[flag]?.reach === 'number') {
          creatureReachOverride = selections[flag].reach!
        }
      }
    }
    if (r.resizeEquipment === true) resize = true
    break
  }

  // --- Pass 3: find FlatModifier on melee-strike-damage (status bonus).
  let meleeDamageBonus = 0
  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    if (r.key !== 'FlatModifier') continue
    const selectors = Array.isArray(r.selector)
      ? (r.selector as unknown[])
      : typeof r.selector === 'string'
        ? [r.selector]
        : []
    if (!selectors.includes('melee-strike-damage')) continue
    const raw = r.value
    if (typeof raw === 'number') {
      meleeDamageBonus = raw
    } else if (typeof raw === 'string') {
      const flag = extractSelectionFlag(raw, 'damage')
      if (flag && typeof selections[flag]?.damage === 'number') {
        meleeDamageBonus = selections[flag].damage!
      }
    }
    break
  }

  // --- Pass 4: derive reachBonus.
  // Priority:
  //   1. Explicit creature-reach override from CreatureSize.reach.override
  //      (Foundry Enlarge shape). reachBonus = override − baseMediumReach(5).
  //   2. Reach field on the ChoiceSet selection value (Enlarge rules_json
  //      carries `reach: 10|15` in each choice). Same formula.
  //   3. Fallback: map meleeDamageBonus → reachBonus (+2 damage → +5 reach;
  //      +4 damage → +10 reach). Consistent with PF2e Enlarge table.
  //
  // Ground-truth spec treats Enlarge reach as additive (+5 / +10) on top of
  // weapon reach, even for `reach-N` absolute trait. So we surface the raw
  // delta; the CreatureStatBlock consumer adds it to each melee strike.
  const BASE_MEDIUM_REACH = 5
  let reachBonus = 0
  if (creatureReachOverride !== null) {
    reachBonus = Math.max(0, creatureReachOverride - BASE_MEDIUM_REACH)
  } else {
    // Scan selections[*] for a reach field (ChoiceSet value.reach).
    for (const sel of Object.values(selections)) {
      if (typeof sel.reach === 'number') {
        reachBonus = Math.max(0, sel.reach - BASE_MEDIUM_REACH)
        break
      }
    }
    if (reachBonus === 0) {
      // Fallback map — damage → reach per PF2e Enlarge.
      if (meleeDamageBonus === 2) reachBonus = 5
      else if (meleeDamageBonus === 4) reachBonus = 10
    }
  }

  if (!resolvedSize && meleeDamageBonus === 0 && reachBonus === 0) return null
  // Without a resolved size we still surface a damage bonus, but default the
  // size to medium so the caller can still apply the flat bonus.
  return {
    size: resolvedSize ?? 'med',
    meleeDamageBonus,
    reachBonus,
    resizeEquipment: resize,
  }
}

function pickChoiceByLevel(
  choices: unknown[],
  level: number,
): { value?: unknown } | null {
  for (const choice of choices) {
    if (!choice || typeof choice !== 'object') continue
    const c = choice as Record<string, unknown>
    const pred = Array.isArray(c.predicate) ? c.predicate : []
    if (pred.length === 0) return c as { value?: unknown }
    if (evaluateLevelPredicate(pred, level)) return c as { value?: unknown }
  }
  return null
}

// Evaluate only the `parent:level` predicate shapes Enlarge-class effects use
// (`gte`, `lte`, and `or` combinations). Anything else we can't resolve — treat
// the predicate as unsatisfied.
function evaluateLevelPredicate(pred: unknown[], level: number): boolean {
  for (const node of pred) {
    if (!evaluateNode(node, level)) return false
  }
  return true
}

function evaluateNode(node: unknown, level: number): boolean {
  if (!node || typeof node !== 'object') return false
  const n = node as Record<string, unknown>
  if (Array.isArray(n.gte)) {
    const [lhs, rhs] = n.gte as [unknown, unknown]
    if (lhs === 'parent:level' && typeof rhs === 'number') return level >= rhs
  }
  if (Array.isArray(n.lte)) {
    const [lhs, rhs] = n.lte as [unknown, unknown]
    if (lhs === 'parent:level' && typeof rhs === 'number') return level <= rhs
  }
  if (Array.isArray(n.or)) {
    return (n.or as unknown[]).some((child) => evaluateNode(child, level))
  }
  if (Array.isArray(n.and)) {
    return (n.and as unknown[]).every((child) => evaluateNode(child, level))
  }
  return false
}

// Match `{item|flags.system.rulesSelections.<flag>.<field>}` — return flag or null.
function extractSelectionFlag(
  value: string,
  field: 'size' | 'damage' | 'reach',
): string | null {
  const re = new RegExp(
    `\\{item\\|flags\\.system\\.rulesSelections\\.([^.}]+)\\.${field}\\}`,
  )
  const m = re.exec(value)
  return m?.[1] ?? null
}
