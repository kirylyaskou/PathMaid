import { useState } from 'react'
import { Flame, Dices, Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { useConditionStore } from '@/entities/condition'
import { useCombatantStore } from '@/entities/combatant'
import type { PendingPersistentDamage } from '@/features/combat-tracker/model/store'
import { incrementDyingForCombatant } from '../model/use-combatant-hp'

function rollFormula(formula: string): number {
  const match = formula.match(/^(\d+)d(\d+)(?:\s*\+\s*(\d+))?$/)
  if (match) {
    const [, count, faces, bonus] = match
    let total = 0
    for (let i = 0; i < parseInt(count); i++) {
      total += Math.ceil(Math.random() * parseInt(faces))
    }
    return total + (bonus ? parseInt(bonus) : 0)
  }
  const num = parseInt(formula, 10)
  return isNaN(num) ? 0 : num
}

type RollResult = {
  damageType: string
  slug: string
  formula: string
  roll: number
  damageDealt: number
  ended: boolean       // flat check passed → condition removed
  dyingIncreased?: boolean
}

function applyResult(
  combatantId: string,
  pc: { slug: string; formula: string; damageType: string },
  d20: number,
  flatCheckDC: number,
): RollResult {
  // PF2e rule: take damage first, THEN flat check to end condition
  const damage = rollFormula(pc.formula)
  const combatant = useCombatantStore.getState().combatants.find((c) => c.id === combatantId)
  let dyingIncreased = false
  if (combatant && combatant.hp <= 0) {
    incrementDyingForCombatant(combatantId)
    dyingIncreased = true
  } else {
    useCombatantStore.getState().updateHp(combatantId, -damage)
  }

  // Configurable flat-check DC (default 15 per PF2e rules).
  const ended = d20 >= flatCheckDC
  if (ended) {
    useConditionStore.getState().removeCondition(combatantId, pc.slug)
  }

  return { damageType: pc.damageType, slug: pc.slug, formula: pc.formula, roll: d20, damageDealt: damage, ended, dyingIncreased }
}

interface PersistentDamageDialogProps {
  pending: PendingPersistentDamage | null
  onClose: () => void
}

function applyFlatCheckOnly(
  combatantId: string,
  pc: { slug: string; formula: string; damageType: string },
  d20: number,
  flatCheckDC: number,
): RollResult {
  const ended = d20 >= flatCheckDC
  if (ended) {
    useConditionStore.getState().removeCondition(combatantId, pc.slug)
  }
  return { damageType: pc.damageType, slug: pc.slug, formula: pc.formula, roll: d20, damageDealt: 0, ended }
}

export function PersistentDamageDialog({ pending, onClose }: PersistentDamageDialogProps) {
  const [rollMode, setRollMode] = useState<'auto' | 'manual'>('auto')
  const [manualRoll, setManualRoll] = useState('')
  const [results, setResults] = useState<RollResult[]>([])
  // manual step: index of the condition currently being rolled
  const [manualStep, setManualStep] = useState(0)
  // FEAT-08 D-23: configurable flat-check DC (default 15 per PF2e rules)
  const [flatCheckDC, setFlatCheckDC] = useState(15)

  if (!pending) return null

  const allResolved = results.length === pending.conditions.length
  const currentCondition = pending.conditions[manualStep]

  const rollFn = pending.dealDamage ? applyResult : applyFlatCheckOnly

  // FEAT-08: Roll Save — rolls a single flat check for the current condition
  // using the configurable DC. Shared by the Auto and Manual flows below.
  const handleRollSave = () => {
    const d20 = Math.ceil(Math.random() * 20)
    const target = currentCondition ?? pending.conditions[0]
    if (!target) return
    const result = rollFn(pending.combatantId, target, d20, flatCheckDC)
    setResults((prev) => [...prev, result])
    setManualStep((s) => s + 1)
  }

  const handleRollAll = () => {
    const newResults = pending.conditions.map((pc) => {
      const d20 = Math.ceil(Math.random() * 20)
      return rollFn(pending.combatantId, pc, d20, flatCheckDC)
    })
    setResults(newResults)
  }

  const handleManualApply = () => {
    const d20 = parseInt(manualRoll, 10)
    if (isNaN(d20) || d20 < 1 || d20 > 20) return
    const result = rollFn(pending.combatantId, currentCondition, d20, flatCheckDC)
    setResults((prev) => [...prev, result])
    setManualRoll('')
    setManualStep((s) => s + 1)
  }

  const handleClose = () => {
    setResults([])
    setManualRoll('')
    setRollMode('auto')
    setManualStep(0)
    setFlatCheckDC(15)
    onClose()
  }

  // Block backdrop-click dismiss until all conditions have been rolled.
  // DM can still explicitly skip via the "Skip (DM Fiat)" button.
  return (
    <Dialog open={!!pending} onOpenChange={(o) => { if (!o && allResolved) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            {pending.dealDamage ? 'Persistent Damage' : 'Flat Check'} — {pending.combatantName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Condition list header */}
          <div className="space-y-1">
            {pending.conditions.map((pc, i) => {
              const res = results[i]
              return (
                <div key={pc.slug} className="flex items-center justify-between px-2 py-1.5 rounded bg-secondary/30">
                  <span className="text-sm capitalize font-medium">{pc.damageType}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-orange-400">{pc.formula}</span>
                    {res && (
                      <span className={`text-xs font-mono ${res.ended ? 'text-emerald-400' : 'text-destructive'}`}>
                        d20={res.roll} {res.ended ? '✓' : '✗'}
                      </span>
                    )}
                    {!res && rollMode === 'manual' && i === manualStep && (
                      <span className="text-xs text-pf-gold">← rolling</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Flat-check DC:</span>
            <Input
              type="number"
              value={flatCheckDC}
              onChange={(e) => setFlatCheckDC(Math.max(1, Math.min(40, parseInt(e.target.value, 10) || 15)))}
              className="h-7 w-14 text-center text-sm font-mono font-bold"
              min={1}
              max={40}
            />
            <span className="text-xs">(one roll per condition)</span>
          </div>

          {!allResolved && (
            <>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant={rollMode === 'auto' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => { setRollMode('auto'); setManualStep(results.length) }}
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
                <Button className="w-full" onClick={handleRollAll}>
                  Roll Flat Check (All) — {pending.conditions.length - results.length} remaining
                </Button>
              )}

              {rollMode === 'manual' && currentCondition && (
                <div className="space-y-2">
                  <p className="text-center text-sm text-muted-foreground">
                    Rolling for: <span className="capitalize font-medium text-foreground">{currentCondition.damageType}</span>
                    <span className="text-xs ml-1 font-mono text-orange-400">({currentCondition.formula})</span>
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      type="number"
                      value={manualRoll}
                      onChange={(e) => setManualRoll(e.target.value)}
                      placeholder="1-20"
                      className="h-8 w-20 text-center text-sm"
                      min={1}
                      max={20}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleManualApply()}
                    />
                    <Button onClick={handleManualApply} disabled={!manualRoll}>
                      Apply
                    </Button>
                  </div>
                  <Button variant="secondary" size="sm" className="w-full" onClick={handleRollSave}>
                    Roll Save (auto d20)
                  </Button>
                </div>
              )}
            </>
          )}

          {!allResolved && (
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleClose}>
              Skip (DM Fiat)
            </Button>
          )}

          {allResolved && (
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.slug} className="p-3 rounded bg-secondary/50 space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="capitalize font-medium">{r.damageType}</span>
                    <span className="font-mono text-xs text-muted-foreground">d20 = <span className="font-bold text-foreground">{r.roll}</span></span>
                  </div>
                  {pending.dealDamage && (
                    <p className={r.dyingIncreased ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                      {r.dyingIncreased
                        ? `${r.damageDealt} damage — Dying +1 (0 HP)`
                        : `${r.damageDealt} ${r.damageType} damage`}
                    </p>
                  )}
                  <p className={r.ended ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                    {r.ended ? `d20 ${r.roll} ≥ ${flatCheckDC} — condition removed` : `d20 ${r.roll} < ${flatCheckDC} — continues`}
                  </p>
                </div>
              ))}
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
