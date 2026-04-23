import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronDown, Info } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import { runSanityChecks } from '@engine'
import type { SanityIssue } from '@engine'
import type { CreatureStatBlockData } from '@/entities/creature/model/types'

interface Props {
  form: CreatureStatBlockData
}

export function DesignReviewPanel({ form }: Props) {
  const [issues, setIssues] = useState<SanityIssue[]>([])

  // Debounce 150ms — UI-SPEC Micro-interactions .
  useEffect(() => {
    const t = setTimeout(() => {
      const firstStrike = form.strikes[0]
      const firstEntry = form.spellcasting?.[0]
      setIssues(
        runSanityChecks({
          level: form.level,
          ac: form.ac,
          hp: form.hp,
          fort: form.fort,
          ref: form.ref,
          will: form.will,
          perception: form.perception,
          abilityMods: form.abilityMods,
          strikeAttackBonus: firstStrike?.modifier,
          // Form state does not track expected damage numerically — leave undefined.
          strikeDamageExpected: undefined,
          spellDC: firstEntry?.spellDc,
          spellAttack: firstEntry?.spellAttack,
        }),
      )
    }, 150)
    return () => clearTimeout(t)
  }, [form])

  const hasWarns = issues.some((i) => i.severity === 'warn')
  const [open, setOpen] = useState(hasWarns)

  // Keep open in sync when warns appear/disappear.
  useEffect(() => {
    setOpen(hasWarns)
  }, [hasWarns])

  // UI-SPEC: "If 0 items: hide the panel header entirely; just render nothing."
  if (issues.length === 0) return null

  const warnCount = issues.filter((i) => i.severity === 'warn').length
  const infoCount = issues.filter((i) => i.severity === 'info').length

  return (
    <div className="mt-4 border border-border/40 rounded-md bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold hover:bg-secondary/30"
          >
            <span className="flex items-center gap-2">
              Design Review
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {warnCount} warn · {infoCount} info
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="divide-y divide-border/40">
            {issues.map((issue, i) => (
              <li
                key={i}
                className={
                  issue.severity === 'warn'
                    ? 'flex items-start gap-2 px-3 py-2 text-sm text-amber-400 bg-amber-500/5 border-l-2 border-amber-500/50'
                    : 'flex items-start gap-2 px-3 py-2 text-sm text-muted-foreground'
                }
              >
                {issue.severity === 'warn' ? (
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
