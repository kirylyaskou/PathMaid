import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Swords, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { CharacterGroup, CharacterRecord } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/shared/ui/alert-dialog'
import { logErrorWithToast } from '@/shared/lib/error'
import { useCharacterGroups } from '../model/use-character-groups'
import { addCharacterGroupToCombat } from '../model/add-character-group-to-combat'
import { CharacterGroupEditor } from './CharacterGroupEditor'

function GroupCard({ group, characters, busy, onEdit, onDelete, onAdd }: {
  group: CharacterGroup
  characters: CharacterRecord[]
  busy: boolean
  onEdit: (group: CharacterGroup) => void
  onDelete: (group: CharacterGroup) => void
  onAdd: (group: CharacterGroup, characters: CharacterRecord[]) => Promise<void>
}) {
  const { t } = useTranslation('common')
  const members = useMemo(() => characters.filter((c) => c.sourceAdventure === null && group.characterIds.includes(c.id)), [characters, group.characterIds])
  const names = useMemo(() => members.map((c) => c.name).join(', '), [members])
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{group.name}</h3>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(group)} disabled={busy} aria-label={t('characterGroups.edit')}><Pencil className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(group)} disabled={busy} aria-label={t('characterGroups.delete')}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
      <p className="text-xs text-muted-foreground">{names || t('characterGroups.empty')}</p>
      <Button size="sm" variant="outline" className="gap-2" onClick={() => void onAdd(group, members)} disabled={busy || members.length === 0}>
        <Swords className="h-3.5 w-3.5" />{t('characterGroups.addToCombat')}
      </Button>
    </div>
  )
}

function DeleteGroupDialog({ group, busy, onOpenChange, onConfirm }: {
  group: CharacterGroup | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}) {
  const { t } = useTranslation('common')
  return (
    <AlertDialog open={group !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('characterGroups.deleteTitle', { name: group?.name })}</AlertDialogTitle>
          <AlertDialogDescription>{t('characterGroups.deleteHint')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t('characterGroups.cancel')}</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void onConfirm() }}>{t('characterGroups.delete')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function CharacterGroupsPanel({ characters }: { characters: CharacterRecord[] }) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { groups, loading, save, remove } = useCharacterGroups()
  const [editing, setEditing] = useState<CharacterGroup | null>(null)
  const [deleting, setDeleting] = useState<CharacterGroup | null>(null)
  const [busy, setBusy] = useState(false)
  const closeEditor = useCallback(() => setEditing(null), [])
  const closeDelete = useCallback((open: boolean) => { if (!open) setDeleting(null) }, [])
  const add = useCallback(async (group: CharacterGroup, members: CharacterRecord[]) => {
    setBusy(true)
    try {
      const count = await addCharacterGroupToCombat(members, group.name)
      toast.success(t(count ? 'characterGroups.added' : 'characterGroups.alreadyPresent', { count }))
      navigate('/combat')
    } catch (err) {
      logErrorWithToast('character-groups.add')(err)
    } finally {
      setBusy(false)
    }
  }, [navigate, t])
  const confirmDelete = useCallback(async () => {
    if (!deleting) return
    setBusy(true)
    try {
      await remove(deleting.id)
      setDeleting(null)
    } catch (err) {
      logErrorWithToast('character-groups.delete')(err)
    } finally {
      setBusy(false)
    }
  }, [deleting, remove])

  return (
    <section className="mb-6 space-y-3" aria-label={t('characterGroups.title')}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t('characterGroups.title')}</h2>
        <Button size="sm" variant="outline" disabled={loading || busy} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', characterIds: [] })}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />{t('characterGroups.create')}
        </Button>
      </div>
      {!loading && groups.length === 0 && <p className="text-sm text-muted-foreground">{t('characterGroups.hint')}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => <GroupCard key={group.id} group={group} characters={characters} busy={busy} onEdit={setEditing} onDelete={setDeleting} onAdd={add} />)}
      </div>
      {editing && <CharacterGroupEditor group={editing} characters={characters} onSave={save} onClose={closeEditor} />}
      <DeleteGroupDialog group={deleting} busy={busy} onOpenChange={closeDelete} onConfirm={confirmDelete} />
    </section>
  )
}
