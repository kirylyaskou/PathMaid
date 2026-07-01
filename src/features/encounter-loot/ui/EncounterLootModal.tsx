import { useCallback, useEffect, useMemo } from 'react'
import { Copy, FileText, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { AdditionalLootEditor } from './AdditionalLootEditor'
import { EnemyLootPreview } from './EnemyLootPreview'
import { LootSummary } from './LootSummary'
import { useEncounterLoot } from '../model/use-encounter-loot'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Switch } from '@/shared/ui/switch'
import type { ResolvedEncounterLootItem } from '../lib/types'

interface EncounterLootModalProps {
  encounterId: string | null
  open: boolean
  mode: 'builder' | 'combat'
  refreshKey?: number
  onOpenChange: (open: boolean) => void
}

function formatItemMarkdown(item: ResolvedEncounterLootItem): string {
  const details = [
    item.itemType,
    item.priceGp === null ? null : `${item.priceGp} gp`,
    item.bulk ? `Bulk ${item.bulk}` : null,
    item.combatantName ? `Source: ${item.combatantName}` : null,
  ].filter((value): value is string => value !== null && value.length > 0)
  const notes = item.notes ? `\n${item.notes}` : ''
  return `### ${item.remainingQuantity}x ${item.name}\n${details.join(' · ')}${notes}`
}

function formatItemCardsMarkdown(items: ResolvedEncounterLootItem[]): string {
  return items.map(formatItemMarkdown).join('\n\n')
}

export function EncounterLootModal({ encounterId, open, mode, refreshKey = 0, onOpenChange }: EncounterLootModalProps) {
  const loot = useEncounterLoot(encounterId)
  const isBuilderMode = mode === 'builder'
  const title = isBuilderMode ? 'Encounter Loot Builder' : 'Encounter Loot'

  useEffect(() => {
    if (open) void loot.reload()
  }, [loot.reload, open, refreshKey])

  const itemCardsText = useMemo(
    () => formatItemCardsMarkdown(loot.resolved.items),
    [loot.resolved.items],
  )

  const handleCopyCards = useCallback(async () => {
    await navigator.clipboard.writeText(itemCardsText)
    toast('Item cards copied')
  }, [itemCardsText])

  const handleReload = useCallback(() => {
    void loot.reload()
  }, [loot])

  const handleCopyTelegram = useCallback(() => {
    void loot.copyTelegramText()
  }, [loot])

  const handleCopyItemCards = useCallback(() => {
    void handleCopyCards()
  }, [handleCopyCards])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[min(92vh,860px)] w-[min(96vw,1280px)] !max-w-[min(96vw,1280px)] flex-col overflow-hidden">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {isBuilderMode && (
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={loot.autoFromEnemies}
                    disabled={loot.saving}
                    onCheckedChange={(checked) => void loot.saveAutoFromEnemies(checked)}
                  />
                  Auto from enemies
                </label>
              )}
              {loot.loading && <span className="text-xs text-muted-foreground">Loading...</span>}
              {loot.error && <span className="text-xs text-destructive">{loot.error}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleReload} disabled={loot.loading}>
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Reload
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleCopyTelegram} disabled={loot.resolved.items.length === 0}>
                <Copy className="mr-1.5 h-4 w-4" />
                Telegram
              </Button>
              {!isBuilderMode && (
                <Button type="button" variant="outline" size="sm" onClick={handleCopyItemCards} disabled={loot.resolved.items.length === 0}>
                  <FileText className="mr-1.5 h-4 w-4" />
                  Markdown cards
                </Button>
              )}
            </div>
          </div>

          <div className="shrink-0">
            <LootSummary summary={loot.resolved.summary} itemCount={loot.resolved.items.length} />
          </div>

          {isBuilderMode ? (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(22rem,0.9fr)_minmax(38rem,1.35fr)]">
              <section className="flex min-h-0 min-w-0 flex-col gap-2">
                <h2 className="shrink-0 text-sm font-semibold">Enemy loot preview</h2>
                <EnemyLootPreview groups={loot.groups} className="min-h-0 flex-1" />
              </section>
              <section className="flex min-h-0 min-w-0 flex-col gap-2">
                <h2 className="shrink-0 text-sm font-semibold">Additional loot</h2>
                <AdditionalLootEditor
                  className="min-h-0 flex-1"
                  entries={loot.additionalEntries}
                  disabled={loot.saving}
                  onAdd={loot.addAdditionalEntry}
                  onUpdate={loot.updateAdditionalEntry}
                  onDelete={loot.deleteAdditionalEntry}
                />
              </section>
            </div>
          ) : (
            <EnemyLootPreview groups={loot.groups} className="min-h-0 flex-1" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
