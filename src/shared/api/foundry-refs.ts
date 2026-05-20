import { getActionByName } from './actions'
import { getFeatByName } from './feats'
import { getItemByName } from './items'
import { getSpellByName } from './spells'

export type FoundryRefKind = 'spell' | 'feat' | 'item' | 'action' | 'unknown'

export interface ParsedFoundryRef {
  uuid: string
  pack: string | null
  kind: FoundryRefKind
  name: string
}

const UUID_ITEM_NAME_REGEX = /^Compendium\.pf2e\.([^.]+)\.Item\.(.+)$/

const SPELL_PACKS = new Set([
  'spells-srd',
])

const FEAT_PACK_HINTS = [
  'feat',
  'classfeatures',
  'ancestryfeatures',
  'backgrounds',
]

const ITEM_PACK_HINTS = [
  'equipment',
  'armor',
  'weapon',
  'consumable',
  'treasure',
  'effect',
]

function decodeFoundryName(input: string): string {
  return input
    .replace(/%20/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function classifyPack(pack: string | null, name: string): FoundryRefKind {
  if (!pack) return 'unknown'
  if (SPELL_PACKS.has(pack)) return 'spell'
  if (pack === 'actionspf2e' || pack === 'actions') return 'action'
  if (FEAT_PACK_HINTS.some((hint) => pack.includes(hint))) return 'feat'
  if (ITEM_PACK_HINTS.some((hint) => pack.includes(hint))) return 'item'
  if (/^Effect:/i.test(name)) return 'item'
  return 'unknown'
}

export function parseFoundryUuid(uuid: string): ParsedFoundryRef {
  const trimmed = uuid.trim()
  const match = trimmed.match(UUID_ITEM_NAME_REGEX)
  if (!match) {
    const fallback = trimmed.split('.').pop() ?? trimmed
    const name = /^[A-Za-z0-9]{16,}$/.test(fallback) ? trimmed : decodeFoundryName(fallback)
    return {
      uuid: trimmed,
      pack: null,
      kind: 'unknown',
      name,
    }
  }

  const pack = match[1] ?? null
  const name = decodeFoundryName(match[2] ?? '')
  return {
    uuid: trimmed,
    pack,
    kind: classifyPack(pack, name),
    name,
  }
}

export interface ResolvedFoundryRef {
  uuid: string
  kind: FoundryRefKind
  id: string | null
  name: string
  label: string
  resolved: boolean
}

const refCache = new Map<string, Promise<ResolvedFoundryRef>>()

async function resolveByKind(kind: FoundryRefKind, name: string): Promise<ResolvedFoundryRef | null> {
  if (kind === 'spell') {
    const row = await getSpellByName(name)
    if (!row) return null
    return {
      uuid: '',
      kind,
      id: row.id,
      name: row.name,
      label: row.name_loc ?? row.name,
      resolved: true,
    }
  }
  if (kind === 'feat') {
    const row = await getFeatByName(name)
    if (!row) return null
    return {
      uuid: '',
      kind,
      id: row.id,
      name: row.name,
      label: row.name,
      resolved: true,
    }
  }
  if (kind === 'item') {
    const row = await getItemByName(name)
    if (!row) return null
    return {
      uuid: '',
      kind,
      id: row.id,
      name: row.name,
      label: row.name_loc ?? row.name,
      resolved: true,
    }
  }
  if (kind === 'action') {
    const row = await getActionByName(name)
    if (!row) return null
    return {
      uuid: '',
      kind,
      id: row.id,
      name: row.name,
      label: row.name,
      resolved: true,
    }
  }
  return null
}

async function resolveFoundryRefUncached(uuid: string): Promise<ResolvedFoundryRef> {
  const parsed = parseFoundryUuid(uuid)
  const resolved = await resolveByKind(parsed.kind, parsed.name).catch(() => null)
  if (resolved) {
    return {
      ...resolved,
      uuid: parsed.uuid,
    }
  }
  return {
    uuid: parsed.uuid,
    kind: parsed.kind,
    id: null,
    name: parsed.name,
    label: parsed.name,
    resolved: false,
  }
}

export async function resolveFoundryRef(uuid: string): Promise<ResolvedFoundryRef> {
  const key = uuid.trim()
  const cached = refCache.get(key)
  if (cached) return cached
  const pending = resolveFoundryRefUncached(key)
  refCache.set(key, pending)
  return pending
}

export async function resolveFoundryRefs(uuids: string[]): Promise<Record<string, ResolvedFoundryRef>> {
  const unique = [...new Set(uuids.map((uuid) => uuid.trim()).filter(Boolean))]
  const entries = await Promise.all(unique.map(async (uuid) => [uuid, await resolveFoundryRef(uuid)] as const))
  return Object.fromEntries(entries)
}
