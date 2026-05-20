import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { getCustomCreatureById } from '@/shared/api'
import type { CreatureStatBlockData } from '@/entities/creature'
import { exportCreatureJson } from '../model/exportJson'

interface Props {
  creatureId: string
  disabled?: boolean
}

// download a per-creature JSON envelope via Blob + <a download>.
// Pitfall 3: pull the stat block from the PERSISTED record (not the in-memory
// builder form) so exports always match the last-saved state.
export function ExportJsonButton({ creatureId, disabled }: Props) {
  const { t } = useTranslation('common')

  async function handleExport() {
    try {
      const record = await getCustomCreatureById<CreatureStatBlockData>(creatureId)
      if (!record) {
        toast.error(t('customCreatureBuilder.exportJson.creatureNotFound'))
        return
      }
      const filename = exportCreatureJson(record.statBlock)
      toast(t('customCreatureBuilder.exportJson.exported', { filename }))
    } catch (e) {
      toast.error(`${t('customCreatureBuilder.exportJson.failedToExport')}: ${(e as Error).message}`)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void handleExport()} disabled={disabled}>
      <Download className="w-3.5 h-3.5 mr-1.5" />
      {t('customCreatureBuilder.exportJson.buttonLabel')}
    </Button>
  )
}
