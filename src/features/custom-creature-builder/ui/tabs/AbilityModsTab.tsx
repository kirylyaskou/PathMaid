import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import type { BuilderTabsProps } from '../BuilderTabs'
import { BenchmarkHint } from '../BenchmarkHint'

type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

const ABILITIES: { key: AbilityKey; label: string }[] = [
  { key: 'str', label: 'Strength' },
  { key: 'dex', label: 'Dexterity' },
  { key: 'con', label: 'Constitution' },
  { key: 'int', label: 'Intelligence' },
  { key: 'wis', label: 'Wisdom' },
  { key: 'cha', label: 'Charisma' },
]

export function AbilityModsTab({ state, dispatch }: BuilderTabsProps) {
  const { form } = state
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">Ability Mods</h2>
      <div className="grid grid-cols-2 gap-3">
        {ABILITIES.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`abm-${key}`}>{label}</Label>
              <BenchmarkHint
                stat="abilityMod"
                level={form.level}
                value={form.abilityMods[key]}
                onSelectTier={(v) => dispatch({ type: 'SET_ABILITY_MOD', key, value: v })}
              />
            </div>
            <Input
              id={`abm-${key}`}
              type="number"
              className="font-mono"
              value={form.abilityMods[key]}
              onChange={(e) =>
                dispatch({ type: 'SET_ABILITY_MOD', key, value: Number(e.target.value) })
              }
            />
          </div>
        ))}
      </div>
    </div>
  )
}
