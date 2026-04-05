import { useState, useCallback } from 'react'
import { Plus, Minus, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import { CONDITION_SLUGS, VALUED_CONDITIONS, CONDITION_GROUPS } from '@engine'
import type { ConditionSlug } from '@engine'
import { applyCondition } from '@/features/combat-tracker'
import { useConditionStore } from '@/entities/condition'
import { toast } from 'sonner'

interface ConditionComboboxProps {
  combatantId: string
  existingSlugs: string[]
}

const PERSISTENT_SLUGS = [
  'persistent-fire', 'persistent-cold', 'persistent-acid',
  'persistent-bleed', 'persistent-electricity', 'persistent-poison',
] as const

const groupedSlugs = new Set([
  ...Object.values(CONDITION_GROUPS).flat(),
  ...PERSISTENT_SLUGS,
])
const otherSlugs = CONDITION_SLUGS.filter((s) => !groupedSlugs.has(s))

const TABS = [
  { id: 'persistent', label: 'Persistent', slugs: PERSISTENT_SLUGS as readonly string[] },
  { id: 'death', label: 'Death', slugs: CONDITION_GROUPS.death as readonly string[] },
  { id: 'abilities', label: 'Abilities', slugs: CONDITION_GROUPS.abilities as readonly string[] },
  { id: 'senses', label: 'Senses', slugs: CONDITION_GROUPS.senses as readonly string[] },
  { id: 'other', label: 'Other', slugs: otherSlugs as readonly string[] },
] as const

const allSlugs = TABS.flatMap((t) => [...t.slugs])

function ConditionPill({ slug, disabled, onClick }: { slug: string; disabled: boolean; onClick: () => void }) {
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
      {slug.split('-').join(' ')}
      {disabled && <Check className="w-2.5 h-2.5 inline ml-1 opacity-50" />}
    </button>
  )
}

const normalize = (s: string) => s.split('-').join(' ').toLowerCase()

export function ConditionCombobox({ combatantId, existingSlugs }: ConditionComboboxProps) {
  const [open, setOpen] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [value, setValue] = useState(1)
  const [formula, setFormula] = useState('')
  const [search, setSearch] = useState('')

  const isPersistent = selectedSlug?.startsWith('persistent-')
  const isValued = selectedSlug && !isPersistent && (VALUED_CONDITIONS as readonly string[]).includes(selectedSlug)

  const matchesSearch = (slug: string) => normalize(slug).includes(normalize(search))

  const handleOpenChange = useCallback((o: boolean) => {
    setOpen(o)
    if (!o) { setSelectedSlug(null); setValue(1); setFormula(''); setSearch('') }
  }, [])

  const handleSelect = useCallback(
    (slug: string) => {
      if (slug.startsWith('persistent-')) {
        setSelectedSlug(slug)
        setFormula('')
      } else if ((VALUED_CONDITIONS as readonly string[]).includes(slug)) {
        setSelectedSlug(slug)
        setValue(1)
      } else {
        const granted = applyCondition(combatantId, slug as ConditionSlug)
        if (granted.length > 0) {
          toast(`Applied ${slug} — also granted: ${granted.join(', ')}`)
        }
        setOpen(false)
        setSelectedSlug(null)
      }
    },
    [combatantId]
  )

  const handleApplyValued = useCallback(() => {
    if (!selectedSlug) return
    const granted = applyCondition(combatantId, selectedSlug as ConditionSlug, value)
    if (granted.length > 0) {
      toast(`Applied ${selectedSlug} ${value} — also granted: ${granted.join(', ')}`)
    }
    setOpen(false)
    setSelectedSlug(null)
    setValue(1)
  }, [combatantId, selectedSlug, value])

  const handleApplyPersistent = useCallback(() => {
    if (!selectedSlug || !formula.trim()) return
    useConditionStore.getState().setCondition({
      combatantId,
      slug: selectedSlug,
      value: 1,
      formula: formula.trim(),
    })
    toast(`Applied ${selectedSlug.replace('persistent-', 'persistent ')} (${formula.trim()})`)
    setOpen(false)
    setSelectedSlug(null)
    setFormula('')
  }, [combatantId, selectedSlug, formula])

  const handleBack = useCallback(() => {
    setSelectedSlug(null)
    setValue(1)
    setFormula('')
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
          <Plus className="w-3 h-3" />
          Condition
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="text-sm">Add Condition</DialogTitle>
        </DialogHeader>
        {selectedSlug && isPersistent ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="text-xs text-muted-foreground hover:text-foreground">
                &#8592; Back
              </button>
              <span className="text-sm font-medium capitalize">
                {selectedSlug.replace('persistent-', 'persistent ')}
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
              Apply {selectedSlug.replace('persistent-', 'persistent ')}
            </Button>
          </div>
        ) : selectedSlug && isValued ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <button onClick={handleBack} className="text-xs text-muted-foreground hover:text-foreground">
                &#8592; Back
              </button>
              <span className="text-sm font-medium capitalize">
                {selectedSlug.split('-').join(' ')}
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
              Apply {selectedSlug.split('-').join(' ')} {value}
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
                      onClick={() => handleSelect(slug)}
                    />
                  ))
                )}
              </div>
            ) : (
              <Tabs defaultValue="persistent">
                <TabsList className="w-full h-8 rounded-none border-b">
                  {TABS.map((t) => (
                    <TabsTrigger key={t.id} value={t.id} className="text-xs flex-1 h-7">
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {TABS.map((tab) => (
                  <TabsContent key={tab.id} value={tab.id} className="mt-0">
                    <div className="p-2 grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                      {tab.slugs.map((slug) => (
                        <ConditionPill
                          key={slug}
                          slug={slug}
                          disabled={existingSlugs.includes(slug)}
                          onClick={() => handleSelect(slug)}
                        />
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
