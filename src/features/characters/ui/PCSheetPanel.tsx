import { useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import { ScrollArea } from '@/shared/ui/scroll-area'
import type { CharacterRecord } from '@/shared/api/characters'
import type { PathbuilderBuild, PathbuilderExport } from '@engine'

// ── Internal tab content stubs (filled in by Plans 02 and 03) ────────────

function CoreSkillsContent({ build: _build }: { build: PathbuilderBuild }) {
  return <div className="text-sm text-muted-foreground">Core & Skills — stub</div>
}

function EquipmentContent({ build: _build }: { build: PathbuilderBuild }) {
  return <div className="text-sm text-muted-foreground">Equipment — stub</div>
}

function SpellsContent({ build: _build }: { build: PathbuilderBuild }) {
  return <div className="text-sm text-muted-foreground">Spells — stub</div>
}

function FeatsContent({ build: _build }: { build: PathbuilderBuild }) {
  return <div className="text-sm text-muted-foreground">Feats — stub</div>
}

function NotesContent({ character: _character }: { character: CharacterRecord }) {
  return <div className="text-sm text-muted-foreground">Notes — stub</div>
}

// ── Main PCSheetPanel ─────────────────────────────────────────────────────

interface PCSheetPanelProps {
  character: CharacterRecord | null
  onClose: () => void
}

export function PCSheetPanel({ character, onClose }: PCSheetPanelProps) {
  const build = useMemo(() => {
    if (!character) return null
    try {
      return (JSON.parse(character.rawJson) as PathbuilderExport).build
    } catch {
      return null
    }
  }, [character])

  return (
    <Sheet open={character !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-[460px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-4 pt-4 pb-3 shrink-0 border-b border-border">
          <SheetTitle className="text-xl font-semibold text-primary">
            {character?.name ?? ''}
          </SheetTitle>
          {build && (
            <p className="text-xs text-muted-foreground">
              {build.class} · {build.level} · {build.ancestry}
            </p>
          )}
        </SheetHeader>

        {build === null && character !== null ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Could not read character data.
          </div>
        ) : build ? (
          <Tabs defaultValue="core" className="flex flex-col flex-1 min-h-0">
            <TabsList className="w-full rounded-none border-b border-border h-auto shrink-0 gap-0">
              <TabsTrigger value="core" className="text-xs flex-1">Core & Skills</TabsTrigger>
              <TabsTrigger value="equipment" className="text-xs flex-1">Equipment</TabsTrigger>
              <TabsTrigger value="spells" className="text-xs flex-1">Spells</TabsTrigger>
              <TabsTrigger value="feats" className="text-xs flex-1">Feats</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs flex-1">Notes</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <TabsContent value="core" className="m-0">
                  <CoreSkillsContent build={build} />
                </TabsContent>
                <TabsContent value="equipment" className="m-0">
                  <EquipmentContent build={build} />
                </TabsContent>
                <TabsContent value="spells" className="m-0">
                  <SpellsContent build={build} />
                </TabsContent>
                <TabsContent value="feats" className="m-0">
                  <FeatsContent build={build} />
                </TabsContent>
                <TabsContent value="notes" className="m-0">
                  <NotesContent character={character} />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
