import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleHelp, Plus, X } from 'lucide-react'
import { SKILL_ABILITY } from '@engine'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { saveCustomHazard, type HazardDisableCheck, type HazardRow } from '@/shared/api'
import { logErrorWithToast } from '@/shared/lib/error'
import { parseJsonArray } from '@/shared/lib/json'
import { getSkillLabel, useCurrentLocale } from '@/shared/i18n'
import type { HazardDamageTemplate } from '@/entities/hazard'

interface ActionDraft {
  name: string
  actionType: string
  trigger: string
  description: string
  damage: HazardDamageTemplate[]
}

type StoredAction = Partial<ActionDraft> & { damageFormula?: string; damageType?: string }

const SKILLS = [...Object.keys(SKILL_ABILITY), 'lore']
const RANKS: HazardDisableCheck['rank'][] = ['untrained', 'trained', 'expert', 'master', 'legendary']

function emptyHazard(): HazardRow {
  return {
    id: '', name: '', name_loc: null, structured_json: null, level: 0,
    is_complex: 0, hazard_type: 'simple', stealth_dc: null, stealth_details: null,
    ac: null, hardness: null, hp: null, has_health: 0, description: null,
    disable_details: null, reset_details: null, routine_details: null, traits: '[]',
    source_book: null, source_pack: null, actions_json: '[]', required_successes: null,
  }
}

function numeric(value: string): number | null {
  return value.trim() === '' ? null : Number(value)
}

export function HazardEditorDialog({ initial, onClose, onSaved }: {
  initial: HazardRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation('common')
  const locale = useCurrentLocale()
  const [hazard, setHazard] = useState<HazardRow>(initial ?? emptyHazard())
  const [traitInput, setTraitInput] = useState('')
  const [actions, setActions] = useState<ActionDraft[]>(() =>
    parseJsonArray<StoredAction>(initial?.actions_json).map((action) => ({
      name: action.name ?? '', actionType: action.actionType ?? 'action', trigger: action.trigger ?? '',
      description: action.description ?? '',
      damage: action.damage ?? (action.damageFormula
        ? [{ formula: action.damageFormula, type: action.damageType ?? '' }]
        : []),
    })),
  )
  const [saving, setSaving] = useState(false)

  function change<K extends keyof HazardRow>(key: K, value: HazardRow[K]) {
    setHazard((current) => ({ ...current, [key]: value }))
  }

  function changeAction(index: number, key: keyof ActionDraft, value: string) {
    setActions((current) => current.map((action, i) => i === index ? { ...action, [key]: value } : action))
  }

  function changeDamage(actionIndex: number, damageIndex: number, key: keyof HazardDamageTemplate, value: string) {
    setActions((current) => current.map((action, i) => i === actionIndex
      ? { ...action, damage: action.damage.map((entry, j) => j === damageIndex ? { ...entry, [key]: value } : entry) }
      : action))
  }

  function addTrait() {
    const trait = traitInput.trim()
    const traits = parseJsonArray(hazard.traits)
    if (!trait || traits.includes(trait)) return
    change('traits', JSON.stringify([...traits, trait]))
    setTraitInput('')
  }

  function changeCheck(index: number, key: keyof HazardDisableCheck, value: string | number) {
    change('disable_checks', (hazard.disable_checks ?? []).map((check, i) => i === index ? { ...check, [key]: value } : check))
  }

  async function save() {
    if (!hazard.name.trim() || !Number.isInteger(hazard.level)) return
    setSaving(true)
    try {
      const namedActions = actions.filter((action) => action.name.trim())
      if (namedActions.some((action) => action.damage.some((entry) => !/^\d+d\d+(?:[+-]\d+)?$/i.test(entry.formula)))) {
        throw new Error(t('pages.hazards.invalidDamageFormula'))
      }
      if (hazard.disable_checks?.some((check) => !Number.isInteger(check.dc) || check.dc < 1)) {
        throw new Error(t('pages.hazards.invalidDisableCheck'))
      }
      await saveCustomHazard({
        ...hazard,
        id: hazard.is_custom ? hazard.id : '',
        is_custom: hazard.is_custom === true,
        hazard_type: hazard.is_complex ? 'complex' : 'simple',
        has_health: hazard.hp != null ? 1 : 0,
        actions_json: JSON.stringify(namedActions),
      })
      onSaved()
    } catch (error) {
      logErrorWithToast('save-custom-hazard')(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t('pages.hazards.editorTitle')}</DialogTitle></DialogHeader>
        <details className="rounded border border-border/50 bg-muted/20 px-3 py-2 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-medium"><CircleHelp className="size-4 text-primary" />{t('pages.hazards.editorHelpTitle')}</summary>
          <div className="mt-2 space-y-1 text-muted-foreground">
            <p>{t('pages.hazards.editorHelpStealth')}</p>
            <p>{t('pages.hazards.editorHelpDefenses')}</p>
            <p>{t('pages.hazards.editorHelpDisable')}</p>
            <p>{t('pages.hazards.editorHelpRoutine')}</p>
          </div>
        </details>
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">{t('pages.hazards.name')}<Input value={hazard.name} onChange={(e) => change('name', e.target.value)} /></label>
          <label className="block space-y-1">{t('pages.hazards.level')}<Input type="number" value={hazard.level} onChange={(e) => change('level', Number(e.target.value))} /></label>
          <label className="block space-y-1">{t('pages.hazards.type')}
            <select className="h-9 w-full rounded border border-border bg-background px-2" value={hazard.hazard_type} onChange={(e) => {
              const complex = e.target.value === 'complex'
              setHazard((current) => ({ ...current, hazard_type: e.target.value, is_complex: complex ? 1 : 0 }))
            }}>
              <option value="simple">simple</option><option value="complex">complex</option>
            </select>
          </label>
          <label className="block space-y-1">{t('pages.hazards.stealth')}<Input type="number" value={hazard.stealth_dc ?? ''} onChange={(e) => change('stealth_dc', numeric(e.target.value))} /></label>
          <label className="block space-y-1">{t('pages.hazards.stealthDetails')}<Input value={hazard.stealth_details ?? ''} onChange={(e) => change('stealth_details', e.target.value)} /></label>
          <label className="block space-y-1">AC<Input type="number" value={hazard.ac ?? ''} onChange={(e) => change('ac', numeric(e.target.value))} /></label>
          <label className="block space-y-1">{t('pages.hazards.hardness')}<Input type="number" value={hazard.hardness ?? ''} onChange={(e) => change('hardness', numeric(e.target.value))} /></label>
          <label className="block space-y-1">HP<Input type="number" min={0} value={hazard.hp ?? ''} onChange={(e) => {
            const hp = numeric(e.target.value)
            setHazard((current) => ({ ...current, hp, has_health: hp != null ? 1 : 0 }))
          }} /></label>
          <label className="block space-y-1">{t('pages.hazards.requiredSuccesses')}<Input type="number" min={2} value={hazard.required_successes ?? ''} onChange={(e) => change('required_successes', numeric(e.target.value))} /></label>
          <div className="space-y-1">
            <label htmlFor="hazard-trait">{t('pages.hazards.traits')}</label>
            <div className="flex gap-2"><Input id="hazard-trait" value={traitInput} onChange={(e) => setTraitInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrait() } }} placeholder={t('pages.hazards.addTraitPlaceholder')} /><Button type="button" variant="outline" onClick={addTrait}>{t('pages.hazards.addTrait')}</Button></div>
            <div className="flex flex-wrap gap-1.5 pt-1">{parseJsonArray(hazard.traits).map((trait) => <span key={trait} className="inline-flex items-center gap-1 rounded border border-border/50 bg-secondary/50 px-2 py-0.5 text-xs">{trait}<button type="button" aria-label={t('pages.hazards.removeTrait', { trait })} onClick={() => change('traits', JSON.stringify(parseJsonArray(hazard.traits).filter((item) => item !== trait)))}><X className="size-3" /></button></span>)}</div>
          </div>
          <label className="block space-y-1">{t('pages.hazards.description')}<textarea className="w-full rounded border border-border bg-background p-2" rows={3} value={hazard.description ?? ''} onChange={(e) => change('description', e.target.value)} /></label>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><h3 className="font-semibold">{t('pages.hazards.disableChecks')}</h3><Button type="button" variant="outline" size="sm" onClick={() => change('disable_checks', [...(hazard.disable_checks ?? []), { skill: 'thievery', dc: 15, rank: 'trained' }])}>{t('pages.hazards.addDisableCheck')}</Button></div>
            {(hazard.disable_checks ?? []).map((check, index) => <div key={index} className="space-y-2 rounded border border-border/60 p-3">
              <label className="block space-y-1">{t('pages.hazards.skill')}<select className="h-9 w-full rounded border border-border bg-background px-2" value={check.skill} onChange={(e) => changeCheck(index, 'skill', e.target.value)}>{SKILLS.map((skill) => <option key={skill} value={skill}>{getSkillLabel(skill.charAt(0).toUpperCase() + skill.slice(1), locale)}</option>)}</select></label>
              <label className="block space-y-1">{t('pages.hazards.checkDc')}<Input type="number" min={1} value={check.dc} onChange={(e) => changeCheck(index, 'dc', Number(e.target.value))} /></label>
              <label className="block space-y-1">{t('pages.hazards.proficiencyRank')}<select className="h-9 w-full rounded border border-border bg-background px-2" value={check.rank} onChange={(e) => changeCheck(index, 'rank', e.target.value)}>{RANKS.map((rank) => <option key={rank} value={rank}>{t(`pages.hazards.rank.${rank}`)}</option>)}</select></label>
              <Button type="button" variant="ghost" size="sm" onClick={() => change('disable_checks', (hazard.disable_checks ?? []).filter((_, i) => i !== index))}>{t('pages.hazards.removeDisableCheck')}</Button>
            </div>)}
          </div>
          <label className="block space-y-1">{t('pages.hazards.disableDetails')}<textarea className="w-full rounded border border-border bg-background p-2" rows={3} value={hazard.disable_details ?? ''} onChange={(e) => change('disable_details', e.target.value)} /></label>
          {hazard.is_complex > 0 && <label className="block space-y-1">{t('pages.hazards.routine')}<textarea className="w-full rounded border border-border bg-background p-2" rows={3} value={hazard.routine_details ?? ''} onChange={(e) => change('routine_details', e.target.value)} /></label>}
          <label className="block space-y-1">{t('pages.hazards.reset')}<textarea className="w-full rounded border border-border bg-background p-2" rows={2} value={hazard.reset_details ?? ''} onChange={(e) => change('reset_details', e.target.value)} /></label>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between"><h3 className="font-semibold">{t('pages.hazards.actions')}</h3><Button variant="outline" size="sm" onClick={() => setActions((current) => [...current, { name: '', actionType: 'action', trigger: '', description: '', damage: [] }])}><Plus className="size-3.5" />{t('pages.hazards.addAction')}</Button></div>
          {actions.map((action, index) => (
            <div key={index} className="space-y-3 rounded-md border border-border/50 bg-secondary/30 p-3">
              <div className="flex items-center justify-between gap-2"><h4 className="font-semibold">{action.name.trim() || t('pages.hazards.untitledAction', { number: index + 1 })}</h4><Button type="button" variant="ghost" size="sm" onClick={() => setActions((current) => current.filter((_, i) => i !== index))}>{t('pages.hazards.removeAction')}</Button></div>
              <label className="block space-y-1">{t('pages.hazards.actionName')}<Input value={action.name} onChange={(e) => changeAction(index, 'name', e.target.value)} /></label>
              <label className="block space-y-1">{t('pages.hazards.actionType')}<select className="h-9 w-full rounded border border-border bg-background px-2" value={action.actionType} onChange={(e) => changeAction(index, 'actionType', e.target.value)}><option value="action">action</option><option value="reaction">reaction</option><option value="free">free</option><option value="passive">passive</option></select></label>
              <label className="block space-y-1">{t('pages.hazards.trigger')}<Input value={action.trigger} onChange={(e) => changeAction(index, 'trigger', e.target.value)} /></label>
              <label className="block space-y-1">{t('pages.hazards.description')}<textarea className="w-full rounded border border-border bg-background p-2 text-sm" rows={2} value={action.description} onChange={(e) => changeAction(index, 'description', e.target.value)} /></label>
              <div className="space-y-2">
                <p className="font-medium">{t('pages.hazards.actionDamage')}</p>
                {action.damage.map((entry, damageIndex) => <div key={damageIndex} className="flex flex-wrap items-center gap-2">
                  <Input className="min-w-28 flex-1 font-mono" aria-label={t('pages.hazards.damageFormula')} placeholder="2d6" value={entry.formula} onChange={(e) => changeDamage(index, damageIndex, 'formula', e.target.value)} />
                  <Input className="min-w-28 flex-1" aria-label={t('pages.hazards.damageType')} placeholder="fire" value={entry.type} onChange={(e) => changeDamage(index, damageIndex, 'type', e.target.value)} />
                  <Button type="button" variant="ghost" size="sm" aria-label={t('pages.hazards.removeDamageRow')} onClick={() => setActions((current) => current.map((item, i) => i === index ? { ...item, damage: item.damage.filter((_, j) => j !== damageIndex) } : item))}><X className="size-4" /></Button>
                </div>)}
                <Button type="button" variant="outline" size="sm" onClick={() => setActions((current) => current.map((item, i) => i === index ? { ...item, damage: [...item.damage, { formula: '1d6', type: 'fire' }] } : item))}><Plus className="size-3.5" />{t('pages.hazards.addDamageRow')}</Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>{t('pages.hazards.cancel')}</Button><Button disabled={saving || !hazard.name.trim()} onClick={save}>{t('pages.hazards.save')}</Button></div>
      </DialogContent>
    </Dialog>
  )
}
