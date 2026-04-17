import { useState, useEffect } from 'react'
import { Dices } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useCombatantStore } from '@/entities/combatant'
import { fetchCreatureById } from '@/shared/api/creatures'
import { toCreatureStatBlockData } from '@/entities/creature'

interface SkillOption {
  name: string
  modifier: number
}

interface StagingDeployDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  combatantId: string
  creatureRef: string
  displayName: string
}

export function StagingDeployDialog({
  open,
  onOpenChange,
  combatantId,
  creatureRef,
  displayName,
}: StagingDeployDialogProps) {
  const [skills, setSkills] = useState<SkillOption[]>([])
  const [selectedSkill, setSelectedSkill] = useState('Perception')
  const [manualValue, setManualValue] = useState('')

  useEffect(() => {
    if (!open) return
    setManualValue('')
    if (!creatureRef) {
      setSkills([])
      return
    }
    fetchCreatureById(creatureRef).then((row) => {
      if (!row) return
      const creature = toCreatureStatBlockData(row)
      const opts: SkillOption[] = [
        { name: 'Perception', modifier: creature.perception },
        ...creature.skills
          .filter((s) => !s.name.toLowerCase().includes('lore'))
          .map((s) => ({ name: s.name, modifier: s.modifier })),
      ]
      setSkills(opts)
      setSelectedSkill((prev) => (opts.some((o) => o.name === prev) ? prev : 'Perception'))
    })
  }, [open, creatureRef])

  function handleRoll() {
    const entry = skills.find((s) => s.name === selectedSkill)
    const mod = entry?.modifier ?? 0
    const d20 = Math.ceil(Math.random() * 20)
    useCombatantStore.getState().setInitiative(combatantId, d20 + mod)
    onOpenChange(false)
  }

  function handleSetManual() {
    const v = parseInt(manualValue, 10)
    if (!isNaN(v)) {
      useCombatantStore.getState().setInitiative(combatantId, v)
      onOpenChange(false)
    }
  }

  const selectedMod = skills.find((s) => s.name === selectedSkill)?.modifier ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-72 p-4">
        <DialogHeader>
          <DialogTitle className="text-sm">Initiative — {displayName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          {/* Manual input */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Set manually</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSetManual()
                }}
                className="h-8 w-20 text-center font-mono text-sm"
                placeholder="0"
                autoFocus
              />
              <Button size="sm" className="h-8" onClick={handleSetManual}>
                Set
              </Button>
            </div>
          </div>

          {/* Skill roll */}
          {skills.length > 0 && (
            <div className="space-y-1 border-t pt-3">
              <p className="text-xs text-muted-foreground">Roll initiative</p>
              <div className="flex items-center gap-2">
                <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                  <SelectTrigger className="h-8 flex-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {skills.map((s) => (
                      <SelectItem key={s.name} value={s.name} className="text-xs">
                        {s.name} ({s.modifier >= 0 ? `+${s.modifier}` : s.modifier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 gap-1" onClick={handleRoll}>
                  <Dices className="w-3.5 h-3.5" />
                  d20{selectedMod !== 0 && (
                    <span className="font-mono text-xs">
                      {selectedMod >= 0 ? `+${selectedMod}` : selectedMod}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
