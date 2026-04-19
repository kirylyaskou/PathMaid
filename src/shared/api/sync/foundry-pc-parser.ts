// Shared Foundry PC parser — single source of truth for deriving PF2e
// computed stats from a Foundry `type: "character"` document.
//
// Consumed by:
//   - `buildPathbuilderFromFoundryPC` (writes PathbuilderBuild rows for the
//      Characters page + Combat PC panel).
//   - `derivePcStats` in entities/creature/model/mappers.ts (overlays numeric
//      stats on an iconic-as-NPC row in the bestiary / combat-as-NPC panel).
//
// Ground truth: Amiri (Level 1) Barbarian, PF2e Player Core rules.
//
// PF2e formula cheatsheet
//   ability_mod        = floor((score - 10) / 2)
//   prof_mod(rank)     = rank > 0 ? level + rank*2 : 0
//   save               = ability_mod + prof_mod(saveRank)
//   perception         = wis_mod + prof_mod(perceptionRank)
//   ac                 = 10 + min(dex_mod, dexCap) + armor.acBonus + prof_mod(armorRank)
//   strike attack      = ability_mod + prof_mod(weaponRank) + potency
//     where ability = STR for melee; DEX for ranged unless finesse/thrown
//     damage uses STR for melee + thrown; 0 for pure ranged
//
// Boost replay (level-1 creation only)
//   start all 6 abilities at score 10.
//   apply each boost from:
//     ancestry.system.boosts.{idx}.selected
//     background.system.boosts.{idx}.selected
//     class.system.keyAbility.value[0]
//     system.build.attributes.boosts.1[]  (4 free boosts at creation)
//   each boost = +2 if score < 18, else +1. flaws = -2.
//   No two boosts inside the SAME stage to the same ability (PF2e creation
//   rule) — the selected values already encode this, so we just apply them
//   as-is.

// ─── Types ─────────────────────────────────────────────────────────────────

export interface FoundryPcItem {
  _id?: string
  name?: string
  type?: string
  system?: Record<string, unknown>
}

export interface FoundryPcDoc {
  _id?: string
  name?: string
  type?: string
  items?: FoundryPcItem[]
  system?: Record<string, unknown>
}

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface ParsedAbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface ParsedProficiencies {
  // Save / perception / class DC ranks (0..4).
  perception: number
  fortitude: number
  reflex: number
  will: number
  classDC: number
  // Armor ranks.
  unarmored: number
  light: number
  medium: number
  heavy: number
  // Weapon ranks.
  simple: number
  martial: number
  advanced: number
  unarmed: number
  // Spell casting (not used for iconics — all 0 for now).
  castingArcane: number
  castingDivine: number
  castingOccult: number
  castingPrimal: number
}

export interface ParsedWeapon {
  name: string
  qty: number
  category: string // 'simple' | 'martial' | 'advanced' | 'unarmed'
  die: string // e.g. 'd6', 'd8'
  diceCount: number // typically 1 before striking runes
  damageType: string
  potency: number
  striking: number // 0|1|2|3 → dice count adjustment
  runes: string[] // property runes
  traits: string[]
  range: number | null // ranged thrown distance; null for melee
  group?: string
  bonus: number // flat attack bonus (system.bonus.value)
  bonusDamage: number // flat damage bonus (system.bonusDamage.value)
}

export interface ParsedArmor {
  name: string
  qty: number
  category: string // 'unarmored' | 'light' | 'medium' | 'heavy'
  acBonus: number
  dexCap: number // Infinity when no cap (unarmored)
  checkPenalty: number
  speedPenalty: number
  strength: number | null // minimum strength score
  inSlot: boolean
  potency: number
  resilient: string
  runes: string[]
}

export interface ParsedStrike {
  name: string
  attackMod: number
  damageFormula: string // e.g. '1d8+4'
  damageDie: string
  diceCount: number
  damageBonus: number
  damageType: string
  traits: string[]
  category: string
  isRanged: boolean
  range: number | null
  reach: number // feet (melee or thrown; ranged always 0)
  group?: string
}

export interface ParsedPc {
  name: string
  level: number
  className: string
  classHp: number // class HP per level (system.hp on the class item)
  classKeyAbility: AbilityKey | null
  ancestryName: string
  ancestryHp: number
  ancestrySize: string // 'sm' | 'med' | 'lg' | ...
  ancestryReach: number // feet
  ancestrySpeed: number
  ancestryLanguages: string[]
  heritageName: string
  backgroundName: string
  backgroundLoreSkills: string[]
  trainedSkills: string[] // all skills at rank >= 1
  abilities: ParsedAbilityScores
  proficiencies: ParsedProficiencies
  skills: Record<string, number> // skillSlug → rank (0..4)
  hp: number
  ac: number
  acBreakdown: { profBonus: number; abilityBonus: number; itemBonus: number }
  fortitude: number
  reflex: number
  will: number
  perception: number
  speed: number
  languages: string[]
  size: string
  reach: number
  weapons: ParsedWeapon[]
  armor: ParsedArmor[]
  equippedArmor: ParsedArmor | null
  consumables: Array<{ name: string; qty: number }>
  equipment: Array<{ name: string; qty: number }>
  strikes: ParsedStrike[]
}

// ─── Utilities ─────────────────────────────────────────────────────────────

const ABILITY_KEYS: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

/** PF2e prof mod: 0 if untrained, else level + rank*2. */
export function profMod(rank: number, level: number): number {
  if (!rank || rank <= 0) return 0
  return level + rank * 2
}

function asNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function asString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string')
}

function getPath(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj
  for (const key of path) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

function pickItem(items: FoundryPcItem[], type: string): FoundryPcItem | undefined {
  return items.find((it) => it?.type === type)
}

function pickAllItems(items: FoundryPcItem[], type: string): FoundryPcItem[] {
  return items.filter((it) => it?.type === type)
}

/** Collect `selected` values from a Foundry boost/flaw map. */
function collectSelected(boostMap: unknown): AbilityKey[] {
  if (!boostMap || typeof boostMap !== 'object') return []
  const out: AbilityKey[] = []
  for (const entry of Object.values(boostMap as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue
    const sel = (entry as Record<string, unknown>).selected
    if (typeof sel === 'string' && ABILITY_KEYS.includes(sel as AbilityKey)) {
      out.push(sel as AbilityKey)
    }
  }
  return out
}

function applyBoost(scores: ParsedAbilityScores, key: AbilityKey): void {
  scores[key] = scores[key] < 18 ? scores[key] + 2 : scores[key] + 1
}

function applyFlaw(scores: ParsedAbilityScores, key: AbilityKey): void {
  scores[key] = scores[key] - 2
}

/** Base reach from creature size — PF2e CRB. */
function baseReachForSize(size: string): number {
  switch (size) {
    case 'tiny':
      return 0
    case 'sm':
    case 'med':
      return 5
    case 'lg':
      return 10
    case 'huge':
      return 15
    case 'grg':
      return 20
    default:
      return 5
  }
}

/**
 * Reach for a weapon/strike.
 * - Ranged/thrown strikes: reach is 0 (range takes over).
 * - Melee weapons with "reach-N" trait: absolute N feet.
 * - Melee weapons with bare "reach" trait: base + 5.
 * - Plain melee: base reach for creature size.
 * - Optional `reachBonus` adds an active-buff delta (e.g. Enlarge +5/+10) on
 *   top of the resolved reach. Passing 0 or omitting leaves the formula
 *   unchanged. Bonus is additive per ground truth even for reach-N absolute
 *   overrides (user's umbral-dragon claw + Enlarge case).
 */
export function getStrikeReach(
  traits: string[],
  isRanged: boolean,
  baseReach: number,
  reachBonus = 0,
): number {
  if (isRanged) return 0
  let reach = baseReach
  // "reach-10", "reach-15", "reach-20" — absolute (ignores creature base).
  let absolute: number | null = null
  for (const t of traits) {
    const m = /^reach-(\d+)$/.exec(t)
    if (m) {
      absolute = parseInt(m[1], 10)
      break
    }
  }
  if (absolute !== null) {
    reach = absolute
  } else if (traits.includes('reach')) {
    reach = baseReach + 5
  }
  return reach + reachBonus
}

// ─── Extraction (per item) ─────────────────────────────────────────────────

function parseWeapon(it: FoundryPcItem): ParsedWeapon {
  const sys = (it.system ?? {}) as Record<string, unknown>
  const damage = (sys.damage ?? {}) as Record<string, unknown>
  const runes = (sys.runes ?? {}) as Record<string, unknown>
  const traitsObj = (sys.traits ?? {}) as Record<string, unknown>
  const bonus = (sys.bonus ?? {}) as Record<string, unknown>
  const bonusDamage = (sys.bonusDamage ?? {}) as Record<string, unknown>
  return {
    name: asString(it.name, 'Unknown Weapon'),
    qty: asNumber(sys.quantity, 1),
    category: asString(sys.category, 'simple'),
    die: asString(damage.die, 'd4'),
    diceCount: asNumber(damage.dice, 1),
    damageType: asString(damage.damageType, 'bludgeoning'),
    potency: asNumber(runes.potency, 0),
    striking: asNumber(runes.striking, 0),
    runes: asStringArray(runes.property),
    traits: asStringArray(traitsObj.value),
    range: typeof sys.range === 'number' ? sys.range : null,
    group: asString(sys.group, ''),
    bonus: asNumber(bonus.value, 0),
    bonusDamage: asNumber(bonusDamage.value, 0),
  }
}

function parseArmor(it: FoundryPcItem): ParsedArmor {
  const sys = (it.system ?? {}) as Record<string, unknown>
  const runes = (sys.runes ?? {}) as Record<string, unknown>
  const equipped = (sys.equipped ?? {}) as Record<string, unknown>
  const dexCapRaw = sys.dexCap
  return {
    name: asString(it.name, 'Unknown Armor'),
    qty: asNumber(sys.quantity, 1),
    category: asString(sys.category, 'unarmored'),
    acBonus: asNumber(sys.acBonus, 0),
    dexCap:
      typeof dexCapRaw === 'number' && Number.isFinite(dexCapRaw)
        ? dexCapRaw
        : Infinity,
    checkPenalty: asNumber(sys.checkPenalty, 0),
    speedPenalty: asNumber(sys.speedPenalty, 0),
    strength:
      typeof sys.strength === 'number' && Number.isFinite(sys.strength)
        ? (sys.strength as number)
        : null,
    inSlot: equipped.inSlot === true,
    potency: asNumber(runes.potency, 0),
    resilient: asString(runes.resilient, ''),
    runes: asStringArray(runes.property),
  }
}

// ─── Main parser ──────────────────────────────────────────────────────────

/**
 * Parse a Foundry character doc into computed PF2e stats.
 * Returns null if the record is not a playable character.
 */
export function parseFoundryCharacterDoc(raw: unknown): ParsedPc | null {
  if (!raw || typeof raw !== 'object') return null
  const doc = raw as FoundryPcDoc
  if (doc.type !== 'character') return null
  const name = asString(doc.name, '').trim()
  if (!name) return null

  const system = (doc.system ?? {}) as Record<string, unknown>
  const items = Array.isArray(doc.items) ? doc.items : []

  const level = asNumber(
    getPath(system, ['details', 'level', 'value']),
    1
  )

  // ── Items by type ────────────────────────────────────────────────────
  const ancestryItem = pickItem(items, 'ancestry')
  const backgroundItem = pickItem(items, 'background')
  const classItem = pickItem(items, 'class')
  const heritageItem = pickItem(items, 'heritage')

  const ancestrySys = (ancestryItem?.system ?? {}) as Record<string, unknown>
  const backgroundSys = (backgroundItem?.system ?? {}) as Record<string, unknown>
  const classSys = (classItem?.system ?? {}) as Record<string, unknown>

  const ancestryName = asString(ancestryItem?.name, '')
  const className = asString(classItem?.name, '')
  const heritageName = asString(heritageItem?.name, '')
  const backgroundName = asString(backgroundItem?.name, '')

  // ── Ability scores: boost replay ─────────────────────────────────────
  // Fast path — system.abilities present and populated (rare on iconics).
  const systemAbilities = system.abilities as
    | Record<string, { mod?: number } | null>
    | null
    | undefined
  const abilities: ParsedAbilityScores = {
    str: 10,
    dex: 10,
    con: 10,
    int: 10,
    wis: 10,
    cha: 10,
  }
  let abilitiesFromFastPath = false
  if (systemAbilities && typeof systemAbilities === 'object') {
    for (const k of ABILITY_KEYS) {
      const entry = systemAbilities[k]
      if (entry && typeof entry === 'object' && typeof entry.mod === 'number') {
        abilities[k] = 10 + entry.mod * 2
        abilitiesFromFastPath = true
      }
    }
  }
  if (!abilitiesFromFastPath) {
    // 1. Ancestry boosts + flaws.
    for (const b of collectSelected(ancestrySys.boosts)) applyBoost(abilities, b)
    for (const f of collectSelected(ancestrySys.flaws)) applyFlaw(abilities, f)
    // 2. Background boosts.
    for (const b of collectSelected(backgroundSys.boosts)) applyBoost(abilities, b)
    // 3. Class key ability boost (+2).
    const classKey = asStringArray(
      getPath(classSys, ['keyAbility', 'value'])
    )[0] as AbilityKey | undefined
    if (classKey && ABILITY_KEYS.includes(classKey)) {
      applyBoost(abilities, classKey)
    }
    // 4. Build-attributes free boosts: system.build.attributes.boosts is a
    //    map keyed by level-index (creation under "1", later boosts at 5/10/…).
    const buildBoostMap = getPath(system, ['build', 'attributes', 'boosts']) as
      | Record<string, unknown>
      | undefined
    if (buildBoostMap && typeof buildBoostMap === 'object') {
      for (const val of Object.values(buildBoostMap)) {
        if (Array.isArray(val)) {
          for (const stat of val) {
            if (
              typeof stat === 'string' &&
              ABILITY_KEYS.includes(stat as AbilityKey)
            ) {
              applyBoost(abilities, stat as AbilityKey)
            }
          }
        }
      }
    }
  }

  // ── Proficiencies from class ─────────────────────────────────────────
  const classSaves = (classSys.savingThrows ?? {}) as Record<string, unknown>
  const classDefenses = (classSys.defenses ?? {}) as Record<string, unknown>
  const classAttacks = (classSys.attacks ?? {}) as Record<string, unknown>
  const proficiencies: ParsedProficiencies = {
    perception: asNumber(classSys.perception, 0),
    fortitude: asNumber(classSaves.fortitude, 0),
    reflex: asNumber(classSaves.reflex, 0),
    will: asNumber(classSaves.will, 0),
    classDC: 1, // trained at level 1 (PF2e default)
    unarmored: asNumber(classDefenses.unarmored, 0),
    light: asNumber(classDefenses.light, 0),
    medium: asNumber(classDefenses.medium, 0),
    heavy: asNumber(classDefenses.heavy, 0),
    simple: asNumber(classAttacks.simple, 0),
    martial: asNumber(classAttacks.martial, 0),
    advanced: asNumber(classAttacks.advanced, 0),
    unarmed: asNumber(classAttacks.unarmed, 0),
    castingArcane: 0,
    castingDivine: 0,
    castingOccult: 0,
    castingPrimal: 0,
  }

  // Class DC only exists if class was picked.
  if (!classItem) proficiencies.classDC = 0

  // ── Skills: class-trained + background-trained + system.skills.X.rank ─
  const classTrained = asStringArray(
    getPath(classSys, ['trainedSkills', 'value'])
  )
  const bgTrained = asStringArray(
    getPath(backgroundSys, ['trainedSkills', 'value'])
  )
  const bgLore = asStringArray(
    getPath(backgroundSys, ['trainedSkills', 'lore'])
  )
  const ALL_SKILLS = [
    'acrobatics',
    'arcana',
    'athletics',
    'crafting',
    'deception',
    'diplomacy',
    'intimidation',
    'medicine',
    'nature',
    'occultism',
    'performance',
    'religion',
    'society',
    'stealth',
    'survival',
    'thievery',
  ]
  const skills: Record<string, number> = {}
  const systemSkills = (system.skills ?? {}) as Record<string, unknown>
  for (const slug of ALL_SKILLS) {
    const sysEntry = systemSkills[slug] as { rank?: unknown } | undefined
    let rank = 0
    if (sysEntry && typeof sysEntry === 'object' && typeof sysEntry.rank === 'number') {
      rank = sysEntry.rank
    }
    // Class-trained / background-trained elevate to at least rank 1.
    if (rank < 1 && (classTrained.includes(slug) || bgTrained.includes(slug))) {
      rank = 1
    }
    skills[slug] = rank
  }
  const trainedSkills = Object.entries(skills)
    .filter(([, r]) => r >= 1)
    .map(([k]) => k)

  // ── HP ───────────────────────────────────────────────────────────────
  const ancestryHp = asNumber(ancestrySys.hp, 8)
  const classHp = asNumber(classSys.hp, 8)
  const authoredHpValue = asNumber(
    getPath(system, ['attributes', 'hp', 'value']),
    NaN
  )
  const authoredHpMax = asNumber(
    getPath(system, ['attributes', 'hp', 'max']),
    NaN
  )
  const authoredHp = Number.isFinite(authoredHpMax)
    ? authoredHpMax
    : Number.isFinite(authoredHpValue)
      ? authoredHpValue
      : NaN
  const conMod = abilityMod(abilities.con)
  const computedHp = ancestryHp + (classHp + conMod) * level
  const hp = Number.isFinite(authoredHp) ? authoredHp : computedHp

  // ── Armor / AC ───────────────────────────────────────────────────────
  const allArmor = pickAllItems(items, 'armor').map(parseArmor)
  const equippedArmor = allArmor.find((a) => a.inSlot) ?? null
  const armorRank = equippedArmor
    ? proficiencies[
        equippedArmor.category as 'light' | 'medium' | 'heavy' | 'unarmored'
      ] ?? 0
    : proficiencies.unarmored
  const acItemBonus = equippedArmor?.acBonus ?? 0
  const dexCap = equippedArmor?.dexCap ?? Infinity
  const dexForAc = Math.min(abilityMod(abilities.dex), dexCap)
  const acProfBonus = profMod(armorRank, level)
  const acAbilityBonus = dexForAc
  const ac = 10 + acAbilityBonus + acItemBonus + acProfBonus

  // ── Saves / Perception ──────────────────────────────────────────────
  const fortitude =
    abilityMod(abilities.con) + profMod(proficiencies.fortitude, level)
  const reflex =
    abilityMod(abilities.dex) + profMod(proficiencies.reflex, level)
  const will =
    abilityMod(abilities.wis) + profMod(proficiencies.will, level)
  const perception =
    abilityMod(abilities.wis) + profMod(proficiencies.perception, level)

  // ── Languages / Size / Reach / Speed ────────────────────────────────
  const ancestryLanguages = asStringArray(
    getPath(ancestrySys, ['languages', 'value'])
  )
  const detailsLanguages = asStringArray(
    getPath(system, ['details', 'languages', 'value'])
  )
  const languages = Array.from(
    new Set([...ancestryLanguages, ...detailsLanguages])
  )
  const size = asString(ancestrySys.size, 'med')
  const ancestryReach = asNumber(ancestrySys.reach, baseReachForSize(size))
  const ancestrySpeed = asNumber(ancestrySys.speed, 25)
  const speed = ancestrySpeed

  // ── Weapons / Strikes ───────────────────────────────────────────────
  const weapons = pickAllItems(items, 'weapon').map(parseWeapon)
  const WEAPON_PROF: Record<string, keyof ParsedProficiencies> = {
    simple: 'simple',
    martial: 'martial',
    advanced: 'advanced',
    unarmed: 'unarmed',
  }
  const strMod = abilityMod(abilities.str)
  const dexMod = abilityMod(abilities.dex)
  const strikes: ParsedStrike[] = weapons.map((w) => {
    const profKey = WEAPON_PROF[w.category] ?? 'simple'
    const rank = proficiencies[profKey]
    const isThrown = w.traits.includes('thrown')
    const isRanged = (w.range !== null && !isThrown) || isThrown
    // Attack ability: DEX for ranged + thrown + finesse, else STR.
    const usesDexForAttack =
      isRanged || w.traits.includes('finesse') || isThrown
    const attackAbilityMod = usesDexForAttack ? dexMod : strMod
    const attackMod =
      attackAbilityMod + profMod(rank, level) + w.potency + w.bonus

    // Damage ability: STR for melee + thrown; 0 for pure ranged.
    const isPureRanged = isRanged && !isThrown
    const damageBonus = (isPureRanged ? 0 : strMod) + w.bonusDamage
    const diceCount = w.diceCount + w.striking
    const damageFormula =
      damageBonus > 0
        ? `${diceCount}${w.die}+${damageBonus}`
        : damageBonus < 0
          ? `${diceCount}${w.die}${damageBonus}`
          : `${diceCount}${w.die}`

    const strikeReach = getStrikeReach(w.traits, isRanged, ancestryReach)

    const group = w.group && w.group.length > 0 ? w.group : undefined

    return {
      name: w.name,
      attackMod,
      damageFormula,
      damageDie: w.die,
      diceCount,
      damageBonus,
      damageType: w.damageType,
      traits: w.traits,
      category: w.category,
      isRanged,
      range: w.range,
      reach: strikeReach,
      ...(group ? { group } : {}),
    }
  })

  // ── Inventory (consumable / equipment / backpack / treasure) ────────
  const consumables = pickAllItems(items, 'consumable').map((it) => {
    const sys = (it.system ?? {}) as Record<string, unknown>
    return {
      name: asString(it.name, 'Unknown Item'),
      qty: asNumber(sys.quantity, 1),
    }
  })
  const equipment = [
    ...pickAllItems(items, 'equipment'),
    ...pickAllItems(items, 'backpack'),
    ...pickAllItems(items, 'treasure'),
  ].map((it) => {
    const sys = (it.system ?? {}) as Record<string, unknown>
    return {
      name: asString(it.name, 'Unknown Item'),
      qty: asNumber(sys.quantity, 1),
    }
  })

  // ── classKeyAbility resolution (typed) ──────────────────────────────
  const classKeyAbilityRaw = asStringArray(
    getPath(classSys, ['keyAbility', 'value'])
  )[0]
  const classKeyAbility =
    classKeyAbilityRaw && ABILITY_KEYS.includes(classKeyAbilityRaw as AbilityKey)
      ? (classKeyAbilityRaw as AbilityKey)
      : null

  return {
    name,
    level,
    className,
    classHp,
    classKeyAbility,
    ancestryName,
    ancestryHp,
    ancestrySize: size,
    ancestryReach,
    ancestrySpeed,
    ancestryLanguages,
    heritageName,
    backgroundName,
    backgroundLoreSkills: bgLore,
    trainedSkills,
    abilities,
    proficiencies,
    skills,
    hp,
    ac,
    acBreakdown: {
      profBonus: acProfBonus,
      abilityBonus: acAbilityBonus,
      itemBonus: acItemBonus,
    },
    fortitude,
    reflex,
    will,
    perception,
    speed,
    languages,
    size,
    reach: ancestryReach,
    weapons,
    armor: allArmor,
    equippedArmor,
    consumables,
    equipment,
    strikes,
  }
}
