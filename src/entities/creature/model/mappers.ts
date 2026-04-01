import type { Rarity } from '@engine'
import type { CreatureRow } from '@/shared/api'
import { mapSize } from '@/shared/lib/size-map'
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
    traits: row.traits ? JSON.parse(row.traits) : [],
    rarity: (row.rarity ?? 'common') as Rarity,
    size: mapSize(row.size),
    type: row.type,
  }
}

export function toCreatureStatBlockData(row: CreatureRow): CreatureStatBlockData {
  const base = toCreature(row)
  const raw = JSON.parse(row.raw_json)
  const system = raw.system || {}
  const details = system.details || {}

  const immunities: string[] = (system.attributes?.immunities || []).map(
    (i: any) => i.type || String(i)
  )
  const weaknesses = (system.attributes?.weaknesses || []).map((w: any) => ({
    type: w.type || String(w),
    value: w.value ?? 0,
  }))
  const resistances = (system.attributes?.resistances || []).map((r: any) => ({
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

  const items = raw.items || []
  const strikes = items
    .filter((item: any) => item.type === 'melee' || item.type === 'ranged')
    .map((item: any) => ({
      name: item.name || 'Strike',
      modifier: item.system?.bonus?.value ?? 0,
      damage: formatDamage(item.system?.damageRolls),
      traits: (item.system?.traits?.value || []) as string[],
    }))

  const abilities = items
    .filter((item: any) => item.type === 'action')
    .map((item: any) => ({
      name: item.name || 'Ability',
      actionCost: parseActionCost(item.system?.actionType?.value, item.system?.actions?.value),
      description: stripHtml(item.system?.description?.value || ''),
      traits: (item.system?.traits?.value || []) as string[],
    }))

  const skillsObj = system.skills || {}
  const skills = Object.entries(skillsObj)
    .filter(([, v]: [string, any]) => v && typeof v.base === 'number' && v.base > 0)
    .map(([name, v]: [string, any]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      modifier: v.base ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const languages: string[] = details.languages?.value || system.traits?.languages?.value || []
  const senseData = system.perception?.senses || system.traits?.senses || []
  const senses: string[] = Array.isArray(senseData)
    ? senseData.map((s: any) => (typeof s === 'string' ? s : s.type || String(s)))
    : []

  const description = stripHtml(details.publicNotes || details.description?.value || '')
  const source =
    details.publication?.title || system.details?.source?.value || row.source_pack || 'Unknown'

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

function formatDamage(damageRolls: any): string {
  if (!damageRolls) return ''
  const entries = Object.values(damageRolls) as any[]
  return entries
    .map((d: any) => `${d.damage || d.formula || '?'} ${d.damageType || d.type || ''}`.trim())
    .join(' plus ')
}

function parseActionCost(actionType?: string, actions?: number): DisplayActionCost | undefined {
  if (actionType === 'reaction') return 'reaction'
  if (actionType === 'free') return 'free'
  if (actionType === 'passive') return undefined
  if (actions != null && actions >= 1 && actions <= 3) return actions as 1 | 2 | 3
  return undefined
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}
