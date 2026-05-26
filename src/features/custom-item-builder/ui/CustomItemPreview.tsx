import { useMemo } from 'react'
import type { CustomItemInput } from '@/shared/api'
import { parseCustomItemTraits, formatPrice, getCustomItemRuleSummaries } from '@/entities/item'
import { SafeHtml } from '@/shared/lib/safe-html'

interface CustomItemPreviewProps {
  item: CustomItemInput
}

function traitLabel(trait: string): string {
  return trait.trim().toUpperCase()
}

export function CustomItemPreview({ item }: CustomItemPreviewProps) {
  const traits = useMemo(() => parseCustomItemTraits(item.traits), [item.traits])
  const ruleSummaries = useMemo(() => getCustomItemRuleSummaries(item.rules_json), [item.rules_json])
  const headerType = item.item_type.toUpperCase()
  const source = item.source_text?.trim() || 'Pathmaid Homebrew'

  return (
    <div className="custom-item-print-surface rounded-md border border-border/60 bg-[#101010] text-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-4 bg-[#57312e] px-3 py-2 text-[#e7d48e]">
        <h2 className="truncate text-xl font-black tracking-wide font-serif">{item.name || 'Unnamed Item'}</h2>
        <span className="shrink-0 text-lg font-black uppercase font-serif">{headerType} {item.level}</span>
      </div>
      <div className="p-3 space-y-3 text-sm leading-relaxed">
        {traits.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {traits.map((trait) => (
              <span
                key={trait}
                className="border border-[#d7b35b] bg-[#510000] px-1.5 py-0.5 text-xs font-bold uppercase text-white"
              >
                {traitLabel(trait)}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-0.5">
          <p><b>Source</b> <span className="text-cyan-300">{source}</span></p>
          {item.price_gp !== null && <p><b>Price</b> {formatPrice(item.price_gp)}</p>}
          {(item.usage || item.bulk) && (
            <p>
              {item.usage && <><b>Usage</b> {item.usage}</>}
              {item.usage && item.bulk && '; '}
              {item.bulk && <><b>Bulk</b> {item.bulk}</>}
            </p>
          )}
          {item.weapon_group && <p><b>Base Weapon</b> {item.weapon_group}</p>}
          {item.damage_formula && (
            <p><b>Damage</b> {item.damage_formula}{item.damage_type ? ` ${item.damage_type}` : ''}</p>
          )}
          {item.ac_bonus !== null && <p><b>AC Bonus</b> +{item.ac_bonus}</p>}
        </div>

        {ruleSummaries.length > 0 && (
          <div className="space-y-1 rounded-sm border border-[#d7b35b]/45 bg-[#1b140d] p-2">
            <p className="font-bold text-[#e7d48e]">Grants</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {ruleSummaries.map((summary) => (
                <li key={summary}>{summary}</li>
              ))}
            </ul>
          </div>
        )}

        <hr className="border-white/35" />

        {item.description ? (
          <SafeHtml html={item.description} className="custom-item-entry prose prose-invert max-w-none text-sm leading-relaxed" />
        ) : (
          <p className="text-muted-foreground">No public item text yet.</p>
        )}
      </div>
    </div>
  )
}
