import { useState } from 'react'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { X, Plus, Search } from 'lucide-react'
import type { SpellcastingSection } from '@/entities/spell'
import type { BuilderTabsProps } from '../BuilderTabs'
import { BenchmarkHint } from '../BenchmarkHint'
import { SpellSearchDialog } from '@/entities/creature'

const TRADITIONS = ['arcane', 'divine', 'occult', 'primal'] as const
const CAST_TYPES = ['prepared', 'spontaneous', 'focus', 'innate'] as const

function newEntry(): SpellcastingSection {
  return {
    entryId: `custom-entry-${crypto.randomUUID()}`,
    entryName: 'Arcane Prepared Spells',
    tradition: 'arcane',
    castType: 'prepared',
    spellDc: 15,
    spellAttack: 7,
    spellsByRank: [],
  }
}

export function SpellcastingTab({ state, dispatch }: BuilderTabsProps) {
  const { form } = state
  const entries = form.spellcasting ?? []

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-base font-semibold">Spellcasting</h2>
      {entries.length === 0 && (
        <div className="flex items-center justify-between p-4 rounded-md border border-dashed border-border/50 bg-secondary/20">
          <p className="text-sm text-muted-foreground">No spellcasting entries.</p>
          <Button
            size="sm"
            onClick={() => dispatch({ type: 'ADD_SPELLCASTING_ENTRY', entry: newEntry() })}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Spellcasting Entry
          </Button>
        </div>
      )}
      {entries.map((entry, i) => (
        <SpellcastingEntryEditor
          key={entry.entryId}
          entry={entry}
          level={form.level}
          onChange={(e) => dispatch({ type: 'UPDATE_SPELLCASTING_ENTRY', index: i, entry: e })}
          onRemove={() => dispatch({ type: 'REMOVE_SPELLCASTING_ENTRY', index: i })}
        />
      ))}
      {entries.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => dispatch({ type: 'ADD_SPELLCASTING_ENTRY', entry: newEntry() })}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Spellcasting Entry
        </Button>
      )}
    </div>
  )
}

interface EditorProps {
  entry: SpellcastingSection
  level: number
  onChange: (e: SpellcastingSection) => void
  onRemove: () => void
}

function SpellcastingEntryEditor({ entry, level, onChange, onRemove }: EditorProps) {
  const [addRankInput, setAddRankInput] = useState(1)

  function addRank() {
    const rank = Math.max(0, Math.min(10, addRankInput))
    if (entry.spellsByRank.some((r) => r.rank === rank)) return
    onChange({
      ...entry,
      spellsByRank: [...entry.spellsByRank, { rank, slots: 3, spells: [] }].sort(
        (a, b) => a.rank - b.rank,
      ),
    })
  }

  function updateRank(
    rankIdx: number,
    patch: Partial<SpellcastingSection['spellsByRank'][number]>,
  ) {
    onChange({
      ...entry,
      spellsByRank: entry.spellsByRank.map((r, i) => (i === rankIdx ? { ...r, ...patch } : r)),
    })
  }

  function removeRank(rankIdx: number) {
    onChange({
      ...entry,
      spellsByRank: entry.spellsByRank.filter((_, i) => i !== rankIdx),
    })
  }

  function addSpell(rankIdx: number, name: string, foundryId: string | null) {
    const t = name.trim()
    if (!t) return
    const rankEntry = entry.spellsByRank[rankIdx]
    updateRank(rankIdx, {
      spells: [...rankEntry.spells, { name: t, foundryId, entryId: entry.entryId }],
    })
  }

  function removeSpell(rankIdx: number, spellIdx: number) {
    const rankEntry = entry.spellsByRank[rankIdx]
    updateRank(rankIdx, {
      spells: rankEntry.spells.filter((_, i) => i !== spellIdx),
    })
  }

  return (
    <div className="space-y-3 p-3 rounded-md border border-border/50 bg-card">
      <div className="flex items-center justify-between gap-2">
        <Input
          value={entry.entryName}
          onChange={(e) => onChange({ ...entry, entryName: e.target.value })}
          placeholder="Entry name"
          className="flex-1"
        />
        <button
          type="button"
          aria-label="Remove entry"
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Tradition</Label>
          <Select
            value={entry.tradition}
            onValueChange={(v) => onChange({ ...entry, tradition: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRADITIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Cast type</Label>
          <Select
            value={entry.castType}
            onValueChange={(v) => onChange({ ...entry, castType: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAST_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Spell DC</Label>
            <BenchmarkHint
              stat="spellDC"
              level={level}
              value={entry.spellDc}
              onSelectTier={(v) => onChange({ ...entry, spellDc: v })}
            />
          </div>
          <Input
            type="number"
            className="font-mono"
            value={entry.spellDc}
            onChange={(e) => onChange({ ...entry, spellDc: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Spell attack</Label>
            <BenchmarkHint
              stat="spellAttack"
              level={level}
              value={entry.spellAttack}
              onSelectTier={(v) => onChange({ ...entry, spellAttack: v })}
            />
          </div>
          <Input
            type="number"
            className="font-mono"
            value={entry.spellAttack}
            onChange={(e) => onChange({ ...entry, spellAttack: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Ranks</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={10}
              className="font-mono w-20"
              value={addRankInput}
              onChange={(e) => setAddRankInput(Number(e.target.value))}
            />
            <Button size="sm" variant="outline" onClick={addRank}>
              <Plus className="w-3 h-3 mr-1" />
              Add rank
            </Button>
          </div>
        </div>
        {entry.spellsByRank.length === 0 && (
          <p className="text-xs text-muted-foreground">No ranks added.</p>
        )}
        {entry.spellsByRank.map((rankEntry, ri) => (
          <RankEditor
            key={`${rankEntry.rank}-${ri}`}
            rankEntry={rankEntry}
            tradition={entry.tradition}
            onSlotsChange={(n) => updateRank(ri, { slots: n })}
            onAddSpell={(name, foundryId) => addSpell(ri, name, foundryId)}
            onRemoveSpell={(si) => removeSpell(ri, si)}
            onRemoveRank={() => removeRank(ri)}
          />
        ))}
      </div>
    </div>
  )
}

interface RankEditorProps {
  rankEntry: SpellcastingSection['spellsByRank'][number]
  /** Default tradition used to pre-filter SpellSearchDialog when opened. */
  tradition: string
  onSlotsChange: (n: number) => void
  onAddSpell: (name: string, foundryId: string | null) => void
  onRemoveSpell: (idx: number) => void
  onRemoveRank: () => void
}

function RankEditor({
  rankEntry,
  tradition,
  onSlotsChange,
  onAddSpell,
  onRemoveSpell,
  onRemoveRank,
}: RankEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const label = rankEntry.rank === 0 ? 'Cantrips' : `Rank ${rankEntry.rank}`

  return (
    <div className="space-y-2 p-2 rounded bg-secondary/20 border border-border/40">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium w-20">{label}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Slots</span>
        <Input
          type="number"
          min={0}
          className="font-mono w-16"
          value={rankEntry.slots}
          onChange={(e) => onSlotsChange(Number(e.target.value))}
        />
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => setDialogOpen(true)}
        >
          <Search className="w-3 h-3 mr-1" />
          Add spell…
        </Button>
        <button
          type="button"
          aria-label="Remove rank"
          onClick={onRemoveRank}
          className="p-1 text-muted-foreground hover:text-destructive"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {rankEntry.spells.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rankEntry.spells.map((s, si) => (
            <span
              key={`${s.name}-${si}`}
              className="inline-flex items-center gap-1 text-xs rounded bg-secondary/50 border border-border/50 px-2 py-0.5"
            >
              {s.name}
              {s.foundryId === null && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70" title="Free-form entry, no resolved spell data">
                  manual
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove ${s.name}`}
                onClick={() => onRemoveSpell(si)}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <SpellSearchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultRank={rankEntry.rank}
        defaultTradition={tradition}
        onAdd={(name, _rank, foundryId) => {
          onAddSpell(name, foundryId)
        }}
      />
    </div>
  )
}
