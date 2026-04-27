import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dices, Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { removeCondition, setConditionValue } from '@/entities/condition'
import { fetchCreatureById } from '@/shared/api/creatures'
import type { PendingSickenedSave } from '@/features/combat-tracker'

// PF2e CRB: Sickened end-of-turn recovery.
// Attempt a Fortitude save vs DC 15.
// Critical success: remove sickened entirely.
// Success: reduce sickened value by 1.
// Failure / Critical failure: no change.

const DEFAULT_DC = 15

type SaveOutcome = 'critical-success' | 'success' | 'failure'

function getSaveOutcome(total: number, dc: number): SaveOutcome {
  if (total >= dc + 10) return 'critical-success'
  if (total >= dc) return 'success'
  return 'failure'
}

function applyOutcome(
  combatantId: string,
  sickenedValue: number,
  outcome: SaveOutcome,
): void {
  if (outcome === 'critical-success') {
    removeCondition(combatantId, 'sickened')
  } else if (outcome === 'success') {
    if (sickenedValue <= 1) {
      removeCondition(combatantId, 'sickened')
    } else {
      setConditionValue(combatantId, 'sickened', sickenedValue - 1)
    }
  }
  // failure: no change
}

interface SickenedFortitudeSaveDialogProps {
  pending: PendingSickenedSave | null
  onClose: () => void
}

export function SickenedFortitudeSaveDialog({ pending, onClose }: SickenedFortitudeSaveDialogProps) {
  const { t } = useTranslation('common')
  const [rollMode, setRollMode] = useState<'auto' | 'manual'>('auto')
  const [manualRoll, setManualRoll] = useState('')
  const [dc, setDc] = useState(DEFAULT_DC)
  const [result, setResult] = useState<{ d20: number; total: number; outcome: SaveOutcome } | null>(null)
  const [fortMod, setFortMod] = useState(0)

  useEffect(() => {
    if (!pending?.creatureRef) { setFortMod(0); return }
    fetchCreatureById(pending.creatureRef).then((creature) => {
      setFortMod(creature?.fort ?? 0)
    })
  }, [pending?.creatureRef])

  if (!pending) return null

  const resolved = result !== null

  const handleAutoRoll = () => {
    const d20 = Math.ceil(Math.random() * 20)
    const total = d20 + fortMod
    const outcome = getSaveOutcome(total, dc)
    applyOutcome(pending.combatantId, pending.sickenedValue, outcome)
    setResult({ d20, total, outcome })
  }

  const handleManualApply = () => {
    const total = parseInt(manualRoll, 10)
    if (isNaN(total) || total < -20 || total > 40) return
    const outcome = getSaveOutcome(total, dc)
    applyOutcome(pending.combatantId, pending.sickenedValue, outcome)
    setResult({ d20: total - fortMod, total, outcome })
    setManualRoll('')
  }

  const handleClose = () => {
    setResult(null)
    setManualRoll('')
    setRollMode('auto')
    setDc(DEFAULT_DC)
    onClose()
  }

  const outcomeLabel: Record<SaveOutcome, string> = {
    'critical-success': 'Critical Success — Sickened removed',
    'success': pending.sickenedValue <= 1
      ? 'Success — Sickened removed'
      : `Success — Sickened ${pending.sickenedValue} → ${pending.sickenedValue - 1}`,
    'failure': 'Failure — no change',
  }

  const outcomeColor: Record<SaveOutcome, string> = {
    'critical-success': 'text-emerald-400',
    'success': 'text-emerald-400',
    'failure': 'text-amber-400',
  }

  return (
    <Dialog open={!!pending} onOpenChange={(o) => { if (!o && resolved) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Fortitude Save — {pending.combatantName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="px-2 py-1.5 rounded bg-secondary/30 flex items-center justify-between text-sm">
            <span className="font-medium">{t('combatantDetail.sickenedValue', { value: pending.sickenedValue })}</span>
            <span className="text-xs text-muted-foreground">end-of-turn recovery</span>
          </div>

          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>
              Fort mod:{' '}
              <span className="font-mono font-bold text-foreground">
                {fortMod >= 0 ? `+${fortMod}` : `${fortMod}`}
              </span>
            </span>
            <span className="flex items-center gap-1">
              DC:
              <Input
                type="number"
                value={dc}
                onChange={(e) => setDc(Math.max(1, Math.min(40, parseInt(e.target.value, 10) || DEFAULT_DC)))}
                className="h-7 w-14 text-center text-sm font-mono font-bold"
                min={1}
                max={40}
              />
            </span>
          </div>

          {!resolved && (
            <>
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

              {rollMode === 'auto' && (
                <Button className="w-full" onClick={handleAutoRoll}>
                  Roll Fortitude Save
                </Button>
              )}

              {rollMode === 'manual' && (
                <div className="space-y-2">
                  <p className="text-center text-xs text-muted-foreground">
                    Enter total (d20 + Fort mod)
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      type="number"
                      value={manualRoll}
                      onChange={(e) => setManualRoll(e.target.value)}
                      placeholder="total"
                      className="h-8 w-20 text-center text-sm"
                      min={-20}
                      max={40}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleManualApply()}
                    />
                    <Button onClick={handleManualApply} disabled={!manualRoll}>
                      Apply
                    </Button>
                  </div>
                </div>
              )}

              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleClose}>
                Skip (DM Fiat)
              </Button>
            </>
          )}

          {resolved && result && (
            <div className="space-y-2">
              <div className="p-3 rounded bg-secondary/50 space-y-1 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{t('combatantDetail.fortitudeSave')}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {result.d20}
                    {fortMod !== 0 && (
                      <> {fortMod >= 0 ? '+' : ''}{fortMod} = <span className="font-bold text-foreground">{result.total}</span></>
                    )}
                    {fortMod === 0 && (
                      <> = <span className="font-bold text-foreground">{result.total}</span></>
                    )}
                    {' '}vs DC {dc}
                  </span>
                </div>
                <p className={outcomeColor[result.outcome]}>
                  {outcomeLabel[result.outcome]}
                </p>
              </div>
              <Button className="w-full" variant="outline" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
