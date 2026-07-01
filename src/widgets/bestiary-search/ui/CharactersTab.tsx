import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Loader2, Swords, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { SearchInput } from '@/shared/ui/search-input'
import { getAllCharacters, insertEncounterCombatant, type CharacterRecord } from '@/shared/api'
import { useCombatantStore } from '@/entities/combatant'
import { createCombatantFromCharacter, PCSheetPanel } from '@/features/characters'
import { logErrorWithToast } from '@/shared/lib/error'

interface CharactersTabProps {
  encounterId?: string
}

interface CharacterRowProps {
  character: CharacterRecord
  adding: boolean
  onAdd: (character: CharacterRecord) => void
  onView: (character: CharacterRecord) => void
}

function CharacterSearchRow({ character, adding, onAdd, onView }: CharacterRowProps) {
  const { t } = useTranslation('common')

  return (
    <div className="group rounded-md border border-border/40 bg-secondary/25 px-2 py-2 transition-colors hover:border-border/70 hover:bg-secondary/45">
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onView(character)}
        >
          <p className="truncate text-sm font-semibold">{character.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {character.class ?? '-'} - {t('characterCard.level', { level: character.level ?? '?' })}
          </p>
          <p className="truncate text-xs text-muted-foreground/80">{character.ancestry ?? '-'}</p>
        </button>

        <div className="flex shrink-0 gap-1 opacity-80 transition-opacity group-hover:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title={t('characterCard.viewSheet')}
            aria-label={t('characterCard.viewSheet')}
            onClick={() => onView(character)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title={t('characterCard.addToCombat')}
            aria-label={t('characterCard.addToCombat')}
            disabled={adding}
            onClick={() => onAdd(character)}
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CharactersTab({ encounterId }: CharactersTabProps) {
  const { t } = useTranslation('common')
  const [query, setQuery] = useState('')
  const [characters, setCharacters] = useState<CharacterRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterRecord | null>(null)

  const addCombatant = useCombatantStore((s) => s.addCombatant)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAllCharacters()
      .then((rows) => {
        if (!cancelled) setCharacters(rows)
      })
      .catch(logErrorWithToast('characters-tab-load'))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const filteredCharacters = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return characters
    return characters.filter((character) => {
      const haystack = [
        character.name,
        character.class ?? '',
        character.ancestry ?? '',
      ].join(' ').toLowerCase()
      return haystack.includes(normalized)
    })
  }, [characters, query])

  const handleAdd = useCallback(
    async (character: CharacterRecord) => {
      setAddingId(character.id)
      try {
        const currentCombatants = useCombatantStore.getState().combatants
        const combatant = createCombatantFromCharacter(character, currentCombatants)

        if (encounterId) {
          const sortOrder = currentCombatants.length
          await insertEncounterCombatant(encounterId, {
            id: combatant.id,
            encounterId,
            creatureRef: combatant.creatureRef,
            displayName: combatant.displayName,
            initiative: combatant.initiative,
            hp: combatant.hp,
            maxHp: combatant.maxHp,
            tempHp: combatant.tempHp,
            isNPC: false,
            weakEliteTier: 'normal',
            creatureLevel: combatant.level ?? character.level ?? 0,
            sortOrder,
            isHazard: false,
            hazardRef: null,
            side: 'ally',
          }, sortOrder)
        }

        addCombatant(combatant)
        toast(t('bestiarySearch.characterAdded', { name: combatant.displayName }))
      } catch (err) {
        logErrorWithToast('characters-tab-add')(err)
        toast.error(t('bestiarySearch.characterAddFailed', { name: character.name }))
      } finally {
        setAddingId(null)
      }
    },
    [addCombatant, encounterId, t],
  )

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border/50 p-2">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('bestiarySearch.searchCharactersPlaceholder')}
          className="h-8 text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : filteredCharacters.length === 0 ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <UserRound className="h-8 w-8 opacity-30" />
            <p className="text-sm">
              {characters.length === 0
                ? t('bestiarySearch.noCharacters')
                : t('bestiarySearch.noCharactersFoundQuery', { query })}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredCharacters.map((character) => (
              <CharacterSearchRow
                key={character.id}
                character={character}
                adding={addingId === character.id}
                onAdd={handleAdd}
                onView={setSelectedCharacter}
              />
            ))}
          </div>
        )}
      </div>

      <PCSheetPanel
        character={selectedCharacter}
        onClose={() => setSelectedCharacter(null)}
      />
    </div>
  )
}
