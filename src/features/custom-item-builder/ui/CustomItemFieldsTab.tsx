import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { Label } from '@/shared/ui/label'
import { stringifyCustomItemTraits, parseCustomItemTraits, parseCustomItemTraitsText } from '@/entities/item'
import type { CustomItemInput } from '@/shared/api'

interface CustomItemFieldsTabProps {
  item: CustomItemInput
  onChange: (patch: Partial<CustomItemInput>) => void
}

function toNumberOrNull(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function CustomItemFieldsTab({ item, onChange }: CustomItemFieldsTabProps) {
  const traitsText = useMemo(
    () => parseCustomItemTraits(item.traits).join(', '),
    [item.traits],
  )
  const [traitsDraft, setTraitsDraft] = useState(traitsText)
  const selfSerializedTraits = useRef<string | null>(item.traits)

  useEffect(() => {
    if (item.traits !== selfSerializedTraits.current) {
      setTraitsDraft(traitsText)
      selfSerializedTraits.current = item.traits
    }
  }, [item.traits, traitsText])

  function handleTraitsChange(value: string) {
    const nextTraits = stringifyCustomItemTraits(parseCustomItemTraitsText(value))
    setTraitsDraft(value)
    selfSerializedTraits.current = nextTraits
    onChange({ traits: nextTraits })
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_7rem_9rem] gap-3">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={item.name} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Level</Label>
          <Input
            type="number"
            value={item.level}
            onChange={(e) => onChange({ level: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Input value={item.item_type} onChange={(e) => onChange({ item_type: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Rarity</Label>
          <Input value={item.rarity ?? ''} onChange={(e) => onChange({ rarity: e.target.value || null })} />
        </div>
        <div className="space-y-1.5">
          <Label>Price GP</Label>
          <Input value={item.price_gp ?? ''} onChange={(e) => onChange({ price_gp: toNumberOrNull(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Bulk</Label>
          <Input value={item.bulk ?? ''} onChange={(e) => onChange({ bulk: e.target.value || null })} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Usage</Label>
          <Input value={item.usage ?? ''} onChange={(e) => onChange({ usage: e.target.value || null })} />
        </div>
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Input value={item.source_text ?? ''} onChange={(e) => onChange({ source_text: e.target.value || null })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Traits</Label>
        <Input
          value={traitsDraft}
          onChange={(e) => handleTraitsChange(e.target.value)}
          placeholder="magical, invested, agile"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Damage Formula</Label>
          <Input value={item.damage_formula ?? ''} onChange={(e) => onChange({ damage_formula: e.target.value || null })} />
        </div>
        <div className="space-y-1.5">
          <Label>Damage Type</Label>
          <Input value={item.damage_type ?? ''} onChange={(e) => onChange({ damage_type: e.target.value || null })} />
        </div>
        <div className="space-y-1.5">
          <Label>Weapon Group</Label>
          <Input value={item.weapon_group ?? ''} onChange={(e) => onChange({ weapon_group: e.target.value || null })} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>AC Bonus</Label>
          <Input value={item.ac_bonus ?? ''} onChange={(e) => onChange({ ac_bonus: toNumberOrNull(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Dex Cap</Label>
          <Input value={item.dex_cap ?? ''} onChange={(e) => onChange({ dex_cap: toNumberOrNull(e.target.value) })} />
        </div>
        <div className="space-y-1.5">
          <Label>Uses Max</Label>
          <Input value={item.uses_max ?? ''} onChange={(e) => onChange({ uses_max: toNumberOrNull(e.target.value) })} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Public Text</Label>
        <Textarea
          value={item.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          className="min-h-56 font-serif leading-relaxed"
        />
      </div>
    </div>
  )
}
