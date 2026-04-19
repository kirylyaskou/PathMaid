import { getDb } from '@/shared/db'
import type { SpellEffectRow } from '@/entities/spell-effect'
import { parseSpellEffectGrantItems, type GrantItemInput } from '@engine'

// 60-02: level = COALESCE(spells.rank, 1). Used by parseSpellEffectModifiers to
// evaluate @item.level in scaling FlatModifier expressions (Heroism etc.).
// Effects without a linked spell (spell_id IS NULL) fall back to level=1.
//
// 61-06 fix: category now keyed off Foundry source_pack first (added via
// migration 0033), then spell_id for spells that matched post-sync,
// finally name patterns as a last resort for rows with NULL source_pack.
// Pack IDs: 'pf2e.spell-effects', 'pf2e.equipment-effects', 'pf2e.other-effects',
// 'pf2e.feat-effects', 'pf2e.campaign-effects'. Match on LIKE to tolerate
// minor pack-id variations across PF2e releases.
const CATEGORY_EXPR = `
  CASE
    WHEN se.source_pack LIKE '%spell-effects%' THEN 'spell'
    WHEN se.source_pack LIKE '%equipment-effects%' THEN 'alchemical'
    WHEN se.spell_id IS NOT NULL THEN 'spell'
    WHEN LOWER(se.name) LIKE '%elixir%'
      OR LOWER(se.name) LIKE '%mutagen%' THEN 'alchemical'
    ELSE 'other'
  END
`
const SELECT_WITH_LEVEL = `
  SELECT se.id, se.name, se.rules_json, se.duration_json, se.description, se.spell_id,
         COALESCE(s.rank, 1) AS level,
         ${CATEGORY_EXPR} AS category
  FROM spell_effects se
  LEFT JOIN spells s ON se.spell_id = s.id
`

export async function listSpellEffects(): Promise<SpellEffectRow[]> {
  const db = await getDb()
  return db.select<SpellEffectRow[]>(
    `${SELECT_WITH_LEVEL} ORDER BY se.name`,
    []
  )
}

export async function searchSpellEffects(query: string): Promise<SpellEffectRow[]> {
  const db = await getDb()
  return db.select<SpellEffectRow[]>(
    `${SELECT_WITH_LEVEL} WHERE se.name LIKE ? ORDER BY se.name`,
    [`%${query}%`]
  )
}

// Strip the same display prefixes spell_effects.name was stripped of in
// migration 0032. Used to canonicalize item names + custom spell names
// before matching against spell_effects.name.
function stripEffectPrefix(s: string): string {
  return s.replace(/^(?:Spell Effect|Effect|Stance|Aura):\s*/i, '').trim()
}

// 61-11: context query unions three sources of relevance:
//
//   1. spell effects whose linked spell id appears in any combatant's
//      creature_spell_lists (bestiary / monster spells)
//   2. spell effects matching a spell name pulled from a custom creature's
//      data_json blob (parsed in TS — SQLite can't reach into JSON).
//      Matches both the bare name AND `<name> Heightened (+N)` variants
//      to surface heightened-version effects (e.g. Thundering Dominance
//      Heightened (+2)).
//   3. equipment effects matching an item on any combatant — collected in
//      TS so we can strip "Effect: ..."/"Spell Effect: ..."/etc. prefixes
//      before the IN-list match (Foundry items often reference their
//      effect-form by the prefixed name).
//
// Callers fall back to listSpellEffects when this returns empty.
export async function getContextEffectsForEncounter(
  encounterId: string
): Promise<SpellEffectRow[]> {
  const db = await getDb()

  // Path 1 — bestiary spell effects via creature_spell_lists.
  const bestiaryMatched = await db.select<SpellEffectRow[]>(
    `${SELECT_WITH_LEVEL}
     WHERE se.spell_id IS NOT NULL
       AND se.spell_id IN (
         SELECT DISTINCT csl.spell_foundry_id
         FROM creature_spell_lists csl
         JOIN encounter_combatants ec
           ON ec.creature_ref = csl.creature_id
         WHERE ec.encounter_id = ?
           AND csl.spell_foundry_id IS NOT NULL
       )`,
    [encounterId]
  )

  // Path 3 — equipment effects via creature_items + encounter_combatant_items.
  // Names are collected and prefix-stripped on the TS side so spell_effects.name
  // (already stripped at sync time) can be matched directly.
  const itemNames = await collectItemNamesForEncounter(encounterId)
  let itemMatched: SpellEffectRow[] = []
  if (itemNames.length > 0) {
    const ph = itemNames.map(() => '?').join(',')
    itemMatched = await db.select<SpellEffectRow[]>(
      `${SELECT_WITH_LEVEL}
       WHERE LOWER(TRIM(se.name)) IN (${ph})`,
      itemNames.map((n) => n.toLowerCase().trim())
    )
  }

  // Path 2 — custom-creature spells.
  const customSpellNames = await collectCustomCreatureSpellNames(encounterId)
  let customMatched: SpellEffectRow[] = []
  if (customSpellNames.length > 0) {
    const lc = customSpellNames.map((n) => n.toLowerCase().trim())
    const ph = lc.map(() => '?').join(',')
    // Three-pronged match:
    //  a) effects with spell_id linking to a spell whose name is in the list
    //  b) effects whose own name equals one of the spell names
    //     (covers Spell Effect: <name> after sync's prefix strip)
    //  c) effects whose own name starts with `<spell name> Heightened`
    //     — catches heightened variants like "Thundering Dominance Heightened (+2)"
    //     whose spell_id stayed NULL because the post-sync name match didn't
    //     handle the suffix.
    const heightenLikes = lc.map((n) => `${n} heightened%`)
    const heightenLikeClauses = heightenLikes.map(() => 'LOWER(TRIM(se.name)) LIKE ?').join(' OR ')
    customMatched = await db.select<SpellEffectRow[]>(
      `${SELECT_WITH_LEVEL}
       WHERE se.spell_id IN (
         SELECT id FROM spells WHERE LOWER(TRIM(name)) IN (${ph})
       )
       OR LOWER(TRIM(se.name)) IN (${ph})
       OR (${heightenLikeClauses})`,
      [...lc, ...lc, ...heightenLikes],
    )
  }

  // Merge dedup by id.
  const seen = new Set<string>()
  const out: SpellEffectRow[] = []
  for (const row of [...bestiaryMatched, ...itemMatched, ...customMatched]) {
    if (seen.has(row.id)) continue
    seen.add(row.id)
    out.push(row)
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

// 61-fix: authoritative item→effect link is Foundry's @UUID reference embedded
// in the item's description HTML. Every equipment item that grants an effect
// spells it out as:
//   @UUID[Compendium.pf2e.equipment-effects.Item.Effect: <Effect Name>]
// Extract the <Effect Name> portion (may include parentheses/punctuation),
// strip the "Effect:" display-prefix, and we have the canonical
// spell_effects.name form. Handles the two failure modes name-matching can't:
//   1) One effect covers multiple item tiers (Elixir of Life has one effect
//      file, six item tiers — name-equality never matches).
//   2) Item / effect name drift ("+1 Studded Leather Armor" vs a cleaner
//      effect name would never line up, but the description link always does).
const EFFECT_UUID_RE =
  /@UUID\[Compendium\.pf2e\.equipment-effects\.Item\.([^\]]+?)\]/g

// Legacy fallback: older sync versions had a resolveUUID bug that unwrapped
// equipment-effects UUIDs into bare "<p>Effect: NAME</p>" paragraphs, losing
// the @UUID[...] form. Users who ran that sync have descriptions with the
// bare-paragraph shape. Match that too so the picker surfaces effects for
// them without forcing a full resync. Safe because the specific
// "<p>Effect: ...</p>" (paragraph containing ONLY the effect label) is the
// exact shape the bug produced; normal prose paragraphs don't look like this.
const LEGACY_BARE_EFFECT_RE =
  /<p[^>]*>\s*Effect:\s*([^<]+?)\s*<\/p>/gi

function extractEffectNamesFromDescription(description: string | null): string[] {
  if (!description) return []
  const names: string[] = []

  EFFECT_UUID_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = EFFECT_UUID_RE.exec(description)) !== null) {
    const raw = m[1].trim()
    if (!raw) continue
    // Foundry uses the "Display Name" form (not the 16-char _id) after the
    // "Item." segment. The canonical spell_effects.name strips the
    // "Effect:"/"Spell Effect:"/etc. prefix at sync time, so mirror that here.
    const stripped = stripEffectPrefix(raw)
    if (stripped) names.push(stripped)
  }

  LEGACY_BARE_EFFECT_RE.lastIndex = 0
  while ((m = LEGACY_BARE_EFFECT_RE.exec(description)) !== null) {
    const raw = m[1].trim()
    if (!raw) continue
    names.push(raw)
  }

  return names
}

// Internal — pulls item names for every combatant in the encounter,
// from both the base creature_items inventory and per-encounter overrides
// (excluding removed). Names are prefix-stripped so they line up with
// the canonicalized spell_effects.name format.
//
// 61-fix: also joins through items.description to pull @UUID[...equipment-effects...]
// names — the authoritative item↔effect link when item and effect names
// diverge (Elixir of Life, tier-suffixed items, etc).
async function collectItemNamesForEncounter(encounterId: string): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<Array<{ item_name: string; description: string | null }>>(
    `SELECT ci.item_name AS item_name, i.description AS description
     FROM creature_items ci
     JOIN encounter_combatants ec ON ec.creature_ref = ci.creature_id
     LEFT JOIN items i ON i.id = ci.foundry_item_id
     WHERE ec.encounter_id = ?
     UNION
     SELECT eci.item_name AS item_name, i.description AS description
     FROM encounter_combatant_items eci
     JOIN encounter_combatants ec ON ec.id = eci.combatant_id
     LEFT JOIN items i ON i.id = eci.item_foundry_id
     WHERE ec.encounter_id = ?
       AND eci.is_removed = 0`,
    [encounterId, encounterId],
  )
  const names = new Set<string>()
  for (const r of rows) {
    if (r.item_name) {
      names.add(r.item_name)
      const stripped = stripEffectPrefix(r.item_name)
      if (stripped && stripped !== r.item_name) names.add(stripped)
    }
    for (const effectName of extractEffectNamesFromDescription(r.description)) {
      names.add(effectName)
    }
  }
  return Array.from(names)
}

// Internal — pulls spell names from every custom creature whose id is
// referenced by any encounter combatant. Returns unique names.
async function collectCustomCreatureSpellNames(encounterId: string): Promise<string[]> {
  const db = await getDb()
  const rows = await db.select<Array<{ data_json: string }>>(
    `SELECT cc.data_json
     FROM custom_creatures cc
     JOIN encounter_combatants ec ON ec.creature_ref = cc.id
     WHERE ec.encounter_id = ?`,
    [encounterId]
  )
  const names = new Set<string>()
  for (const r of rows) {
    try {
      const data = JSON.parse(r.data_json) as {
        spellcasting?: Array<{
          spellsByRank?: Array<{ spells?: Array<{ name?: string }> }>
        }>
      }
      for (const entry of data.spellcasting ?? []) {
        for (const rank of entry.spellsByRank ?? []) {
          for (const s of rank.spells ?? []) {
            if (s.name) names.add(s.name)
          }
        }
      }
    } catch {
      // ignore malformed data_json
    }
  }
  return Array.from(names)
}

export interface ActiveEffectRow {
  id: string
  effect_id: string
  applied_at: number
  remaining_turns: number
  name: string
  rules_json: string
  duration_json: string
  description: string | null
  level: number  // 60-02: @item.level for expression eval; COALESCE(spells.rank, 1)
  granted_by: string | null  // 65-06: parent encounter_combatant_effects.id (cascade)
}

export async function getActiveEffectsForCombatant(
  encounterId: string,
  combatantId: string
): Promise<ActiveEffectRow[]> {
  const db = await getDb()
  return db.select<ActiveEffectRow[]>(
    `SELECT ece.id, ece.effect_id, ece.applied_at, ece.remaining_turns,
            se.name, se.rules_json, se.duration_json, se.description,
            COALESCE(s.rank, 1) AS level,
            ece.granted_by
     FROM encounter_combatant_effects ece
     JOIN spell_effects se ON ece.effect_id = se.id
     LEFT JOIN spells s ON se.spell_id = s.id
     WHERE ece.encounter_id = ? AND ece.combatant_id = ?`,
    [encounterId, combatantId]
  )
}

export async function applyEffectToCombatant(
  encounterId: string,
  combatantId: string,
  effectId: string,
  remainingTurns: number,
  grantedBy?: string | null,
): Promise<string> {
  const db = await getDb()
  const id = crypto.randomUUID()
  const appliedAt = Math.floor(Date.now() / 1000)
  await db.execute(
    'INSERT INTO encounter_combatant_effects (id, encounter_id, combatant_id, effect_id, applied_at, remaining_turns, granted_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, encounterId, combatantId, effectId, appliedAt, remainingTurns, grantedBy ?? null]
  )
  return id
}

// 65-06: parse the effect's rules_json, resolve same-pack GrantItem targets
// against spell_effects.name, and auto-apply each grantee to the same
// combatant. Returns the freshly-created encounter_combatant_effects rows
// so the caller can seed useEffectStore with the complete chain.
//
// Cascading removal is handled by the FK (`granted_by ON DELETE CASCADE`)
// on migration 0034; callers don't need to explicitly tear down children.
export interface ResolvedGrantedEffect {
  id: string                 // encounter_combatant_effects.id
  effectId: string           // spell_effects.id
  name: string
  rulesJson: string
  durationJson: string
  description: string | null
  level: number
  remainingTurns: number
}

export async function applyGrantedEffects(
  encounterId: string,
  combatantId: string,
  parentEceId: string,
  parentRulesJson: string,
  parentRemainingTurns: number,
): Promise<ResolvedGrantedEffect[]> {
  const grants: GrantItemInput[] = parseSpellEffectGrantItems(parentRulesJson)
  if (grants.length === 0) return []

  const db = await getDb()
  const resolved: ResolvedGrantedEffect[] = []

  for (const grant of grants) {
    // Resolve grantee by (source_pack LIKE pack, name match). Foundry stores
    // source_pack as "pf2e.<packId>"; we keep the LIKE to tolerate pack-id
    // drift introduced by minor PF2e releases.
    const rows = await db.select<SpellEffectRow[]>(
      `${SELECT_WITH_LEVEL}
       WHERE LOWER(TRIM(se.name)) = LOWER(TRIM(?))
         AND se.source_pack LIKE ?
       LIMIT 1`,
      [grant.granteeName, `%${grant.pack}%`],
    )
    const grantee = rows[0]
    if (!grantee) continue

    const ceId = await applyEffectToCombatant(
      encounterId,
      combatantId,
      grantee.id,
      parentRemainingTurns,
      parentEceId,
    )
    resolved.push({
      id: ceId,
      effectId: grantee.id,
      name: grantee.name,
      rulesJson: grantee.rules_json,
      durationJson: grantee.duration_json,
      description: grantee.description,
      level: grantee.level,
      remainingTurns: parentRemainingTurns,
    })
  }

  return resolved
}

export async function removeEffectFromCombatant(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM encounter_combatant_effects WHERE id = ?', [id])
}

export async function decrementEffectTurns(
  encounterId: string,
  combatantId: string
): Promise<string[]> {
  const db = await getDb()
  await db.execute(
    'UPDATE encounter_combatant_effects SET remaining_turns = remaining_turns - 1 WHERE encounter_id = ? AND combatant_id = ? AND remaining_turns > 0',
    [encounterId, combatantId]
  )
  const expired = await db.select<Array<{ id: string }>>(
    'SELECT id FROM encounter_combatant_effects WHERE encounter_id = ? AND combatant_id = ? AND remaining_turns <= 0',
    [encounterId, combatantId]
  )
  await db.execute(
    'DELETE FROM encounter_combatant_effects WHERE encounter_id = ? AND combatant_id = ? AND remaining_turns <= 0',
    [encounterId, combatantId]
  )
  return expired.map((r) => r.id)
}
