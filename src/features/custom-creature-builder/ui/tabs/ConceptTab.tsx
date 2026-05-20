import { useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import type { Rarity } from '@engine'
import type { DisplaySize } from '@/shared/lib/size-map'
import type { CustomCreatureBuilderMode } from '@/entities/creature'
import type { BuilderTabsProps } from '../BuilderTabs'

const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'unique']
const SIZES: DisplaySize[] = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan']

export function ConceptTab({ state, dispatch }: BuilderTabsProps) {
  const { t } = useTranslation('common')
  const { form } = state
  const [traitInput, setTraitInput] = useState('')
  const builderMode = form.builderMode ?? 'manual'

  function addTrait() {
    const t = traitInput.trim()
    if (!t || form.traits.includes(t)) return
    dispatch({ type: 'SET_FIELD', path: 'traits', value: [...form.traits, t] })
    setTraitInput('')
  }

  function removeTrait(idx: number) {
    dispatch({
      type: 'SET_FIELD',
      path: 'traits',
      value: form.traits.filter((_, i) => i !== idx),
    })
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">{t('customCreatureBuilder.conceptTab.heading')}</h2>

      <div className="space-y-2">
        <Label>{t('customCreatureBuilder.conceptTab.builderMode')}</Label>
        <div className="inline-flex rounded-md border border-border/50 bg-secondary/20 p-1">
          {(['manual', 'auto'] as CustomCreatureBuilderMode[]).map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={builderMode === mode ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs"
              onClick={() => dispatch({ type: 'SET_BUILDER_MODE', mode })}
            >
              {t(`customCreatureBuilder.conceptTab.builderModes.${mode}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t('customCreatureBuilder.conceptTab.name')}</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', path: 'name', value: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="level">{t('customCreatureBuilder.conceptTab.level')}</Label>
          <Input
            id="level"
            type="number"
            min={-1}
            max={24}
            className="font-mono"
            value={form.level}
            onChange={(e) =>
              dispatch({ type: 'SET_LEVEL_AND_RESCALE', level: Number(e.target.value) })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>{t('customCreatureBuilder.conceptTab.rarity')}</Label>
          <Select
            value={form.rarity}
            onValueChange={(v) =>
              dispatch({ type: 'SET_FIELD', path: 'rarity', value: v as Rarity })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RARITIES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('customCreatureBuilder.conceptTab.size')}</Label>
          <Select
            value={form.size}
            onValueChange={(v) =>
              dispatch({ type: 'SET_FIELD', path: 'size', value: v as DisplaySize })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">{t('customCreatureBuilder.conceptTab.creatureType')}</Label>
        <Input
          id="type"
          value={form.type}
          placeholder={t('customCreatureBuilder.conceptTab.typeInputPlaceholder')}
          onChange={(e) =>
            dispatch({ type: 'SET_FIELD', path: 'type', value: e.target.value })
          }
        />
      </div>

      <div className="space-y-2">
        <Label>{t('customCreatureBuilder.conceptTab.traits')}</Label>
        <div className="flex items-center gap-2">
          <Input
            value={traitInput}
            onChange={(e) => setTraitInput(e.target.value)}
            placeholder={t('customCreatureBuilder.conceptTab.addTraitPlaceholder')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTrait()
              }
            }}
          />
          <Button size="sm" variant="outline" onClick={addTrait}>
            {t('customCreatureBuilder.conceptTab.addTraitButton')}
          </Button>
        </div>
        {form.traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {form.traits.map((trait, i) => (
              <span
                key={`${trait}-${i}`}
                className="inline-flex items-center gap-1 text-xs rounded bg-secondary/50 border border-border/50 px-2 py-0.5"
              >
                {trait}
                <button
                  type="button"
                  aria-label={t('customCreatureBuilder.conceptTab.removeTraitAriaLabel', { name: trait })}
                  onClick={() => removeTrait(i)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('customCreatureBuilder.conceptTab.description')}</Label>
        <Textarea
          id="description"
          rows={4}
          value={form.description ?? ''}
          onChange={(e) =>
            dispatch({
              type: 'SET_FIELD',
              path: 'description',
              value: e.target.value || undefined,
            })
          }
        />
      </div>
    </div>
  )
}
