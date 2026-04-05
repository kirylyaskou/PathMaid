import { useState } from 'react'
import { X, RotateCcw, Columns2 } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { useEncounterTabsStore } from '@/features/combat-tracker'
import type { EncounterTab } from '@/features/combat-tracker'
import { cn } from '@/shared/lib/utils'
import { BlueprintSelectorDialog } from './BlueprintSelectorDialog'

interface DroppableTabProps {
  tab: EncounterTab
  isActive: boolean
  onSelect: () => void
  onClose: (e: React.MouseEvent) => void
  onReset: (e: React.MouseEvent) => void
}

function DroppableTab({ tab, isActive, onSelect, onClose, onReset }: DroppableTabProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `tab-drop-${tab.id}`,
    disabled: isActive,
  })

  return (
    <div
      ref={isActive ? undefined : setNodeRef}
      className={cn(
        'group px-3 py-1.5 text-sm font-medium flex items-center gap-2 shrink-0 cursor-pointer border-r border-border/30 h-full select-none',
        isActive
          ? 'bg-card border-b-2 border-b-primary text-foreground'
          : 'bg-muted/30 text-muted-foreground hover:bg-muted/50',
        !isActive && isOver && 'ring-2 ring-primary bg-primary/10'
      )}
      onClick={onSelect}
    >
      <span className="max-w-[120px] truncate">{tab.name}</span>
      {/* Reset button */}
      <button
        className="w-4 h-4 opacity-0 group-hover:opacity-100 rounded hover:bg-amber-500/20 flex items-center justify-center transition-opacity"
        onClick={onReset}
        title="Reset to blueprint"
      >
        <RotateCcw className="w-3 h-3" />
      </button>
      {/* Close button */}
      <button
        className="w-4 h-4 opacity-0 group-hover:opacity-100 rounded hover:bg-destructive/20 flex items-center justify-center transition-opacity"
        onClick={onClose}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

export function EncounterTabBar() {
  const openTabs = useEncounterTabsStore((s) => s.openTabs)
  const activeTabId = useEncounterTabsStore((s) => s.activeTabId)
  const setActiveTab = useEncounterTabsStore((s) => s.setActiveTab)
  const closeTab = useEncounterTabsStore((s) => s.closeTab)
  const resetTab = useEncounterTabsStore((s) => s.resetTab)
  const splitMode = useEncounterTabsStore((s) => s.splitMode)
  const toggleSplitMode = useEncounterTabsStore((s) => s.toggleSplitMode)

  const [showSelector, setShowSelector] = useState(false)

  return (
    <div className="flex items-center h-9 border-b border-border/50 bg-muted/20 shrink-0 overflow-x-auto">
      {openTabs.map((tab) => (
        <DroppableTab
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onSelect={() => setActiveTab(tab.id)}
          onClose={(e) => {
            e.stopPropagation()
            closeTab(tab.id)
          }}
          onReset={(e) => {
            e.stopPropagation()
            resetTab(tab.id)
          }}
        />
      ))}

      {/* Add tab button */}
      <button
        className="px-2 h-full flex items-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0 text-lg leading-none"
        onClick={() => setShowSelector(true)}
        title="Open encounter"
      >
        +
      </button>

      <BlueprintSelectorDialog open={showSelector} onOpenChange={setShowSelector} />

      {/* Split view toggle — only visible when 2+ tabs are open */}
      {openTabs.length >= 2 && (
        <div className="ml-auto border-l border-border/30 flex items-center px-1">
          <button
            onClick={toggleSplitMode}
            title={splitMode ? 'Exit split view' : 'Split view'}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded transition-colors',
              splitMode
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Columns2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
