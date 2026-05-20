import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { VALUED_CONDITIONS } from '@engine'
import { useHotkeyStore } from '@/shared/model'
import { upsertHotkey, deleteHotkey, type Hotkey } from '@/shared/api'
import { eventToCombo, isModifierOnly } from '@/widgets/app-shell'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/shared/ui/select'

type ActionType = 'next-initiative' | 'zoom-in' | 'zoom-out' | 'stealth-vs-party' | 'apply-condition'

interface FormState {
  id: string
  actionType: ActionType
  conditionSlug: string
  chord: string
}

function emptyForm(): FormState {
  return {
    id: crypto.randomUUID(),
    actionType: 'next-initiative',
    conditionSlug: VALUED_CONDITIONS[0],
    chord: '',
  }
}

function buildAction(form: FormState): string {
  if (form.actionType === 'apply-condition') {
    return `apply-condition:${form.conditionSlug}`
  }
  return form.actionType
}

function parseAction(action: string): Pick<FormState, 'actionType' | 'conditionSlug'> {
  if (action.startsWith('apply-condition:')) {
    const rest = action.slice('apply-condition:'.length)
    const slug = rest.includes(':') ? rest.slice(0, rest.lastIndexOf(':')) : rest
    return {
      actionType: 'apply-condition',
      conditionSlug: slug || VALUED_CONDITIONS[0],
    }
  }
  return {
    actionType: (action as ActionType) ?? 'next-initiative',
    conditionSlug: VALUED_CONDITIONS[0],
  }
}

/** Splits a chord string into badge tokens for display */
function chordToBadges(chord: string): string[] {
  // For apply-condition chords the format is just "Ctrl+F" (no suffix).
  // For regular chords it is "Ctrl+F:1" — split on last colon.
  const colonIdx = chord.lastIndexOf(':')
  const combo = colonIdx !== -1 ? chord.slice(0, colonIdx) : chord
  const suffix = colonIdx !== -1 ? chord.slice(colonIdx + 1) : null

  const comboParts = combo.split('+').filter(Boolean).map((p) => p.toUpperCase())
  return suffix ? [...comboParts, suffix.toUpperCase()] : comboParts
}

function KeyBadge({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-mono font-semibold uppercase tracking-wide text-foreground bg-muted border border-border leading-none shadow-sm">
      {label}
    </kbd>
  )
}

interface HotkeyRowProps {
  hk: Hotkey
  label: string
  onEdit: (hk: Hotkey) => void
  onDelete: (id: string) => void
  t: ReturnType<typeof useTranslation<'common'>>['t']
}

function HotkeyRow({ hk, label, onEdit, onDelete, t }: HotkeyRowProps) {
  const badges = useMemo(() => chordToBadges(hk.chord), [hk.chord])

  return (
    <div className="flex items-center justify-between px-4 py-3.5 group hover:bg-muted/30 transition-colors">
      <span className="text-sm text-foreground flex-1 min-w-0 truncate pr-6">{label}</span>
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1">
          {badges.map((badge, i) => (
            <KeyBadge key={i} label={badge} />
          ))}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(hk)}
          >
            {t('settings.hotkeys.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(hk.id)}
          >
            {t('settings.hotkeys.delete')}
          </Button>
        </div>
      </div>
    </div>
  )
}

interface ChordInputProps {
  /** For apply-condition: only captures the combo part (no suffix) */
  applyConditionMode: boolean
  value: string
  onChange: (chord: string) => void
  t: ReturnType<typeof useTranslation<'common'>>['t']
}

function ChordInput({ applyConditionMode, value, onChange, t }: ChordInputProps) {
  const [capturing, setCapturing] = useState(false)
  const badges = useMemo(() => (value ? chordToBadges(value) : []), [value])

  const stopCapture = useCallback(() => setCapturing(false), [])

  useEffect(() => {
    if (!capturing) return

    if (applyConditionMode) {
      function applyHandler(e: KeyboardEvent) {
        if (isModifierOnly(e)) return
        if (e.key === 'Escape') {
          e.preventDefault()
          stopCapture()
          return
        }
        const combo = eventToCombo(e)
        if (combo === null) return
        e.preventDefault()
        onChange(combo)
        stopCapture()
      }
      document.addEventListener('keydown', applyHandler)
      return () => document.removeEventListener('keydown', applyHandler)
    } else {
      let comboPrefix: string | null = null
      function twoPhaseHandler(e: KeyboardEvent) {
        if (isModifierOnly(e)) return
        if (e.key === 'Escape') {
          e.preventDefault()
          comboPrefix = null
          stopCapture()
          return
        }
        if (comboPrefix === null) {
          const combo = eventToCombo(e)
          if (combo === null) return
          e.preventDefault()
          comboPrefix = combo
        } else {
          e.preventDefault()
          const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
          onChange(`${comboPrefix}:${key}`)
          comboPrefix = null
          stopCapture()
        }
      }
      document.addEventListener('keydown', twoPhaseHandler)
      return () => document.removeEventListener('keydown', twoPhaseHandler)
    }
  }, [capturing, applyConditionMode, onChange, stopCapture])

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {t('settings.hotkeys.fieldChord')}
      </label>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 min-w-[120px]">
          {capturing ? (
            <span className="text-xs text-primary animate-pulse font-medium">
              {t('settings.hotkeys.captureStep1')}
            </span>
          ) : badges.length > 0 ? (
            badges.map((b, i) => <KeyBadge key={i} label={b} />)
          ) : (
            <span className="text-xs text-muted-foreground italic">
              {t('settings.hotkeys.chordPlaceholder')}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={[
            'h-7 px-3 text-xs font-medium shrink-0',
            capturing ? 'border-primary text-primary' : '',
          ].join(' ')}
          onClick={() => setCapturing(true)}
        >
          {capturing ? t('settings.hotkeys.captureListening') : t('settings.hotkeys.captureChange')}
        </Button>
      </div>
      {applyConditionMode && (
        <p className="text-xs text-muted-foreground">{t('settings.hotkeys.conditionValueHint')}</p>
      )}
    </div>
  )
}

export function HotkeysSection() {
  const { t } = useTranslation('common')

  const { hotkeys, loadHotkeys } = useHotkeyStore(
    useShallow((s) => ({ hotkeys: s.hotkeys, loadHotkeys: s.loadHotkeys })),
  )

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    loadHotkeys()
  }, [loadHotkeys])

  const actionLabels = useMemo(() => ({
    'next-initiative': t('settings.hotkeys.actions.nextInitiative'),
    'zoom-in': t('settings.hotkeys.actions.zoomIn'),
    'zoom-out': t('settings.hotkeys.actions.zoomOut'),
    'stealth-vs-party': t('settings.hotkeys.actions.stealthVsParty'),
    'apply-condition': t('settings.hotkeys.actions.applyCondition'),
  }), [t])

  const getHotkeyLabel = useCallback((hk: Hotkey): string => {
    if (hk.action.startsWith('apply-condition:')) {
      const slug = hk.action.slice('apply-condition:'.length)
      return `${actionLabels['apply-condition']}: ${slug}`
    }
    return actionLabels[hk.action as ActionType] ?? hk.action
  }, [actionLabels])

  const handleAdd = useCallback(() => {
    setForm(emptyForm())
    setShowForm(true)
  }, [])

  const handleEdit = useCallback((hk: Hotkey) => {
    const parsed = parseAction(hk.action)
    setForm({ id: hk.id, chord: hk.chord, ...parsed })
    setShowForm(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await deleteHotkey(id)
    await loadHotkeys()
  }, [loadHotkeys])

  const handleSave = useCallback(async () => {
    const action = buildAction(form)
    await upsertHotkey({ id: form.id, action, chord: form.chord })
    await loadHotkeys()
    setShowForm(false)
  }, [form, loadHotkeys])

  const handleCancel = useCallback(() => {
    setShowForm(false)
  }, [])

  const handleChordChange = useCallback((chord: string) => {
    setForm((prev) => ({ ...prev, chord }))
  }, [])

  const isApplyCondition = form.actionType === 'apply-condition'

  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground">{t('settings.hotkeys.title')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t('settings.hotkeys.description')}</p>

      {hotkeys.length > 0 && (
        <div className="mt-4 rounded-lg border border-border overflow-hidden divide-y divide-border">
          {hotkeys.map((hk) => (
            <HotkeyRow
              key={hk.id}
              hk={hk}
              label={getHotkeyLabel(hk)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              t={t}
            />
          ))}
        </div>
      )}

      {hotkeys.length === 0 && !showForm && (
        <p className="mt-4 text-sm text-muted-foreground">{t('settings.hotkeys.empty')}</p>
      )}

      {showForm && (
        <div className="mt-4 rounded-lg border border-border bg-muted/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('settings.hotkeys.formTitle')}
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('settings.hotkeys.fieldAction')}
                </label>
                <Select
                  value={form.actionType}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, actionType: v as ActionType, chord: '' }))
                  }
                >
                  <SelectTrigger className="w-52 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="next-initiative">
                      {t('settings.hotkeys.actions.nextInitiative')}
                    </SelectItem>
                    <SelectItem value="zoom-in">
                      {t('settings.hotkeys.actions.zoomIn')}
                    </SelectItem>
                    <SelectItem value="zoom-out">
                      {t('settings.hotkeys.actions.zoomOut')}
                    </SelectItem>
                    <SelectItem value="stealth-vs-party">
                      {t('settings.hotkeys.actions.stealthVsParty')}
                    </SelectItem>
                    <SelectItem value="apply-condition">
                      {t('settings.hotkeys.actions.applyCondition')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isApplyCondition && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('settings.hotkeys.fieldCondition')}
                  </label>
                  <Select
                    value={form.conditionSlug}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, conditionSlug: v }))}
                  >
                    <SelectTrigger className="w-36 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VALUED_CONDITIONS.map((slug) => (
                        <SelectItem key={slug} value={slug}>
                          {slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <ChordInput
              applyConditionMode={isApplyCondition}
              value={form.chord}
              onChange={handleChordChange}
              t={t}
            />

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={!form.chord}>
                {t('settings.hotkeys.save')}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} className="text-muted-foreground">
                {t('settings.hotkeys.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Button className="mt-4" variant="outline" onClick={handleAdd}>
        {t('settings.hotkeys.addButton')}
      </Button>
    </section>
  )
}
