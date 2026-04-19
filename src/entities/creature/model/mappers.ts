import type { Rarity } from '@engine'
import type { CreatureRow } from '@/shared/api'
import { mapSize } from '@/shared/lib/size-map'
import { parseJsonArray } from '@/shared/lib/json'
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
  return {
    id: row.id,
    name: row.name,
    level: row.level ?? 0,
    hp: row.hp ?? 0,
    ac: row.ac ?? 0,
    fort: row.fort ?? 0,
    ref: row.ref ?? 0,
    will: row.will ?? 0,
    perception: row.perception ?? 0,
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

  // D-09: structured IWR transform at map-time. Legacy string[] inputs wrapped as { type }.
  // Foundry `.exceptions` may be string[] or { label }[] — coerce to string[] with filter(Boolean).
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
  const strikes = items
    .filter((item) => item.type === 'melee' || item.type === 'ranged')
    .map((item) => {
      const linkedWeaponId = item.flags?.pf2e?.linkedWeapon
      const linkedWeapon = linkedWeaponId ? weaponsById.get(linkedWeaponId) : undefined
      const group = linkedWeapon?.system?.group || undefined
      return {
        name: item.name || 'Strike',
        modifier: item.system?.bonus?.value ?? 0,
        damage: formatDamage(item.system?.damageRolls),
        traits: asArray(item.system?.traits?.value) as string[],
        group,
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
  const standardSkills = STANDARD_SKILLS.map((key) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    modifier: foundrySkills.has(key) ? foundrySkills.get(key)! : base.level,
    calculated: !foundrySkills.has(key),
  }))

  // Lore skills — any Foundry skill keys not in STANDARD_SKILLS
  const loreSkills = Object.entries(skillsObj)
    .filter(([k, v]) => !STANDARD_SKILLS.includes(k) && v && typeof v.base === 'number')
    .map(([k, v]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      modifier: v.base as number,
      calculated: false as const,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const skills = [...standardSkills, ...loreSkills]

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

  // D-08: Ability modifiers from Foundry `system.abilities.{str,dex,con,int,wis,cha}.mod`.
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

  // v1.4 UAT BUG-B: iconic-as-NPC (Foundry `type: "character"` synced into the
  // bestiary as `type: "npc"`). Character documents store declarative data
  // only — numeric stats live on nested items (class/ancestry/armor/weapon)
  // and have to be reconstructed here. The Rust sync path reads NPC paths
  // (attributes.hp.max, saves.fortitude.value, …) which are all absent on a
  // character document, so the row ships with hp/ac/saves = null. We detect
  // the character shape via raw.type and overlay derived numbers + strikes.
  let derivedStrikes: typeof strikes | null = null
  let derivedBase: Partial<Creature> | null = null
  if (raw.type === 'character') {
    const derived = derivePcStats(raw, abilityMods)
    abilityMods = derived.abilityMods
    derivedBase = derived.base
    derivedStrikes = derived.strikes.map((s) => ({
      name: s.name,
      modifier: s.modifier,
      damage: s.damage,
      traits: s.traits,
      group: s.group,
    }))
  }

  return {
    ...base,
    ...(derivedBase ?? {}),
    immunities,
    weaknesses,
    resistances,
    speeds,
    strikes: derivedStrikes ?? strikes,
    abilities,
    skills,
    languages,
    senses,
    description: description || undefined,
    source,
    spellDC,
    classDC,
    abilityMods,
  }
}

// ─── v1.4 UAT BUG-B: character-as-NPC derivation ────────────────────────────
// Foundry character documents don't carry computed numeric stats on disk. We
// reconstruct the minimum set the statblock needs:
//   - HP: system.attributes.hp.value (authored max per iconic)
//   - abilityMods: replay ancestry + background + build.attributes.boosts on
//     the PF2e boost ladder (+2 if <18 else +1). Flaws subtract 2.
//   - AC: 10 + dex_mod (capped by armor.dexCap) + armor.acBonus + prof_bonus
//   - Fort/Ref/Will: level + ability_mod + prof_bonus_from_class
//   - Perception: level + wis_mod + prof_bonus_from_class
//   - Strikes: synthesized from items[].type === 'weapon' using weapon traits
//     + ability mod (STR for melee, DEX for ranged/finesse/thrown).
//
// PF2e proficiency rank → bonus mapping: 0 = untrained (0), 1 = trained
// (level + 2), 2 = expert (level + 4), 3 = master (level + 6), 4 = legendary
// (level + 8). Same across saves / perception / armor / weapons.
interface DerivedPcStats {
  base: Partial<Creature>
  abilityMods: AbilityMods
  strikes: CreatureStatBlockData['strikes']
}

function profBonus(rank: number | null | undefined, level: number): number {
  if (typeof rank !== 'number' || rank <= 0) return 0
  return level + rank * 2
}

function getBoosted(obj: unknown): string[] {
  // Collect `selected` strings from a Foundry boost-map shape, falling back to
  // treating array values as already-selected lists (as the build.attributes
  // block does).
  if (!obj || typeof obj !== 'object') return []
  const out: string[] = []
  for (const v of Object.values(obj as Record<string, unknown>)) {
    if (Array.isArray(v)) {
      for (const s of v) if (typeof s === 'string') out.push(s)
    } else if (v && typeof v === 'object') {
      const sel = (v as Record<string, unknown>).selected
      if (typeof sel === 'string' && sel) out.push(sel)
    }
  }
  return out
}

function applyBoost(mods: Record<keyof AbilityMods, number>, stat: string): void {
  // Mod starts at 0 (score 10). Boost adds +2 score (+1 mod) until 18 (mod=4),
  // then +1 score (no full mod step). We approximate by tracking score.
  // Caller passes mods; we internally reconstruct scores.
  const key = stat as keyof AbilityMods
  if (!(key in mods)) return
  // Convert mod → score, apply boost, convert back.
  const score = 10 + mods[key] * 2
  const nextScore = score < 18 ? score + 2 : score + 1
  mods[key] = Math.floor((nextScore - 10) / 2)
}

function applyFlaw(mods: Record<keyof AbilityMods, number>, stat: string): void {
  const key = stat as keyof AbilityMods
  if (!(key in mods)) return
  const score = 10 + mods[key] * 2
  const nextScore = score - 2
  mods[key] = Math.floor((nextScore - 10) / 2)
}

function buildAbilityModsFromBoosts(raw: unknown): AbilityMods {
  const mods: AbilityMods = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
  if (!raw || typeof raw !== 'object') return mods
  const doc = raw as Record<string, unknown>
  const items = Array.isArray(doc.items) ? (doc.items as Array<Record<string, unknown>>) : []

  const ancestry = items.find((it) => it?.type === 'ancestry')
  const background = items.find((it) => it?.type === 'background')
  const anSys = (ancestry?.system ?? {}) as Record<string, unknown>
  const bgSys = (background?.system ?? {}) as Record<string, unknown>

  for (const b of getBoosted(anSys.boosts)) applyBoost(mods, b)
  for (const f of getBoosted(anSys.flaws)) applyFlaw(mods, f)
  for (const b of getBoosted(bgSys.boosts)) applyBoost(mods, b)

  const buildBoosts = (doc.system as Record<string, unknown> | undefined)
    ?.build as Record<string, unknown> | undefined
  const attrBoosts = (buildBoosts?.attributes as Record<string, unknown> | undefined)?.boosts
  for (const b of getBoosted(attrBoosts)) applyBoost(mods, b)
  return mods
}

function derivePcStats(raw: unknown, baseAbilityMods: AbilityMods): DerivedPcStats {
  const doc = (raw ?? {}) as Record<string, unknown>
  const system = (doc.system ?? {}) as Record<string, unknown>
  const items = Array.isArray(doc.items) ? (doc.items as Array<Record<string, unknown>>) : []

  const levelRaw = (system.details as Record<string, unknown> | undefined)?.level as
    | Record<string, unknown>
    | undefined
  const level = typeof levelRaw?.value === 'number' ? levelRaw.value : 1

  // Ability mods: replay boosts (character docs ship system.abilities=null).
  const haveBaseMods = Object.values(baseAbilityMods).some((v) => v !== 0)
  const abilityMods = haveBaseMods ? baseAbilityMods : buildAbilityModsFromBoosts(raw)

  // HP — use the authored max on the character document.
  const attrs = (system.attributes ?? {}) as Record<string, unknown>
  const hpBlock = (attrs.hp ?? {}) as Record<string, unknown>
  const hp =
    typeof hpBlock.max === 'number'
      ? hpBlock.max
      : typeof hpBlock.value === 'number'
        ? hpBlock.value
        : 0

  // Class item carries the proficiency ranks for saves/perception/defenses/attacks.
  const classItem = items.find((it) => it?.type === 'class')
  const clsSystem = (classItem?.system ?? {}) as Record<string, unknown>
  const saves = (clsSystem.savingThrows ?? {}) as Record<string, unknown>
  const defenses = (clsSystem.defenses ?? {}) as Record<string, unknown>
  const attacks = (clsSystem.attacks ?? {}) as Record<string, unknown>
  const perceptionRank =
    typeof clsSystem.perception === 'number' ? (clsSystem.perception as number) : 0

  const fortRank = typeof saves.fortitude === 'number' ? (saves.fortitude as number) : 0
  const refRank = typeof saves.reflex === 'number' ? (saves.reflex as number) : 0
  const willRank = typeof saves.will === 'number' ? (saves.will as number) : 0

  // AC: pick the equipped armor (if any) for category + dexCap + acBonus.
  // Fall back to unarmored when absent.
  const armorItem = items.find((it) => it?.type === 'armor')
  const armorSystem = (armorItem?.system ?? {}) as Record<string, unknown>
  const armorCategory =
    typeof armorSystem.category === 'string' ? (armorSystem.category as string) : 'unarmored'
  const acBonus = typeof armorSystem.acBonus === 'number' ? (armorSystem.acBonus as number) : 0
  const dexCap =
    typeof armorSystem.dexCap === 'number' ? (armorSystem.dexCap as number) : Infinity
  const armorRank = typeof defenses[armorCategory] === 'number' ? (defenses[armorCategory] as number) : 0
  const dexForAc = Math.min(abilityMods.dex, dexCap)
  const ac = 10 + dexForAc + acBonus + profBonus(armorRank, level)

  const fort = level + abilityMods.con + profBonus(fortRank, level)
  const ref = level + abilityMods.dex + profBonus(refRank, level)
  const will = level + abilityMods.wis + profBonus(willRank, level)
  const perception = level + abilityMods.wis + profBonus(perceptionRank, level)

  // Strikes: synthesize one per weapon item. Use the weapon's category rank
  // from class.attacks (simple/martial/advanced/unarmed). Ability: STR for
  // melee, DEX for ranged or finesse/thrown traits.
  const strikes: CreatureStatBlockData['strikes'] = items
    .filter((it) => it?.type === 'weapon')
    .map((it) => {
      const wSys = (it.system ?? {}) as Record<string, unknown>
      const damage = (wSys.damage ?? {}) as Record<string, unknown>
      const die = typeof damage.die === 'string' ? (damage.die as string) : 'd4'
      const dice = typeof damage.dice === 'number' ? (damage.dice as number) : 1
      const damageType =
        typeof damage.damageType === 'string' ? (damage.damageType as string) : ''
      const runes = (wSys.runes ?? {}) as Record<string, unknown>
      const potency = typeof runes.potency === 'number' ? (runes.potency as number) : 0
      const striking = typeof runes.striking === 'number' ? (runes.striking as number) : 0
      const weaponCategory =
        typeof wSys.category === 'string' ? (wSys.category as string) : 'simple'
      const weaponRank =
        typeof attacks[weaponCategory] === 'number' ? (attacks[weaponCategory] as number) : 0
      const traits = Array.isArray((wSys.traits as Record<string, unknown> | undefined)?.value)
        ? ((wSys.traits as Record<string, unknown>).value as string[])
        : []
      const isRanged = typeof wSys.range === 'number' || traits.some((t) => /^range-/.test(t))
      const usesDex =
        isRanged || traits.includes('finesse') || traits.includes('thrown')
      const abilityMod = usesDex ? abilityMods.dex : abilityMods.str
      const attackMod = level + abilityMod + profBonus(weaponRank, level) + potency
      const diceCount = dice + striking
      const strDmgBonus = usesDex ? 0 : abilityMods.str
      const formula =
        strDmgBonus > 0
          ? `${diceCount}${die}+${strDmgBonus}`
          : strDmgBonus < 0
            ? `${diceCount}${die}${strDmgBonus}`
            : `${diceCount}${die}`
      const group = typeof wSys.group === 'string' ? (wSys.group as string) : undefined
      return {
        name: typeof it.name === 'string' ? (it.name as string) : 'Weapon',
        modifier: attackMod,
        damage: [{ formula, type: damageType }],
        traits,
        ...(group ? { group } : {}),
      }
    })

  return {
    abilityMods,
    strikes,
    base: { level, hp, ac, fort, ref, will, perception },
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

function formatDamage(damageRolls: Record<string, FoundryDamageRoll> | undefined | null): { formula: string; type: string }[] {
  if (!damageRolls) return []
  return Object.values(damageRolls).map((d) => ({
    formula: (d.damage || d.formula || '?').trim(),
    type: (d.damageType || d.type || '').trim(),
  }))
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
  //         @Check[will|dc:25]            → "DC 25 Will check"  (Foundry positional)
  //         @Check[dc:25]                 → "DC 25"             (no type at all)
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
