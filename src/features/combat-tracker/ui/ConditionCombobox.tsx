import { useState, useCallback, useEffect } from 'react'
import { Plus, Minus, Check, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { CONDITION_SLUGS, VALUED_CONDITIONS, CONDITION_GROUPS } from '@engine'
import type { ConditionSlug } from '@engine'
import { applyCondition } from '@/features/combat-tracker'
import { useConditionStore } from '@/entities/condition'
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

const SECTIONS: { label: string; slugs: readonly string[] }[] = [
  { label: 'Persistent Damage', slugs: PERSISTENT_SLUGS },
  { label: 'Death',             slugs: CONDITION_GROUPS['death']     ?? [] },
  { label: 'Abilities',         slugs: CONDITION_GROUPS['abilities'] ?? [] },
  { label: 'Senses',            slugs: CONDITION_GROUPS['senses']    ?? [] },
  { label: 'Detection',         slugs: CONDITION_GROUPS['detection'] ?? [] },
  { label: 'Attitudes',         slugs: CONDITION_GROUPS['attitudes'] ?? [] },
]

const groupedSet = new Set(SECTIONS.flatMap((s) => [...s.slugs]))
const otherSlugs = CONDITION_SLUGS.filter((s) => !groupedSet.has(s))
const allSlugs = [...SECTIONS.flatMap((s) => [...s.slugs]), ...otherSlugs]

const fmt = (s: string) => s.split('-').join(' ')
const norm = (s: string) => fmt(s).toLowerCase()

function ConditionPill({
  slug,
  disabled,
  selected,
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

export function ConditionCombobox({ combatantId, existingSlugs }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [value, setValue] = useState(1)
  const [formula, setFormula] = useState('')

  const isPersistent = selected?.startsWith('persistent-') ?? false
  const isValued =
    selected != null &&
    !isPersistent &&
    (VALUED_CONDITIONS as readonly string[]).includes(selected)

  const close = useCallback(() => {
    setOpen(false)
    setSelected(null)
    setValue(1)
    setFormula('')
    setSearch('')
  }, [])

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
    if (!o) { setSelected(null); setValue(1); setFormula(''); setSearch('') }
  }, [])

  const handleBack = useCallback(() => {
    setSelected(null)
    setValue(1)
    setFormula('')
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
          <Plus className="w-3 h-3" />
          Condition
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-sm">Add Condition</DialogTitle>
        </DialogHeader>

        {selected && isPersistent ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="text-xs text-muted-foreground hover:text-foreground">
                &#8592; Back
              </button>
              <span className="text-sm font-medium capitalize">
                {selected.replace('persistent-', 'persistent ')}
              </span>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Dice Formula</label>
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
              Apply {selected.replace('persistent-', 'persistent ')}
            </Button>
          </div>
        ) : selected && isValued ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="text-xs text-muted-foreground hover:text-foreground">
                &#8592; Back
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
              Apply {selected.split('-').join(' ')} {value}
            </Button>
          </div>
        ) : (
          <div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conditions..."
              className="h-8 text-xs border-0 border-b rounded-none px-3 focus-visible:ring-0"
            />
            {search ? (
              <div className="p-2 grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                {allSlugs.filter(matchesSearch).length === 0 ? (
                  <p className="col-span-3 text-center text-xs text-muted-foreground py-4">No condition found.</p>
                ) : (
                  allSlugs.filter(matchesSearch).map((slug) => (
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
                      Apply
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
                      Apply {fmt(selected)} {value}
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
