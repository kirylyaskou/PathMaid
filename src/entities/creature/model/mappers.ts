import type { Rarity } from '@engine'
import type { CreatureRow } from '@/shared/api'
import { mapSize } from '@/shared/lib/size-map'
import { parseJsonArray } from '@/shared/lib/json'
import { parseFoundryCharacterDoc } from '@/shared/api/sync/foundry-pc-parser'
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

export function toCreatureStatBlockData(row: CreatureRow): CreatureStatBlockData {
  const base = toCreature(row)
  const raw = JSON.parse(row.raw_json)
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
    const result: ResistanceEntry = { type: entry.type || String(r), value: entry.value ?? 0 }
    if (exceptions.length > 0) result.exceptions = exceptions
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
  weaknesses: { type: string; value: number }[]
  resistances: { type: string; value: number }[]
} {
  const raw = JSON.parse(row.raw_json)
  const system = (raw.system || {}) as FoundrySystem
  return {
    immunities: (system.attributes?.immunities || []).map((i) => i.type || String(i)),
    weaknesses: (system.attributes?.weaknesses || []).map((w) => ({
      type: w.type || String(w),
      value: w.value ?? 0,
    })),
    resistances: (system.attributes?.resistances || []).map((r) => ({
      type: r.type || String(r),
      value: r.value ?? 0,
    })),
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

function resolveFoundryTokens(text: string): string {
  // @UUID with alias: @UUID[Compendium.pf2e.X.Item.Y]{alias} → alias text
  text = text.replace(/@UUID\[[^\]]*\]\{([^}]+)\}/g, '$1')
  // @UUID without alias: extract last dot-path segment (e.g. "Enfeebled")
  text = text.replace(/@UUID\[([^\]]+)\]/g, (_, path: string) => {
    const parts = path.split('.')
    return parts[parts.length - 1]
  })
  // @Damage: @Damage[9d10[untyped]] → "9d10 untyped"
  //          @Damage[2d6[fire], 1d4[bleed]] → "2d6 fire plus 1d4 bleed"
  text = text.replace(/@Damage\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\]/g, (_, inner: string) => {
    const parts = inner.split(/,\s*/).map((part: string) => {
      const m = part.trim().match(/^(.+?)\[(.+?)\]$/)
      return m ? `${m[1]} ${m[2]}` : part.trim()
    })
    return parts.join(' plus ')
  })
  // @Check: @Check[type:perception|dc:20] → "DC 20 Perception check"
  //         @Check[will|dc:25] → "DC 25 Will check" (Foundry positional)
  //         @Check[dc:25] → "DC 25" (no type at all)
  text = text.replace(/@Check\[([^\]]+)\]/g, (_, inner: string) => {
    const segments = inner.split('|')
    const params: Record<string, string> = {}
    let positionalType: string | undefined
    for (const seg of segments) {
      if (seg.includes(':')) {
        const [k, v] = seg.split(':')
        params[k] = v
      } else if (!positionalType && seg) {
        positionalType = seg
      }
    }
    const rawType = params.type ?? positionalType
    if (!rawType) {
      return params.dc ? `DC ${params.dc}` : 'flat check'
    }
    const type = rawType.charAt(0).toUpperCase() + rawType.slice(1)
    const dc = params.dc ? `DC ${params.dc} ` : ''
    return `${dc}${type} check`
  })
  // Collapse accidental "check check" duplication left behind when the
  // Foundry author wrote " check" after an @Check token that already
  // renders its own "check" suffix.
  text = text.replace(/\bcheck\s+check\b/gi, 'check')
  // @Template: @Template[type:cone|distance:15] → "15-foot cone"
  //            @Template[type:emanation|distance:30] → "30-foot emanation"
  text = text.replace(/@Template\[([^\]]+)\]/g, (_, inner: string) => {
    const params = Object.fromEntries(inner.split('|').map((p: string) => p.split(':')))
    const distance = params.distance ?? '?'
    const type = params.type ?? 'area'
    return `${distance}-foot ${type}`
  })
  // [[/act slug]] or [[/act slug #id]] → capitalize slug, hyphens to spaces
  text = text.replace(/\[\[\/act\s+([^#\s\]]*)[^\]]*\]\]/g, (_, slug: string) => {
    if (!slug) return ''
    return slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
  })

  // [[/br expr #label]]{display} → use display text only
  text = text.replace(/\[\[\/br\s+[^\]]*\]\]\{([^}]+)\}/g, '$1')

  // [[/br expr]] with NO {display} → use expr as-is
  text = text.replace(/\[\[\/br\s+([^#\s\]]+)[^\]]*\]\]/g, '$1')

  // {Nfeet} or {Nfoot} where N is digits → "N feet"
  text = text.replace(/\{(\d+)feet?\}/gi, '$1 feet')

  // @Localize fallback — strip token (sync pipeline resolves these at import time)
  text = text.replace(/@Localize\[[^\]]+\]/g, '')
  return text
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
