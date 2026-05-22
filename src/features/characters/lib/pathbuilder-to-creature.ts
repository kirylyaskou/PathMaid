import {
  abilityModifier,
  calculatePCMaxHP,
  proficiencyModifier,
  SKILL_ABILITY,
} from '@engine'
import type { PathbuilderBuild, PathbuilderProficiencies } from '@engine'
import { formatEquipmentDamageFormula, type CreatureStatBlockData } from '@/entities/creature'
import { getFeatByName, getItemByName, getSpellByName, type ItemRow } from '@/shared/api'

const WEAPON_PROF_MAP: Record<string, keyof PathbuilderProficiencies> = {
  simple: 'simple',
  martial: 'martial',
  advanced: 'advanced',
  unarmed: 'unarmed',
}

const STRIKING_DICE: Record<string, number> = {
  striking: 2,
  greaterStriking: 3,
  majorStriking: 4,
}

function titleCase(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1)
}

function normalizeCastType(input: string): string {
  const value = input.toLowerCase()
  if (value.includes('focus')) return 'focus'
  if (value.includes('innate')) return 'innate'
  if (value.includes('spontaneous')) return 'spontaneous'
  return 'prepared'
}

function slugify(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'item'
}

function pathbuilderWeaponDamageFormula(
  weapon: PathbuilderBuild['weapons'][number],
  strMod: number,
): string {
  const dice = STRIKING_DICE[weapon.str] ?? 1
  const bonus = strMod === 0 ? '' : strMod > 0 ? `+${strMod}` : String(strMod)
  return `${dice}${weapon.die}${bonus}`
}

function catalogTraitsOrRunes(item: ItemRow | null, runes: string[]): string | null {
  if (item?.traits) return item.traits
  return runes.length > 0 ? JSON.stringify(runes) : null
}

async function findCatalogItem(name: string): Promise<ItemRow | null> {
  return getItemByName(name).catch(() => null)
}

async function buildEquipment(
  build: PathbuilderBuild,
  strMod: number,
): Promise<CreatureStatBlockData['equipment']> {
  const equipment: NonNullable<CreatureStatBlockData['equipment']> = []
  const seenNames = new Set<string>()
  let sortOrder = 0

  for (const [index, weapon] of (build.weapons ?? []).entries()) {
    const catalog = await findCatalogItem(weapon.name)
    seenNames.add(weapon.name.toLowerCase())
    equipment.push({
      id: `pathbuilder-weapon-${index}-${slugify(weapon.name)}`,
      creature_id: '',
      item_name: weapon.name,
      item_type: catalog?.item_type ?? 'weapon',
      foundry_item_id: catalog?.id ?? null,
      quantity: weapon.qty ?? 1,
      bulk: catalog?.bulk ?? null,
      damage_formula:
        formatEquipmentDamageFormula(catalog?.damage_formula, catalog?.damage_type, catalog?.description) ??
        formatEquipmentDamageFormula(pathbuilderWeaponDamageFormula(weapon, strMod), weapon.damageType),
      ac_bonus: catalog?.ac_bonus ?? null,
      traits: catalogTraitsOrRunes(catalog, weapon.runes ?? []),
      sort_order: sortOrder,
    })
    sortOrder += 1
  }

  for (const [index, armor] of (build.armor ?? []).entries()) {
    const catalog = await findCatalogItem(armor.name)
    seenNames.add(armor.name.toLowerCase())
    equipment.push({
      id: `pathbuilder-armor-${index}-${slugify(armor.name)}`,
      creature_id: '',
      item_name: armor.name,
      item_type: catalog?.item_type ?? 'armor',
      foundry_item_id: catalog?.id ?? null,
      quantity: armor.qty ?? 1,
      bulk: catalog?.bulk ?? null,
      damage_formula: catalog?.damage_formula ?? null,
      ac_bonus: catalog?.ac_bonus ?? null,
      traits: catalogTraitsOrRunes(catalog, armor.runes ?? []),
      sort_order: sortOrder,
    })
    sortOrder += 1
  }

  for (const [index, entry] of (build.equipment ?? []).entries()) {
    const [name, quantity] = entry
    if (!name || seenNames.has(name.toLowerCase())) continue
    const catalog = await findCatalogItem(name)
    equipment.push({
      id: `pathbuilder-equipment-${index}-${slugify(name)}`,
      creature_id: '',
      item_name: name,
      item_type: catalog?.item_type ?? 'equipment',
      foundry_item_id: catalog?.id ?? null,
      quantity: quantity ?? 1,
      bulk: catalog?.bulk ?? null,
      damage_formula: catalog?.damage_formula ?? null,
      ac_bonus: catalog?.ac_bonus ?? null,
      traits: catalog?.traits ?? null,
      sort_order: sortOrder,
    })
    sortOrder += 1
  }

  return equipment
}

async function buildAbilityCards(build: PathbuilderBuild): Promise<CreatureStatBlockData['abilities']> {
  const cards: CreatureStatBlockData['abilities'] = []
  const seen = new Set<string>()
  for (const name of build.specials ?? []) {
    if (!name || seen.has(name)) continue
    seen.add(name)
    const feat = await getFeatByName(name).catch(() => null)
    let description = ''
    let traits: string[] = []
    if (feat) {
      try {
        const raw = JSON.parse(feat.raw_json) as {
          system?: {
            description?: { value?: string }
            traits?: { value?: string[] }
          }
        }
        description = raw.system?.description?.value ?? ''
        traits = raw.system?.traits?.value ?? []
      } catch {
        description = ''
        traits = []
      }
    }
    cards.push({
      id: feat?.id,
      name,
      description,
      traits,
    })
  }
  return cards
}

async function buildSpellcasting(
  build: PathbuilderBuild,
  spellAttackFallback?: number,
): Promise<CreatureStatBlockData['spellcasting']> {
  const sections: NonNullable<CreatureStatBlockData['spellcasting']> = []
  const spellIdCache = new Map<string, string | null>()
  for (const [casterIndex, caster] of (build.spellCasters ?? []).entries()) {
    const abilityKey = caster.ability as keyof typeof build.abilities
    const spellAttack = abilityKey
      ? proficiencyModifier(caster.proficiency, build.abilities[abilityKey], build.level)
      : (spellAttackFallback ?? 0)
    const entryId = `pathbuilder-caster-${casterIndex}`
    const spellsByRank = []
    for (const group of caster.spells ?? []) {
      const spells = []
      for (const name of group.list ?? []) {
        const trimmed = name.trim()
        if (!trimmed) continue
        if (!spellIdCache.has(trimmed)) {
          const row = await getSpellByName(trimmed).catch(() => null)
          spellIdCache.set(trimmed, row?.id ?? null)
        }
        spells.push({
          name: trimmed,
          foundryId: spellIdCache.get(trimmed) ?? null,
          entryId,
        })
      }
      if (spells.length === 0 && (caster.perDay?.[group.spellLevel] ?? 0) <= 0) continue
      spellsByRank.push({
        rank: group.spellLevel,
        slots: caster.perDay?.[group.spellLevel] ?? 0,
        spells,
      })
    }
    sections.push({
      entryId,
      entryName: `${titleCase(caster.magicTradition.toLowerCase())} ${titleCase(normalizeCastType(caster.spellcastingType))} Spells`,
      tradition: caster.magicTradition.toLowerCase(),
      castType: normalizeCastType(caster.spellcastingType),
      spellDc: 10 + spellAttack,
      spellAttack,
      spellsByRank,
    })
  }
  return sections
}

export async function pathbuilderToCreatureStatBlock(build: PathbuilderBuild): Promise<CreatureStatBlockData> {
  const { abilities, proficiencies, level } = build
  const abilityMods = {
    str: abilityModifier(abilities.str),
    dex: abilityModifier(abilities.dex),
    con: abilityModifier(abilities.con),
    int: abilityModifier(abilities.int),
    wis: abilityModifier(abilities.wis),
    cha: abilityModifier(abilities.cha),
  }
  const hp = calculatePCMaxHP(build)
  const ac = 10 + (build.acTotal?.acProfBonus ?? 0) + (build.acTotal?.acAbilityBonus ?? 0) + (build.acTotal?.acItemBonus ?? 0)

  const skills: CreatureStatBlockData['skills'] = Object.entries(SKILL_ABILITY).map(([name, ability]) => {
    const prof = (proficiencies as unknown as Record<string, number>)[name] ?? 0
    return {
      name: titleCase(name),
      modifier: proficiencyModifier(prof, abilities[ability], level),
      calculated: prof === 0,
    }
  })
  for (const [name, prof] of build.lores ?? []) {
    skills.push({
      name: `${name} Lore`,
      modifier: proficiencyModifier(prof, abilities.int, level),
      calculated: false,
    })
  }

  const strikes: CreatureStatBlockData['strikes'] = (build.weapons ?? []).map((weapon) => {
    const profKey = WEAPON_PROF_MAP[weapon.prof] ?? 'simple'
    const prof = proficiencies[profKey] ?? 0
    const attackMod = proficiencyModifier(prof, abilities.str, level) + (weapon.pot ?? 0)
    return {
      name: weapon.name,
      modifier: attackMod,
      damage: [{
        formula: pathbuilderWeaponDamageFormula(weapon, abilityMods.str),
        type: weapon.damageType || 'untyped',
      }],
      traits: weapon.runes ?? [],
      group: weapon.prof,
      reach: 5,
    }
  })

  const maxCastingProf = Math.max(
    proficiencies.castingArcane ?? 0,
    proficiencies.castingDivine ?? 0,
    proficiencies.castingOccult ?? 0,
    proficiencies.castingPrimal ?? 0,
  )
  const spellAbility = build.spellCasters?.[0]?.ability as keyof typeof abilities | undefined
  const spellAttack = spellAbility
    ? proficiencyModifier(maxCastingProf, abilities[spellAbility], level)
    : undefined
  const [abilityCards, spellcasting] = await Promise.all([
    buildAbilityCards(build),
    buildSpellcasting(build, spellAttack),
  ])
  const equipment = await buildEquipment(build, abilityMods.str)

  return {
    id: '',
    name: build.name,
    level,
    hp,
    ac,
    fort: proficiencyModifier(proficiencies.fortitude, abilities.con, level),
    ref: proficiencyModifier(proficiencies.reflex, abilities.dex, level),
    will: proficiencyModifier(proficiencies.will, abilities.wis, level),
    perception: proficiencyModifier(proficiencies.perception, abilities.wis, level),
    stealth: skills.find((skill) => skill.name === 'Stealth')?.modifier ?? null,
    rarity: 'common',
    size: 'Medium',
    type: 'pc',
    traits: build.traits ?? [],
    abilityMods,
    immunities: [],
    weaknesses: [],
    resistances: (build.resistances ?? []) as CreatureStatBlockData['resistances'],
    speeds: { land: (build.attributes?.speed ?? 25) + (build.attributes?.speedBonus ?? 0) },
    strikes,
    abilities: abilityCards,
    skills,
    languages: build.languages ?? [],
    senses: (build.specials ?? []).filter((name) => /vision/i.test(name)),
    description: `${build.ancestry} ${build.class}`,
    source: 'Pathbuilder',
    spellDC: spellAttack != null ? 10 + spellAttack : undefined,
    spellcasting,
    classDC: proficiencies.classDC > 0
      ? 10 + level + proficiencies.classDC + abilityMods.str
      : undefined,
    auras: [],
    rituals: [],
    equipment,
  }
}
