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
import { X, Plus } from 'lucide-react'
import type { SpellcastingSection } from '@/entities/spell'
import type { BuilderTabsProps } from '../BuilderTabs'
import { BenchmarkHint } from '../BenchmarkHint'
import { SpellSearchDialog } from '@/entities/creature'
import { SpellcastingEditor } from '@/features/spellcasting-editor'

const TRADITIONS = ['arcane', 'divine', 'occult', 'primal'] as const
const CAST_TYPES = ['prepared', 'spontaneous', 'focus', 'innate'] as const

// Builder binds to local section state — no live combat context, so these are
// always empty / no-ops. Declared at module scope to keep referential equality
// stable across renders and avoid shared-editor re-renders.
const EMPTY_USED_SLOTS: Record<number, number> = {}
const EMPTY_SLOT_DELTAS: Record<number, number> = {}
const EMPTY_PREPARED_CASTS: Set<string> = new Set()
const EMPTY_REMOVED_SPELLS: Set<string> = new Set()
const EMPTY_ADDED_BY_RANK: Record<number, never[]> = {}

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
  const [spellDialogOpen, setSpellDialogOpen] = useState(false)
  const [spellDialogRank, setSpellDialogRank] = useState(0)

  // Ensure a rank bucket exists for the target rank; return its index.
  function ensureRank(rank: number): { ranks: SpellcastingSection['spellsByRank']; idx: number } {
    const existing = entry.spellsByRank.findIndex((r) => r.rank === rank)
    if (existing >= 0) return { ranks: entry.spellsByRank, idx: existing }
    const nextRanks = [...entry.spellsByRank, { rank, slots: 0, spells: [] }].sort(
      (a, b) => a.rank - b.rank,
    )
    return { ranks: nextRanks, idx: nextRanks.findIndex((r) => r.rank === rank) }
  }

  function handleAddRank(rank: number) {
    if (entry.spellsByRank.some((r) => r.rank === rank)) return
    onChange({
      ...entry,
      spellsByRank: [...entry.spellsByRank, { rank, slots: 3, spells: [] }].sort(
        (a, b) => a.rank - b.rank,
      ),
    })
  }

  function handleSlotDelta(rank: number, delta: 1 | -1) {
    const { ranks, idx } = ensureRank(rank)
    const cur = ranks[idx]
    const nextSlots = Math.max(0, cur.slots + delta)
    onChange({
      ...entry,
      spellsByRank: ranks.map((r, i) => (i === idx ? { ...r, slots: nextSlots } : r)),
    })
  }

  function handleAddSpell(name: string, rank: number, foundryId?: string | null) {
    const trimmed = name.trim()
    if (!trimmed) return
    const { ranks, idx } = ensureRank(rank)
    const cur = ranks[idx]
    onChange({
      ...entry,
      spellsByRank: ranks.map((r, i) =>
        i === idx
          ? {
            ...r,
            spells: [
              ...cur.spells,
              { name: trimmed, foundryId: foundryId ?? null, entryId: entry.entryId },
            ],
          }
          : r,
      ),
    })
  }

  function handleRemoveSpell(name: string, rank: number, _isDefault: boolean) {
    const idx = entry.spellsByRank.findIndex((r) => r.rank === rank)
    if (idx < 0) return
    const cur = entry.spellsByRank[idx]
    const spellIdx = cur.spells.findIndex((s) => s.name === name)
    if (spellIdx < 0) return
    onChange({
      ...entry,
      spellsByRank: entry.spellsByRank.map((r, i) =>
        i === idx ? { ...r, spells: r.spells.filter((_, si) => si !== spellIdx) } : r,
      ),
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

      {/* Shared editor — always edit-mode. No live combat context, so cast
          callbacks + rank-pill filter are omitted; the editor then renders
          every rank, slot +/- controls, and the "Add rank N" footer. */}
      <SpellcastingEditor
        entry={entry}
        creatureLevel={level}
        mode="edit"
        usedSlots={EMPTY_USED_SLOTS}
        slotDeltas={EMPTY_SLOT_DELTAS}
        preparedCasts={EMPTY_PREPARED_CASTS}
        removedSpells={EMPTY_REMOVED_SPELLS}
        addedByRank={EMPTY_ADDED_BY_RANK}
        onSlotDelta={handleSlotDelta}
        onAddRank={handleAddRank}
        onAddSpell={handleAddSpell}
        onRemoveSpell={handleRemoveSpell}
        onOpenSpellSearch={(rank) => {
          setSpellDialogRank(rank)
          setSpellDialogOpen(true)
        }}
      />

      <SpellSearchDialog
        open={spellDialogOpen}
        onOpenChange={setSpellDialogOpen}
        defaultRank={spellDialogRank}
        defaultTradition={entry.tradition}
        onAdd={(name, rank, foundryId) => handleAddSpell(name, rank, foundryId)}
      />
    </div>
  )
}
