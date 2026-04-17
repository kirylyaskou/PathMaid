import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { AppliedRoleValues } from '@engine'
import {
  getCustomCreatureById,
  updateCustomCreature,
} from '@/shared/api/custom-creatures'
import { CreatureStatBlock } from '@/entities/creature/ui/CreatureStatBlock'
import type { CreatureStatBlockData } from '@/entities/creature/model/types'
import { PATHS } from '@/shared/routes'
import {
  builderReducer,
  type BuilderState,
} from '../model/builderReducer'
import { isDirty as checkIsDirty } from '../model/isDirty'
import { BuilderHeader } from './BuilderHeader'
import { BuilderTabs } from './BuilderTabs'
import { CloneFromBestiaryDialog } from './CloneFromBestiaryDialog'
import { DesignReviewPanel } from './DesignReviewPanel'
import { DirtyGuardDialog } from './DirtyGuardDialog'

interface Props {
  creatureId: string
}

// Reducer typed variant — before load we render a loading placeholder and
// never dispatch anything, so `state` is effectively a non-null after `loaded`.
type MaybeBuilderState = BuilderState | null

function rootReducer(
  state: MaybeBuilderState,
  action: Parameters<typeof builderReducer>[1],
): MaybeBuilderState {
  if (action.type === 'REPLACE_ALL') {
    return { form: action.form }
  }
  if (!state) return state
  return builderReducer(state, action)
}

export function BuilderPage({ creatureId }: Props) {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(rootReducer, null as MaybeBuilderState)
  const savedSnapshotRef = useRef<CreatureStatBlockData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [wasSaved, setWasSaved] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)

  // Load creature once on mount.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const data = await getCustomCreatureById(creatureId)
      if (cancelled) return
      if (!data) {
        toast.error('Creature not found')
        navigate(PATHS.CUSTOM_CREATURES)
        return
      }
      savedSnapshotRef.current = data.statBlock
      dispatch({ type: 'REPLACE_ALL', form: data.statBlock })
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [creatureId, navigate])

  // Dirty status (cheap JSON compare).
  const dirty =
    loaded && state && savedSnapshotRef.current
      ? checkIsDirty(state.form, savedSnapshotRef.current)
      : false

  // Pitfall 2: useCallback to avoid a new blocker per render (RESEARCH.md).
  const shouldBlock = useCallback(
    ({
      currentLocation,
      nextLocation,
    }: {
      currentLocation: { pathname: string }
      nextLocation: { pathname: string }
    }) =>
      dirty && !wasSaved && currentLocation.pathname !== nextLocation.pathname,
    [dirty, wasSaved],
  )
  const blocker = useBlocker(shouldBlock)

  // Pitfall 1: set `wasSaved` immediately before snapshot update so a follow-up
  // nav passes the blocker even if React hasn't rerendered yet. Reset after a
  // short tick so subsequent edits re-arm the guard.
  const handleSave = useCallback(async () => {
    if (!state || !dirty || saving) return
    setSaving(true)
    try {
      await updateCustomCreature(creatureId, state.form)
      savedSnapshotRef.current = state.form
      setWasSaved(true)
      toast('Saved')
    } catch (e) {
      toast.error(
        `Failed to save. ${(e as Error).message}. Your changes are still in the form.`,
      )
    } finally {
      setSaving(false)
    }
  }, [creatureId, dirty, saving, state])

  useEffect(() => {
    if (wasSaved) {
      const t = setTimeout(() => setWasSaved(false), 50)
      return () => clearTimeout(t)
    }
    return undefined
  }, [wasSaved])

  const handleApplyRole = useCallback((values: AppliedRoleValues) => {
    dispatch({ type: 'APPLY_ROLE_VALUES', values })
  }, [])

  // UI-SPEC: Ctrl+S / Cmd+S saves. Same pattern as CommandPalette.tsx.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  if (!loaded || !state) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <BuilderHeader
        name={state.form.name}
        level={state.form.level}
        dirty={dirty}
        saving={saving}
        creatureId={creatureId}
        onSave={() => void handleSave()}
        onApplyRole={handleApplyRole}
        onClone={() => setCloneOpen(true)}
      />
      {/* Two-pane layout — D-17. Stacks vertically below xl (Tauri window resize). */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 p-6 min-h-0 overflow-hidden">
        <div className="flex flex-col min-h-0 bg-card border border-border/40 rounded-md overflow-hidden">
          <BuilderTabs state={state} dispatch={dispatch} />
        </div>
        <div className="flex flex-col min-h-0 overflow-y-auto">
          {/* Live preview — renders form state directly per UI-SPEC. */}
          <CreatureStatBlock creature={state.form} />
          <DesignReviewPanel form={state.form} />
        </div>
      </div>

      {blocker.state === 'blocked' && (
        <DirtyGuardDialog
          onKeepEditing={() => blocker.reset?.()}
          onDiscard={() => blocker.proceed?.()}
        />
      )}

      <CloneFromBestiaryDialog
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        onClone={(data) => {
          // Preserve the current creature's id — clone only replaces content.
          dispatch({ type: 'REPLACE_ALL', form: { ...data, id: creatureId } })
          toast(`Replaced form with ${data.name}. Click Save to persist.`)
        }}
      />
    </div>
  )
}
