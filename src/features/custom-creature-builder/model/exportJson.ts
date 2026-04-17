// Blob + <a download> file export. Works in Tauri WebView without plugin-fs.
// D-22 envelope: { formatVersion, metadata, data }. Filename: {slug}-level-{N}.json.
// Pitfall 3: export from the PERSISTED stat block shape — strip `id` and
// `equipment` here to match what `toDataJson` writes into `data_json`.

import type { CreatureStatBlockData } from '@/entities/creature/model/types'

// Hand-maintained alongside app version per D-22 / RESEARCH.md Pattern 4 option A.
const FORMAT_VERSION = '1.2.1'

// Pathmaid app version — hand-bump per release. Kept as a constant (not read
// from package.json at runtime) because Vite would otherwise need a `define`
// injection. Matches the FORMAT_VERSION policy.
const PATHMAID_VERSION = '1.0.1'

interface ExportEnvelope {
  formatVersion: string
  metadata: {
    name: string
    level: number
    exportedAt: string
    pathmaidVersion: string
  }
  data: Omit<CreatureStatBlockData, 'id' | 'equipment'>
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

export function exportCreatureJson(statBlock: CreatureStatBlockData): string {
  // Pitfall 3: strip `id` (regenerated at import) and `equipment` (stored in a
  // separate table, always empty for custom creatures). Matches `toDataJson`.
  const { id: _id, equipment: _equipment, ...data } = statBlock
  void _id
  void _equipment

  const envelope: ExportEnvelope = {
    formatVersion: FORMAT_VERSION,
    metadata: {
      name: statBlock.name,
      level: statBlock.level,
      exportedAt: new Date().toISOString(),
      pathmaidVersion: PATHMAID_VERSION,
    },
    data,
  }

  const json = JSON.stringify(envelope, null, 2)
  const filename = `${slugify(statBlock.name)}-level-${statBlock.level}.json`

  const blob = new Blob([json], { type: 'application/json' })
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
