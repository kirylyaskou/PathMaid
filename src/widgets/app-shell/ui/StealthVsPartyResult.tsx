import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import type { StealthVsPartyRow } from '@/shared/lib/stealth-vs-party'

interface StealthVsPartyResultProps {
  rows: StealthVsPartyRow[]
  onClose: () => void
}

export function StealthVsPartyResult({ rows, onClose }: StealthVsPartyResultProps) {
  const [open, setOpen] = useState(true)
  const widthClass = rows.length === 0 ? 'w-72' : 'w-80'

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={`fixed bottom-4 right-4 z-50 ${widthClass} rounded-md border border-border bg-background shadow-lg`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <CollapsibleTrigger className="group flex flex-1 items-center gap-2 text-left text-sm font-semibold text-foreground hover:text-primary">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]:-rotate-90" />
          <span>Stealth vs Party</span>
        </CollapsibleTrigger>
        <button
          type="button"
          aria-label="Hide Stealth vs Party"
          className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <CollapsibleContent className="max-h-80 overflow-y-auto px-3 pb-3">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No NPCs in encounter.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.npcId} className="text-xs">
                <div className="font-medium text-foreground">
                  {row.npcName}
                  {row.stealthDc != null ? (
                    <span className="ml-1 text-muted-foreground font-normal">
                      (DC {row.stealthDc})
                    </span>
                  ) : (
                    <span className="ml-1 text-muted-foreground font-normal italic">(нет блока)</span>
                  )}
                </div>

                {row.pcChecks.length === 0 && (
                  <p className="mt-0.5 text-muted-foreground">No PCs in encounter.</p>
                )}

                <ul className="mt-1 space-y-0.5 pl-2">
                  {row.pcChecks.map((check) => (
                    <li key={check.pcId} className="flex items-center gap-1.5">
                      <span
                        className={
                          check.spots === true
                            ? 'text-green-600 dark:text-green-400'
                            : check.spots === false
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-muted-foreground'
                        }
                      >
                        {check.spots === true ? '●' : check.spots === false ? '○' : '?'}
                      </span>
                      <span className="text-foreground">{check.pcName}</span>
                      {check.perception != null && (
                        <span className="text-muted-foreground">
                          Perc {check.perception >= 0 ? '+' : ''}{check.perception}
                        </span>
                      )}
                      {check.perception == null && (
                        <span className="text-muted-foreground">no stat block</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
