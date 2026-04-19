import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { getAllCharacters, deleteCharacter } from '@/shared/api/characters'
import type { CharacterRecord } from '@/shared/api/characters'
import { useCombatantStore } from '@/entities/combatant/model/store'
import { calculatePCMaxHP } from '@engine'
import type { PathbuilderExport } from '@engine'
import type { Combatant } from '@/entities/combatant/model/types'
import { CharacterCard, ImportDialog, DeleteCharacterDialog, PCSheetPanel } from '@/features/characters'

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
  const navigate = useNavigate()
  const addCombatant = useCombatantStore((s) => s.addCombatant)

  const [characters, setCharacters] = useState<CharacterRecord[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CharacterRecord | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterRecord | null>(null)
  // 70-04: active chip filter. Defaults to user imports per UI-SPEC.
  const [sourceFilter, setSourceFilter] = useState<string>(USER_FILTER)

  async function loadCharacters() {
    const data = await getAllCharacters()
    setCharacters(data)
  }

  useEffect(() => {
    loadCharacters()
  }, [])

  // 70-04: chip options are derived from the loaded characters so the UI
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
        <h1 className="text-base font-semibold">Characters</h1>
        <Button size="sm" onClick={() => setImportOpen(true)}>Import Character</Button>
      </header>

      {chipOptions.length > 1 && (
        <div
          role="tablist"
          aria-label="Character source filter"
          className="px-4 pt-3 flex items-center gap-1.5 overflow-x-auto shrink-0"
        >
          {chipOptions.map((token) => (
            <button
              key={token}
              role="tab"
              aria-selected={sourceFilter === token}
              onClick={() => setSourceFilter(token)}
              className={`px-2.5 py-0.5 text-xs rounded transition-colors shrink-0 ${
                sourceFilter === token
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent/30'
              }`}
            >
              {sourceChipLabel(token)}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center gap-3">
            <Users className="w-10 h-10 text-muted-foreground/30" />
            <div>
              <p className="text-base font-semibold text-muted-foreground">No characters imported yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Import your party from Pathbuilder 2e</p>
            </div>
            <Button size="sm" onClick={() => setImportOpen(true)}>Import Character</Button>
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
