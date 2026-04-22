import { getDb } from '@/shared/db'
import type {
  ParsedCombatant,
  ParsedEncounter,
  MatchStatus,
  MatchedCombatant,
  MatchedEncounter,
} from './types'

// case-insensitive name matching against bestiary → custom → hazards.
// Priority:
//  - isHazard=true → hazards table only
//  - isHazard=false → entities (type='npc'), fallback custom_creatures
// Unmatched → skipped.

async function matchCreatureByName(
  name: string
): Promise<{ id: string; level: number; hp: number | null } | null> {
  const db = await getDb()
  const rows = await db.select<Array<{ id: string; level: number | null; hp: number | null }>>(
    `SELECT id, level, hp FROM entities
     WHERE type = 'npc' AND LOWER(name) = LOWER(?)
     LIMIT 1`,
    [name]
  )
  if (rows.length > 0) {
    return { id: rows[0].id, level: rows[0].level ?? 0, hp: rows[0].hp }
  }
  return null
}

async function matchCustomCreatureByName(
  name: string
): Promise<{ id: string; level: number } | null> {
  const db = await getDb()
  const rows = await db.select<Array<{ id: string; level: number }>>(
    `SELECT id, level FROM custom_creatures
     WHERE LOWER(name) = LOWER(?)
     LIMIT 1`,
    [name]
  )
  return rows[0] ?? null
}

async function matchHazardByName(
  name: string
): Promise<{ id: string; level: number; hp: number | null } | null> {
  const db = await getDb()
  const rows = await db.select<Array<{ id: string; level: number; hp: number | null }>>(
    `SELECT id, level, hp FROM hazards
     WHERE LOWER(name) = LOWER(?)
     LIMIT 1`,
    [name]
  )
  return rows[0] ?? null
}

export async function matchCombatant(c: ParsedCombatant): Promise<MatchStatus> {
  // 64-fix: lookup uses lookupName (originalCreature.name in Dashboard format),
  // not displayName (which carries the GM's local moniker like "Огрек").
  const name = c.lookupName ?? c.displayName
  if (!name || !name.trim()) return { status: 'skipped', reason: 'missing-name' }
  if (c.isHazard) {
    const hit = await matchHazardByName(name)
    if (hit) return { status: 'hazard', id: hit.id, level: hit.level, hp: hit.hp ?? 0 }
    return { status: 'skipped', reason: 'no-match' }
  }
  const bestiary = await matchCreatureByName(name)
  if (bestiary) {
    return {
      status: 'bestiary',
      id: bestiary.id,
      level: bestiary.level,
      hp: bestiary.hp ?? 0,
    }
  }
  const custom = await matchCustomCreatureByName(name)
  if (custom) return { status: 'custom', id: custom.id, level: custom.level }
  return { status: 'skipped', reason: 'no-match' }
}

export async function matchEncounter(enc: ParsedEncounter): Promise<MatchedEncounter> {
  const combatants: MatchedCombatant[] = []
  for (const p of enc.combatants) {
    const match = await matchCombatant(p)
    combatants.push({ parsed: p, match })
  }
  return { parsed: enc, combatants }
}

export async function matchEncounters(encs: ParsedEncounter[]): Promise<MatchedEncounter[]> {
  const out: MatchedEncounter[] = []
  for (const e of encs) out.push(await matchEncounter(e))
  return out
}
