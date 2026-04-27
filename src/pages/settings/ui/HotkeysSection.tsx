import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { VALUED_CONDITIONS } from '@engine'
import { useHotkeyStore } from '@/shared/model/hotkey-store'
import { upsertHotkey, deleteHotkey, type Hotkey } from '@/shared/api/hotkeys'
import { eventToCombo, eventToSuffix } from '@/widgets/app-shell/model/use-chord-engine'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/shared/ui/select'

type ActionType = 'next-initiative' | 'zoom-in' | 'zoom-out' | 'apply-condition'

interface FormState {
  id: string
  actionType: ActionType
  conditionSlug: string
  conditionValue: string
  chord: string
}

function emptyForm(): FormState {
  return {
    id: crypto.randomUUID(),
    actionType: 'next-initiative',
    conditionSlug: VALUED_CONDITIONS[0],
    conditionValue: '1',
    chord: '',
  }
}

function buildAction(form: FormState): string {
  if (form.actionType === 'apply-condition') {
    return `apply-condition:${form.conditionSlug}:${form.conditionValue}`
  }
  return form.actionType
}

function parseAction(action: string): Pick<FormState, 'actionType' | 'conditionSlug' | 'conditionValue'> {
  if (action.startsWith('apply-condition:')) {
    const rest = action.slice('apply-condition:'.length)
    const lastColon = rest.lastIndexOf(':')
    if (lastColon !== -1) {
      return {
        actionType: 'apply-condition',
        conditionSlug: rest.slice(0, lastColon),
        conditionValue: rest.slice(lastColon + 1),
      }
    }
    return { actionType: 'apply-condition', conditionSlug: VALUED_CONDITIONS[0], conditionValue: '1' }
  }
  return {
    actionType: (action as ActionType) ?? 'next-initiative',
    conditionSlug: VALUED_CONDITIONS[0],
    conditionValue: '1',
  }
}

function actionLabel(action: string, t: ReturnType<typeof useTranslation<'common'>>['t']): string {
  if (action === 'next-initiative') return t('settings.hotkeys.actions.nextInitiative')
  if (action === 'zoom-in') return t('settings.hotkeys.actions.zoomIn')
  if (action === 'zoom-out') return t('settings.hotkeys.actions.zoomOut')
  if (action.startsWith('apply-condition:')) {
    const rest = action.slice('apply-condition:'.length)
    const lastColon = rest.lastIndexOf(':')
    if (lastColon !== -1) {
      const slug = rest.slice(0, lastColon)
      const value = rest.slice(lastColon + 1)
      return `${t('settings.hotkeys.actions.applyCondition')} ${slug} ${value}`
    }
  }
  return action
}

export function HotkeysSection() {
  const { t } = useTranslation('common')

  const { hotkeys, loadHotkeys } = useHotkeyStore(
    useShallow((s) => ({ hotkeys: s.hotkeys, loadHotkeys: s.loadHotkeys })),
  )

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isRecording, setIsRecording] = useState(false)
  const [recordPhase, setRecordPhase] = useState<1 | 2>(1)

  // Load hotkeys on mount
  useEffect(() => {
    loadHotkeys()
  }, [loadHotkeys])

  // Record mode keydown listener — mutable ref holds in-flight combo prefix
  const recordStep = useRef<{ combo: string | null }>({ combo: null })

  const stopRecording = useCallback(() => {
    setIsRecording(false)
    setRecordPhase(1)
    recordStep.current.combo = null
  }, [recordStep])

  useEffect(() => {
    if (!isRecording) return

    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        stopRecording()
        return
      }

      if (recordStep.current.combo === null) {
        // Step 1: capture combo prefix
        e.preventDefault()
        recordStep.current.combo = eventToCombo(e)
        setRecordPhase(2)
      } else {
        // Step 2: capture suffix → build full chord
        e.preventDefault()
        const suffix = eventToSuffix(e)
        const chord = `${recordStep.current.combo}:${suffix}`
        setForm((prev) => ({ ...prev, chord }))
        stopRecording()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isRecording, recordStep, stopRecording])

  const handleAdd = useCallback(() => {
    setForm(emptyForm())
    setShowForm(true)
    setIsRecording(false)
    setRecordPhase(1)
    recordStep.current.combo = null
  }, [recordStep])

  const handleEdit = useCallback((hk: Hotkey) => {
    const parsed = parseAction(hk.action)
    setForm({ id: hk.id, chord: hk.chord, ...parsed })
    setShowForm(true)
    setIsRecording(false)
    setRecordPhase(1)
    recordStep.current.combo = null
  }, [recordStep])

  const handleDelete = useCallback(async (id: string) => {
    await deleteHotkey(id)
    await loadHotkeys()
  }, [loadHotkeys])

  const handleSave = useCallback(async () => {
    const action = buildAction(form)
    await upsertHotkey({ id: form.id, action, chord: form.chord })
    await loadHotkeys()
    setShowForm(false)
    setIsRecording(false)
  }, [form, loadHotkeys])

  const handleCancel = useCallback(() => {
    setShowForm(false)
    setIsRecording(false)
    setRecordPhase(1)
    recordStep.current.combo = null
  }, [recordStep])

  return (
    <section>
      <h2 className="text-xl font-semibold text-foreground">{t('settings.hotkeys.title')}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t('settings.hotkeys.description')}</p>

      {hotkeys.length > 0 && (
        <div className="mt-4 rounded border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {t('settings.hotkeys.columnAction')}
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {t('settings.hotkeys.columnChord')}
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {hotkeys.map((hk) => (
                <tr key={hk.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-foreground">{actionLabel(hk.action, t)}</td>
                  <td className="px-3 py-2 font-mono text-foreground">{hk.chord}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(hk)}
                      >
                        {t('settings.hotkeys.edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(hk.id)}
                      >
                        {t('settings.hotkeys.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hotkeys.length === 0 && !showForm && (
        <p className="mt-4 text-sm text-muted-foreground">{t('settings.hotkeys.empty')}</p>
      )}

      {showForm && (
        <div className="mt-4 rounded border border-border p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              {t('settings.hotkeys.fieldAction')}
            </label>
            <Select
              value={form.actionType}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, actionType: v as ActionType }))
              }
            >
              <SelectTrigger className="w-60">
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
                <SelectItem value="apply-condition">
                  {t('settings.hotkeys.actions.applyCondition')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.actionType === 'apply-condition' && (
            <div className="flex gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  {t('settings.hotkeys.fieldCondition')}
                </label>
                <Select
                  value={form.conditionSlug}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, conditionSlug: v }))}
                >
                  <SelectTrigger className="w-40">
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

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  {t('settings.hotkeys.fieldValue')}
                </label>
                <Select
                  value={form.conditionValue}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, conditionValue: v }))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['1', '2', '3', '4'].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              {t('settings.hotkeys.fieldChord')}
            </label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={form.chord}
                placeholder={t('settings.hotkeys.chordPlaceholder')}
                className="w-48 font-mono"
              />
              <Button
                variant={isRecording ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => {
                  if (isRecording) {
                    stopRecording()
                  } else {
                    recordStep.current.combo = null
                    setIsRecording(true)
                  }
                }}
              >
                {isRecording
                  ? t('settings.hotkeys.recordingStop')
                  : t('settings.hotkeys.recordStart')}
              </Button>
            </div>
            {isRecording && (
              <p className="text-xs text-muted-foreground">
                {recordPhase === 1
                  ? t('settings.hotkeys.recordHintStep1')
                  : t('settings.hotkeys.recordHintStep2')}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={!form.chord}>
              {t('settings.hotkeys.save')}
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              {t('settings.hotkeys.cancel')}
            </Button>
          </div>
        </div>
      )}

      <Button className="mt-4" variant="outline" onClick={handleAdd}>
        {t('settings.hotkeys.addButton')}
      </Button>
    </section>
  )
}
