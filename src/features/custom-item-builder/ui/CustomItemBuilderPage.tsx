import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { getCustomItemById, updateCustomItem } from '@/shared/api'
import type { CustomItemInput } from '@/shared/api'
import { PATHS } from '@/shared/routes'
import { customItemRowToInput, isCustomItemDirty } from '../model/transform'
import { copyCustomItemCardToClipboard } from '../model/export-card'
import { CustomItemFieldsTab } from './CustomItemFieldsTab'
import { CustomItemRulesTab } from './CustomItemRulesTab'
import { CustomItemPreview } from './CustomItemPreview'
import { CustomItemHeader } from './CustomItemHeader'
import { CloneFromItemDialog } from './CloneFromItemDialog'

interface CustomItemBuilderPageProps {
  itemId: string
}

export function CustomItemBuilderPage({ itemId }: CustomItemBuilderPageProps) {
  const navigate = useNavigate()
  const [item, setItem] = useState<CustomItemInput | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)
  const savedRef = useRef<CustomItemInput | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const row = await getCustomItemById(itemId)
      if (cancelled) return
      if (!row) {
        toast.error('Custom item not found')
        navigate(PATHS.CUSTOM_ITEMS)
        return
      }
      const input = customItemRowToInput(row)
      savedRef.current = input
      setItem(input)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [itemId, navigate])

  const dirty = useMemo(
    () => Boolean(item && savedRef.current && isCustomItemDirty(item, savedRef.current)),
    [item],
  )

  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
    [dirty],
  )
  const blocker = useBlocker(shouldBlock)

  const patchItem = useCallback((patch: Partial<CustomItemInput>) => {
    setItem((prev) => prev ? { ...prev, ...patch } : prev)
  }, [])

  const save = useCallback(async () => {
    if (!item || saving) return
    setSaving(true)
    try {
      await updateCustomItem(itemId, item)
      savedRef.current = item
      toast('Custom item saved')
    } catch {
      toast.error('Failed to save custom item')
    } finally {
      setSaving(false)
    }
  }, [item, itemId, saving])

  const copyCard = useCallback(async () => {
    const target = previewRef.current?.querySelector<HTMLElement>('.custom-item-print-surface')
    if (!target) {
      toast.error('Custom item card is not ready')
      return
    }
    try {
      await copyCustomItemCardToClipboard(target)
      toast('Item card copied as image')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to copy item card'
      toast.error(message)
    }
  }, [])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [save])

  if (!loaded || !item) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        Loading custom item...
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <CustomItemHeader
        name={item.name}
        dirty={dirty}
        saving={saving}
        onSave={() => void save()}
        onClone={() => setCloneOpen(true)}
        onCopyCard={() => void copyCard()}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden p-6 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,0.85fr)]">
        <div className="min-h-0 overflow-hidden rounded-md border border-border/40 bg-card">
          <Tabs defaultValue="fields" className="flex h-full flex-col">
            <TabsList className="mx-2 mt-2 w-fit">
              <TabsTrigger value="fields">Fields</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
            </TabsList>
            <TabsContent value="fields" className="min-h-0 flex-1 overflow-y-auto">
              <CustomItemFieldsTab item={item} onChange={patchItem} />
            </TabsContent>
            <TabsContent value="rules" className="min-h-0 flex-1 overflow-y-auto">
              <CustomItemRulesTab item={item} onChange={(rules_json) => patchItem({ rules_json })} />
            </TabsContent>
          </Tabs>
        </div>
        <div ref={previewRef} className="custom-item-print-root min-h-0 overflow-y-auto">
          <CustomItemPreview item={item} />
        </div>
      </div>

      {blocker.state === 'blocked' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="rounded-md border border-border bg-card p-4 shadow-lg">
            <p className="mb-4 text-sm">Discard unsaved custom item changes?</p>
            <div className="flex justify-end gap-2">
              <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => blocker.reset?.()}>
                Keep editing
              </button>
              <button className="text-sm text-destructive hover:underline" onClick={() => blocker.proceed?.()}>
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      <CloneFromItemDialog
        open={cloneOpen}
        onOpenChange={setCloneOpen}
        onCloned={(id) => navigate(PATHS.CUSTOM_ITEM_EDIT(id))}
      />
    </div>
  )
}
