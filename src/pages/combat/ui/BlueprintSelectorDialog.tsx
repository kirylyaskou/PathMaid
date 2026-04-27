import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { useEncounterStore } from '@/entities/encounter'
import { useEncounterTabsStore, createEmptySnapshot } from '@/features/combat-tracker'
import type { TabSnapshot } from '@/features/combat-tracker'
import { loadEncounterCombatants } from '@/shared/api'
import type { Combatant } from '@/entities/combatant'
import { kindFromLegacy } from '@/entities/combatant'

interface BlueprintSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BlueprintSelectorDialog({ open, onOpenChange }: BlueprintSelectorDialogProps) {
  const { t } = useTranslation('common')
  const encounters = useEncounterStore((s) => s.encounters)

  useEffect(() => {
    if (open) {
      useEncounterStore.getState().loadEncounters()
    }
  }, [open])

  async function handleSelectBlueprint(encounterId: string, encounterName: string) {
    try {
      const encounterCombatants = await loadEncounterCombatants(encounterId)
      const combatants: Combatant[] = encounterCombatants.map((ec) => ({
        id: crypto.randomUUID(),
        creatureRef: ec.creatureRef,
        displayName: ec.displayName,
        initiative: ec.initiative,
        hp: ec.maxHp,
        maxHp: ec.maxHp,
        tempHp: 0,
        kind: kindFromLegacy(ec.isNPC, ec.isHazard ?? false),
      }))
      const snapshot: TabSnapshot = {
        combatants,
        stagingCombatants: [],
        combatId: encounterId,
        activeCombatantId: null,
        round: 1,
        turn: 0,
        isRunning: false,
        isEncounterBacked: true,
      }
      useEncounterTabsStore.getState().openTab({ encounterId, name: encounterName, snapshot })
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to open encounter blueprint:', err)
    }
  }

  function handleBlankEncounter() {
    useEncounterTabsStore.getState().openTab({
      encounterId: null,
      name: 'New Combat',
      snapshot: createEmptySnapshot(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('pages.combat.blueprint.title')}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1 p-1">
            {/* Blank encounter option */}
            <button
              className="w-full text-left px-3 py-2 rounded hover:bg-secondary/50 transition-colors"
              onClick={handleBlankEncounter}
            >
              <div className="text-sm font-medium">{t('pages.combat.blueprint.blankEncounter')}</div>
              <div className="text-xs text-muted-foreground">{t('pages.combat.blueprint.blankEncounterHint')}</div>
            </button>

            {encounters.length > 0 && (
              <div className="border-t border-border/30 pt-1 mt-1">
                {encounters.map((enc) => (
                  <button
                    key={enc.id}
                    className="w-full text-left px-3 py-2 rounded hover:bg-secondary/50 transition-colors"
                    onClick={() => handleSelectBlueprint(enc.id, enc.name)}
                  >
                    <div className="text-sm font-medium">{enc.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Party {enc.partySize} @ Level {enc.partyLevel}
                      {enc.combatants.length > 0 && ` · ${enc.combatants.length} creatures`}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {encounters.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">
                No saved encounters. Create one in the Encounters page first.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
