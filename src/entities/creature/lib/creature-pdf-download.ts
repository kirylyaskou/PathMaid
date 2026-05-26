import type { AbilityLoc, SupportedLocale } from '@/shared/i18n'
import type { CreatureStatBlockData } from '../model/types'
import type {
  CreaturePdfLabels,
  CreaturePdfOptions,
  CreaturePdfSpeed,
  CreaturePdfStatValues,
} from './creature-pdf-document'

interface DownloadCreaturePdfOptions {
  locale: SupportedLocale
  displayName?: string
  sizeTypeLine?: string
  traitLabels?: string[]
  labels?: Partial<CreaturePdfLabels>
  statValues?: CreaturePdfStatValues
  speeds?: readonly CreaturePdfSpeed[]
  strikes?: CreaturePdfOptions['strikes']
  itemsLocById?: Map<string, AbilityLoc>
}

type CreaturePdfPayload = Pick<
  CreatureStatBlockData,
  | 'id'
  | 'name'
  | 'level'
  | 'hp'
  | 'ac'
  | 'fort'
  | 'ref'
  | 'will'
  | 'perception'
  | 'stealth'
  | 'traits'
  | 'rarity'
  | 'size'
  | 'type'
  | 'immunities'
  | 'weaknesses'
  | 'resistances'
  | 'speeds'
  | 'strikes'
  | 'abilities'
  | 'skills'
  | 'languages'
  | 'senses'
  | 'description'
  | 'source'
  | 'spellDC'
  | 'classDC'
  | 'spellcasting'
  | 'equipment'
  | 'abilityMods'
>

type WorkerPdfOptions = Omit<DownloadCreaturePdfOptions, 'itemsLocById'> & {
  itemLocEntries?: Array<[string, AbilityLoc]>
}

interface CreaturePdfWorkerSuccess {
  ok: true
  filename: string
  buffer: ArrayBuffer
}

interface CreaturePdfWorkerFailure {
  ok: false
  error: string
}

type CreaturePdfWorkerResponse = CreaturePdfWorkerSuccess | CreaturePdfWorkerFailure

function savePdfBuffer(filename: string, buffer: ArrayBuffer): void {
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function toCreaturePdfPayload(creature: CreatureStatBlockData): CreaturePdfPayload {
  return {
    id: creature.id,
    name: creature.name,
    level: creature.level,
    hp: creature.hp,
    ac: creature.ac,
    fort: creature.fort,
    ref: creature.ref,
    will: creature.will,
    perception: creature.perception,
    stealth: creature.stealth,
    traits: creature.traits,
    rarity: creature.rarity,
    size: creature.size,
    type: creature.type,
    immunities: creature.immunities,
    weaknesses: creature.weaknesses,
    resistances: creature.resistances,
    speeds: creature.speeds,
    strikes: creature.strikes,
    abilities: creature.abilities,
    skills: creature.skills,
    languages: creature.languages,
    senses: creature.senses,
    description: creature.description,
    source: creature.source,
    spellDC: creature.spellDC,
    classDC: creature.classDC,
    spellcasting: creature.spellcasting,
    equipment: creature.equipment,
    abilityMods: creature.abilityMods,
  }
}

function toWorkerPdfOptions(
  creature: CreatureStatBlockData,
  options: DownloadCreaturePdfOptions,
): WorkerPdfOptions {
  const itemLocEntries: Array<[string, AbilityLoc]> = []
  if (options.itemsLocById) {
    const relevantIds = new Set<string>()
    options.strikes?.forEach((strike) => {
      if (strike.id) relevantIds.add(strike.id)
    })
    creature.abilities.forEach((ability) => {
      if (ability.id) relevantIds.add(ability.id)
    })
    relevantIds.forEach((id) => {
      const loc = options.itemsLocById?.get(id)
      if (loc) itemLocEntries.push([id, loc])
    })
  }

  const { itemsLocById, ...rest } = options
  void itemsLocById
  return {
    ...rest,
    ...(itemLocEntries.length > 0 ? { itemLocEntries } : {}),
  }
}

function renderCreaturePdfInWorker(
  creature: CreaturePdfPayload,
  options: WorkerPdfOptions,
): Promise<CreaturePdfWorkerSuccess> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./creature-pdf-worker.ts', import.meta.url), {
      name: 'creature-pdf-worker',
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<CreaturePdfWorkerResponse>) => {
      worker.terminate()
      const response = event.data
      if (response.ok) {
        resolve(response)
      } else {
        reject(new Error(response.error))
      }
    }

    worker.onerror = (event) => {
      worker.terminate()
      reject(new Error(event.message || 'PDF worker failed'))
    }

    worker.postMessage({ creature, options })
  })
}

export async function downloadCreaturePdf(
  creature: CreatureStatBlockData,
  options: DownloadCreaturePdfOptions,
): Promise<string> {
  const displayName = options.displayName ?? creature.name
  const response = await renderCreaturePdfInWorker(
    toCreaturePdfPayload(creature),
    toWorkerPdfOptions(creature, { ...options, displayName }),
  )
  savePdfBuffer(response.filename, response.buffer)
  return response.filename
}
