import { useState } from 'react'
import { Zap, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('common')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [initiative, setInitiative] = useState('')
  const [hp, setHp] = useState('')
  const [ac, setAc] = useState('')
  const [perception, setPerception] = useState('')
  const addCombatant = useCombatantStore((s) => s.addCombatant)
  const combatants = useCombatantStore((s) => s.combatants)

  const reset = () => {
    setName('')
    setInitiative('')
    setHp('')
    setAc('')
    setPerception('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const parsedHp = Math.max(1, parseInt(hp, 10) || 1)
    const parsedInit = parseInt(initiative, 10) || 0
    const parsedAc = ac ? Math.max(0, parseInt(ac, 10) || 0) : undefined
    const parsedPerception = perception ? parseInt(perception, 10) || 0 : undefined

    addCombatant({
      kind: mode === 'creature' ? 'npc' : 'pc',
      id: crypto.randomUUID(),
      creatureRef: '',
      displayName: autoName(trimmed, combatants),
      initiative: parsedInit,
      hp: parsedHp,
      maxHp: parsedHp,
      tempHp: 0,
      side: mode === 'creature' ? 'enemy' : 'ally',
      ...(mode === 'creature' ? { mortal: true } : {}),
      ...(mode === 'creature' && parsedAc !== undefined ? { ac: parsedAc } : {}),
      ...(mode === 'creature' && parsedPerception !== undefined ? { perception: parsedPerception } : {}),
    })
    reset()
    setOpen(false)
  }

  const Icon = mode === 'pc' ? UserPlus : Zap
  const title = mode === 'pc' ? t('combatTracker.quickAdd.pcTitle') : t('combatTracker.quickAdd.creatureTitle')
  const triggerLabel = mode === 'pc' ? t('combatTracker.quickAdd.pcTrigger') : t('combatTracker.quickAdd.creatureTrigger')
  const namePlaceholder = mode === 'pc' ? t('combatTracker.quickAdd.pcNamePlaceholder') : t('combatTracker.quickAdd.creatureNamePlaceholder')

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
            <Label htmlFor="qa-name">{t('combatTracker.quickAdd.name')}</Label>
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
              <Label htmlFor="qa-init">{t('combatTracker.addPc.initiative')}</Label>
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
              <Label htmlFor="qa-hp">{t('combatTracker.quickAdd.hp')}</Label>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="qa-ac">{t('combatTracker.quickAdd.ac')}</Label>
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
              <div>
                <Label htmlFor="qa-perception">{t('combatTracker.quickAdd.perception')}</Label>
                <Input
                  id="qa-perception"
                  type="number"
                  value={perception}
                  onChange={(e) => setPerception(e.target.value)}
                  placeholder="0"
                  min={-99}
                  max={99}
                />
              </div>
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={!name.trim() || !hp}
          >
            {t('combatTracker.quickAdd.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
