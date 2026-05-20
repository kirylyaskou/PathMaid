import {
  abilityModifier,
  calculatePCMaxHP,
  proficiencyModifier,
  SKILL_ABILITY,
} from '@engine'
import type { PathbuilderBuild, PathbuilderProficiencies } from '@engine'
import type { CreatureStatBlockData } from '@/entities/creature'
import { getFeatByName, getSpellByName } from '@/shared/api'

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
    const dice = STRIKING_DICE[weapon.str] ?? 1
    const strMod = abilityMods.str
    const bonus = strMod === 0 ? '' : strMod > 0 ? `+${strMod}` : String(strMod)
    return {
      name: weapon.name,
      modifier: attackMod,
      damage: [{
        formula: `${dice}${weapon.die}${bonus}`,
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
  }
}
