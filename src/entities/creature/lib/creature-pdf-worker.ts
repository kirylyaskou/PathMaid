import pathfinder2eActionsFontUrl from '../../../shared/assets/fonts/Pathfinder2eActions.ttf?url'
import type { AbilityLoc, SupportedLocale } from '@/shared/i18n'
import type { CreatureStatBlockData } from '../model/types'
import type {
  CreaturePdfLabels,
  CreaturePdfOptions,
  CreaturePdfSpeed,
  CreaturePdfStatValues,
} from './creature-pdf-document'
import {
  buildCreaturePdfDocument,
  creaturePdfFilename,
} from './creature-pdf-document'

type PdfMakeModule = typeof import('pdfmake/build/pdfmake')
type PdfFontsModule = typeof import('pdfmake/build/vfs_fonts')
type PdfMakeApi = {
  createPdf: PdfMakeModule['createPdf']
  vfs?: Record<string, string>
  addVirtualFileSystem?: (vfs: Record<string, string>) => void
  addFonts?: (fonts: Record<string, PdfFontDefinition>) => void
  fonts?: Record<string, PdfFontDefinition>
}
type PdfFontDefinition = {
  normal: string
  bold?: string
  italics?: string
  bolditalics?: string
}

interface CreaturePdfWorkerOptions {
  locale: SupportedLocale
  displayName?: string
  sizeTypeLine?: string
  traitLabels?: string[]
  labels?: Partial<CreaturePdfLabels>
  statValues?: CreaturePdfStatValues
  speeds?: readonly CreaturePdfSpeed[]
  strikes?: CreaturePdfOptions['strikes']
  itemLocEntries?: Array<[string, AbilityLoc]>
}

interface CreaturePdfWorkerRequest {
  creature: CreatureStatBlockData
  options: CreaturePdfWorkerOptions
}

const ACTION_FONT_FILE = 'Pathfinder2eActions.ttf'

let pdfMakePromise: Promise<PdfMakeApi> | null = null
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<CreaturePdfWorkerRequest>) => void) | null
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

function resolvePdfMakeApi(pdfMake: PdfMakeModule): PdfMakeApi {
  const candidates = [
    pdfMake,
    (pdfMake as { default?: PdfMakeApi }).default,
  ].filter(Boolean)

  const api = candidates.find((candidate): candidate is PdfMakeApi =>
    typeof (candidate as PdfMakeApi).createPdf === 'function',
  )

  if (!api) {
    throw new Error('pdfmake createPdf API is unavailable')
  }

  return api
}

function resolvePdfFonts(pdfFonts: PdfFontsModule): Record<string, string> {
  const pdfFontsShape = pdfFonts as {
    default?: unknown
    vfs?: unknown
    pdfMake?: { vfs?: unknown }
  }
  const candidates: unknown[] = [
    pdfFonts,
    pdfFontsShape.default,
    pdfFontsShape.vfs,
    typeof pdfFontsShape.default === 'object' && pdfFontsShape.default
      ? (pdfFontsShape.default as { vfs?: unknown }).vfs
      : undefined,
    pdfFontsShape.pdfMake?.vfs,
  ].filter(Boolean)

  const vfs = candidates.find((candidate): candidate is Record<string, string> =>
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as Record<string, unknown>)['Roboto-Medium.ttf'] === 'string',
  )

  if (!vfs) {
    throw new Error('pdfmake Roboto font VFS is unavailable')
  }

  return vfs
}

async function fetchFontAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load PDF font asset: ${response.status}`)
  }

  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return btoa(binary)
}

async function loadPdfMake(): Promise<PdfMakeApi> {
  if (!pdfMakePromise) {
    pdfMakePromise = Promise.all([
      import('pdfmake/build/pdfmake') as Promise<PdfMakeModule>,
      import('pdfmake/build/vfs_fonts') as Promise<PdfFontsModule>,
      fetchFontAsBase64(pathfinder2eActionsFontUrl),
    ]).then(([pdfMake, pdfFonts, actionFontBase64]) => {
      const api = resolvePdfMakeApi(pdfMake)
      const vfs = {
        ...resolvePdfFonts(pdfFonts),
        [ACTION_FONT_FILE]: actionFontBase64,
      }

      if (api.addVirtualFileSystem) {
        api.addVirtualFileSystem(vfs)
      } else {
        api.vfs = vfs
      }

      const fonts = {
        Roboto: {
          normal: 'Roboto-Regular.ttf',
          bold: 'Roboto-Medium.ttf',
          italics: 'Roboto-Italic.ttf',
          bolditalics: 'Roboto-MediumItalic.ttf',
        },
        Pathfinder2eActions: {
          normal: ACTION_FONT_FILE,
          bold: ACTION_FONT_FILE,
          italics: ACTION_FONT_FILE,
          bolditalics: ACTION_FONT_FILE,
        },
      }
      if (api.addFonts) {
        api.addFonts(fonts)
      } else {
        api.fonts = fonts
      }

      return api
    })
  }

  return pdfMakePromise
}

function createPdfBuffer(pdfMake: PdfMakeApi, documentDefinition: ReturnType<typeof buildCreaturePdfDocument>): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(documentDefinition).getBlob((blob: Blob) => {
        blob.arrayBuffer().then(resolve, reject)
      })
    } catch (error) {
      reject(error)
    }
  })
}

workerScope.onmessage = (event: MessageEvent<CreaturePdfWorkerRequest>) => {
  void (async () => {
    try {
      const { creature, options } = event.data
      const displayName = options.displayName ?? creature.name
      const filename = creaturePdfFilename(displayName)
      const { itemLocEntries, ...documentOptions } = options
      const documentDefinition = buildCreaturePdfDocument(creature, {
        ...documentOptions,
        ...(itemLocEntries ? { itemsLocById: new Map(itemLocEntries) } : {}),
      })
      const pdfMake = await loadPdfMake()
      const buffer = await createPdfBuffer(pdfMake, documentDefinition)
      workerScope.postMessage({ ok: true, filename, buffer }, [buffer])
    } catch (error) {
      workerScope.postMessage({
        ok: false,
        error: error instanceof Error ? error.message : 'PDF export failed',
      })
    }
  })()
}
