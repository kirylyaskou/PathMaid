/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Rarity } from '@engine'
import type { CreatureRow } from '@/shared/api'
import { mapSize } from '@/shared/lib/size-map'
import { parseJsonArray } from '@/shared/lib/json'
import type { Creature, CreatureStatBlockData, DisplayActionCost } from './types'

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
function asArray(val: unknown): any[] {
  return Array.isArray(val) ? val : []
}

export function toCreatureStatBlockData(row: CreatureRow): CreatureStatBlockData {
  const base = toCreature(row)
  const raw = JSON.parse(row.raw_json)
  const system = raw.system || {}
  const details = system.details || {}

  const immunities: string[] = asArray(system.attributes?.immunities).map(
    (i: any) => i.type || String(i)
  )
  const weaknesses = asArray(system.attributes?.weaknesses).map((w: any) => ({
    type: w.type || String(w),
    value: w.value ?? 0,
  }))
  const resistances = asArray(system.attributes?.resistances).map((r: any) => ({
    type: r.type || String(r),
    value: r.value ?? 0,
  }))

  const speedData = system.attributes?.speed || {}
  const speeds: Record<string, number | null> = { land: speedData.value ?? null }
  if (Array.isArray(speedData.otherSpeeds)) {
    for (const s of speedData.otherSpeeds) {
      if (s.type && s.value != null) speeds[s.type] = s.value
    }
  } else if (speedData.otherSpeeds && typeof speedData.otherSpeeds === 'object') {
    for (const [key, val] of Object.entries(speedData.otherSpeeds)) {
      if (typeof val === 'object' && val !== null && 'value' in val) {
        speeds[key] = (val as any).value ?? null
      }
    }
  }

  const items = asArray(raw.items)
  // Build weapon lookup for resolving group from linked weapon items
  const weaponsById = new Map<string, any>(
    items.filter((item: any) => item.type === 'weapon').map((item: any) => [item._id, item])
  )
  const strikes = items
    .filter((item: any) => item.type === 'melee' || item.type === 'ranged')
    .map((item: any) => {
      const linkedWeaponId = item.flags?.pf2e?.linkedWeapon
      const linkedWeapon = linkedWeaponId ? weaponsById.get(linkedWeaponId) : undefined
      const group = (linkedWeapon?.system?.group as string) || undefined
      return {
        name: item.name || 'Strike',
        modifier: item.system?.bonus?.value ?? 0,
        damage: formatDamage(item.system?.damageRolls),
        traits: asArray(item.system?.traits?.value) as string[],
        group,
      }
    })

  const abilities = items
    .filter((item: any) => item.type === 'action')
    .map((item: any) => ({
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
      .filter(([, v]: [string, any]) => v && typeof v.base === 'number')
      .map(([k, v]: [string, any]) => [k, v.base as number])
  )

  // All 17 standard skills — use Foundry value if present, else derive from level
  const standardSkills = STANDARD_SKILLS.map((key) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    modifier: foundrySkills.has(key) ? foundrySkills.get(key)! : base.level,
    calculated: !foundrySkills.has(key),
  }))

  // Lore skills — any Foundry skill keys not in STANDARD_SKILLS
  const loreSkills = Object.entries(skillsObj)
    .filter(([k, v]: [string, any]) => !STANDARD_SKILLS.includes(k) && v && typeof v.base === 'number')
    .map(([k, v]: [string, any]) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      modifier: v.base as number,
      calculated: false as const,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const skills = [...standardSkills, ...loreSkills]

  const languages: string[] = asArray(details.languages?.value ?? system.traits?.languages?.value)
  const senseData = system.perception?.senses || system.traits?.senses || []
  const senses: string[] = Array.isArray(senseData)
    ? senseData.map((s: any) => (typeof s === 'string' ? s : s.type || String(s)))
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

  return {
    ...base,
    immunities,
    weaknesses,
    resistances,
    speeds,
    strikes,
    abilities,
    skills,
    languages,
    senses,
    description: description || undefined,
    source,
    spellDC,
    classDC,
  }
}

export function extractIwr(row: CreatureRow): {
  immunities: string[]
  weaknesses: { type: string; value: number }[]
  resistances: { type: string; value: number }[]
} {
  const raw = JSON.parse(row.raw_json)
  const system = raw.system || {}
  return {
    immunities: (system.attributes?.immunities || []).map((i: any) => i.type || String(i)),
    weaknesses: (system.attributes?.weaknesses || []).map((w: any) => ({
      type: w.type || String(w),
      value: w.value ?? 0,
    })),
    resistances: (system.attributes?.resistances || []).map((r: any) => ({
      type: r.type || String(r),
      value: r.value ?? 0,
    })),
  }
}

function formatDamage(damageRolls: any): { formula: string; type: string }[] {
  if (!damageRolls) return []
  const entries = Object.values(damageRolls) as any[]
  return entries.map((d: any) => ({
    formula: (d.damage || d.formula || '?').trim(),
    type: (d.damageType || d.type || '').trim(),
  }))
}

function parseActionCost(actionType?: string, actions?: number): DisplayActionCost | undefined {
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
