import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { useCombatantStore } from '@/entities/combatant'
import { advanceDisableCheck, hazardDamageRolls, requiredDisableChecks, type HazardDamageTemplate } from '@/entities/hazard'
import { useRoll } from '@/widgets/roll-history'
import { useCombatTrackerStore } from '@/features/combat-tracker'
import { getHazardById, type HazardRow } from '@/shared/api'
import { logError } from '@/shared/lib/error'
import { parseJsonArray, parseJsonOrNull } from '@/shared/lib/json'
import { getSkillLabel, getTraitLabel, useCurrentLocale, type MonsterStructuredLoc } from '@/shared/i18n'
import { SafeHtml } from '@/shared/lib/safe-html'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { LevelBadge } from '@/shared/ui/level-badge'
import { Separator } from '@/shared/ui/separator'
import { TraitList } from '@/shared/ui/trait-pill'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { damageTypeChip } from '@/shared/lib/damage-colors'
import { cn } from '@/shared/lib/utils'
import { ActionIcon } from '@/shared/ui/action-icon'
import { Collapsible, CollapsibleContent } from '@/shared/ui/collapsible'
import { SectionHeader } from '@/shared/ui/section-header'
import { useCombatantHp } from '../model/use-combatant-hp'

interface HazardAction {
  name: string
  actionType: string
  trigger?: string
  description: string | null
  damageFormula?: string
  damageType?: string
  damage?: HazardDamageTemplate[]
  sourceDescription?: string | null
  bonus?: number
}

function HazardDamage({ templates, source, disabled }: { templates: HazardDamageTemplate[]; source: string; disabled: boolean }) {
  const { t } = useTranslation('common')
  const locale = useCurrentLocale()
  const combatants = useCombatantStore(useShallow((s) => s.combatants.filter((c) => c.kind !== 'hazard')))
  const [targetId, setTargetId] = useState('')
  const [damage, setDamage] = useState(0)
  const [results, setResults] = useState<Array<HazardDamageTemplate & { total: number }>>([])
  const combatId = useCombatTrackerStore((s) => s.combatId)
  const roll = useRoll(source, combatId ?? undefined)
  const { applyDamage } = useCombatantHp(targetId)

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Button variant="outline" size="sm" disabled={disabled || templates.length === 0} onClick={() => {
        const rolled = templates.map(({ formula, type, persistent, category }) => ({ formula, type, persistent, category, total: roll(formula, type ? `${source}: ${type}` : source).total }))
        setResults(rolled)
        setDamage(rolled.reduce((sum, entry) => sum + (entry.persistent ? 0 : entry.total), 0))
      }}>
        {t('pages.hazards.rollActionDamage')}
      </Button>
      <select className="h-8 rounded border border-border bg-background px-2" value={targetId} onChange={(e) => setTargetId(e.target.value)} aria-label={t('pages.hazards.damageTarget')}>
        <option value="">{t('pages.hazards.damageTarget')}</option>
        {combatants.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
      </select>
      <Input className="h-8 w-16" type="number" min={0} value={damage} onChange={(e) => setDamage(Math.max(0, Number(e.target.value) || 0))} aria-label={t('pages.hazards.finalDamage')} />
      <Button size="sm" disabled={disabled || !targetId || damage <= 0} onClick={() => { applyDamage(damage); setDamage(0); setResults([]) }}>
        {t('pages.hazards.applyDamage')}
      </Button>
      <div className="flex flex-wrap items-center gap-1 font-mono">
        {(results.length ? results : templates).map((entry, index) => <span key={index} className="inline-flex items-center gap-1">
          {index > 0 && <span className="text-muted-foreground">+</span>}
          <span>{entry.formula}{'total' in entry ? ` = ${entry.total}` : ''}</span>
          {entry.type && <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', damageTypeChip(entry.type))}>{getTraitLabel(entry.type, locale)}</span>}
          {entry.category && <span className="text-muted-foreground">{getTraitLabel(entry.category, locale)}</span>}
          {entry.persistent && <span className="text-muted-foreground">{t('statblock.persistent')}</span>}
        </span>)}
      </div>
    </div>
  )
}

function HazardActionCard({ action, hazardName, disabled }: { action: HazardAction; hazardName: string; disabled: boolean }) {
  const { t } = useTranslation('common')
  const explicitDamage = useMemo(() => action.damage?.length ? action.damage
    : action.damageFormula ? [{ formula: action.damageFormula, type: action.damageType ?? '' }] : null, [action])
  const inferredDamage = useMemo(() => explicitDamage ? [] : hazardDamageRolls(action.sourceDescription ?? action.description ?? ''), [action.sourceDescription, action.description, explicitDamage])

  return (
    <section className="space-y-2 rounded-md bg-secondary/50 p-3">
      <h3 className="flex items-center gap-2 font-semibold">{action.actionType !== 'passive' && action.actionType !== 'melee' && <ActionIcon cost={action.actionType === 'reaction' ? 'reaction' : action.actionType === 'free' ? 'free' : 1} className="text-lg" />}{action.name}{action.bonus != null && <span className="text-sm text-muted-foreground">+{action.bonus}</span>}</h3>
      {action.trigger && <p className="text-sm"><strong>{t('pages.hazards.trigger')}:</strong> {action.trigger}</p>}
      {action.description && <SafeHtml html={action.description} className="text-sm" />}
      {explicitDamage && <HazardDamage templates={explicitDamage} disabled={disabled} source={`${hazardName}: ${action.name}`} />}
      {inferredDamage.map((templates, i) => <HazardDamage key={i} templates={templates} disabled={disabled} source={`${hazardName}: ${action.name}`} />)}
    </section>
  )
}

export function HazardCombatCard({ combatantId }: { combatantId: string }) {
  const { t } = useTranslation('common')
  const locale = useCurrentLocale()
  const combatant = useCombatantStore(useShallow((s) => s.combatants.find((c) => c.id === combatantId)))
  const updateCombatant = useCombatantStore((s) => s.updateCombatant)
  const [hazard, setHazard] = useState<HazardRow | null>(null)

  useEffect(() => {
    if (combatant?.kind !== 'hazard') return
    let active = true
    getHazardById(combatant.creatureRef).then((row) => { if (active) setHazard(row) }).catch(logError('hazard-combat-card'))
    return () => { active = false }
  }, [combatant?.creatureRef, combatant?.kind])

  const structured = useMemo(() => parseJsonOrNull<MonsterStructuredLoc>(hazard?.structured_json), [hazard?.structured_json])
  const description = locale === 'ru' ? (structured?.descriptionHazard ?? structured?.description ?? hazard?.description) : hazard?.description
  const disableText = locale === 'ru' ? (structured?.disableDetails ?? hazard?.disable_details) : hazard?.disable_details
  const resetText = locale === 'ru' ? (structured?.resetDetails ?? hazard?.reset_details) : hazard?.reset_details
  const routineText = locale === 'ru' ? (structured?.routineDetails ?? hazard?.routine_details) : hazard?.routine_details
  const actions = useMemo(() => {
    const raw = parseJsonArray<HazardAction>(hazard?.actions_json)
    if (locale !== 'ru' || !structured?.items) return raw
    const translations = new Map(structured.items.map((item) => [item.name.toLowerCase(), item.description]))
    return raw.map((action) => ({ ...action, sourceDescription: action.description, description: translations.get(action.name.toLowerCase()) ?? action.description }))
  }, [hazard?.actions_json, locale, structured])
  const strikes = useMemo(() => actions.filter((action) => action.actionType === 'melee'), [actions])
  const otherActions = useMemo(() => actions.filter((action) => action.actionType !== 'melee'), [actions])
  const descriptionDamage = useMemo(() => hazardDamageRolls(hazard?.description ?? ''), [hazard?.description])
  const routineDamage = useMemo(() => hazardDamageRolls(hazard?.routine_details ?? ''), [hazard?.routine_details])
  const required = hazard ? requiredDisableChecks(hazard) : null
  const progress = combatant?.kind === 'hazard' ? combatant.hazardCheckProgress ?? 0 : 0
  if (!hazard || combatant?.kind !== 'hazard') return null

  const disabled = combatant.hazardDisabled || (hazard.has_health > 0 && combatant.hp === 0)
  const markCheck = () => {
    updateCombatant(combatant.id, advanceDisableCheck(progress, required ?? 1))
  }

  return (
    <Card className="creature-statblock-card card-grimdark gap-0 overflow-hidden rounded-md border-border/50 border-l-[3px] border-l-pf-gold py-0">
      <CardHeader className="stat-block-header border-b border-primary/20 px-4 py-4">
        <div className="flex items-start gap-4">
          <LevelBadge level={hazard.level} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight">{combatant.displayName}</h2>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{hazard.hazard_type}</p>
            <TraitList traits={parseJsonArray(hazard.traits)} className="mt-2" />
          </div>
          {disabled && <span className="text-xs font-bold text-pf-gold">DISABLED!</span>}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-wrap gap-x-8 gap-y-3 bg-card px-4 py-3 [@container-type:inline-size]">
          {hazard.stealth_dc != null && <div><p className="text-xs text-muted-foreground">{t('pages.hazards.stealth')}</p><p className="font-mono font-bold text-pf-gold">{hazard.stealth_dc >= 0 ? '+' : ''}{hazard.stealth_dc}</p></div>}
          {hazard.ac != null && <div><p className="text-xs text-muted-foreground">AC</p><p className="font-mono font-bold text-pf-gold">{hazard.ac}</p></div>}
          {hazard.hardness != null && <div><p className="text-xs text-muted-foreground">{t('pages.hazards.hardness')}</p><p className="font-mono font-bold">{hazard.hardness}</p></div>}
          {hazard.has_health > 0 && <div><p className="text-xs text-muted-foreground">HP</p><p className="font-mono font-bold text-pf-threat-extreme">{combatant.hp}/{combatant.maxHp}</p></div>}
        </div>
        {hazard.stealth_details && <div className="px-4 py-2 text-xs text-muted-foreground"><SafeHtml html={hazard.stealth_details} /></div>}
        <Separator />
        {description && <SafeHtml html={description} className="px-4 py-3 text-sm" />}
        {actions.length === 0 && descriptionDamage.map((templates, i) => <div key={i} className="px-4 pb-3"><HazardDamage templates={templates} disabled={disabled} source={hazard.name} /></div>)}
        <section className="space-y-2 border-t border-border/40 px-4 py-3">
          <h3 className="font-semibold text-primary">{t('pages.hazards.disable')}</h3>
          {hazard.disable_checks?.map((check, index) => <p key={index} className="text-sm"><span className="font-semibold">{getSkillLabel(check.skill.charAt(0).toUpperCase() + check.skill.slice(1), locale)}</span> · DC {check.dc} · {t(`pages.hazards.rank.${check.rank}`)}</p>)}
          {disableText && <SafeHtml html={disableText} className="text-sm" />}
          {required && <p className="text-xs text-muted-foreground">{t('pages.hazards.checkProgress', { progress, required })}</p>}
          <div className="flex flex-wrap gap-2">
            {required && !disabled && <Button size="sm" onClick={markCheck}>{t('pages.hazards.checkPassed')}</Button>}
            {(!disabled || combatant.hazardDisabled) && <Button variant={combatant.hazardDisabled ? 'outline' : 'destructive'} size="sm" onClick={() => updateCombatant(combatant.id, { hazardDisabled: !combatant.hazardDisabled, hazardCheckProgress: combatant.hazardDisabled ? 0 : progress })}>
              {combatant.hazardDisabled ? t('pages.hazards.reEnable') : 'DISABLED!'}
            </Button>}
          </div>
        </section>
        {resetText && <section className="space-y-2 border-t border-border/40 px-4 py-3"><h3 className="font-semibold text-primary">{t('pages.hazards.reset')}</h3><SafeHtml html={resetText} className="text-sm" /></section>}
        {routineText && <section className="space-y-2 border-t border-border/40 px-4 py-3"><h3 className="font-semibold text-primary">{t('pages.hazards.routine')}</h3><SafeHtml html={routineText} className="text-sm" />{routineDamage.map((templates, i) => <HazardDamage key={i} templates={templates} disabled={disabled} source={`${hazard.name}: ${t('pages.hazards.routine')}`} />)}</section>}
        {strikes.length > 0 && <><Separator /><Collapsible defaultOpen><SectionHeader>{t('statblock.strikes')}</SectionHeader><CollapsibleContent><div className="space-y-3 px-4 py-3">{strikes.map((action, index) => <HazardActionCard key={`${action.name}-${index}`} action={action} hazardName={hazard.name} disabled={disabled} />)}</div></CollapsibleContent></Collapsible></>}
        {otherActions.length > 0 && <><Separator /><Collapsible defaultOpen><SectionHeader>{t('pages.hazards.actions')}</SectionHeader><CollapsibleContent><div className="space-y-3 px-4 py-3">{otherActions.map((action, index) => <HazardActionCard key={`${action.name}-${index}`} action={action} hazardName={hazard.name} disabled={disabled} />)}</div></CollapsibleContent></Collapsible></>}
      </CardContent>
    </Card>
  )
}
