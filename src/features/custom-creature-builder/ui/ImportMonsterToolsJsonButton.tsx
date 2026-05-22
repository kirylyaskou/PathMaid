import { useRef, useState } from 'react'
import { Check, FileJson, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogFooter,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { createImportedCustomCreature } from '@/shared/api'
import { errorMessage } from '@/shared/lib/error'
import { parseCustomCreaturePathmaidText } from '../model/importExport'
import { parseMonsterToolsJsonToPathmaid } from '../model/monsterToolsImport'

interface Props {
  onImported: () => Promise<void> | void
}

export function ImportMonsterToolsJsonButton({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [filename, setFilename] = useState('')
  const [sourceText, setSourceText] = useState('')
  const [pathmaidText, setPathmaidText] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setParsing(true)
    setFilename(file.name)
    setSourceText('')
    setPathmaidText('')
    setWarnings([])
    try {
      const text = await file.text()
      const parsed = parseMonsterToolsJsonToPathmaid(text)
      setSourceText(JSON.stringify(JSON.parse(text), null, 2))
      setPathmaidText(parsed.pathmaidText)
      setWarnings(parsed.warnings)
    } catch (e) {
      toast.error(`Monster Tools import failed: ${errorMessage(e)}`)
    } finally {
      setParsing(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleImport() {
    setImporting(true)
    try {
      const parsed = parseCustomCreaturePathmaidText(pathmaidText)
      for (const creature of parsed) {
        await createImportedCustomCreature(creature.statBlock)
      }
      await onImported()
      toast(`Imported ${parsed.length} Monster Tools creature${parsed.length === 1 ? '' : 's'}.`)
      setSourceText('')
      setPathmaidText('')
    } catch (e) {
      toast.error(`Import failed: ${errorMessage(e)}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={parsing}
      >
        {parsing ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <FileJson className="w-3.5 h-3.5 mr-1.5" />
        )}
        Monster Tools JSON
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <Dialog
        open={parsing || pathmaidText.trim().length > 0}
        onOpenChange={(open) => {
          if (!open && !parsing) {
            setSourceText('')
            setPathmaidText('')
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Monster Tools JSON draft</DialogTitle>
            <DialogDescription>{filename}</DialogDescription>
          </DialogHeader>
          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-900 dark:text-amber-200">
              {warnings.join(' ')}
            </div>
          )}
          <div className="grid min-h-[420px] grid-cols-2 gap-3">
            <textarea
              readOnly
              value={sourceText}
              className="h-full resize-none rounded-md border bg-background p-3 font-mono text-xs"
            />
            <textarea
              value={pathmaidText}
              onChange={(event) => setPathmaidText(event.target.value)}
              className="h-full resize-none rounded-md border bg-background p-3 font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <div className="mr-auto text-xs text-muted-foreground">
              {sourceText.length} JSON characters
            </div>
            <Button onClick={() => void handleImport()} disabled={importing || !pathmaidText.trim()}>
              {importing ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5 mr-1.5" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
