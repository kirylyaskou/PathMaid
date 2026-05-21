import { useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import { createImportedCustomCreature } from '@/shared/api'
import { parseCustomCreaturePathmaidText } from '../model/importExport'

interface Props {
  onImported: () => Promise<void> | void
}

interface ImportFailure {
  filename: string
  message: string
}

export function ImportCustomCreatureButton({ onImported }: Props) {
  const { t } = useTranslation('common')
  const inputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  async function handleFiles(files: FileList | null) {
    const selected = Array.from(files ?? [])
    if (selected.length === 0) return

    setImporting(true)
    const failures: ImportFailure[] = []
    const importedNames: string[] = []

    for (const file of selected) {
      try {
        const parsed = parseCustomCreaturePathmaidText(await file.text())
        for (const creature of parsed) {
          const result = await createImportedCustomCreature(creature.statBlock)
          importedNames.push(result.name)
        }
      } catch (e) {
        failures.push({
          filename: file.name,
          message: e instanceof Error ? e.message : t('customCreatureBuilder.listPage.importUnknownError'),
        })
      }
    }

    try {
      if (importedNames.length > 0) await onImported()
    } finally {
      setImporting(false)
      if (inputRef.current) inputRef.current.value = ''
    }

    if (importedNames.length > 0) {
      toast(t('customCreatureBuilder.listPage.importedToast', { count: importedNames.length }))
    }

    if (failures.length > 0) {
      toast.error(
        t('customCreatureBuilder.listPage.importFailedToast', {
          count: failures.length,
          details: failures.map((failure) => `${failure.filename}: ${failure.message}`).join('; '),
        })
      )
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={importing}
      >
        {importing ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <Upload className="w-3.5 h-3.5 mr-1.5" />
        )}
        {t('customCreatureBuilder.listPage.importPathmaid')}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pathmaid,application/json"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </>
  )
}
