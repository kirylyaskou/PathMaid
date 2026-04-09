import { useCallback, useState } from 'react'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useCombatantStore } from '@/entities/combatant'
import { useConditionStore } from '@/entities/condition'
import { useCombatTrackerStore, clearCombatantManager, rollInitiative } from '@/features/combat-tracker'
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
  const { removeCombatant, setInitiative } = useCombatantStore()
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const allZeroInit = combatants.length > 0 && combatants.every((c) => c.initiative === 0)
  const showBanner = allZeroInit && !bannerDismissed

  function handleRollAll() {
    combatants.forEach((c) => {
      setInitiative(c.id, rollInitiative(0))
    })
    setBannerDismissed(true)
  }

  const handleRemove = useCallback(
    (id: string) => {
      removeCombatant(id)
      clearCombatantManager(id)
    },
    [removeCombatant]
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-2 space-y-0.5">
        {showBanner && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded bg-amber-950/50 border border-amber-800/50 text-xs text-amber-200">
            <span className="flex-1">⚠ Initiative not set</span>
            <button
              className="px-2 py-0.5 rounded bg-amber-700/60 hover:bg-amber-700 transition-colors"
              onClick={handleRollAll}
            >
              Roll All Initiative
            </button>
            <button
              className="px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
              onClick={() => setBannerDismissed(true)}
            >
              Set Manually
            </button>
          </div>
        )}
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
        {combatants.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Add creatures from the bestiary or add PCs to begin.
          </p>
        )}
      </div>
    </div>
  )
}
