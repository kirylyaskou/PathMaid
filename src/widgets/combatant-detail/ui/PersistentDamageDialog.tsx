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
import { applyCondition } from '@/features/combat-tracker'
import { getDyingValueOnKnockout } from '@engine'
import type { ConditionSlug } from '@engine'
import type { PendingPersistentDamage } from '@/features/combat-tracker/model/store'

function incrementDying(combatantId: string): void {
  const conditions = useConditionStore.getState().activeConditions
  const dying = conditions.find((c) => c.combatantId === combatantId && c.slug === 'dying')
  const wounded = conditions.find((c) => c.combatantId === combatantId && c.slug === 'wounded')
  const currentDying = dying?.value ?? 0
  const woundedVal = wounded?.value ?? 0
  // If already dying: bump by 1. Otherwise: apply the knockout start value (1 + wounded).
  const next = currentDying > 0
    ? currentDying + 1
    : getDyingValueOnKnockout(woundedVal)
  applyCondition(combatantId, 'dying' as ConditionSlug, next)
}

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
  d20: number
): RollResult {
  // PF2e rule: take damage first, THEN flat check to end condition
  const damage = rollFormula(pc.formula)
  const combatant = useCombatantStore.getState().combatants.find((c) => c.id === combatantId)
  let dyingIncreased = false
  if (combatant && combatant.hp <= 0) {
    incrementDying(combatantId)
    dyingIncreased = true
  } else {
    useCombatantStore.getState().updateHp(combatantId, -damage)
  }

  // Flat check DC 15 to remove condition
  const ended = d20 >= 15
  if (ended) {
    useConditionStore.getState().removeCondition(combatantId, pc.slug)
  }

  return { damageType: pc.damageType, slug: pc.slug, formula: pc.formula, roll: d20, damageDealt: damage, ended, dyingIncreased }
}

interface PersistentDamageDialogProps {
  pending: PendingPersistentDamage | null
  onClose: () => void
}

export function PersistentDamageDialog({ pending, onClose }: PersistentDamageDialogProps) {
  const [rollMode, setRollMode] = useState<'auto' | 'manual'>('auto')
  const [manualRoll, setManualRoll] = useState('')
  const [results, setResults] = useState<RollResult[]>([])
  // manual step: index of the condition currently being rolled
  const [manualStep, setManualStep] = useState(0)

  if (!pending) return null

  const allResolved = results.length === pending.conditions.length
  const currentCondition = pending.conditions[manualStep]

  const handleRollAll = () => {
    const newResults = pending.conditions.map((pc) => {
      const d20 = Math.ceil(Math.random() * 20) // separate roll per condition
      return applyResult(pending.combatantId, pc, d20)
    })
    setResults(newResults)
  }

  const handleManualApply = () => {
    const d20 = parseInt(manualRoll, 10)
    if (isNaN(d20) || d20 < 1 || d20 > 20) return
    const result = applyResult(pending.combatantId, currentCondition, d20)
    setResults((prev) => [...prev, result])
    setManualRoll('')
    setManualStep((s) => s + 1)
  }

  const handleClose = () => {
    setResults([])
    setManualRoll('')
    setRollMode('auto')
    setManualStep(0)
    onClose()
  }

  return (
    <Dialog modal={false} open={!!pending} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Persistent Damage — {pending.combatantName}
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

          <div className="text-center text-sm text-muted-foreground">
            Flat-check DC: <span className="font-mono font-bold text-foreground">15</span>
            <span className="ml-1 text-xs">(one roll per condition)</span>
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
                  Roll All Flat Checks ({pending.conditions.length - results.length} remaining)
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
                </div>
              )}
            </>
          )}

          {allResolved && (
            <div className="space-y-2">
              {results.map((r) => (
                <div key={r.slug} className="p-3 rounded bg-secondary/50 space-y-1 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="capitalize font-medium">{r.damageType}</span>
                    <span className="font-mono text-xs text-muted-foreground">d20 = <span className="font-bold text-foreground">{r.roll}</span></span>
                  </div>
                  <p className={r.dyingIncreased ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                    {r.dyingIncreased
                      ? `${r.damageDealt} damage — Dying +1 (0 HP)`
                      : `${r.damageDealt} ${r.damageType} damage`}
                  </p>
                  <p className={r.ended ? 'text-emerald-400 font-medium' : 'text-amber-400'}>
                    {r.ended ? `d20 ${r.roll} ≥ 15 — condition removed` : `d20 ${r.roll} < 15 — continues`}
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
