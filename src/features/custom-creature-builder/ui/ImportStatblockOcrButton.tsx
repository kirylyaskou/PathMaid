import { useRef, useState } from 'react'
import { Check, FileScan, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { MascotHex } from '@/shared/ui/mascot-hex'
import {
  Dialog,
  DialogFooter,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { createImportedCustomCreature, recognizeStatblockFile, type StatblockOcrResult } from '@/shared/api'
import { parseCustomCreaturePathmaidText } from '../model/importExport'
import { parseOcrStatblockToPathmaid } from '../model/statblockOcrImport'

interface Props {
  onImported: () => Promise<void> | void
}

export function ImportStatblockOcrButton({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [recognizing, setRecognizing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [filename, setFilename] = useState('')
  const [result, setResult] = useState<StatblockOcrResult | null>(null)
  const [pathmaidText, setPathmaidText] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setRecognizing(true)
    setFilename(file.name)
    setResult(null)
    setPathmaidText('')
    setWarnings([])
    try {
      const next = await recognizeStatblockFile(file)
      const parsed = parseOcrStatblockToPathmaid(next.text)
      setResult(next)
      setPathmaidText(parsed.pathmaidText)
      setWarnings(parsed.warnings)
    } catch (e) {
      toast.error(`OCR failed: ${(e as Error).message}`)
    } finally {
      setRecognizing(false)
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
      toast(`Imported ${parsed.length} OCR creature${parsed.length === 1 ? '' : 's'}.`)
      setResult(null)
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`)
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
        disabled={recognizing}
      >
        {recognizing ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <FileScan className="w-3.5 h-3.5 mr-1.5" />
        )}
        OCR statblock
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/png,image/jpeg,image/webp,image/bmp,image/tiff"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <Dialog
        open={recognizing || result !== null}
        onOpenChange={(open) => {
          if (!open && !recognizing) setResult(null)
        }}
      >
        <DialogContent className="max-w-3xl">
          {recognizing ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-4">
              <MascotHex height={160} />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Parsing statblock...</span>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>OCR statblock draft</DialogTitle>
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
                  value={result?.text ?? ''}
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
                  {result?.pages.length ?? 0} page(s), {result?.text.length ?? 0} OCR characters
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
