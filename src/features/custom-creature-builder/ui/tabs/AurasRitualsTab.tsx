import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { X, Plus } from 'lucide-react'
import type { BuilderTabsProps } from '../BuilderTabs'
import type { AuraEntry, RitualEntry } from '@/entities/creature'

const TRADITIONS = ['arcane', 'divine', 'occult', 'primal'] as const

function newAura(): AuraEntry {
  return { name: 'New Aura', radius: 10, traits: [], effect: '' }
}

function newRitual(): RitualEntry {
  return { name: 'New Ritual', tradition: 'arcane', rank: 1 }
}

export function AurasRitualsTab({ state, dispatch }: BuilderTabsProps) {
  const { t } = useTranslation('common')
  const { form } = state
  const auras = form.auras ?? []
  const rituals = form.rituals ?? []
  const allEmpty = auras.length === 0 && rituals.length === 0

  return (
    <div className="p-4 space-y-5">
      <h2 className="text-base font-semibold">{t('customCreatureBuilder.aurasRitualsTab.heading')}</h2>

      {allEmpty && (
        <div className="p-4 rounded-md border border-dashed border-border/50 bg-secondary/20 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{t('customCreatureBuilder.aurasRitualsTab.noAurasRituals')}</p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatch({ type: 'ADD_AURA', entry: newAura() })}
            >
              <Plus className="w-3 h-3 mr-1" />
              {t('customCreatureBuilder.aurasRitualsTab.addAura')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatch({ type: 'ADD_RITUAL', entry: newRitual() })}
            >
              <Plus className="w-3 h-3 mr-1" />
              {t('customCreatureBuilder.aurasRitualsTab.addRitual')}
            </Button>
          </div>
        </div>
      )}

      {/* Auras */}
      {auras.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('customCreatureBuilder.aurasRitualsTab.aurasLabel')}</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatch({ type: 'ADD_AURA', entry: newAura() })}
            >
              <Plus className="w-3 h-3 mr-1" />
              {t('customCreatureBuilder.aurasRitualsTab.addAura')}
            </Button>
          </div>
          {auras.map((aura, i) => (
            <AuraEditor
              key={i}
              aura={aura}
              onChange={(a) => dispatch({ type: 'UPDATE_AURA', index: i, entry: a })}
              onRemove={() => dispatch({ type: 'REMOVE_AURA', index: i })}
            />
          ))}
        </div>
      )}

      {/* Rituals */}
      {rituals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t('customCreatureBuilder.aurasRitualsTab.ritualsLabel')}</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => dispatch({ type: 'ADD_RITUAL', entry: newRitual() })}
            >
              <Plus className="w-3 h-3 mr-1" />
              {t('customCreatureBuilder.aurasRitualsTab.addRitual')}
            </Button>
          </div>
          {rituals.map((rit, i) => (
            <RitualEditor
              key={i}
              ritual={rit}
              onChange={(r) => dispatch({ type: 'UPDATE_RITUAL', index: i, entry: r })}
              onRemove={() => dispatch({ type: 'REMOVE_RITUAL', index: i })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface AuraEditorProps {
  aura: AuraEntry
  onChange: (a: AuraEntry) => void
  onRemove: () => void
}

function AuraEditor({ aura, onChange, onRemove }: AuraEditorProps) {
  const { t } = useTranslation('common')
  const [traitInput, setTraitInput] = useState('')

  function addTrait() {
    const traitVal = traitInput.trim()
    if (!traitVal || aura.traits.includes(traitVal)) return
    onChange({ ...aura, traits: [...aura.traits, traitVal] })
    setTraitInput('')
  }

  return (
    <div className="space-y-3 p-3 rounded-md border border-border/50 bg-card">
      <div className="flex items-center gap-2">
        <Input
          value={aura.name}
          onChange={(e) => onChange({ ...aura, name: e.target.value })}
          placeholder={t('customCreatureBuilder.aurasRitualsTab.auraNamePlaceholder')}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground">{t('customCreatureBuilder.aurasRitualsTab.radius')}</span>
        <Input
          type="number"
          className="font-mono w-20"
          value={aura.radius}
          onChange={(e) => onChange({ ...aura, radius: Number(e.target.value) })}
        />
        <button
          type="button"
          aria-label={t('customCreatureBuilder.aurasRitualsTab.removeAuraAriaLabel')}
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <Label>{t('customCreatureBuilder.aurasRitualsTab.effect')}</Label>
        <Textarea
          rows={3}
          value={aura.effect}
          onChange={(e) => onChange({ ...aura, effect: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>{t('customCreatureBuilder.aurasRitualsTab.traits')}</Label>
        <div className="flex items-center gap-2">
          <Input
            value={traitInput}
            onChange={(e) => setTraitInput(e.target.value)}
            placeholder={t('customCreatureBuilder.aurasRitualsTab.addTraitPlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTrait()
              }
            }}
          />
          <Button size="sm" variant="outline" onClick={addTrait}>
            {t('customCreatureBuilder.aurasRitualsTab.addTraitButton')}
          </Button>
        </div>
        {aura.traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {aura.traits.map((trait, ti) => (
              <span
                key={`${trait}-${ti}`}
                className="inline-flex items-center gap-1 text-xs rounded bg-secondary/50 border border-border/50 px-2 py-0.5"
              >
                {trait}
                <button
                  type="button"
                  aria-label={t('customCreatureBuilder.aurasRitualsTab.removeTraitAriaLabel', { name: trait })}
                  onClick={() =>
                    onChange({
                      ...aura,
                      traits: aura.traits.filter((_, i) => i !== ti),
                    })
                  }
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface RitualEditorProps {
  ritual: RitualEntry
  onChange: (r: RitualEntry) => void
  onRemove: () => void
}

function RitualEditor({ ritual, onChange, onRemove }: RitualEditorProps) {
  const { t } = useTranslation('common')
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/40">
      <Input
        value={ritual.name}
        onChange={(e) => onChange({ ...ritual, name: e.target.value })}
        placeholder={t('customCreatureBuilder.aurasRitualsTab.ritualNamePlaceholder')}
        className="flex-1"
      />
      <Select
        value={ritual.tradition}
        onValueChange={(v) => onChange({ ...ritual, tradition: v })}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRADITIONS.map((tradition) => (
            <SelectItem key={tradition} value={tradition}>
              {tradition}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">{t('customCreatureBuilder.aurasRitualsTab.rank')}</span>
      <Input
        type="number"
        min={1}
        max={10}
        className="font-mono w-16"
        value={ritual.rank}
        onChange={(e) => onChange({ ...ritual, rank: Number(e.target.value) })}
      />
      <button
        type="button"
        aria-label={t('customCreatureBuilder.aurasRitualsTab.removeRitualAriaLabel')}
        onClick={onRemove}
        className="p-1 text-muted-foreground hover:text-destructive"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
