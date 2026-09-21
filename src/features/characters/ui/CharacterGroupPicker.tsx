import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Users } from 'lucide-react'
import { getAllCharacters, type CharacterGroup, type CharacterRecord } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { logErrorWithToast } from '@/shared/lib/error'
import { useCharacterGroups } from '../model/use-character-groups'

function GroupChoices({ onAdd, onClose }: {
  onAdd: (characters: CharacterRecord[]) => Promise<number>
  onClose: () => void
}) {
  const { t } = useTranslation('common')
  const { groups, loading } = useCharacterGroups()
  const [characters, setCharacters] = useState<CharacterRecord[] | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    getAllCharacters().then(setCharacters).catch(logErrorWithToast('character-groups.characters'))
  }, [])

  async function add(group: CharacterGroup) {
    if (!characters || busy) return
    const members = characters.filter((c) => c.sourceAdventure === null && group.characterIds.includes(c.id))
    if (members.length === 0) { toast.error(t('characterGroups.empty')); return }
    setBusy(true)
    try {
      const count = await onAdd(members)
      toast.success(t(count ? 'characterGroups.added' : 'characterGroups.alreadyPresent', { count }))
      onClose()
    } catch (err) {
      logErrorWithToast('character-groups.add')(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="max-h-80 overflow-y-auto space-y-2">
      {!loading && groups.length === 0 && <p className="text-sm text-muted-foreground">{t('characterGroups.hint')}</p>}
      {groups.map((group) => (
        <Button key={group.id} variant="outline" className="w-full justify-start" disabled={busy || !characters} onClick={() => void add(group)}>{group.name}</Button>
      ))}
    </div>
  )
}

export function CharacterGroupPicker({ onAdd }: { onAdd: (characters: CharacterRecord[]) => Promise<number> }) {
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Users className="h-3.5 w-3.5 mr-1.5" />{t('characterGroups.addGroup')}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('characterGroups.addGroup')}</DialogTitle></DialogHeader>
          {open && <GroupChoices onAdd={onAdd} onClose={close} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
