import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { getCustomCreatureById } from '@/shared/api/custom-creatures'
import { exportCreatureJson } from '../model/exportJson'

interface Props {
  creatureId: string
  disabled?: boolean
}

// D-22: download a per-creature JSON envelope via Blob + <a download>.
// Pitfall 3: pull the stat block from the PERSISTED record (not the in-memory
// builder form) so exports always match the last-saved state.
export function ExportJsonButton({ creatureId, disabled }: Props) {
  async function handleExport() {
    try {
      const record = await getCustomCreatureById(creatureId)
      if (!record) {
        toast.error('Creature not found')
        return
      }
      const filename = exportCreatureJson(record.statBlock)
      toast(`Exported ${filename}`)
    } catch (e) {
      toast.error(`Failed to export: ${(e as Error).message}`)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void handleExport()} disabled={disabled}>
      <Download className="w-3.5 h-3.5 mr-1.5" />
      Export JSON
    </Button>
  )
}
