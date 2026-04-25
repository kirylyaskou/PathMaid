import { useState, useCallback, useRef } from 'react'
import { Upload, FileJson, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { cn } from '@/shared/lib/utils'
import { toast } from 'sonner'
import { parseEncounterJson, detectFormat } from '../lib/parse-formats'
import { matchEncounters } from '../lib/match-combatants'
import { commitMatchedEncounter } from '../lib/import-encounter'
import type { MatchedEncounter, ImportFormat } from '../lib/types'
import { useEncounterBuilderStore } from '@/features/encounter-builder'
import { useEncounterStore } from '@/entities/encounter'
import { listEncounters } from '@/shared/api'

type Step = 'pick' | 'preview' | 'committing' | 'done'

export function ImportEncounterDialog({ open, onOpenChange }: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [step, setStep] = useState<Step>('pick')
  const [format, setFormat] = useState<ImportFormat>('unknown')
  const [matched, setMatched] = useState<MatchedEncounter[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const partyLevel = useEncounterBuilderStore((s) => s.partyLevel)
  const partySize = useEncounterBuilderStore((s) => s.partySize)
  const loadEncounters = useEncounterStore((s) => s.loadEncounters)

  const reset = useCallback(() => {
    setStep('pick')
    setFormat('unknown')
    setMatched([])
    setError(null)
    setBusy(false)
  }, [])

  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (!v) reset()
      onOpenChange(v)
    },
    [reset, onOpenChange]
  )

  const handleFile = useCallback(async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const text = await file.text()
      let json: unknown
      try {
        json = JSON.parse(text)
      } catch {
        setError('File is not valid JSON.')
        return
      }
      const fmt = detectFormat(json)
      setFormat(fmt)
      if (fmt === 'unknown') {
        setError('Unknown format. Expected PathMaid bundle, Pathmaiden export or Pathfinder Dashboard JSON.')
        return
      }
      const parsed = parseEncounterJson(json)
      if (parsed.length === 0) {
        setError('No encounters found in the file.')
        return
      }
      const m = await matchEncounters(parsed)
      setMatched(m)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.')
    } finally {
      setBusy(false)
    }
  }, [])

  const handleCommit = useCallback(async () => {
    setStep('committing')
    setBusy(true)
    try {
      const usedNames = new Set((await listEncounters()).map((e) => e.name))
      let totalImported = 0
      let totalSkipped = 0
      for (const m of matched) {
        const r = await commitMatchedEncounter(m, partyLevel, partySize, usedNames)
        totalImported += r.importedCount
        totalSkipped += r.skippedCount
      }
      await loadEncounters()
      toast(`Imported ${totalImported} combatant${totalImported === 1 ? '' : 's'}${totalSkipped > 0 ? `, skipped ${totalSkipped}` : ''}`)
      setStep('done')
      setTimeout(() => handleOpenChange(false), 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
      setStep('preview')
    } finally {
      setBusy(false)
    }
  }, [matched, partyLevel, partySize, loadEncounters, handleOpenChange])

  const totalImportable = matched.reduce(
    (acc, m) => acc + m.combatants.filter((c) => c.match.status !== 'skipped').length,
    0
  )
  const totalSkipped = matched.reduce(
    (acc, m) => acc + m.combatants.filter((c) => c.match.status === 'skipped').length,
    0
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-sm flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import Encounter
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 'pick' && 'Drop a JSON file or browse. Supported: PathMaid bundle, Pathmaiden export, Pathfinder Dashboard.'}
            {step === 'preview' && `Detected format: ${format}. Review combatant matches, then Import.`}
            {step === 'committing' && 'Committing…'}
            {step === 'done' && 'Done.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'pick' && (
          <div className="p-4">
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border/50 bg-muted/20 py-10 px-4 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'copy'
              }}
              onDrop={(e) => {
                e.preventDefault()
                const f = e.dataTransfer.files?.[0]
                if (f) void handleFile(f)
              }}
            >
              <FileJson className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drop JSON file here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json,.pathmaid,.pathmaiden,.pfdashencounters"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
                e.target.value = '' // allow re-selecting same file
              }}
            />
            {error && (
              <p className="mt-3 text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
            {busy && (
              <p className="mt-3 text-xs text-muted-foreground">Parsing…</p>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="flex flex-col max-h-[28rem]">
            <ScrollArea className="flex-1 px-4">
              {matched.map((m, i) => (
                <div key={i} className="mb-3">
                  <div className="flex items-center gap-2 py-1 border-b border-border/40 mb-1.5">
                    <span className="text-sm font-semibold">{m.parsed.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {m.combatants.length} total
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {m.combatants.map((c, j) => (
                      <CombatantMatchRow key={j} matched={c} />
                    ))}
                  </div>
                </div>
              ))}
            </ScrollArea>
            <div className="border-t border-border/40 px-4 py-3 flex items-center gap-3">
              <p className="text-xs text-muted-foreground flex-1">
                {totalImportable} to import{totalSkipped > 0 ? ` · ${totalSkipped} skipped` : ''}
              </p>
              <Button variant="outline" size="sm" onClick={() => setStep('pick')}>
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleCommit}
                disabled={totalImportable === 0 || busy}
              >
                Import {totalImportable || ''}
              </Button>
            </div>
            {error && (
              <p className="px-4 py-2 text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>
        )}

        {(step === 'committing' || step === 'done') && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {step === 'committing' ? 'Importing…' : 'Imported.'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CombatantMatchRow({ matched }: { matched: MatchedEncounter['combatants'][number] }) {
  const { parsed, match } = matched
  const badge = getBadge(match)
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/20 text-xs">
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded uppercase tracking-wider text-[10px] font-semibold shrink-0',
          badge.className
        )}
        title={badge.tooltip}
      >
        {badge.icon}
        {badge.label}
      </span>
      <span className="flex-1 truncate">{parsed.displayName}</span>
      {parsed.lookupName !== parsed.displayName && (
        <span className="text-[10px] text-muted-foreground/70 font-mono truncate" title="Bestiary lookup name">
          ({parsed.lookupName})
        </span>
      )}
      {parsed.level != null && (
        <span className="text-muted-foreground font-mono">L{parsed.level}</span>
      )}
    </div>
  )
}

function getBadge(match: MatchedEncounter['combatants'][number]['match']) {
  switch (match.status) {
    case 'bestiary':
      return {
        icon: <CheckCircle2 className="w-3 h-3" />,
        label: 'Bestiary',
        className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
        tooltip: `Matched creature in bestiary (level ${match.level})`,
      }
    case 'custom':
      return {
        icon: <CheckCircle2 className="w-3 h-3" />,
        label: 'Custom',
        className: 'bg-sky-500/15 text-sky-400 border border-sky-500/30',
        tooltip: `Matched custom creature (level ${match.level})`,
      }
    case 'hazard':
      return {
        icon: <AlertCircle className="w-3 h-3" />,
        label: 'Hazard',
        className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
        tooltip: `Matched hazard (level ${match.level})`,
      }
    case 'skipped':
      return {
        icon: <XCircle className="w-3 h-3" />,
        label: 'Skipped',
        className: 'bg-muted/50 text-muted-foreground border border-border/50',
        tooltip:
          match.reason === 'missing-name'
            ? 'No name on source entry'
            : 'No match in bestiary / custom / hazards',
      }
  }
}
