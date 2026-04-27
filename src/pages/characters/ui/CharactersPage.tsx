import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Users, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  getAllCharacters,
  deleteCharacter,
  duplicatePregenAsUserCharacter,
} from '@/shared/api/characters'
import type { CharacterRecord } from '@/shared/api/characters'
import { useCombatantStore } from '@/entities/combatant/model/store'
import { calculatePCMaxHP } from '@engine'
import type { PathbuilderExport } from '@engine'
import type { Combatant } from '@/entities/combatant/model/types'
import { CharacterCard, ImportDialog, DeleteCharacterDialog, PCSheetPanel } from '@/features/characters'
import { PregenPickerDialog } from '@/features/pregen-picker'

// 70-04/06: filter chip values for the Characters page. `__user__` is the
// default and matches records with NULL source_adventure (Pathbuilder
// imports). `__iconics__` / adventure slug tokens mirror the tokens stored
// by the sync pipeline.
const USER_FILTER = '__user__'

function sourceChipLabel(token: string): string {
  if (token === USER_FILTER) return 'User imports'
  if (token === '__iconics__') return 'Iconics'
  return (
    'PF ' +
    token
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  )
}

export function CharactersPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const addCombatant = useCombatantStore((s) => s.addCombatant)

  const [characters, setCharacters] = useState<CharacterRecord[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [pregenOpen, setPregenOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CharacterRecord | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterRecord | null>(null)
  // active chip filter. Defaults to user imports per UI-SPEC.
  const [sourceFilter, setSourceFilter] = useState<string>(USER_FILTER)

  async function loadCharacters() {
    const data = await getAllCharacters()
    setCharacters(data)
  }

  useEffect(() => {
    loadCharacters()
  }, [])

  // chip options are derived from the loaded characters so the UI
  // only ever shows sources that actually have rows. Order: User imports
  // → Iconics → alphabetically sorted adventure slugs.
  const chipOptions = useMemo<string[]>(() => {
    const set = new Set<string>()
    for (const c of characters) {
      set.add(c.sourceAdventure ?? USER_FILTER)
    }
    const all = Array.from(set)
    const ordered: string[] = []
    if (all.includes(USER_FILTER)) ordered.push(USER_FILTER)
    if (all.includes('__iconics__')) ordered.push('__iconics__')
    ordered.push(
      ...all
        .filter((v) => v !== USER_FILTER && v !== '__iconics__')
        .sort()
    )
    return ordered
  }, [characters])

  const filteredCharacters = useMemo(() => {
    const wantNull = sourceFilter === USER_FILTER
    return characters.filter((c) =>
      wantNull
        ? c.sourceAdventure === null
        : c.sourceAdventure === sourceFilter
    )
  }, [characters, sourceFilter])

  function handleImportSuccess(name: string) {
    loadCharacters()
    toast(`${name} imported`)
  }

  async function handlePregenPick(pregen: CharacterRecord) {
    try {
      const { name } = await duplicatePregenAsUserCharacter(pregen)
      await loadCharacters()
      // Switch the chip filter back to user imports so the new copy is
      // immediately visible after picking (pregens still show behind the
      // Iconics / adventure chips).
      setSourceFilter(USER_FILTER)
      toast(
        name === pregen.name
          ? `Added ${name} as a new character`
          : `Added ${name} (copy of ${pregen.name}) as a new character`,
      )
    } catch (e) {
      toast.error(`Failed to add pregen: ${(e as Error).message}`)
    }
  }

  async function handleDelete(id: string) {
    await deleteCharacter(id)
    setDeleteTarget(null)
    loadCharacters()
  }

  function handleAddToCombat(character: CharacterRecord) {
    try {
      const exp = JSON.parse(character.rawJson) as PathbuilderExport
      const maxHp = calculatePCMaxHP(exp.build)
      const combatant: Combatant = {
        id: crypto.randomUUID(),
        creatureRef: character.id,
        displayName: character.name,
        initiative: 0,
        hp: maxHp,
        maxHp,
        tempHp: 0,
        kind: 'pc',
      }
      addCombatant(combatant)
      toast(`${character.name} added to combat`, {
        action: {
          label: 'Go to Combat',
          onClick: () => navigate('/combat'),
        },
      })
    } catch {
      toast(`Failed to add ${character.name} to combat`)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
        <h1 className="text-base font-semibold">{t('pages.characters.title')}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPregenOpen(true)}
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            {t('pages.characters.usePregen')}
          </Button>
          <Button size="sm" onClick={() => setImportOpen(true)}>{t('pages.characters.importButton')}</Button>
        </div>
      </header>

      {chipOptions.length > 1 && (
        // 70-04 / the scrolling chip row was awkward on
        // narrow viewports. Replaced with a shadcn Select dropdown; values
        // unchanged (USER_FILTER / '__iconics__' / adventure slug).
        <div className="px-4 pt-3 shrink-0">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-8 text-xs" aria-label={t('pages.characters.sourceFilterAria')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {chipOptions.map((token) => (
                <SelectItem key={token} value={token}>
                  {sourceChipLabel(token)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center gap-3">
            <Users className="w-10 h-10 text-muted-foreground/30" />
            <div>
              <p className="text-base font-semibold text-muted-foreground">{t('pages.characters.noCharacters')}</p>
              <p className="text-sm text-muted-foreground/70 mt-1">{t('pages.characters.importHint')}</p>
            </div>
            <Button size="sm" onClick={() => setImportOpen(true)}>{t('pages.characters.importButton')}</Button>
          </div>
        ) : filteredCharacters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center gap-3">
            <Users className="w-10 h-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {sourceFilter === '__iconics__'
                ? 'Run sync to import Paizo iconics'
                : sourceFilter === USER_FILTER
                ? 'No user-imported characters yet'
                : 'No characters from this source'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredCharacters.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                onAddToCombat={handleAddToCombat}
                onDelete={(ch) => setDeleteTarget(ch)}
                onView={setSelectedCharacter}
              />
            ))}
          </div>
        )}
      </div>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={handleImportSuccess}
      />

      <PregenPickerDialog
        open={pregenOpen}
        onOpenChange={setPregenOpen}
        mode="pc"
        onPick={handlePregenPick}
      />

      <DeleteCharacterDialog
        target={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <PCSheetPanel
        character={selectedCharacter}
        onClose={() => setSelectedCharacter(null)}
      />
    </div>
  )
}
