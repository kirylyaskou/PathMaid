import { useState } from 'react'
import { Zap, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useCombatantStore } from '@/entities/combatant'
import { autoName } from '../lib/initiative'

interface QuickAddCombatantFormProps {
  /**
   * creature: session-only NPC (isNPC=true, ac input shown).
   * pc: session-only custom PC (isNPC=false, no ac input).
   */
  mode: 'creature' | 'pc'
}

/**
 * Lightweight add form for session-only combatants. No DB write, no creatureRef.
 * Used alongside the Bestiary drag-add and AddPCDialog flows for custom entries.
 */
export function QuickAddCombatantForm({ mode }: QuickAddCombatantFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [initiative, setInitiative] = useState('')
  const [hp, setHp] = useState('')
  const [ac, setAc] = useState('')
  const addCombatant = useCombatantStore((s) => s.addCombatant)
  const combatants = useCombatantStore((s) => s.combatants)

  const reset = () => {
    setName('')
    setInitiative('')
    setHp('')
    setAc('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const parsedHp = Math.max(1, parseInt(hp, 10) || 1)
    const parsedInit = parseInt(initiative, 10) || 0
    const parsedAc = ac ? Math.max(0, parseInt(ac, 10) || 0) : undefined

    addCombatant({
      kind: mode === 'creature' ? 'npc' : 'pc',
      id: crypto.randomUUID(),
      creatureRef: '',
      displayName: autoName(trimmed, combatants),
      initiative: parsedInit,
      hp: parsedHp,
      maxHp: parsedHp,
      tempHp: 0,
      ...(mode === 'creature' && parsedAc !== undefined ? { ac: parsedAc } : {}),
    })
    reset()
    setOpen(false)
  }

  const Icon = mode === 'pc' ? UserPlus : Zap
  const title = mode === 'pc' ? 'Add Custom PC' : 'Quick Add Creature'
  const triggerLabel = mode === 'pc' ? 'Custom PC' : 'Quick Add'
  const namePlaceholder = mode === 'pc' ? 'Character name' : 'Creature name'

  return (
    <Dialog modal={false} open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Icon className="w-3.5 h-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="qa-name">Name *</Label>
            <Input
              id="qa-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 50))}
              placeholder={namePlaceholder}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="qa-init">Initiative</Label>
              <Input
                id="qa-init"
                type="number"
                value={initiative}
                onChange={(e) => setInitiative(e.target.value)}
                placeholder="0"
                min={-99}
                max={999}
              />
            </div>
            <div>
              <Label htmlFor="qa-hp">HP *</Label>
              <Input
                id="qa-hp"
                type="number"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                placeholder="10"
                min={1}
                max={9999}
                required
              />
            </div>
          </div>
          {mode === 'creature' && (
            <div>
              <Label htmlFor="qa-ac">AC</Label>
              <Input
                id="qa-ac"
                type="number"
                value={ac}
                onChange={(e) => setAc(e.target.value)}
                placeholder="10"
                min={0}
                max={99}
              />
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={!name.trim() || !hp}
          >
            Add to Combat
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
