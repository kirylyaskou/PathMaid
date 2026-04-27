import { useCallback, useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useCombatantStore } from '@/entities/combatant'
import { useConditionStore } from '@/entities/condition'
import { useCombatTrackerStore, clearCombatantManager, rollInitiative, useEncounterTabsStore } from '@/features/combat-tracker'
import { fetchCreatureById } from '@/shared/api'
import { useShallow } from 'zustand/react/shallow'
import { StatBlockModal } from '@/entities/creature'
import { InitiativeRow } from './InitiativeRow'

interface InitiativeListProps {
  selectedId: string | null
  onSelect: (id: string) => void
}

export function InitiativeList({ selectedId, onSelect }: InitiativeListProps) {
  const { t } = useTranslation('common')
  const combatants = useCombatantStore(useShallow((s) => s.combatants))
  const conditions = useConditionStore(useShallow((s) => s.activeConditions))
  const activeCombatantId = useCombatTrackerStore(
    useShallow((s) => s.activeCombatantId)
  )
  const { removeCombatant, setInitiative } = useCombatantStore()
  const activeTabId = useEncounterTabsStore((s) => s.activeTabId)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [modalCreatureId, setModalCreatureId] = useState<string | null>(null)
  const allZeroInit = combatants.length > 0 && combatants.every((c) => c.initiative === 0)
  const showBanner = allZeroInit && !bannerDismissed

  // Reset banner when switching tabs so each tab independently shows the
  // "Initiative not set" prompt. Without this, an async handleRollAll that
  // completes after a tab switch would call setBannerDismissed(true) on the
  // wrong tab, permanently hiding the banner on the original tab.
  useEffect(() => {
    setBannerDismissed(false)
  }, [activeTabId])

  async function handleRollAll() {
    const tabAtStart = activeTabId
    await Promise.all(combatants.map(async (c) => {
      let perception = 0
      if (c.creatureRef) {
        const row = await fetchCreatureById(c.creatureRef)
        perception = row?.perception ?? 0
      }
      setInitiative(c.id, rollInitiative(perception))
    }))
    // Only dismiss the banner if the user is still on the same tab.
    // If they switched tabs during the async fetch, the useEffect above
    // already reset bannerDismissed, so we must not override that.
    if (useEncounterTabsStore.getState().activeTabId === tabAtStart) {
      setBannerDismissed(true)
    }
  }

  const handleRemove = useCallback(
    (id: string) => {
      removeCombatant(id)
      clearCombatantManager(id)
    },
    [removeCombatant]
  )

  // Memoize: stable ID array passed as prop to SortableContext; avoids new array reference on every render
  const combatantIds = useMemo(() => combatants.map((c) => c.id), [combatants])

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-2 space-y-0.5">
        {showBanner && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded bg-amber-950/50 border border-amber-800/50 text-xs text-amber-200">
            <span className="flex-1">⚠ {t('initiative.notSet')}</span>
            <button
              className="px-2 py-0.5 rounded bg-amber-700/60 hover:bg-amber-700 transition-colors"
              onClick={handleRollAll}
            >
              {t('initiative.rollAll')}
            </button>
            <button
              className="px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
              onClick={() => setBannerDismissed(true)}
            >
              {t('initiative.setManually')}
            </button>
          </div>
        )}
        <SortableContext
          items={combatantIds}
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
              onCreatureClick={(ref) => setModalCreatureId(ref)}
            />
          ))}
        </SortableContext>
        {combatants.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('combatTracker.addCreaturesToBegin')}
          </p>
        )}
      </div>
      <StatBlockModal
        creatureId={modalCreatureId}
        open={modalCreatureId !== null}
        onOpenChange={(o) => { if (!o) setModalCreatureId(null) }}
      />
    </div>
  )
}
