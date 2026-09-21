import { useCallback, useEffect, useState } from 'react'
import { getCharacterGroups, saveCharacterGroup, deleteCharacterGroup, type CharacterGroup } from '@/shared/api'
import { logErrorWithToast } from '@/shared/lib/error'

export function useCharacterGroups() {
  const [groups, setGroups] = useState<CharacterGroup[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setGroups(await getCharacterGroups())
  }, [])

  useEffect(() => {
    reload().catch(logErrorWithToast('character-groups.load')).finally(() => setLoading(false))
  }, [reload])

  const save = useCallback(async (group: CharacterGroup) => {
    await saveCharacterGroup(group)
    await reload()
  }, [reload])

  const remove = useCallback(async (id: string) => {
    await deleteCharacterGroup(id)
    await reload()
  }, [reload])

  return { groups, loading, save, remove }
}
