// ─── Note rule (Phase 65, D-65-05) ────────────────────────────────────────────
// Parse PF2e `Note` rule elements. Foundry shape:
//   { key: "Note", selector: "saving-throw" | "<stat>-damage" | …,
//     text: "<PF2E.localization-key>" | "<HTML string>",
//     title?: "<label>", outcome?: ["success"|"failure"|…],
//     predicate?: […] }
//
// For Phase 65 we surface: selector, text body, optional title label, optional
// outcome whitelist (so "Note on critical failure" can be suppressed until
// the roll result is known). Predicate and selector tokens like
// `{item|flags.system.rulesSelections.weapon}-attack` are stored raw — Phase 66
// predicate evaluator will filter them. Consumers that want to show a note
// right now can fall back to "render everything" semantics.

export interface NoteInput {
  /** Source effect id (encounter_combatant_effects.id) — for lifecycle. */
  effectId: string
  /** Source effect human name — optional tooltip prefix. */
  effectName: string
  /** Foundry selector(s) the note attaches to. */
  selector: string | string[]
  /** Note body. May be a localization key (`PF2E.Foo.Bar`) or raw text. */
  text: string
  /** Optional override title shown above the body. */
  title?: string
  /** Optional degree-of-success whitelist: one of success/failure/etc. */
  outcome?: string[]
  /** Stored but not evaluated here — Phase 66 predicate evaluator consumes. */
  predicate?: unknown[]
}

export function parseSpellEffectNotes(
  rulesJson: string,
  effectId: string,
  effectName: string,
): NoteInput[] {
  let rules: unknown[]
  try {
    rules = JSON.parse(rulesJson)
  } catch {
    return []
  }
  if (!Array.isArray(rules)) return []

  const out: NoteInput[] = []
  for (const rule of rules) {
    const r = rule as Record<string, unknown>
    if (r.key !== 'Note') continue
    const selector = (r.selector as string | string[] | undefined) ?? undefined
    const text = typeof r.text === 'string' ? r.text : null
    if (!selector || !text) continue
    out.push({
      effectId,
      effectName,
      selector,
      text,
      title: typeof r.title === 'string' ? r.title : undefined,
      outcome: Array.isArray(r.outcome)
        ? (r.outcome as unknown[]).filter((o): o is string => typeof o === 'string')
        : undefined,
      predicate: Array.isArray(r.predicate) ? r.predicate : undefined,
    })
  }
  return out
}

/**
 * Walk a combatant's active notes and return the `text` bodies applicable to
 * the given selector. Pure function — caller supplies the active-notes list
 * (typically gathered by running `parseSpellEffectNotes` over every active
 * effect on the combatant).
 *
 * Selector matching: exact string compare, handling both `string` and
 * `string[]` rule selectors. Predicate is NOT evaluated (Phase 66 territory);
 * notes whose `predicate` is empty are always emitted; notes with a predicate
 * are also emitted — consumers should treat them as "potentially relevant"
 * until the predicate evaluator lands.
 *
 * `outcome` filter: if provided, the caller passes the realized roll outcome
 * and this function drops notes whose outcome list doesn't include it. When
 * `outcome` is undefined the note is always emitted.
 */
export function getActiveRollNotes(
  notes: NoteInput[],
  selector: string,
  outcome?: string,
): NoteInput[] {
  return notes.filter((n) => {
    const selectors = Array.isArray(n.selector) ? n.selector : [n.selector]
    if (!selectors.includes(selector)) return false
    if (n.outcome && outcome) {
      return n.outcome.includes(outcome)
    }
    return true
  })
}

/**
 * Convenience: assemble active notes for a combatant across a set of
 * `ActiveEffect`-like records. Each record only needs `{ id, name, rulesJson }`
 * — the caller is free to feed either DB rows or store entries.
 */
export function collectActiveNotesForCombatant(
  activeEffects: Array<{ id: string; effectName?: string; name?: string; rulesJson: string }>,
): NoteInput[] {
  const out: NoteInput[] = []
  for (const eff of activeEffects) {
    const name = eff.effectName ?? eff.name ?? eff.id
    out.push(...parseSpellEffectNotes(eff.rulesJson, eff.id, name))
  }
  return out
}
