import type { Rarity } from '@engine'
import type { CreatureRow } from '@/shared/api'
import { mapSize } from '@/shared/lib/size-map'
import { parseJsonArray } from '@/shared/lib/json'
import { parseFoundryCharacterDoc } from '@/shared/api'
import { resolveFoundryTokens } from '@/shared/lib/foundry-tokens'
import type {
  Creature,
  CreatureStatBlockData,
  DisplayActionCost,
  ImmunityEntry,
  WeaknessEntry,
  ResistanceEntry,
  AbilityMods,
} from './types'
import type { FoundrySystem, FoundryItem, FoundryIwrEntry, FoundrySenseEntry, FoundryDamageRoll } from './foundry-types'

export function toCreature(row: CreatureRow): Creature {
  // Iconic-as-NPC rows: Foundry `type: "character"` re-routed to `type='npc'`
  // by the Rust sync. Character docs ship without `attributes.hp.max` /
  // `attributes.ac.value` / saves (those paths only exist on true NPCs), so
  // every numeric stat the Rust extractor reached for is null and add-to-combat
  // would write HP 1/1. Overlay with the shared parser so the combat-tracker
  // receives computed values.
  let derivedHp: number | null = null
  let derivedAc: number | null = null
  let derivedFort: number | null = null
  let derivedRef: number | null = null
  let derivedWill: number | null = null
  let derivedPerception: number | null = null
  let derivedLevel: number | null = null
  // Fast-path: real NPC bestiary rows always have hp/ac populated by Rust
  // sync; skip the raw_json parse entirely. Only character docs (iconic
  // iconic/pregen imports) arrive with null numeric columns and need the
  // overlay.
  if (row.hp == null || row.ac == null) {
    try {
      const raw = JSON.parse(row.raw_json) as { type?: string } | null
      if (raw && raw.type === 'character') {
        const pc = parseFoundryCharacterDoc(raw)
        if (pc) {
          derivedHp = pc.hp
          derivedAc = pc.ac
          derivedFort = pc.fortitude
          derivedRef = pc.reflex
          derivedWill = pc.will
          derivedPerception = pc.perception
          derivedLevel = pc.level
        }
      }
    } catch {
      // raw_json may be absent or malformed on legacy rows — fall back to
      // whatever the DB column captured.
    }
  }

  // Extract stealth skill modifier from raw_json skills block (all creature types)
  let stealth: number | null = null
  try {
    const rawForStealth = JSON.parse(row.raw_json) as unknown
    const stealthBase = isRecord(rawForStealth)
      && isRecord(rawForStealth.system)
      && isRecord(rawForStealth.system.skills)
      && isRecord(rawForStealth.system.skills.stealth)
      ? rawForStealth.system.skills.stealth.base
      : undefined
    if (typeof stealthBase === 'number') stealth = stealthBase
    if (stealth == null && isDashboardCreature(rawForStealth)) {
      const dashboardStealth = dashboardSkills(rawForStealth.skills)
        .find((skill) => skill.name.toLowerCase() === 'stealth')?.modifier
      if (typeof dashboardStealth === 'number') stealth = dashboardStealth
    }
  } catch {
    // raw_json absent or malformed — stealth stays null
  }

  return {
    id: row.id,
    name: row.name,
    level: derivedLevel ?? row.level ?? 0,
    hp: derivedHp ?? row.hp ?? 0,
    ac: derivedAc ?? row.ac ?? 0,
    fort: derivedFort ?? row.fort ?? 0,
    ref: derivedRef ?? row.ref ?? 0,
    will: derivedWill ?? row.will ?? 0,
    perception: derivedPerception ?? row.perception ?? 0,
    stealth,
    traits: parseJsonArray(row.traits),
    rarity: (row.rarity ?? 'common') as Rarity,
    size: mapSize(row.size),
    type: row.type,
  }
}

// Safely coerce unknown JSON value to array (guards against objects/strings/nulls)
function asArray(val: unknown): unknown[] {
  return Array.isArray(val) ? val : []
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function dashboardNumber(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val
  if (typeof val === 'string' && val.trim()) {
    const parsed = Number(val)
    return Number.isFinite(parsed) ? parsed : null
  }
  if (isRecord(val)) return dashboardNumber(val.value)
  return null
}

function dashboardText(val: unknown): string {
  return typeof val === 'string' ? val.trim() : ''
}

function dashboardArray(val: unknown): unknown[] {
  return Array.isArray(val) ? val : []
}

function dashboardTraits(val: unknown): string[] {
  const sizeTraits = new Set(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'])
  return dashboardArray(val)
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0 && !sizeTraits.has(item) && !item.startsWith('('))
}

function dashboardSize(val: unknown): CreatureStatBlockData['size'] {
  const sizes: Record<string, CreatureStatBlockData['size']> = {
    tiny: 'Tiny',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    huge: 'Huge',
    gargantuan: 'Gargantuan',
  }
  for (const item of dashboardArray(val)) {
    if (typeof item !== 'string') continue
    const size = sizes[item.trim().toLowerCase()]
    if (size) return size
  }
  return 'Medium'
}

function dashboardSpeed(raw: unknown): Record<string, number | null> {
  const text = dashboardText(raw)
  const speeds: Record<string, number | null> = {}
  for (const part of text.split(',').map((item) => item.trim()).filter(Boolean)) {
    const match = /^(?:(\w+)\s+)?(\d+)\s*(?:feet|ft\.?)?/i.exec(part)
    if (!match) continue
    speeds[(match[1] ?? 'land').toLowerCase()] = Number(match[2])
  }
  return Object.keys(speeds).length > 0 ? speeds : { land: null }
}

function dashboardIwrEntries(raw: unknown): Array<{ type: string; value: number }> {
  return dashboardArray(raw).flatMap((item) => {
    if (typeof item === 'string') {
      const match = /^(.+?)\s+(\d+)$/.exec(item.trim())
      if (!match) return []
      return [{ type: match[1].trim().toLowerCase(), value: Number(match[2]) }]
    }
    if (!isRecord(item)) return []
    const type = dashboardText(item.type ?? item.name)
    const value = dashboardNumber(item.value)
    return type && value != null ? [{ type: type.toLowerCase(), value }] : []
  })
}

function dashboardImmunities(raw: unknown): ImmunityEntry[] {
  return dashboardArray(raw).flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [item.trim().toLowerCase()]
    if (isRecord(item)) {
      const type = dashboardText(item.type ?? item.name)
      if (type) return [type.toLowerCase()]
    }
    return []
  })
}

function dashboardActionCost(raw: unknown): DisplayActionCost | undefined {
  const value = dashboardNumber(raw)
  if (value === -1) return 'reaction'
  if (value === 0 || value === 1 || value === 2 || value === 3) return value
  return undefined
}

function dashboardDamageRolls(raw: unknown): { formula: string; type: string }[] {
  return dashboardArray(raw).flatMap((item) => {
    if (typeof item === 'string') {
      const match = /roll=([^;}]+)(?:;\s*type=([^;}]*))?/.exec(item)
      if (!match) return []
      return [{ formula: match[1].trim(), type: (match[2] ?? '').trim() }]
    }
    if (!isRecord(item)) return []
    const formula = dashboardText(item.roll ?? item.formula)
    if (!formula) return []
    return [{ formula, type: dashboardText(item.type) }]
  })
}

function dashboardRange(traits: string[]): number | undefined {
  for (const trait of traits) {
    const match = /^(?:range-increment|range|reach)-(\d+)$/.exec(trait)
    if (match && !trait.startsWith('reach')) return Number(match[1])
  }
  return undefined
}

function dashboardReach(traits: string[]): number | undefined {
  for (const trait of traits) {
    const match = /^reach-(\d+)$/.exec(trait)
    if (match) return Number(match[1])
  }
  return traits.includes('reach') ? 10 : undefined
}

function dashboardStrikes(raw: unknown): CreatureStatBlockData['strikes'] {
  return dashboardArray(raw).flatMap((item, index) => {
    if (!isRecord(item)) return []
    const name = dashboardText(item.name) || 'Strike'
    const modifier = dashboardNumber(item.bonus)
    if (modifier == null) return []
    const traits = dashboardArray(item.traits)
      .filter((trait): trait is string => typeof trait === 'string')
      .map((trait) => trait.trim().toLowerCase())
      .filter(Boolean)
    const strike: CreatureStatBlockData['strikes'][number] = {
      id: `dashboard-strike-${index}`,
      name,
      modifier,
      damage: dashboardDamageRolls(item.damageRolls),
      traits,
    }
    const reach = dashboardReach(traits)
    const range = dashboardRange(traits)
    if (reach != null) strike.reach = reach
    if (range != null || item.type === 'ranged') strike.range = range ?? 30
    return [strike]
  })
}

function dashboardAbilities(raw: Record<string, unknown>): CreatureStatBlockData['abilities'] {
  const groups = [raw.generalAbilities, raw.defensiveAbilities, raw.offensiveAbilities]
  return groups.flatMap((group) =>
    dashboardArray(group).flatMap((item, index) => {
      if (!isRecord(item)) return []
      const name = dashboardText(item.name)
      if (!name) return []
      const traits = dashboardArray(item.traits)
        .filter((trait): trait is string => typeof trait === 'string')
        .map((trait) => trait.trim().toLowerCase())
        .filter(Boolean)
      return [{
        id: `dashboard-ability-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
        name,
        actionCost: dashboardActionCost(item.actions),
        description: stripHtml(dashboardText(item.description)),
        traits,
      }]
    })
  )
}

function dashboardSkills(raw: unknown): CreatureStatBlockData['skills'] {
  return dashboardArray(raw).flatMap((item) => {
    if (!isRecord(item)) return []
    const name = dashboardText(item.name)
    const modifier = dashboardNumber(item.modifier)
    return name && modifier != null ? [{ name, modifier, calculated: false }] : []
  })
}

function dashboardSpellcasting(raw: Record<string, unknown>, creatureLevel: number): CreatureStatBlockData['spellcasting'] {
  return dashboardArray(raw.spellcastingEntries).flatMap((entry, entryIndex) => {
    if (!isRecord(entry)) return []
    const entryId = `dashboard-spellcasting-${entryIndex}`
    const spellsByRank: NonNullable<CreatureStatBlockData['spellcasting']>[number]['spellsByRank'] = []
    const appendRank = (rank: number, spellsRaw: unknown, slotsRaw: unknown) => {
      const spells = dashboardArray(spellsRaw).flatMap((spell) => {
        if (!isRecord(spell)) return []
        const name = dashboardText(spell.name)
        if (!name) return []
        const from = dashboardNumber(spell.fromlevel)
        const to = dashboardNumber(spell.tolevel)
        if (from != null && creatureLevel < from) return []
        if (to != null && creatureLevel > to) return []
        return [{
          name,
          foundryId: dashboardText(spell.id) || null,
          entryId,
          ...(rank !== 0 && dashboardNumber(spell.level) != null
            ? { heightenedFromRank: dashboardNumber(spell.level)! }
            : {}),
        }]
      })
      if (spells.length === 0) return
      spellsByRank.push({
        rank,
        slots: isRecord(slotsRaw) ? dashboardNumber(slotsRaw.max) ?? 0 : 0,
        spells,
      })
    }

    appendRank(0, entry.cantrips, { max: 0 })
    for (let rank = 1; rank <= 10; rank++) {
      appendRank(rank, entry[`lv${rank}spells`], entry[`lv${rank}slots`])
    }

    if (spellsByRank.length === 0 && dashboardNumber(entry.dc) == null) return []
    const entryName = dashboardText(entry.name) || 'Spells'
    const entryNameLower = entryName.toLowerCase()
    const tradition =
      ['arcane', 'divine', 'occult', 'primal'].find((item) => entryNameLower.includes(item)) ?? 'arcane'
    return [{
      entryId,
      entryName,
      tradition,
      castType: dashboardText(entry.type) || 'prepared',
      spellDc: dashboardNumber(entry.dc) ?? 0,
      spellAttack: dashboardNumber(entry.bonus) ?? 0,
      spellsByRank,
    }]
  })
}

function dashboardAbilityMods(raw: Record<string, unknown>): AbilityMods {
  return {
    str: dashboardNumber(raw.strength) ?? 0,
    dex: dashboardNumber(raw.dexterity) ?? 0,
    con: dashboardNumber(raw.constitution) ?? 0,
    int: dashboardNumber(raw.intelligence) ?? 0,
    wis: dashboardNumber(raw.wisdom) ?? 0,
    cha: dashboardNumber(raw.charisma) ?? 0,
  }
}

function isDashboardCreature(raw: unknown): raw is Record<string, unknown> {
  return isRecord(raw) && raw.type === 'Creature' && typeof raw.source === 'string'
}

function toDashboardCreatureStatBlockData(row: CreatureRow, raw: Record<string, unknown>): CreatureStatBlockData {
  const base = toCreature(row)
  const level = dashboardNumber(raw.level) ?? base.level
  const skills = dashboardSkills(raw.skills)
  const spellcasting = dashboardSpellcasting(raw, level)
  return {
    ...base,
    level,
    hp: dashboardNumber(raw.hp) ?? base.hp,
    ac: dashboardNumber(raw.ac) ?? base.ac,
    fort: dashboardNumber(raw.fortitude) ?? base.fort,
    ref: dashboardNumber(raw.reflex) ?? base.ref,
    will: dashboardNumber(raw.will) ?? base.will,
    perception: dashboardNumber(raw.perception) ?? base.perception,
    stealth: skills.find((skill) => skill.name.toLowerCase() === 'stealth')?.modifier ?? base.stealth,
    traits: dashboardTraits(raw.traits),
    rarity: base.rarity,
    size: dashboardSize(raw.traits),
    immunities: dashboardImmunities(raw.immunities),
    weaknesses: dashboardIwrEntries(raw.weaknesses),
    resistances: dashboardIwrEntries(raw.resistances),
    speeds: dashboardSpeed(raw.speed),
    strikes: dashboardStrikes(raw.strikes),
    abilities: dashboardAbilities(raw),
    skills,
    languages: dashboardArray(raw.languages).filter((item): item is string => typeof item === 'string'),
    senses: dashboardArray(raw.senses).filter((item): item is string => typeof item === 'string'),
    description: dashboardText(raw.description) || undefined,
    source: dashboardText(raw.source) || row.source_name || 'Generic Creatures',
    spellDC: spellcasting?.[0]?.spellDc,
    spellcasting,
    abilityMods: dashboardAbilityMods(raw),
  }
}

export function toCreatureStatBlockData(row: CreatureRow): CreatureStatBlockData {
  const base = toCreature(row)
  const raw = JSON.parse(row.raw_json)
  if (isDashboardCreature(raw)) {
    return toDashboardCreatureStatBlockData(row, raw)
  }
  const system = (raw.system || {}) as FoundrySystem
  const details = system.details || {}

  // Structured IWR transform at map-time. Legacy string[] inputs wrapped as
  // { type }. Foundry `.exceptions` may be string[] or { label }[] — coerce
  // to string[] with filter(Boolean).
  const immunities = asArray(system.attributes?.immunities).map((i): ImmunityEntry => {
    const entry = i as FoundryIwrEntry & { exceptions?: unknown }
    const type = entry.type || String(i)
    const rawExc = Array.isArray(entry.exceptions) ? entry.exceptions : []
    const exceptions = rawExc
      .map((e) => (typeof e === 'string' ? e : (e as { label?: string })?.label))
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
    return exceptions.length > 0 ? { type, exceptions } : type
  })

  const weaknesses = asArray(system.attributes?.weaknesses).map((w): WeaknessEntry => {
    const entry = w as FoundryIwrEntry & { exceptions?: unknown }
    const rawExc = Array.isArray(entry.exceptions) ? entry.exceptions : []
    const exceptions = rawExc
      .map((e) => (typeof e === 'string' ? e : (e as { label?: string })?.label))
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
    const result: WeaknessEntry = { type: entry.type || String(w), value: entry.value ?? 0 }
    if (exceptions.length > 0) result.exceptions = exceptions
    return result
  })

  const resistances = asArray(system.attributes?.resistances).map((r): ResistanceEntry => {
    const entry = r as FoundryIwrEntry & { exceptions?: unknown }
    const rawExc = Array.isArray(entry.exceptions) ? entry.exceptions : []
    const exceptions = rawExc
      .map((e) => (typeof e === 'string' ? e : (e as { label?: string })?.label))
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
    const rawDvs = Array.isArray(entry.doubleVs) ? entry.doubleVs : []
    const doubleVs = rawDvs.filter((s): s is string => typeof s === 'string' && s.length > 0)
    const result: ResistanceEntry = { type: entry.type || String(r), value: entry.value ?? 0 }
    if (exceptions.length > 0) result.exceptions = exceptions
    if (doubleVs.length > 0) result.doubleVs = doubleVs
    return result
  })

  const speedData = system.attributes?.speed || {}
  const speeds: Record<string, number | null> = { land: speedData.value ?? null }
  if (Array.isArray(speedData.otherSpeeds)) {
    for (const s of speedData.otherSpeeds) {
      if (s.type && s.value != null) speeds[s.type] = s.value
    }
  } else if (speedData.otherSpeeds && typeof speedData.otherSpeeds === 'object') {
    for (const [key, val] of Object.entries(speedData.otherSpeeds)) {
      if (typeof val === 'object' && val !== null && 'value' in val) {
        speeds[key] = (val as { value?: number }).value ?? null
      }
    }
  }

  const items = asArray(raw.items) as FoundryItem[]
  // Build weapon lookup for resolving group from linked weapon items
  const weaponsById = new Map<string, FoundryItem>(
    items.filter((item) => item.type === 'weapon').map((item) => [item._id, item])
  )
  // Base reach (feet) derived from Foundry size. `"reach"` / `"reach-N"`
  // traits on a strike layer on top of this base.
  const creatureSize: string = (typeof (system as { traits?: { size?: { value?: string } } }).traits?.size?.value === 'string')
    ? ((system as { traits: { size: { value: string } } }).traits.size.value)
    : 'med'
  const baseCreatureReach =
    creatureSize === 'tiny' ? 0
    : creatureSize === 'sm' || creatureSize === 'med' ? 5
    : creatureSize === 'lg' ? 10
    : creatureSize === 'huge' ? 15
    : creatureSize === 'grg' ? 20
    : 5
  const strikes: CreatureStatBlockData['strikes'] = items
    .filter((item) => item.type === 'melee' || item.type === 'ranged')
    .map((item): CreatureStatBlockData['strikes'][number] => {
      const linkedWeaponId = item.flags?.pf2e?.linkedWeapon
      const linkedWeapon = linkedWeaponId ? weaponsById.get(linkedWeaponId) : undefined
      const group = linkedWeapon?.system?.group || undefined
      const traits = asArray(item.system?.traits?.value) as string[]
      // Extract reach from trait list.
      let reach: number | undefined
      let range: number | undefined
      for (const t of traits) {
        const m = /^reach-(\d+)$/.exec(t)
        if (m) {
          reach = parseInt(m[1], 10)
          break
        }
        const r = /^range(?:-increment)?-(\d+)$/.exec(t)
        if (r) range = parseInt(r[1], 10)
      }
      if (reach === undefined && traits.includes('reach')) {
        reach = baseCreatureReach + 5
      }
      // Read system.range.max as the canonical range for ranged strikes.
      // PF2e uses item.type="melee" for ALL strike items (melee and ranged),
      // so we cannot rely on item.type to detect ranged — system.range.max is
      // the ground truth (non-null → ranged attack with that range in feet).
      if (range === undefined && (item.system?.range?.max ?? null) !== null) {
        range = item.system!.range!.max as number
      }
      const isMelee = item.type === 'melee' && range === undefined
      if (reach === undefined && isMelee) reach = baseCreatureReach
      return {
        id: item._id,
        name: item.name || 'Strike',
        modifier: item.system?.bonus?.value ?? 0,
        damage: formatDamage(item.system?.damageRolls),
        traits,
        group: group as string | undefined,
        reach,
        range,
      }
    })

  const abilities = items
    .filter((item) => item.type === 'action')
    .map((item) => ({
      id: item._id,
      name: item.name || 'Ability',
      actionCost: parseActionCost(item.system?.actionType?.value, item.system?.actions?.value),
      description: stripHtml(resolveFoundryTokens(item.system?.description?.value || '')),
      traits: asArray(item.system?.traits?.value) as string[],
    }))

  const STANDARD_SKILLS = [
    'acrobatics', 'arcana', 'athletics', 'crafting', 'deception',
    'diplomacy', 'intimidation', 'medicine', 'nature', 'occultism',
    'performance', 'religion', 'society', 'stealth', 'survival', 'thievery',
  ]

  const skillsObj = system.skills || {}
  const foundrySkills = new Map<string, number>(
    Object.entries(skillsObj)
      .filter(([, v]) => v && typeof v.base === 'number')
      .map(([k, v]) => [k, v.base as number])
  )

  // All 17 standard skills — use Foundry value if present, else derive from level
  const standardSkills: CreatureStatBlockData['skills'] = STANDARD_SKILLS.map((key) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    modifier: foundrySkills.has(key) ? foundrySkills.get(key)! : base.level,
    calculated: !foundrySkills.has(key),
  }))

  // Lore skills — any Foundry skill keys not in STANDARD_SKILLS
  const loreSkills: CreatureStatBlockData['skills'] = Object.entries(skillsObj)
    .filter(([k, v]) => !STANDARD_SKILLS.includes(k) && v && typeof v.base === 'number')
    .map(([k, v]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      modifier: v.base as number,
      calculated: false,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const skills: CreatureStatBlockData['skills'] = [...standardSkills, ...loreSkills]

  const languages: string[] = asArray(details.languages?.value ?? system.traits?.languages?.value) as string[]
  const senseData = system.perception?.senses || system.traits?.senses || []
  const senses: string[] = Array.isArray(senseData)
    ? senseData.map((s) => (typeof s === 'string' ? s : (s as FoundrySenseEntry).type || String(s)))
    : []

  const description = stripHtml(resolveFoundryTokens(details.publicNotes || details.description?.value || ''))
  const source =
    details.publication?.title || system.details?.source?.value || row.source_pack || 'Unknown'

  // Spell DC and Class DC — present on spellcasting creatures
  const spellDCRaw = system.attributes?.spellDC?.value ?? system.spellcasting?.dc?.value
  const spellDC: number | undefined = spellDCRaw != null ? Number(spellDCRaw) : undefined
  const classDCFromAttr = system.attributes?.classOrSpellDC?.value
  const classDCFromMod = system.proficiencies?.classDC?.totalModifier
  const classDC: number | undefined =
    classDCFromAttr != null ? Number(classDCFromAttr) :
    classDCFromMod != null ? 10 + Number(classDCFromMod) :
    undefined

  // Ability modifiers from Foundry `system.abilities.{str,dex,con,int,wis,cha}.mod`.
  // Bestiary rows have these; fallback to 0 if missing.
  const foundryAbilities = (system as { abilities?: Record<string, { mod?: number }> }).abilities ?? {}
  let abilityMods: AbilityMods = {
    str: foundryAbilities.str?.mod ?? 0,
    dex: foundryAbilities.dex?.mod ?? 0,
    con: foundryAbilities.con?.mod ?? 0,
    int: foundryAbilities.int?.mod ?? 0,
    wis: foundryAbilities.wis?.mod ?? 0,
    cha: foundryAbilities.cha?.mod ?? 0,
  }

  // Iconic-as-NPC overlay: Foundry `type: "character"` gets synced into the
  // bestiary as `type: "npc"`, but character documents carry declarative data
  // only — numeric stats live on nested items (class/ancestry/armor/weapon)
  // and have to be reconstructed via the shared Foundry-PC parser. Rust sync
  // reads NPC paths (attributes.hp.max, saves.fortitude.value, …) which are
  // all absent on a character doc, so the row ships with hp/ac/saves = null.
  // The parser overlay fills them plus strikes, skills, languages, speed, reach.
  let derivedStrikes: typeof strikes | null = null
  let derivedBase: Partial<Creature> | null = null
  let derivedSkills: typeof skills | null = null
  let derivedSpeeds: Record<string, number | null> | null = null
  let derivedLanguages: string[] | null = null
  let derivedSize: CreatureStatBlockData['size'] | null = null
  if (raw.type === 'character') {
    const derived = derivePcStats(raw, abilityMods)
    if (derived) {
      abilityMods = derived.abilityMods
      derivedBase = derived.base
      derivedStrikes = derived.strikes
      derivedSkills = derived.skills
      derivedSpeeds = derived.speeds
      derivedLanguages = derived.languages
      derivedSize = derived.size
    }
  }

  return {
    ...base,
    ...(derivedBase ?? {}),
    ...(derivedSize ? { size: derivedSize } : {}),
    immunities,
    weaknesses,
    resistances,
    speeds: derivedSpeeds ?? speeds,
    strikes: derivedStrikes ?? strikes,
    abilities,
    skills: derivedSkills ?? skills,
    languages: derivedLanguages ?? languages,
    senses,
    description: description || undefined,
    source,
    spellDC,
    classDC,
    abilityMods,
  }
}

// ─── Character-as-NPC derivation via shared parser ────────────────────────
// Foundry character documents don't carry computed numeric stats on disk.
// `derivePcStats` delegates to the shared `parseFoundryCharacterDoc` so the
// iconic-as-NPC overlay (this file) and the PC-library row (sync-iconics-pc)
// stay in lockstep. Every PF2e formula and boost-replay rule lives in the
// parser; this function only translates `ParsedPc` into the
// `CreatureStatBlockData` overlay shape the bestiary renderer expects.
interface DerivedPcStats {
  base: Partial<Creature>
  abilityMods: AbilityMods
  strikes: CreatureStatBlockData['strikes']
  skills: CreatureStatBlockData['skills']
  speeds: Record<string, number | null>
  languages: string[]
  reach: number
  size: CreatureStatBlockData['size']
}

function derivePcStats(raw: unknown, baseAbilityMods: AbilityMods): DerivedPcStats | null {
  const pc = parseFoundryCharacterDoc(raw)
  if (!pc) return null

  // Prefer baseAbilityMods only when they're non-zero (i.e. Rust sync
  // captured numbers from an already-expanded character). Otherwise use
  // the parser's replayed scores.
  const haveBaseMods = Object.values(baseAbilityMods).some((v) => v !== 0)
  const abilityMods: AbilityMods = haveBaseMods
    ? baseAbilityMods
    : {
        str: Math.floor((pc.abilities.str - 10) / 2),
        dex: Math.floor((pc.abilities.dex - 10) / 2),
        con: Math.floor((pc.abilities.con - 10) / 2),
        int: Math.floor((pc.abilities.int - 10) / 2),
        wis: Math.floor((pc.abilities.wis - 10) / 2),
        cha: Math.floor((pc.abilities.cha - 10) / 2),
      }

  const strikes: CreatureStatBlockData['strikes'] = pc.strikes.map((s) => ({
    name: s.name,
    modifier: s.attackMod,
    damage: [{ formula: s.damageFormula, type: s.damageType }],
    traits: s.traits,
    group: s.group,
    reach: s.reach,
    range: s.range ?? undefined,
  }))

  // PF2e skill → governing ability. Keep local to avoid reaching into
  // engine internals from a bestiary mapper.
  const SKILL_ABILITY: Record<string, keyof AbilityMods> = {
    acrobatics: 'dex',
    arcana: 'int',
    athletics: 'str',
    crafting: 'int',
    deception: 'cha',
    diplomacy: 'cha',
    intimidation: 'cha',
    medicine: 'wis',
    nature: 'wis',
    occultism: 'int',
    performance: 'cha',
    religion: 'wis',
    society: 'int',
    stealth: 'dex',
    survival: 'wis',
    thievery: 'dex',
  }
  const skills: CreatureStatBlockData['skills'] = Object.entries(SKILL_ABILITY).map(
    ([slug, ability]): CreatureStatBlockData['skills'][number] => {
      const rank = pc.skills[slug] ?? 0
      const profBonus = rank > 0 ? pc.level + rank * 2 : 0
      const modifier = abilityMods[ability] + profBonus
      return {
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
        modifier,
        calculated: rank === 0,
      }
    }
  )
  // Append background lore skills (trained = rank 1, INT-based).
  for (const lore of pc.backgroundLoreSkills) {
    skills.push({
      name: `${lore}`,
      modifier: abilityMods.int + (pc.level + 2),
      calculated: false,
    })
  }

  const speeds: Record<string, number | null> = { land: pc.speed }

  const size = (
    pc.size === 'tiny'
      ? 'tiny'
      : pc.size === 'sm'
        ? 'small'
        : pc.size === 'med'
          ? 'medium'
          : pc.size === 'lg'
            ? 'large'
            : pc.size === 'huge'
              ? 'huge'
              : pc.size === 'grg'
                ? 'gargantuan'
                : 'medium'
  ) as CreatureStatBlockData['size']

  return {
    abilityMods,
    strikes,
    skills,
    speeds,
    languages: pc.languages,
    reach: pc.reach,
    size,
    base: {
      level: pc.level,
      hp: pc.hp,
      ac: pc.ac,
      fort: pc.fortitude,
      ref: pc.reflex,
      will: pc.will,
      perception: pc.perception,
    },
  }
}

export function extractIwr(row: CreatureRow): {
  immunities: string[]
  weaknesses: { type: string; value: number; exceptions?: string[] }[]
  resistances: { type: string; value: number; exceptions?: string[]; doubleVs?: string[] }[]
} {
  const raw = JSON.parse(row.raw_json)
  const system = (raw.system || {}) as FoundrySystem
  return {
    immunities: (system.attributes?.immunities || []).map((i) => i.type || String(i)),
    weaknesses: (system.attributes?.weaknesses || []).map((w) => {
      const rawExc = Array.isArray(w.exceptions) ? w.exceptions : []
      const exceptions = rawExc
        .map((e: unknown) => (typeof e === 'string' ? e : (e as { label?: string })?.label))
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
      const entry: { type: string; value: number; exceptions?: string[] } = {
        type: w.type || String(w),
        value: w.value ?? 0,
      }
      if (exceptions.length > 0) entry.exceptions = exceptions
      return entry
    }),
    resistances: (system.attributes?.resistances || []).map((r) => {
      const rawExc = Array.isArray(r.exceptions) ? r.exceptions : []
      const exceptions = rawExc
        .map((e: unknown) => (typeof e === 'string' ? e : (e as { label?: string })?.label))
        .filter((s): s is string => typeof s === 'string' && s.length > 0)
      const rawDvs = Array.isArray(r.doubleVs) ? r.doubleVs : []
      const doubleVs = rawDvs.filter((s: unknown): s is string => typeof s === 'string' && s.length > 0)
      const entry: { type: string; value: number; exceptions?: string[]; doubleVs?: string[] } = {
        type: r.type || String(r),
        value: r.value ?? 0,
      }
      if (exceptions.length > 0) entry.exceptions = exceptions
      if (doubleVs.length > 0) entry.doubleVs = doubleVs
      return entry
    }),
  }
}

function formatDamage(damageRolls: Record<string, FoundryDamageRoll> | undefined | null): { formula: string; type: string; persistent?: boolean }[] {
  if (!damageRolls) return []
  return Object.values(damageRolls).map((d) => {
    const entry: { formula: string; type: string; persistent?: boolean } = {
      formula: (d.damage || d.formula || '?').trim(),
      type: (d.damageType || d.type || '').trim(),
    }
    if (d.category === 'persistent') entry.persistent = true
    return entry
  })
}

function parseActionCost(actionType?: string, actions?: number | null): DisplayActionCost | undefined {
  if (actionType === 'reaction') return 'reaction'
  if (actionType === 'free') return 'free'
  if (actionType === 'passive') return undefined
  if (actions != null && actions >= 1 && actions <= 3) return actions as 1 | 2 | 3
  return undefined
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
