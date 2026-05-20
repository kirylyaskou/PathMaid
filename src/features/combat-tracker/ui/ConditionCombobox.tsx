import { useState, useCallback, useEffect, useMemo } from 'react'
import { Plus, Minus, Check, X, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { CONDITION_SLUGS, VALUED_CONDITIONS, CONDITION_GROUPS } from '@engine'
import type { ConditionSlug, ModifierType } from '@engine'
import { applyCondition, useConditionStore } from '@/entities/condition'
import {
  CUSTOM_PENALTY_TARGETS,
  createCustomPenaltyEffect,
  useEffectStore,
  type CustomPenaltyTargetId,
} from '@/entities/spell-effect'
import { toast } from 'sonner'

interface Props {
  combatantId: string
  existingSlugs: string[]
}

const PERSISTENT_SLUGS = [
  'persistent-fire',
  'persistent-cold',
  'persistent-acid',
  'persistent-bleed',
  'persistent-electricity',
  'persistent-poison',
] as const

const STATIC_GROUPED_SLUGS = [
  ...PERSISTENT_SLUGS,
  ...(CONDITION_GROUPS['death']     ?? []),
  ...(CONDITION_GROUPS['abilities'] ?? []),
  ...(CONDITION_GROUPS['senses']    ?? []),
  ...(CONDITION_GROUPS['detection'] ?? []),
  ...(CONDITION_GROUPS['attitudes'] ?? []),
]
const groupedSet = new Set(STATIC_GROUPED_SLUGS)
const otherSlugs = CONDITION_SLUGS.filter((s) => !groupedSet.has(s))

const fmt = (s: string) => s.split('-').join(' ')
const norm = (s: string) => fmt(s).toLowerCase()
const CUSTOM_MODIFIER_TYPES = ['status', 'circumstance', 'item', 'untyped'] as const satisfies readonly ModifierType[]
type CustomModifierType = (typeof CUSTOM_MODIFIER_TYPES)[number]

function ConditionPill({
  slug,
  disabled,
  selected: _selected,
  onClick,
}: {
  slug: string
  disabled: boolean
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`px-2 py-1.5 rounded text-xs capitalize cursor-pointer text-left break-words
        ${disabled
          ? 'opacity-50 cursor-not-allowed bg-secondary/20'
          : 'bg-secondary/30 hover:bg-secondary/50 border border-border/30'
        }`}
      disabled={disabled}
      onClick={onClick}
    >
      {fmt(slug)}
      {disabled && <Check className="w-2.5 h-2.5 inline ml-1 opacity-50" />}
    </button>
  )
}

function ModifierTypeButton({
  type,
  label,
  selected,
  onClick,
}: {
  type: CustomModifierType
  label: string
  selected: boolean
  onClick: (type: CustomModifierType) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onClick(type)}
      className={`px-2 py-1.5 rounded text-xs capitalize border transition-colors
        ${selected
          ? 'border-primary/60 bg-primary/15 text-primary'
          : 'border-border/30 bg-secondary/20 hover:bg-secondary/40'
        }`}
    >
      {label}
    </button>
  )
}

function CustomTargetButton({
  id,
  label,
  selected,
  onToggle,
}: {
  id: CustomPenaltyTargetId
  label: string
  selected: boolean
  onToggle: (id: CustomPenaltyTargetId) => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onToggle(id)}
      className={`px-2 py-1.5 rounded text-xs text-left border transition-colors
        ${selected
          ? 'border-primary/60 bg-primary/15 text-primary'
          : 'border-border/30 bg-secondary/20 hover:bg-secondary/40'
        }`}
    >
      {label}
    </button>
  )
}

interface CustomPenaltyFormProps {
  name: string
  penalty: number
  modifierType: CustomModifierType
  targetIds: CustomPenaltyTargetId[]
  targetOptions: Array<{ id: CustomPenaltyTargetId; label: string }>
  modifierLabels: Record<CustomModifierType, string>
  onBack: () => void
  onNameChange: (value: string) => void
  onPenaltyChange: (value: number) => void
  onModifierTypeChange: (type: CustomModifierType) => void
  onTargetToggle: (id: CustomPenaltyTargetId) => void
  onApply: () => void
}

function CustomPenaltyForm({
  name,
  penalty,
  modifierType,
  targetIds,
  targetOptions,
  modifierLabels,
  onBack,
  onNameChange,
  onPenaltyChange,
  onModifierTypeChange,
  onTargetToggle,
  onApply,
}: CustomPenaltyFormProps) {
  const { t } = useTranslation('common')
  const canApply = penalty > 0 && targetIds.length > 0

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground">
          &#8592; {t('combatTracker.conditions.back')}
        </button>
        <span className="text-sm font-medium">
          {t('combatTracker.conditions.customPenalty.title')}
        </span>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {t('combatTracker.conditions.customPenalty.name')}
        </label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('combatTracker.conditions.customPenalty.namePlaceholder')}
          className="h-8 text-sm"
        />
      </div>

      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t('combatTracker.conditions.customPenalty.modifierType')}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {CUSTOM_MODIFIER_TYPES.map((type) => (
              <ModifierTypeButton
                key={type}
                type={type}
                label={modifierLabels[type]}
                selected={modifierType === type}
                onClick={onModifierTypeChange}
              />
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t('combatTracker.conditions.customPenalty.penalty')}
          </label>
          <Input
            type="number"
            min={1}
            step={1}
            value={penalty}
            onChange={(e) => onPenaltyChange(Number(e.target.value))}
            className="h-8 text-sm font-mono"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {t('combatTracker.conditions.customPenalty.targets')}
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {targetOptions.map((target) => (
            <CustomTargetButton
              key={target.id}
              id={target.id}
              label={target.label}
              selected={targetIds.includes(target.id)}
              onToggle={onTargetToggle}
            />
          ))}
        </div>
      </div>

      <Button className="w-full h-8 text-xs" onClick={onApply} disabled={!canApply}>
        <Check className="w-3 h-3 mr-1" />
        {t('combatTracker.conditions.customPenalty.apply', { penalty })}
      </Button>
    </div>
  )
}

export function ConditionCombobox({ combatantId, existingSlugs }: Props) {
  const { t } = useTranslation('common')

  const SECTIONS = useMemo(
    () => [
      { label: t('combatTracker.conditions.sectionPersistentDamage'), slugs: PERSISTENT_SLUGS },
      { label: t('combatTracker.conditions.sectionDeath'),     slugs: CONDITION_GROUPS['death']     ?? [] },
      { label: t('combatTracker.conditions.sectionAbilities'), slugs: CONDITION_GROUPS['abilities'] ?? [] },
      { label: t('combatTracker.conditions.sectionSenses'),    slugs: CONDITION_GROUPS['senses']    ?? [] },
      { label: t('combatTracker.conditions.sectionDetection'), slugs: CONDITION_GROUPS['detection'] ?? [] },
      { label: t('combatTracker.conditions.sectionAttitudes'), slugs: CONDITION_GROUPS['attitudes'] ?? [] },
    ],
    [t],
  )

  const allSlugs = useMemo(
    () => [...SECTIONS.flatMap((s) => [...s.slugs]), ...otherSlugs],
    [SECTIONS],
  )

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [value, setValue] = useState(1)
  const [formula, setFormula] = useState('')
  const [showCustomPenalty, setShowCustomPenalty] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPenalty, setCustomPenalty] = useState(1)
  const [customModifierType, setCustomModifierType] = useState<CustomModifierType>('status')
  const [customTargetIds, setCustomTargetIds] = useState<CustomPenaltyTargetId[]>(['all'])

  const isPersistent = selected?.startsWith('persistent-') ?? false
  const isValued =
    selected != null &&
    !isPersistent &&
    (VALUED_CONDITIONS as readonly string[]).includes(selected)

  const resetCustomPenalty = useCallback(() => {
    setShowCustomPenalty(false)
    setCustomName('')
    setCustomPenalty(1)
    setCustomModifierType('status')
    setCustomTargetIds(['all'])
  }, [])

  const resetConditionDraft = useCallback(() => {
    setSelected(null)
    setValue(1)
    setFormula('')
    setSearch('')
    resetCustomPenalty()
  }, [resetCustomPenalty])

  const close = useCallback(() => {
    setOpen(false)
    resetConditionDraft()
  }, [resetConditionDraft])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  const handleOpenChange = useCallback((o: boolean) => {
    setOpen(o)
    if (!o) resetConditionDraft()
  }, [resetConditionDraft])

  const handleBack = useCallback(() => {
    setSelected(null)
    setValue(1)
    setFormula('')
    setShowCustomPenalty(false)
  }, [])

  const handleCustomPenaltyBack = useCallback(() => {
    resetCustomPenalty()
  }, [resetCustomPenalty])

  const handleToggleCustomTarget = useCallback((targetId: CustomPenaltyTargetId) => {
    setCustomTargetIds((prev) =>
      prev.includes(targetId)
        ? prev.filter((id) => id !== targetId)
        : [...prev, targetId],
    )
  }, [])

  const handleSelect = useCallback(
    (slug: string) => {
      if (slug.startsWith('persistent-')) {
        setSelected(slug)
        setFormula('')
      } else if ((VALUED_CONDITIONS as readonly string[]).includes(slug)) {
        setSelected(slug)
        setValue(1)
      } else {
        // Close dialog BEFORE store update to avoid useSyncExternalStore race with Radix effects
        setOpen(false)
        setSelected(null)
        const granted = applyCondition(combatantId, slug as ConditionSlug)
        if (granted.length > 0) {
          toast(`Applied ${slug} — also granted: ${granted.join(', ')}`)
        }
      }
    },
    [combatantId],
  )

  const handleApplyValued = useCallback(() => {
    if (!selected) return
    const slug = selected
    const v = value
    // Close dialog BEFORE store update
    setOpen(false)
    setSelected(null)
    setValue(1)
    const granted = applyCondition(combatantId, slug as ConditionSlug, v)
    if (granted.length > 0) {
      toast(`Applied ${slug} ${v} — also granted: ${granted.join(', ')}`)
    }
  }, [combatantId, selected, value])

  const handleApplyPersistent = useCallback(() => {
    if (!selected || !formula.trim()) return
    const slug = selected
    const f = formula.trim()
    // Close dialog BEFORE store update
    setOpen(false)
    setSelected(null)
    setFormula('')
    useConditionStore.getState().setCondition({
      combatantId,
      slug,
      value: 1,
      formula: f,
    })
    toast(`Applied ${slug.replace('persistent-', 'persistent ')} (${f})`)
  }, [combatantId, selected, formula])

  const handleApply = useCallback(() => {
    if (isPersistent) handleApplyPersistent()
    else handleApplyValued()
  }, [isPersistent, handleApplyPersistent, handleApplyValued])

  const matchesSearch = useCallback(
    (s: string) => norm(s).includes(norm(search)),
    [search],
  )

  const filteredSlugs = useMemo(
    () => (search ? allSlugs.filter(matchesSearch) : []),
    [search, matchesSearch],
  )

  const customTargetOptions = useMemo(
    () =>
      CUSTOM_PENALTY_TARGETS.map((target) => ({
        id: target.id,
        label: t(`combatTracker.conditions.customPenalty.targetsList.${target.id}`),
      })),
    [t],
  )

  const customModifierLabels = useMemo<Record<CustomModifierType, string>>(
    () => ({
      status: t('combatTracker.conditions.customPenalty.modifierTypes.status'),
      circumstance: t('combatTracker.conditions.customPenalty.modifierTypes.circumstance'),
      item: t('combatTracker.conditions.customPenalty.modifierTypes.item'),
      untyped: t('combatTracker.conditions.customPenalty.modifierTypes.untyped'),
    }),
    [t],
  )

  const handleApplyCustomPenalty = useCallback(() => {
    if (customPenalty <= 0 || customTargetIds.length === 0) return
    const targetLabels = customTargetOptions
      .filter((target) => customTargetIds.includes(target.id))
      .map((target) => target.label)
    const effect = createCustomPenaltyEffect({
      combatantId,
      name: customName,
      penalty: customPenalty,
      modifierType: customModifierType,
      targetIds: customTargetIds,
      targetLabels,
    })
    useEffectStore.getState().addEffect(effect)
    toast(t('combatTracker.conditions.customPenalty.appliedToast', { name: effect.effectName }))
    close()
  }, [
    close,
    combatantId,
    customModifierType,
    customName,
    customPenalty,
    customTargetIds,
    customTargetOptions,
    t,
  ])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Plus className="w-3 h-3" />
          {t('combatTracker.conditions.addButton')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-sm">{t('combatTracker.conditions.addButton')}</DialogTitle>
        </DialogHeader>

        {showCustomPenalty ? (
          <CustomPenaltyForm
            name={customName}
            penalty={customPenalty}
            modifierType={customModifierType}
            targetIds={customTargetIds}
            targetOptions={customTargetOptions}
            modifierLabels={customModifierLabels}
            onBack={handleCustomPenaltyBack}
            onNameChange={setCustomName}
            onPenaltyChange={(next) => setCustomPenalty(Number.isFinite(next) ? Math.max(1, next) : 1)}
            onModifierTypeChange={setCustomModifierType}
            onTargetToggle={handleToggleCustomTarget}
            onApply={handleApplyCustomPenalty}
          />
        ) : selected && isPersistent ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="text-xs text-muted-foreground hover:text-foreground">
                &#8592; {t('combatTracker.conditions.back')}
              </button>
              <span className="text-sm font-medium capitalize">
                {selected.replace('persistent-', 'persistent ')}
              </span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('combatTracker.conditions.diceFormula')}</label>
              <Input
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="e.g. 2d6"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleApplyPersistent()}
              />
            </div>
            <Button className="w-full h-8 text-xs" onClick={handleApplyPersistent} disabled={!formula.trim()}>
              <Check className="w-3 h-3 mr-1" />
              {t('combatTracker.conditions.apply')} {selected.replace('persistent-', 'persistent ')}
            </Button>
          </div>
        ) : selected && isValued ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="text-xs text-muted-foreground hover:text-foreground">
                &#8592; {t('combatTracker.conditions.back')}
              </button>
              <span className="text-sm font-medium capitalize">
                {selected.split('-').join(' ')}
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button
                size="icon"
                variant="outline"
                className="w-8 h-8"
                onClick={() => setValue(Math.max(1, value - 1))}
                disabled={value <= 1}
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
              <span className="text-2xl font-mono font-bold w-8 text-center">{value}</span>
              <Button
                size="icon"
                variant="outline"
                className="w-8 h-8"
                onClick={() => setValue(value + 1)}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Button className="w-full h-8 text-xs" onClick={handleApplyValued}>
              <Check className="w-3 h-3 mr-1" />
              {t('combatTracker.conditions.apply')} {selected.split('-').join(' ')} {value}
            </Button>
          </div>
        ) : (
          <div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('combatTracker.conditions.searchPlaceholder')}
              className="h-8 text-xs border-0 border-b rounded-none px-3 focus-visible:ring-0"
            />
            <div className="p-2 border-b border-border/40">
              <Button
                variant="ghost"
                className="w-full h-8 justify-start gap-2 text-xs"
                onClick={() => setShowCustomPenalty(true)}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {t('combatTracker.conditions.customPenalty.button')}
              </Button>
            </div>
            {search ? (
              <div className="p-2 grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                {filteredSlugs.length === 0 ? (
                  <p className="col-span-3 text-center text-xs text-muted-foreground py-4">{t('combatTracker.conditions.noMatch')}</p>
                ) : (
                  filteredSlugs.map((slug) => (
                    <ConditionPill
                      key={slug}
                      slug={slug}
                      disabled={existingSlugs.includes(slug)}
                      selected={selected === slug}
                      onClick={() => handleSelect(slug)}
                    />
                  ))
                )}
              </div>
            ) : (
              <div className="p-2 space-y-3 max-h-64 overflow-y-auto">
                {SECTIONS.map((section) => (
                  <div key={section.label}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                      {section.label}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {section.slugs.map((slug) => (
                        <ConditionPill
                          key={slug}
                          slug={slug}
                          disabled={existingSlugs.includes(slug)}
                          selected={selected === slug}
                          onClick={() => handleSelect(slug)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {otherSlugs.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                      Other
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {otherSlugs.map((slug) => (
                        <ConditionPill
                          key={slug}
                          slug={slug}
                          disabled={existingSlugs.includes(slug)}
                          selected={selected === slug}
                          onClick={() => handleSelect(slug)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom config bar — valued or persistent */}
            {selected && (isPersistent || isValued) && (
              <div className="border-t border-border px-4 py-3 shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium capitalize">{fmt(selected)}</span>
                  <button
                    onClick={() => setSelected(null)}
                    className="opacity-70 hover:opacity-100 transition-opacity text-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isPersistent ? (
                  <div className="flex gap-2">
                    <Input
                      value={formula}
                      onChange={(e) => setFormula(e.target.value)}
                      placeholder="e.g. 2d6"
                      className="h-8 text-xs flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                      autoFocus
                    />
                    <Button
                      className="h-8 text-xs px-3"
                      onClick={handleApply}
                      disabled={!formula.trim()}
                    >
                      <Check className="w-3 h-3 mr-1" />
                      {t('combatTracker.conditions.apply')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Button
                      size="icon"
                      variant="outline"
                      className="w-8 h-8 shrink-0"
                      onClick={() => setValue((v) => Math.max(1, v - 1))}
                      disabled={value <= 1}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-2xl font-mono font-bold w-8 text-center">
                      {value}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="w-8 h-8 shrink-0"
                      onClick={() => setValue((v) => v + 1)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                    <Button className="h-8 text-xs flex-1" onClick={handleApply}>
                      <Check className="w-3 h-3 mr-1" />
                      {t('combatTracker.conditions.apply')} {fmt(selected)} {value}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
