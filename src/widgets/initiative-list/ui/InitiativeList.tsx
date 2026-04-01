import { useCallback } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { useCombatantStore } from '@/entities/combatant'
import { useConditionStore } from '@/entities/condition'
import { useCombatTrackerStore, clearCombatantManager } from '@/features/combat-tracker'
import { useShallow } from 'zustand/react/shallow'
import { InitiativeRow } from './InitiativeRow'

interface InitiativeListProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function InitiativeList({ selectedId, onSelect }: InitiativeListProps) {
  const combatants = useCombatantStore(useShallow((s) => s.combatants))
  const conditions = useConditionStore(useShallow((s) => s.activeConditions))
  const activeCombatantId = useCombatTrackerStore(
    useShallow((s) => s.activeCombatantId)
  )
  const { removeCombatant, reorderInitiative } = useCombatantStore()

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = combatants.findIndex((c) => c.id === active.id)
      const newIndex = combatants.findIndex((c) => c.id === over.id)
      const reordered = arrayMove(
        combatants.map((c) => c.id),
        oldIndex,
        newIndex
      )
      reorderInitiative(reordered)
    },
    [combatants, reorderInitiative]
  )

  const handleRemove = useCallback(
    (id: string) => {
      removeCombatant(id)
      clearCombatantManager(id)
    },
    [removeCombatant]
  )

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-0.5">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={combatants.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {combatants.map((combatant) => (
              <InitiativeRow
                key={combatant.id}
                combatant={combatant}
                conditions={conditions.filter(
                  (c) => c.combatantId === combatant.id
                )}
                isActive={combatant.id === activeCombatantId}
                isSelected={combatant.id === selectedId}
                onSelect={() => onSelect(combatant.id)}
                onRemove={() => handleRemove(combatant.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
        {combatants.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Add creatures from the bestiary or add PCs to begin.
          </p>
        )}
      </div>
    </ScrollArea>
  )
}
