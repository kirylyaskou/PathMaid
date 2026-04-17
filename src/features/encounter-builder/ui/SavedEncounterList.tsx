import { useState, useRef, useEffect } from 'react'
import { Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { useEncounterStore } from '@/entities/encounter'
import { ImportEncounterDialog } from '@/features/encounter-import'

export function SavedEncounterList() {
  const encounters = useEncounterStore((s) => s.encounters)
  const selectedId = useEncounterStore((s) => s.selectedId)
  const setSelectedId = useEncounterStore((s) => s.setSelectedId)
  const createNewEncounter = useEncounterStore((s) => s.createNewEncounter)
  const deleteEncounterById = useEncounterStore((s) => s.deleteEncounterById)

  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [importOpen, setImportOpen] = useState(false)
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
            onClick={() => setIsCreating(true)}
          >
            <Plus className="w-3 h-3" />
            New Encounter
          </Button>
        </div>
      </div>
      <ImportEncounterDialog open={importOpen} onOpenChange={setImportOpen} />

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
