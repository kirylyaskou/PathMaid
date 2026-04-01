import { useState } from 'react'
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shared/ui/resizable'
import { InitiativeList } from '@/widgets/initiative-list'
import { BestiarySearchPanel } from '@/widgets/bestiary-search'
import { CombatControls, AddPCDialog } from '@/features/combat-tracker'

export function CombatPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left panel — Initiative list */}
        <ResizablePanel defaultSize={25} minSize={18} maxSize={35}>
          <div className="flex flex-col h-full">
            <CombatControls />
            <div className="flex-1 min-h-0">
              <InitiativeList selectedId={selectedId} onSelect={setSelectedId} />
            </div>
            <div className="p-2 border-t border-border/50">
              <AddPCDialog />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center panel — Combatant detail (Plan 03) */}
        <ResizablePanel defaultSize={45} minSize={30}>
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {selectedId ? (
              <p className="text-sm">Combatant detail — Plan 03</p>
            ) : (
              <p className="text-sm">Select a combatant to view details</p>
            )}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right panel — Bestiary search */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
          <BestiarySearchPanel />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
