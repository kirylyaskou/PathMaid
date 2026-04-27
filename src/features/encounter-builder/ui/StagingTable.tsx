import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ArrowRight } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useCombatantStore } from '@/entities/combatant'
import type { NpcCombatant, StagingCombatant } from '@/entities/combatant'
import { saveEncounterStagingCombatants } from '@/shared/api'
import type { EncounterStagingRow } from '@/shared/api'
import { StagingDeployDialog } from '@/widgets/initiative-list/ui/StagingDeployDialog'
import { logErrorWithToast } from '@/shared/lib/error'

interface StagingTableProps {
  encounterId: string
  combatMode?: boolean
}

function toRows(encounterId: string, staging: StagingCombatant[]): EncounterStagingRow[] {
  return staging.map((sc, i) => ({
    id: sc.combatant.id,
    encounterId,
    kind: sc.combatant.kind,
    creatureRef: 'creatureRef' in sc.combatant ? (sc.combatant as NpcCombatant).creatureRef : '',
    displayName: sc.combatant.displayName,
    hp: sc.combatant.hp,
    maxHp: sc.combatant.maxHp,
    tempHp: sc.combatant.tempHp,
    creatureLevel: sc.combatant.level ?? 0,
    weakEliteTier: 'normal' as const,
    round: sc.round ?? null,
    sortOrder: i,
  }))
}

export function StagingTable({ encounterId, combatMode = false }: StagingTableProps) {
  const { t } = useTranslation('common')
  const { stagingCombatants, removeStagingCombatant, releaseFromStaging, updateStagingRound } =
    useCombatantStore(
      useShallow((s) => ({
        stagingCombatants: s.stagingCombatants,
        removeStagingCombatant: s.removeStagingCombatant,
        releaseFromStaging: s.releaseFromStaging,
        updateStagingRound: s.updateStagingRound,
      }))
    )

  const [deployTarget, setDeployTarget] = useState<{
    combatantId: string
    creatureRef: string
    displayName: string
  } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="border border-border/40 rounded-md bg-card/30">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {t('encounterBuilder.stagingPoolHeader', { count: stagingCombatants.length })}
        </span>
      </div>

      <div className="divide-y divide-border/20">
        {stagingCombatants.length === 0 ? (
          <p className="text-sm text-muted-foreground px-3 py-4 text-center">{t('encounterBuilder.noStagedCreatures')}</p>
        ) : (
          stagingCombatants.map((sc) =>
            combatMode ? (
              /* Combat mode row */
              <div key={sc.combatant.id} className="flex items-center gap-2 px-3 py-1.5">
                <span className="flex-1 text-sm truncate">{sc.combatant.displayName}</span>
                {sc.round != null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                    Round {sc.round}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  title={t('encounterBuilder.enterCombatTitle')}
                  onClick={() => {
                    const released = releaseFromStaging(sc.combatant.id)
                    if (!released) return
                    const updated = useCombatantStore.getState().stagingCombatants
                    saveEncounterStagingCombatants(encounterId, toRows(encounterId, updated)).catch(logErrorWithToast('staging-save'))
                    setDeployTarget({
                      combatantId: released.id,
                      creatureRef: 'creatureRef' in released ? (released as NpcCombatant).creatureRef : '',
                      displayName: released.displayName,
                    })
                    setDialogOpen(true)
                  }}
                >
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              /* Planning mode row */
              <div key={sc.combatant.id} className="flex items-center gap-2 px-3 py-1.5 group">
                <span className="flex-1 text-sm truncate">{sc.combatant.displayName}</span>
                <Input
                  type="number"
                  min={1}
                  placeholder={t('encounterBuilder.roundPlaceholder')}
                  value={sc.round ?? ''}
                  className="w-24 h-8"
                  onChange={(e) => {
                    const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                    updateStagingRound(sc.combatant.id, v)
                    const updated = useCombatantStore.getState().stagingCombatants
                    saveEncounterStagingCombatants(encounterId, toRows(encounterId, updated)).catch(logErrorWithToast('staging-save'))
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    removeStagingCombatant(sc.combatant.id)
                    const updated = useCombatantStore.getState().stagingCombatants
                    saveEncounterStagingCombatants(encounterId, toRows(encounterId, updated)).catch(logErrorWithToast('staging-save'))
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )
          )
        )}
      </div>

      <StagingDeployDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        combatantId={deployTarget?.combatantId ?? ''}
        creatureRef={deployTarget?.creatureRef ?? ''}
        displayName={deployTarget?.displayName ?? ''}
      />
    </div>
  )
}
