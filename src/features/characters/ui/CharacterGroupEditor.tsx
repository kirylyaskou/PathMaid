import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CharacterGroup, CharacterRecord } from '@/shared/api'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { logErrorWithToast } from '@/shared/lib/error'

interface Props {
  group: CharacterGroup
  characters: CharacterRecord[]
  onSave: (group: CharacterGroup) => Promise<void>
  onClose: () => void
}

function GroupMembers({ characters, selected, onToggle }: {
  characters: CharacterRecord[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  const { t } = useTranslation('common')
  return (
    <div className="max-h-72 overflow-y-auto space-y-1 rounded-md border p-2">
      {characters.length === 0 && <p className="p-2 text-sm text-muted-foreground">{t('characterGroups.noCharacters')}</p>}
      {characters.map((character) => (
        <label key={character.id} className="flex items-center gap-3 rounded p-2 hover:bg-muted/50 cursor-pointer">
          <Checkbox checked={selected.includes(character.id)} onCheckedChange={() => onToggle(character.id)} />
          <span className="min-w-0 truncate text-sm">{character.name}</span>
          <span className="ml-auto text-xs text-muted-foreground">{character.class} · {character.level}</span>
        </label>
      ))}
    </div>
  )
}

export function CharacterGroupEditor({ group, characters, onSave, onClose }: Props) {
  const { t } = useTranslation('common')
  const [name, setName] = useState(group.name)
  const [selected, setSelected] = useState(group.characterIds)
  const [saving, setSaving] = useState(false)
  const playerCharacters = useMemo(() => characters.filter((c) => c.sourceAdventure === null), [characters])
  const toggle = useCallback((id: string) => {
    setSelected((ids) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id])
  }, [])
  const close = useCallback(() => { if (!saving) onClose() }, [onClose, saving])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const available = new Set(playerCharacters.map((c) => c.id))
      await onSave({ ...group, name: name.trim(), characterIds: selected.filter((id) => available.has(id)) })
      onClose()
    } catch (err) {
      logErrorWithToast('character-groups.save')(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t('characterGroups.edit')}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-2 text-sm">
            <span>{t('characterGroups.name')}</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} autoFocus required disabled={saving} />
          </label>
          <fieldset disabled={saving} className="space-y-2">
            <legend className="mb-2 text-sm">{t('characterGroups.members')}</legend>
            <GroupMembers characters={playerCharacters} selected={selected} onToggle={toggle} />
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={saving}>{t('characterGroups.cancel')}</Button>
            <Button type="submit" disabled={saving || !name.trim()}>{t('characterGroups.save')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
