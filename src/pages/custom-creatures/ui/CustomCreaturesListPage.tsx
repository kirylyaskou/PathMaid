import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hammer, Plus, Copy as CloneIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { SearchInput } from '@/shared/ui/search-input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import {
  getAllCustomCreatures,
  createCustomCreature,
  deleteCustomCreature,
} from '@/shared/api/custom-creatures'
import type { CustomCreatureRow } from '@/entities/creature/model/custom-creature-types'
import type { CreatureStatBlockData } from '@/entities/creature/model/types'
import { PATHS } from '@/shared/routes'
import { CloneFromBestiaryDialog } from '@/features/custom-creature-builder/ui/CloneFromBestiaryDialog'
import { CustomCreatureListRow } from './CustomCreatureListRow'

export function CustomCreaturesListPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<CustomCreatureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [cloneOpen, setCloneOpen] = useState(false)

  // Debounce search 200ms (UI-SPEC micro-interactions)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(t)
  }, [query])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllCustomCreatures()
      setRows(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q))
  }, [rows, debouncedQuery])

  async function handleNewCreature() {
    try {
      // 'scratch' branch ignores `data` and uses defaultStatBlock internally
      // (see src/shared/api/custom-creatures.ts — createCustomCreature).
      const id = await createCustomCreature({} as CreatureStatBlockData, 'scratch')
      navigate(PATHS.CUSTOM_CREATURE_EDIT(id))
    } catch (e) {
      toast.error(`Failed to create creature: ${(e as Error).message}`)
    }
  }

  function handleCloneFromBestiary() {
    setCloneOpen(true)
  }

  async function handleCloneSelected(data: CreatureStatBlockData) {
    try {
      const id = await createCustomCreature(data, 'foundry_clone')
      toast(`${data.name} cloned`)
      await reload()
      navigate(PATHS.CUSTOM_CREATURE_EDIT(id))
    } catch (e) {
      toast.error(`Failed to clone: ${(e as Error).message}`)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteCustomCreature(deleteTarget.id)
      toast(`${deleteTarget.name} deleted`)
      setDeleteTarget(null)
      await reload()
    } catch (e) {
      toast.error(`Failed to delete: ${(e as Error).message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h1 className="text-base font-semibold">Custom Creatures</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCloneFromBestiary}>
            <CloneIcon className="w-3.5 h-3.5 mr-1.5" />
            Clone from Bestiary
          </Button>
          <Button size="sm" onClick={handleNewCreature}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Creature
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 pb-3">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search custom creatures…"
          className="h-8 text-sm max-w-md"
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading && (
          <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
        )}
        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
            <Hammer className="w-10 h-10 text-muted-foreground/30" />
            <div className="space-y-1">
              <p className="text-base font-semibold">No custom creatures yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Build an NPC from benchmarks or start by cloning a bestiary entry.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCloneFromBestiary}>
                Clone from Bestiary
              </Button>
              <Button size="sm" onClick={handleNewCreature}>New Creature</Button>
            </div>
          </div>
        )}
        {!loading && rows.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No creatures match "{debouncedQuery}".
          </p>
        )}
        {!loading && filtered.length > 0 && (
          <div className="space-y-1.5 max-w-2xl">
            {filtered.map((row) => (
              <CustomCreatureListRow
                key={row.id}
                row={row}
                onDelete={(id, name) => setDeleteTarget({ id, name })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete creature?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${deleteTarget?.name ?? ''}" will be removed from custom creatures. Encounters using this creature will fall back to the bestiary copy if one exists. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clone from Bestiary picker */}
      <CloneFromBestiaryDialog
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        onClone={handleCloneSelected}
      />
    </div>
  )
}
