import type { SpellRow } from '@/shared/api'
import { cn } from '@/shared/lib/utils'
import { TRADITION_COLORS, actionCostLabel, parseDamageDisplay } from '@/entities/spell'
import { parseJsonArray } from '@/shared/lib/json'
import { stripRarityMarker } from '@/shared/lib/display-name'

const MAX_TRADITIONS = 2
const MAX_TRAITS = 3

interface SpellsTableProps {
  spells: SpellRow[]
  isFocusTab: boolean
  onSpellClick: (spellId: string) => void
}

export function SpellsTable({ spells, isFocusTab, onSpellClick }: SpellsTableProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 h-9 bg-card border-b border-border/40 shrink-0 text-xs text-muted-foreground font-medium">
        <span className="flex-[22] min-w-0">Name</span>
        <span className="flex-[5] shrink-0">Actions</span>
        <span className="flex-[8]">Save</span>
        <span className="flex-[10]">Damage</span>
        <span className="flex-[14]">{isFocusTab ? 'Source' : 'Traditions'}</span>
        <span className="flex-[16]">Traits</span>
      </div>

      {/* Rows */}
      {spells.map((spell) => (
        <SpellRow
          key={spell.id}
          spell={spell}
          isFocusTab={isFocusTab}
          onClick={() => onSpellClick(spell.id)}
        />
      ))}
    </div>
  )
}

function SpellRow({ spell, isFocusTab, onClick }: { spell: SpellRow; isFocusTab: boolean; onClick: () => void }) {
  const traditions = parseJsonArray(spell.traditions)
  const traits = parseJsonArray(spell.traits)
  const damage = parseDamageDisplay(spell.damage)
  const visibleTraditions = traditions.slice(0, MAX_TRADITIONS)
  const overflowTraditions = traditions.length - MAX_TRADITIONS
  const visibleTraits = traits.slice(0, MAX_TRAITS)
  const overflowTraits = traits.length - MAX_TRAITS

  return (
    <div
      className="flex items-center gap-2 px-3 h-9 border-b border-border/20 hover:bg-secondary/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {/* Name */}
      <span className="flex-[22] min-w-0 font-medium text-[13px] truncate">{stripRarityMarker(spell.name_loc ?? spell.name)}</span>

      {/* Actions */}
      <span className="flex-[5] shrink-0 font-mono text-primary text-[13px]">
        {actionCostLabel(spell.action_cost)}
      </span>

      {/* Save */}
      <span className="flex-[8] text-[12px] capitalize text-muted-foreground">
        {spell.save_stat ?? '—'}
      </span>

      {/* Damage */}
      <span className={cn('flex-[10] font-mono text-[12px]', damage !== '—' ? 'text-pf-blood' : 'text-muted-foreground')}>
        {damage}
      </span>

      {/* Traditions or Source */}
      <div className="flex-[14] flex items-center gap-1 min-w-0 overflow-hidden">
        {isFocusTab ? (
          <span className="text-[12px] text-muted-foreground truncate">{spell.source_book ?? '—'}</span>
        ) : (
          <>
            {visibleTraditions.map((t) => (
              <span
                key={t}
                className={cn(
                  'px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0',
                  TRADITION_COLORS[t] ?? 'bg-secondary text-secondary-foreground border-border'
                )}
              >
                {t}
              </span>
            ))}
            {overflowTraditions > 0 && (
              <span className="text-[10px] text-muted-foreground shrink-0">+{overflowTraditions}</span>
            )}
          </>
        )}
      </div>

      {/* Traits */}
      <div className="flex-[16] flex items-center gap-1 min-w-0 overflow-hidden">
        {visibleTraits.map((t) => (
          <span
            key={t}
            className="px-1 py-0.5 text-[9px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider shrink-0"
          >
            {t}
          </span>
        ))}
        {overflowTraits > 0 && (
          <span className="text-[10px] text-muted-foreground shrink-0">+{overflowTraits}</span>
        )}
      </div>
    </div>
  )
}
