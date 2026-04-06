import { useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Textarea } from '@/shared/ui/textarea'
import { upsertCharacter } from '@/shared/api/characters'
import type { PathbuilderExport } from '@engine'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (name: string) => void
}

function validateExport(data: unknown): PathbuilderExport {
  const exp = data as PathbuilderExport
  if (exp?.success !== true) {
    throw new Error('File is not a valid Pathbuilder export (success: false)')
  }
  if (!exp.build?.name) {
    throw new Error('Missing build.name field')
  }
  if (!exp.build?.class) {
    throw new Error('Missing build.class field')
  }
  return exp
}

export function ImportDialog({ open, onOpenChange, onSuccess }: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file')
  const [pasteValue, setPasteValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  function reset() {
    setPasteValue('')
    setError(null)
    setImporting(false)
    setDragOver(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function importJson(rawInput: string) {
    setError(null)
    setImporting(true)
    try {
      // Extract first complete JSON object — handles Pathbuilder "Share" format where
      // chat prefix and/or multiple messages surround the JSON:
      // "[4/5/2026 10:34 PM] Character Name: {...}\n[timestamp] Name: ..."
      const start = rawInput.indexOf('{')
      if (start === -1) throw new Error('No JSON object found in pasted text')
      let depth = 0, end = -1, inStr = false, esc = false
      for (let i = start; i < rawInput.length; i++) {
        const ch = rawInput[i]
        if (esc) { esc = false; continue }
        if (ch === '\\' && inStr) { esc = true; continue }
        if (ch === '"') { inStr = !inStr; continue }
        if (inStr) continue
        if (ch === '{') depth++
        else if (ch === '}') { depth--; if (depth === 0) { end = i; break } }
      }
      const json = end !== -1 ? rawInput.slice(start, end + 1) : rawInput.slice(start)
      const parsed = JSON.parse(json)
      const exp = validateExport(parsed)
      await upsertCharacter(exp.build)
      reset()
      onOpenChange(false)
      onSuccess(exp.build.name)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not a valid Pathbuilder export')
    } finally {
      setImporting(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => importJson(ev.target?.result as string)
    reader.readAsText(file)
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => importJson(ev.target?.result as string)
    reader.readAsText(file)
  }

  function handleImportClick() {
    if (activeTab === 'file') {
      fileInputRef.current?.click()
    } else {
      importJson(pasteValue)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Character</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="file" onValueChange={(v) => { setActiveTab(v as 'file' | 'paste'); setError(null) }}>
          <TabsList className="w-full">
            <TabsTrigger value="file" className="flex-1">File</TabsTrigger>
            <TabsTrigger value="paste" className="flex-1">Paste JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="file" className="mt-3">
            <div
              className={`border-2 border-dashed rounded-md p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-border/50 hover:border-border/80'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Drop your Pathbuilder export here</p>
              <p className="text-xs text-muted-foreground/60 mt-1">or click to browse</p>
            </div>
            <input
              type="file"
              accept=".json"
              className="hidden"
              ref={fileInputRef}
              onChange={onFileChange}
            />
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </TabsContent>
          <TabsContent value="paste" className="mt-3">
            <Textarea
              placeholder="Paste Pathbuilder JSON here..."
              className="h-48 max-h-72 font-mono text-xs resize-none overflow-y-auto"
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
            />
            {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleImportClick} disabled={importing}>
            {importing && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Import Character
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
