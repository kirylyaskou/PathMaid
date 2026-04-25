import { useState, useRef, useEffect } from 'react'
import { Download, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
import { useEncounterStore } from '@/entities/encounter'
import { ImportEncounterDialog, exportEncounter, exportEncountersBundle } from '@/features/encounter-import'

export function SavedEncounterList() {
  const encounters = useEncounterStore((s) => s.encounters)
  const selectedId = useEncounterStore((s) => s.selectedId)
  const setSelectedId = useEncounterStore((s) => s.setSelectedId)
  const createNewEncounter = useEncounterStore((s) => s.createNewEncounter)
  const deleteEncounterById = useEncounterStore((s) => s.deleteEncounterById)

  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportSelected, setExportSelected] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreating) inputRef.current?.focus()
  }, [isCreating])

  async function handleCreate() {
    const name = newName.trim()
    if (!name) { setIsCreating(false); return }
    await createNewEncounter(name)
    setNewName('')
    setIsCreating(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') { setIsCreating(false); setNewName('') }
  }

  // download encounter as pathmaiden-v1 JSON. Tauri WebView honours the
  // `<a download>` + object URL pattern the same way a browser would (same
  // pattern used elsewhere for exports).
  async function handleExport(id: string) {
    try {
      const { filename, content } = await exportEncounter(id)
      const blob = new Blob([content], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[export encounter] failed', err)
    }
  }

  // open export dialog — pre-select all encounters.
  function handleOpenExportDialog() {
    setExportSelected(new Set(encounters.map((e) => e.id)))
    setExportOpen(true)
  }

  async function handleExportSelected() {
    setExporting(true)
    try {
      const ids = Array.from(exportSelected)
      if (ids.length === 0) return
      const { filename, content } = await exportEncountersBundle(ids)
      const blob = new Blob([content], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[export bundle] failed', err)
    } finally {
      setExporting(false)
      setExportOpen(false)
    }
  }

  function toggleExportSelect(id: string) {
    setExportSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allChecked = encounters.length > 0 && exportSelected.size === encounters.length

  function toggleSelectAll() {
    if (allChecked) setExportSelected(new Set())
    else setExportSelected(new Set(encounters.map((e) => e.id)))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Encounters
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setImportOpen(true)}
            title="Import encounter from JSON"
          >
            <Upload className="w-3 h-3" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={handleOpenExportDialog}
            title="Export encounters"
            disabled={encounters.length === 0}
          >
            <Download className="w-3 h-3" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="w-3 h-3" />
            New Encounter
          </Button>
        </div>
      </div>
      <ImportEncounterDialog open={importOpen} onOpenChange={setImportOpen} />

      {/* Export selection dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Encounters</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto py-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground border-b border-border/40 pb-1.5 mb-1 cursor-pointer select-none px-1 py-0.5">
              <Checkbox
                checked={allChecked}
                onCheckedChange={toggleSelectAll}
              />
              <span>{allChecked ? 'Deselect all' : 'Select all'}</span>
              <span className="ml-auto font-mono">
                {exportSelected.size} / {encounters.length}
              </span>
            </label>
            {encounters.map((enc) => (
              <label
                key={enc.id}
                className="flex items-center gap-2 text-sm cursor-pointer select-none px-1 py-0.5 rounded hover:bg-accent/30 transition-colors"
              >
                <Checkbox
                  checked={exportSelected.has(enc.id)}
                  onCheckedChange={() => toggleExportSelect(enc.id)}
                />
                <span className="truncate">{enc.name}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleExportSelected()}
              disabled={exportSelected.size === 0 || exporting}
            >
              {exporting ? 'Exporting…' : `Export ${exportSelected.size} as bundle`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inline create input */}
      {isCreating && (
        <div className="px-2 py-1 border-b border-border/50">
          <Input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCreate}
            placeholder="Encounter name..."
            className="h-7 text-sm"
          />
        </div>
      )}

      {/* List */}
      <ScrollArea className="flex-1">
        {encounters.length === 0 && !isCreating ? (
          <div className="flex flex-col items-center justify-center h-32 gap-1 text-muted-foreground">
            <p className="text-sm">No saved encounters</p>
            <p className="text-xs">Press + to create your first encounter.</p>
          </div>
        ) : (
          <div className="p-1 space-y-0.5">
            {encounters.map((enc) => (
              <div
                key={enc.id}
                onClick={() => setSelectedId(enc.id)}
                title={enc.name}
                className={`flex items-center px-3 py-2 rounded-md cursor-pointer text-sm transition-colors group ${
                  selectedId === enc.id
                    ? 'bg-secondary/70 border-l-2 border-primary font-medium'
                    : 'hover:bg-secondary/40 border-l-2 border-transparent'
                }`}
              >
                <span className="flex-1 truncate">{enc.name}</span>
                {enc.isRunning && (
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleExport(enc.id)
                  }}
                  title="Export encounter"
                  aria-label="Export encounter"
                >
                  <Download className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteEncounterById(enc.id)
                  }}
                  title="Delete encounter"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
