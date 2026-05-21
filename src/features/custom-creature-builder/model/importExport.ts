import type { CreatureStatBlockData } from '@/entities/creature'

const FORMAT_VERSION = '1.2.1'
const PATHMAID_VERSION = '1.2.1'

interface CustomCreatureEnvelope {
  formatVersion: string
  metadata: {
    name: string
    level: number
    exportedAt: string
    pathmaidVersion: string
  }
  data: Omit<CreatureStatBlockData, 'id' | 'equipment'>
}

interface CustomCreatureBundleEnvelope {
  formatVersion: string
  kind: 'custom-creatures-bundle'
  metadata: {
    count: number
    exportedAt: string
    pathmaidVersion: string
  }
  creatures: CustomCreatureEnvelope[]
}

export interface ParsedCustomCreatureImport {
  statBlock: CreatureStatBlockData
  metadata: CustomCreatureEnvelope['metadata']
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function slugify(input: string): string {
  return (
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'creature'
  )
}

function stripPersistedFields(statBlock: CreatureStatBlockData): Omit<CreatureStatBlockData, 'id' | 'equipment'> {
  const { id: _id, equipment: _equipment, ...data } = statBlock
  void _id
  void _equipment
  return data
}

export function createCustomCreatureEnvelope(statBlock: CreatureStatBlockData): CustomCreatureEnvelope {
  const data = stripPersistedFields(statBlock)
  return {
    formatVersion: FORMAT_VERSION,
    metadata: {
      name: statBlock.name,
      level: statBlock.level,
      exportedAt: new Date().toISOString(),
      pathmaidVersion: PATHMAID_VERSION,
    },
    data,
  }
}

export function customCreaturePathmaidFilename(statBlock: CreatureStatBlockData): string {
  return `${slugify(statBlock.name)}-level-${statBlock.level}.pathmaid`
}

export function stringifyCustomCreaturePathmaid(statBlock: CreatureStatBlockData): string {
  return JSON.stringify(createCustomCreatureEnvelope(statBlock), null, 2)
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

export function customCreatureBundleFilename(): string {
  return `pathmaid-custom-creatures-${todayUtc()}.pathmaid`
}

export function createCustomCreatureBundleEnvelope(statBlocks: CreatureStatBlockData[]): CustomCreatureBundleEnvelope {
  return {
    formatVersion: FORMAT_VERSION,
    kind: 'custom-creatures-bundle',
    metadata: {
      count: statBlocks.length,
      exportedAt: new Date().toISOString(),
      pathmaidVersion: PATHMAID_VERSION,
    },
    creatures: statBlocks.map(createCustomCreatureEnvelope),
  }
}

export function stringifyCustomCreatureBundlePathmaid(statBlocks: CreatureStatBlockData[]): string {
  return JSON.stringify(createCustomCreatureBundleEnvelope(statBlocks), null, 2)
}

function downloadPathmaid(filename: string, text: string): string {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)

  return filename
}

export function downloadCustomCreaturePathmaid(statBlock: CreatureStatBlockData): string {
  const filename = customCreaturePathmaidFilename(statBlock)
  return downloadPathmaid(filename, stringifyCustomCreaturePathmaid(statBlock))
}

export function downloadCustomCreatureBundlePathmaid(statBlocks: CreatureStatBlockData[]): string {
  const filename = customCreatureBundleFilename()
  return downloadPathmaid(filename, stringifyCustomCreatureBundlePathmaid(statBlocks))
}

function parseCustomCreatureEnvelope(envelope: unknown): ParsedCustomCreatureImport {
  if (!isRecord(envelope)) {
    throw new Error('Expected a PathMaid custom creature object.')
  }

  if (envelope.formatVersion !== FORMAT_VERSION) {
    throw new Error(`Unsupported custom creature format: ${String(envelope.formatVersion ?? 'missing')}.`)
  }

  if (!isRecord(envelope.metadata)) {
    throw new Error('Missing custom creature metadata.')
  }

  if (!isRecord(envelope.data)) {
    throw new Error('Missing custom creature data.')
  }

  const data = envelope.data
  if (typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new Error('Custom creature is missing a name.')
  }
  if (typeof data.level !== 'number' || !Number.isFinite(data.level)) {
    throw new Error('Custom creature is missing a numeric level.')
  }

  const { id: _id, equipment: _equipment, ...statBlockData } = data
  void _id
  void _equipment

  return {
    statBlock: {
      ...(statBlockData as Omit<CreatureStatBlockData, 'id' | 'equipment'>),
      id: '',
      source: typeof statBlockData.source === 'string' ? statBlockData.source : 'custom',
    },
    metadata: {
      name: typeof envelope.metadata.name === 'string' ? envelope.metadata.name : data.name,
      level: typeof envelope.metadata.level === 'number' ? envelope.metadata.level : data.level,
      exportedAt: typeof envelope.metadata.exportedAt === 'string' ? envelope.metadata.exportedAt : '',
      pathmaidVersion: typeof envelope.metadata.pathmaidVersion === 'string' ? envelope.metadata.pathmaidVersion : '',
    },
  }
}

export function parseCustomCreaturePathmaidText(text: string): ParsedCustomCreatureImport[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON.')
  }

  if (!isRecord(parsed)) {
    throw new Error('Expected a PathMaid custom creature object.')
  }

  if (parsed.kind === 'custom-creatures-bundle') {
    if (parsed.formatVersion !== FORMAT_VERSION) {
      throw new Error(`Unsupported custom creature format: ${String(parsed.formatVersion ?? 'missing')}.`)
    }
    if (!Array.isArray(parsed.creatures)) {
      throw new Error('Custom creature bundle is missing creatures.')
    }
    return parsed.creatures.map(parseCustomCreatureEnvelope)
  }

  return [parseCustomCreatureEnvelope(parsed)]
}
