import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Skull, Dices, Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { performRecoveryCheck } from '@engine'
import type { RecoveryCheckResult, ConditionSlug } from '@engine'
import { useConditionStore, setConditionValue } from '@/entities/condition'
import { useShallow } from 'zustand/react/shallow'
import { useCombatantHp } from '../model/use-combatant-hp'

interface DyingCascadeDialogProps {
  open: boolean
  onClose: () => void
  combatantId: string
  combatantName: string
  abilities?: { name: string; description: string }[]
  /** 'knockout': shown when HP drops to 0 — apply dying + crit option, no recovery check.
   *  'recovery': shown at start of creature's turn — recovery check only, no crit setup.
   *  Defaults to 'recovery'. */
  mode?: 'knockout' | 'recovery'
}

const DEATH_PREVENTION_KEYWORDS = ['Ferocity', 'Rejuvenation', 'Negative Healing', 'Undead']

export function DyingCascadeDialog({
  open,
  onClose,
  combatantId,
  combatantName,
  abilities,
  mode = 'recovery',
}: DyingCascadeDialogProps) {
  const { t } = useTranslation('common')
  const [rollMode, setRollMode] = useState<'auto' | 'manual'>('auto')
  const [manualRoll, setManualRoll] = useState('')
  const [checkResult, setCheckResult] = useState<RecoveryCheckResult | null>(null)
  const [isDead, setIsDead] = useState(false)

  const { stabilize, knockOut, critKnockOut } = useCombatantHp(combatantId)

  const conditions = useConditionStore(
    useShallow((s) => s.activeConditions.filter((c) => c.combatantId === combatantId))
  )
  const dyingValue = conditions.find((c) => c.slug === 'dying')?.value ?? 0
  const woundedValue = conditions.find((c) => c.slug === 'wounded')?.value ?? 0
  const doomedValue = conditions.find((c) => c.slug === 'doomed')?.value ?? 0

  // Apply initial dying on open if not already dying.
  // Per CRB pg.460: dying starts at 1 + wounded value (handled via @engine pure fn).
  // Uses a ref so we only initialize once per open session — avoids re-applying if
  // the dialog remains open across heal+damage cycles.
  const initializedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (!open) {
      initializedForRef.current = null
      return
    }
    if (initializedForRef.current === combatantId) return
    if (dyingValue === 0) {
      knockOut()
    }
    initializedForRef.current = combatantId
  }, [open, combatantId])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCheckResult(null)
      setIsDead(false)
      setManualRoll('')
    }
  }, [open])

  const hasDeathPrevention = abilities?.some((a) =>
    DEATH_PREVENTION_KEYWORDS.some(
      (kw) => a.name.includes(kw) || a.description.includes(kw)
    )
  )
  const matchedAbilities = abilities?.filter((a) =>
    DEATH_PREVENTION_KEYWORDS.some(
      (kw) => a.name.includes(kw) || a.description.includes(kw)
    )
  )

  const liveDc = 10 + dyingValue
  const dc = checkResult ? checkResult.dc : liveDc

  const handleRecoveryCheck = () => {
    const roll = rollMode === 'manual' ? parseInt(manualRoll, 10) : undefined
    if (rollMode === 'manual' && (isNaN(roll!) || roll! < 1 || roll! > 20)) return

    const result = performRecoveryCheck(dyingValue, doomedValue, roll)
    setCheckResult(result)

    if (result.newDyingValue === -1) {
      const deathThreshold = 4 - doomedValue
      setConditionValue(combatantId, 'dying' as ConditionSlug, deathThreshold)
      setIsDead(true)
    } else if (result.stabilized) {
      stabilize()
    } else {
      setConditionValue(combatantId, 'dying' as ConditionSlug, result.newDyingValue)
    }
  }

  const handleOverride = () => {
    knockOut()
    setIsDead(false)
    setCheckResult(null)
  }

  const handleCritKnockout = () => {
    critKnockOut()
    setCheckResult(null)
    setIsDead(false)
  }

  const outcomeLabel = (outcome: string) => {
    switch (outcome) {
      case 'criticalSuccess': return 'Critical Success'
      case 'success': return 'Success'
      case 'failure': return 'Failure'
      case 'criticalFailure': return 'Critical Failure'
      default: return outcome
    }
  }

  const outcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'criticalSuccess': return 'text-emerald-400'
      case 'success': return 'text-green-400'
      case 'failure': return 'text-amber-400'
      case 'criticalFailure': return 'text-destructive'
      default: return ''
    }
  }

  return (
    <Dialog modal={true} open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-destructive" />
            Dying — {combatantName}
          </DialogTitle>
          <DialogDescription>
            {mode === 'recovery'
              ? 'Recovery check — roll to stabilize or worsen dying condition'
              : 'Knocked out — apply dying condition and optional critical penalty'}
          </DialogDescription>
        </DialogHeader>

        {isDead ? (
          <div className="text-center space-y-4 py-4">
            <Skull className="w-16 h-16 mx-auto text-destructive" />
            <p className="text-2xl font-bold text-destructive">DEAD</p>
            <p className="text-sm text-muted-foreground">
              Dying reached {4 - doomedValue} (death threshold)
            </p>
            <Button variant="outline" size="sm" onClick={handleOverride}>
              Override (DM Fiat)
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {hasDeathPrevention && matchedAbilities && (
              <div className="p-2 rounded bg-amber-900/20 border border-amber-600/30 text-xs text-amber-400">
                Death-prevention abilities detected: {matchedAbilities.map((a) => a.name).join(', ')}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('combatantDetail.dyingLabel')}</p>
                <p className="text-2xl font-mono font-bold text-destructive">{dyingValue}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('combatantDetail.woundedLabel')}</p>
                <p className="text-2xl font-mono font-bold text-amber-400">{woundedValue}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('combatantDetail.doomedLabel')}</p>
                <p className="text-2xl font-mono font-bold text-purple-400">{doomedValue}</p>
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              Recovery DC: <span className="font-mono font-bold text-foreground">{dc}</span>
              <span className="ml-2 text-xs">(death at dying {4 - doomedValue})</span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button
                variant={rollMode === 'auto' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setRollMode('auto')}
              >
                <Dices className="w-3 h-3" />
                Auto Roll
              </Button>
              <Button
                variant={rollMode === 'manual' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setRollMode('manual')}
              >
                <Keyboard className="w-3 h-3" />
                Manual d20
              </Button>
            </div>

            {rollMode === 'manual' && (
              <div className="flex items-center justify-center gap-2">
                <Input
                  type="number"
                  value={manualRoll}
                  onChange={(e) => setManualRoll(e.target.value)}
                  placeholder="1-20"
                  className="h-8 w-20 text-center text-sm"
                  min={1}
                  max={20}
                  onKeyDown={(e) => e.key === 'Enter' && handleRecoveryCheck()}
                />
              </div>
            )}

            {mode === 'recovery' && (
              <Button className="w-full" onClick={handleRecoveryCheck}>
                Roll Recovery Check
              </Button>
            )}

            {mode === 'knockout' && (
              <Button
                className="w-full"
                variant="destructive"
                size="sm"
                onClick={handleCritKnockout}
              >
                Knocked Out (Crit) +2
              </Button>
            )}

            <Button
              className="w-full"
              variant="destructive"
              size="sm"
              onClick={() => {
                setConditionValue(combatantId, 'dying' as ConditionSlug, 4 - doomedValue)
                setIsDead(true)
                setCheckResult(null)
              }}
            >
              Kill (no check)
            </Button>

            {checkResult && (
              <div className="p-3 rounded bg-secondary/50 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('combatantDetail.roll')}</span>
                  <span className="font-mono font-bold">{checkResult.roll}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">vs DC</span>
                  <span className="font-mono">{checkResult.dc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('combatantDetail.result')}</span>
                  <span className={`font-bold ${outcomeColor(checkResult.outcome)}`}>
                    {outcomeLabel(checkResult.outcome)}
                  </span>
                </div>
                {checkResult.stabilized && (
                  <p className="text-emerald-400 font-medium text-center pt-1">
                    Stabilized! Wounded increased.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
