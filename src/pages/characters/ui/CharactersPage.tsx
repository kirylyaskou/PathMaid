import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { getAllCharacters, deleteCharacter } from '@/shared/api/characters'
import type { CharacterRecord } from '@/shared/api/characters'
import { useCombatantStore } from '@/entities/combatant/model/store'
import { calculatePCMaxHP } from '@engine'
import type { PathbuilderBuild } from '@engine'
import type { Combatant } from '@/entities/combatant/model/types'
import { CharacterCard, ImportDialog, DeleteCharacterDialog, PCSheetPanel } from '@/features/characters'

export function CharactersPage() {
  const navigate = useNavigate()
  const addCombatant = useCombatantStore((s) => s.addCombatant)

  const [characters, setCharacters] = useState<CharacterRecord[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CharacterRecord | null>(null)
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterRecord | null>(null)

  async function loadCharacters() {
    const data = await getAllCharacters()
    setCharacters(data)
  }

  useEffect(() => {
    loadCharacters()
  }, [])

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
      const build = JSON.parse(character.rawJson) as PathbuilderBuild
      const maxHp = calculatePCMaxHP(build)
      const ac = build.acTotal.acProfBonus + build.acTotal.acAbilityBonus + build.acTotal.acItemBonus
      const combatant: Combatant = {
        id: crypto.randomUUID(),
        creatureRef: character.id,
        displayName: character.name,
        initiative: 0,
        hp: maxHp,
        maxHp,
        tempHp: 0,
        isNPC: false,
        ac,
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
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {characters.map((c) => (
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
