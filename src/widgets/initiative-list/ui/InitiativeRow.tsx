import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, User, Skull, Info, Dices } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { useShallow } from 'zustand/react/shallow'
import { useCombatantStore, isNpc } from '@/entities/combatant'
import { toCreatureStatBlockData } from '@/entities/creature'
import { applyCondition } from '@/entities/condition/lib/condition-bridge'
import { fetchCreatureById } from '@/shared/api/creatures'
import { useHotkeyStore } from '@/shared/model/hotkey-store'
import type { ConditionSlug } from '@engine'
import type { Combatant } from '@/entities/combatant'
import type { ActiveCondition } from '@/entities/condition'

interface SkillOption {
  name: string
  modifier: number
}

interface InitiativeRowProps {
  combatant: Combatant
  conditions: ActiveCondition[]
  isActive: boolean
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
  onCreatureClick?: (creatureRef: string) => void
}

export function InitiativeRow({
  combatant,
  conditions,
  isActive,
  isSelected,
  onSelect,
  onRemove,
  onCreatureClick,
}: InitiativeRowProps) {
  const { t } = useTranslation('common')
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: combatant.id, data: { combatant } })
  const { setInitiative } = useCombatantStore()
  const { cursorMode, resetCursorMode } = useHotkeyStore(
    useShallow((s) => ({ cursorMode: s.cursorMode, resetCursorMode: s.resetCursorMode }))
  )

  const [popoverOpen, setPopoverOpen] = useState(false)
  const [manualValue, setManualValue] = useState(String(combatant.initiative))
  const [skills, setSkills] = useState<SkillOption[]>([])
  const [selectedSkill, setSelectedSkill] = useState('Perception')

  useEffect(() => {
    if (!popoverOpen) return
    setManualValue(String(combatant.initiative))
    const ref = combatant.creatureRef
    if (!ref) { setSkills([]); return }
    fetchCreatureById(ref).then((row) => {
      if (!row) return
      const creature = toCreatureStatBlockData(row)
      const opts: SkillOption[] = [
        { name: 'Perception', modifier: creature.perception },
        ...creature.skills
          .filter((s) => !s.name.toLowerCase().includes('lore'))
          .map((s) => ({ name: s.name, modifier: s.modifier })),
      ]
      setSkills(opts)
      // Keep selected skill if still present, else reset to Perception
      setSelectedSkill((prev) => opts.some((o) => o.name === prev) ? prev : 'Perception')
    })
  }, [popoverOpen, combatant.creatureRef, combatant.initiative])

  function handleManualSet() {
    const val = parseInt(manualValue, 10)
    if (!isNaN(val)) setInitiative(combatant.id, val)
    setPopoverOpen(false)
  }

  function handleRoll() {
    const entry = skills.find((s) => s.name === selectedSkill)
    const mod = entry?.modifier ?? 0
    const d20 = Math.ceil(Math.random() * 20)
    setInitiative(combatant.id, d20 + mod)
    setPopoverOpen(false)
  }

  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      if (cursorMode.type === 'apply-condition') {
        applyCondition(combatant.id, cursorMode.conditionKey as ConditionSlug, cursorMode.value)
        resetCursorMode()
        e.stopPropagation()
        return
      }
      onSelect()
    },
    [cursorMode, combatant.id, resetCursorMode, onSelect]
  )

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const hpPercent = combatant.maxHp > 0 ? (combatant.hp / combatant.maxHp) * 100 : 0
  const stunnedCondition = conditions.find((c) => c.slug === 'stunned' && (c.value ?? 0) > 0) ?? null
  const selectedMod = skills.find((s) => s.name === selectedSkill)?.modifier ?? 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors border border-transparent',
        isActive && 'bg-emerald-500/15 border-emerald-500/40',
        isSelected && !isActive && 'bg-accent/50 border-accent/30',
        !isActive && !isSelected && 'hover:bg-accent/30',
        isDragging && 'opacity-50',
        combatant.hp === 0 && 'opacity-50'
      )}
      onClick={handleRowClick}
    >
      <button
        className="cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <span
            className="text-xs font-mono text-muted-foreground w-8 text-right shrink-0 cursor-pointer hover:text-foreground hover:underline"
            title={t('initiative.clickToSet')}
            onClick={(e) => e.stopPropagation()}
          >
            {combatant.initiative}
          </span>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-3 space-y-3"
          onClick={(e) => e.stopPropagation()}
          side="right"
          align="start"
        >
          {/* Manual input */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('initiative.setManually')}</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualSet() }}
                className="h-8 w-20 text-center font-mono text-sm"
                autoFocus
              />
              <Button size="sm" className="h-8" onClick={handleManualSet}>
                {t('initiative.set')}
              </Button>
            </div>
          </div>

          {/* Skill roll — only for creatures with a ref */}
          {combatant.creatureRef && skills.length > 0 && (
            <div className="space-y-1 border-t pt-3">
              <p className="text-xs text-muted-foreground">{t('initiative.rollInitiative')}</p>
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
        </PopoverContent>
      </Popover>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {combatant.kind !== 'pc' ? (
            <Skull className="w-3 h-3 text-destructive/60 shrink-0" />
          ) : (
            <User className="w-3 h-3 text-primary/60 shrink-0" />
          )}
          {stunnedCondition && (
            <span className="px-1 py-0.5 text-[10px] rounded font-mono font-semibold bg-amber-900/60 text-amber-200 border border-amber-600/50 shrink-0">
              ⚡{stunnedCondition.value}
            </span>
          )}
          {isNpc(combatant) && combatant.weakEliteTier && combatant.weakEliteTier !== 'normal' && (
            <span
              className={cn(
                'px-1 py-0 text-[10px] rounded font-semibold shrink-0',
                combatant.weakEliteTier === 'elite'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-muted text-muted-foreground border border-border/50',
              )}
              title={combatant.weakEliteTier === 'elite' ? t('initiative.elite') : t('initiative.weak')}
            >
              {combatant.weakEliteTier === 'elite' ? 'E' : 'W'}
            </span>
          )}
          <span className="text-sm font-medium truncate">{combatant.displayName}</span>
        </div>
        <div className="mt-0.5 h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              hpPercent > 50 && 'bg-emerald-500',
              hpPercent > 25 && hpPercent <= 50 && 'bg-amber-500',
              hpPercent <= 25 && 'bg-destructive'
            )}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
        {conditions.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {conditions.slice(0, 4).map((c) => (
              <span
                key={c.slug}
                className="text-[9px] px-1 py-px rounded bg-muted text-muted-foreground leading-none"
              >
                {c.slug}{c.value !== undefined && c.value > 1 ? ` ${c.value}` : ''}
              </span>
            ))}
            {conditions.length > 4 && (
              <span className="text-[9px] px-1 py-px text-muted-foreground">
                +{conditions.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      <span className="text-xs font-mono text-muted-foreground shrink-0">
        {combatant.hp}/{combatant.maxHp}
      </span>

      {combatant.creatureRef && onCreatureClick && (
        <button
          type="button"
          className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-primary cursor-pointer transition-colors shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onCreatureClick(combatant.creatureRef!)
          }}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="w-5 h-5 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  )
}
