import { useEffect, useMemo, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Hammer, Plus, Copy as CloneIcon, UserPlus } from 'lucide-react'
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
  fetchPregenCreatureByName,
} from '@/shared/api'
import {
  toCreatureStatBlockData,
  type CustomCreatureRow,
  type CreatureStatBlockData,
} from '@/entities/creature'
import { PATHS } from '@/shared/routes'
import { CloneFromBestiaryDialog } from '@/features/custom-creature-builder'
import { PregenPickerDialog } from '@/features/pregen-picker'
import type { CharacterRecord } from '@/shared/api'
import { CustomCreatureListRow } from './CustomCreatureListRow'

export function CustomCreaturesListPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [rows, setRows] = useState<CustomCreatureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [pregenOpen, setPregenOpen] = useState(false)

  // Debounce search 200ms (UI-SPEC micro-interactions)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(timer)
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
      toast.error(`${t('customCreatureBuilder.listPage.failedCreate')}: ${(e as Error).message}`)
    }
  }

  function handleCloneFromBestiary() {
    setCloneOpen(true)
  }

  async function handleCloneSelected(data: CreatureStatBlockData) {
    try {
      const id = await createCustomCreature(data, 'foundry_clone')
      toast(t('customCreatureBuilder.listPage.clonedToast', { name: data.name }))
      await reload()
      navigate(PATHS.CUSTOM_CREATURE_EDIT(id))
    } catch (e) {
      toast.error(`${t('customCreatureBuilder.listPage.failedClone')}: ${(e as Error).message}`)
    }
  }

  async function handlePregenPicked(pregen: CharacterRecord) {
    try {
      // Pregens live in BOTH the characters table (iconic PC flow) and the
      // entities table (routed as type='npc' by sync). The custom-creature
      // builder's data model is CreatureStatBlockData, so we pull from
      // entities via name lookup and reuse the same mapper the Clone-from-
      // Bestiary flow uses. Pitfall 8 parity: force source='custom'.
      const entityRow = await fetchPregenCreatureByName(pregen.name)
      if (!entityRow) {
        toast.error(t('customCreatureBuilder.listPage.noBestiaryTwin', { name: pregen.name }))
        return
      }
      const mapped = toCreatureStatBlockData(entityRow)
      const normalized: CreatureStatBlockData = { ...mapped, source: 'custom' }
      const id = await createCustomCreature(normalized, 'foundry_clone')
      toast(t('customCreatureBuilder.listPage.clonedPregenToast', { name: pregen.name }))
      await reload()
      navigate(PATHS.CUSTOM_CREATURE_EDIT(id))
    } catch (e) {
      toast.error(`${t('customCreatureBuilder.listPage.failedClonePregen')}: ${(e as Error).message}`)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteCustomCreature(deleteTarget.id)
      toast(t('customCreatureBuilder.listPage.deletedToast', { name: deleteTarget.name }))
      setDeleteTarget(null)
      await reload()
    } catch (e) {
      toast.error(`${t('customCreatureBuilder.listPage.failedDelete')}: ${(e as Error).message}`)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <h1 className="text-base font-semibold">{t('customCreatureBuilder.listPage.heading')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPregenOpen(true)}>
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            {t('customCreatureBuilder.listPage.usePregen')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCloneFromBestiary}>
            <CloneIcon className="w-3.5 h-3.5 mr-1.5" />
            {t('customCreatureBuilder.listPage.cloneFromBestiary')}
          </Button>
          <Button size="sm" onClick={handleNewCreature}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {t('customCreatureBuilder.listPage.newCreature')}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 pb-3">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('customCreatureBuilder.listPage.searchPlaceholder')}
          className="h-8 text-sm max-w-md"
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {loading && (
          <p className="text-sm text-muted-foreground text-center py-8">{t('customCreatureBuilder.listPage.loading')}</p>
        )}
        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
            <Hammer className="w-10 h-10 text-muted-foreground/30" />
            <div className="space-y-1">
              <p className="text-base font-semibold">{t('customCreatureBuilder.listPage.emptyHeading')}</p>
              <p className="text-sm text-muted-foreground max-w-md">
                {t('customCreatureBuilder.listPage.emptyDesc')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCloneFromBestiary}>
                {t('customCreatureBuilder.listPage.cloneFromBestiaryEmpty')}
              </Button>
              <Button size="sm" onClick={handleNewCreature}>{t('customCreatureBuilder.listPage.newCreatureEmpty')}</Button>
            </div>
          </div>
        )}
        {!loading && rows.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('customCreatureBuilder.listPage.noMatchText', { query: debouncedQuery })}
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
            <AlertDialogTitle>{t('customCreatureBuilder.listPage.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('customCreatureBuilder.listPage.deleteDesc', { name: deleteTarget?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('customCreatureBuilder.listPage.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('customCreatureBuilder.listPage.delete')}
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

      {/* Use Pregen picker — clones an iconic/pregen into custom_creatures */}
      <PregenPickerDialog
        open={pregenOpen}
        onOpenChange={setPregenOpen}
        mode="npc"
        onPick={handlePregenPicked}
      />
    </div>
  )
}
