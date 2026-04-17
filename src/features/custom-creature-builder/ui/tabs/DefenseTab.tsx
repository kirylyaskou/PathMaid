import type { Dispatch } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import type { StatKind } from '@engine'
import type { CreatureStatBlockData } from '@/entities/creature/model/types'
import type { BuilderAction } from '../../model/builderReducer'
import type { BuilderTabsProps } from '../BuilderTabs'
import { BenchmarkHint } from '../BenchmarkHint'

type DefenseField = 'ac' | 'hp' | 'fort' | 'ref' | 'will'
type DefenseStat = Exclude<StatKind, 'strikeDamage' | 'areaDamage'>

export function DefenseTab({ state, dispatch }: BuilderTabsProps) {
  const { form } = state
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">Defense</h2>

      <Field label="AC" field="ac" stat="ac" form={form} dispatch={dispatch} />
      <Field label="HP" field="hp" stat="hp" form={form} dispatch={dispatch} />
      <Field label="Fort" field="fort" stat="save" form={form} dispatch={dispatch} />
      <Field label="Ref" field="ref" stat="save" form={form} dispatch={dispatch} />
      <Field label="Will" field="will" stat="save" form={form} dispatch={dispatch} />
    </div>
  )
}

interface FieldProps {
  label: string
  field: DefenseField
  stat: DefenseStat
  form: CreatureStatBlockData
  dispatch: Dispatch<BuilderAction>
}

function Field({ label, field, stat, form, dispatch }: FieldProps) {
  const value = form[field]
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`def-${field}`}>{label}</Label>
        <BenchmarkHint
          stat={stat}
          level={form.level}
          value={value}
          onSelectTier={(v) => dispatch({ type: 'SET_FIELD', path: field, value: v })}
        />
      </div>
      <Input
        id={`def-${field}`}
        type="number"
        className="font-mono"
        value={value}
        onChange={(e) =>
          dispatch({ type: 'SET_FIELD', path: field, value: Number(e.target.value) })
        }
      />
    </div>
  )
}
