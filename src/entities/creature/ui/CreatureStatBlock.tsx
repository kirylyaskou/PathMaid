import type { ReactNode } from "react"
import { useState, useEffect, useCallback } from "react"
import { cn } from "@/shared/lib/utils"
import { Card, CardContent, CardHeader } from "@/shared/ui/card"
import { Separator } from "@/shared/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible"
import { ChevronDown, ChevronRight, X, Backpack } from "lucide-react"
import { LevelBadge } from "@/shared/ui/level-badge"
import { TraitList } from "@/shared/ui/trait-pill"
import { ActionIcon } from "@/shared/ui/action-icon"
import type { CreatureStatBlockData } from '../model/types'
import type { SpellcastingSection, SpellsByRank } from '@/entities/spell'
import type { SpellRow } from '@/entities/spell'
import { getSpellById, searchSpells, saveSpellSlotUsage, loadSpellSlots, loadSpellOverrides, upsertSpellOverride, deleteSpellOverride } from '@/shared/api'
import type { SpellOverrideRow, CreatureItemRow } from '@/shared/api'
import { ITEM_TYPE_COLORS } from '@/entities/item'

export interface EncounterContext {
  encounterId: string
  combatantId: string
}

interface CreatureStatBlockProps {
  creature: CreatureStatBlockData
  className?: string
  encounterContext?: EncounterContext
}

export function CreatureStatBlock({ creature, className, encounterContext }: CreatureStatBlockProps) {
  return (
    <Card className={cn("overflow-hidden card-grimdark border-border/50 border-l-[3px] border-l-pf-gold", className)}>
      {/* Header - Grimdark */}
      <CardHeader className="-mt-6 pb-3 stat-block-header border-b border-primary/20">
        <div className="flex items-start gap-4">
          <LevelBadge level={creature.level} size="lg" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">{creature.name}</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
              {creature.size} {creature.type}
            </p>
            <TraitList
              traits={creature.traits}
              rarity={creature.rarity}
              size={creature.size}
              className="mt-2"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Core Stats */}
        <div className="p-4 bg-card">
          <div className="grid grid-cols-6 gap-4">
            <StatItem label="HP" value={creature.hp} highlight />
            <StatItem label="AC" value={creature.ac} colorClass="text-pf-gold" />
            <StatItem label="Fort" value={creature.fort} modifier colorClass="text-pf-threat-low" showDc />
            <StatItem label="Ref" value={creature.ref} modifier colorClass="text-pf-threat-low" showDc />
            <StatItem label="Will" value={creature.will} modifier colorClass="text-pf-threat-low" showDc />
            <StatItem label="Perception" value={creature.perception} modifier colorClass="text-pf-gold-dim" showDc />
          </div>
          {(creature.spellDC != null || creature.classDC != null) && (
            <div className="flex gap-6 mt-3 pt-3 border-t border-border/40">
              {creature.spellDC != null && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Spell DC</p>
                  <p className="font-mono font-bold text-lg text-primary">{creature.spellDC}</p>
                </div>
              )}
              {creature.classDC != null && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Class DC</p>
                  <p className="font-mono font-bold text-lg text-primary">{creature.classDC}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Immunities, Weaknesses, Resistances */}
        {(creature.immunities.length > 0 || creature.weaknesses.length > 0 || creature.resistances.length > 0) && (
          <>
            <div className="p-4 space-y-2">
              {creature.immunities.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold text-muted-foreground w-24 shrink-0">Immunities</span>
                  <span>{creature.immunities.join(", ")}</span>
                </div>
              )}
              {creature.resistances.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold text-muted-foreground w-24 shrink-0">Resistances</span>
                  <span>
                    {creature.resistances.map((r) => `${r.type} ${r.value}`).join(", ")}
                  </span>
                </div>
              )}
              {creature.weaknesses.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="font-semibold text-muted-foreground w-24 shrink-0">Weaknesses</span>
                  <span>
                    {creature.weaknesses.map((w) => `${w.type} ${w.value}`).join(", ")}
                  </span>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Speed */}
        <div className="p-4">
          <div className="flex gap-2 text-sm">
            <span className="font-semibold text-muted-foreground w-24 shrink-0">Speed</span>
            <span>
              {Object.entries(creature.speeds)
                .filter(([, value]) => value)
                .map(([type, value]) => (type === "land" ? `${value} feet` : `${type} ${value} feet`))
                .join(", ")}
            </span>
          </div>
        </div>

        <Separator />

        {/* Strikes */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
            <span className="font-semibold text-sm text-foreground">Strikes</span>
            <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 py-3 space-y-3">
              {creature.strikes.map((strike, i) => {
                const isAgile = strike.traits.includes('agile')
                const map1 = strike.modifier - (isAgile ? 4 : 5)
                const map2 = strike.modifier - (isAgile ? 8 : 10)
                const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)
                return (
                  <div key={i} className="p-3 rounded-md bg-secondary/50">
                    <div className="flex items-center gap-2">
                      <ActionIcon cost={1} className="text-lg" />
                      <span className="font-semibold">{strike.name}</span>
                      <span className="font-mono text-primary">
                        +{strike.modifier}
                      </span>
                    </div>
                    {/* Main damage */}
                    {strike.damage.length > 0 && (
                      <div className="mt-1 text-sm">
                        <span className="font-semibold">Damage </span>
                        {strike.damage.map((d, di) => (
                          <span key={di}>
                            {di > 0 && <span className="text-muted-foreground"> plus </span>}
                            <span className="font-mono">{d.formula}</span>
                            {d.type && (
                              <span className={cn("font-mono", damageTypeColor(d.type))}> {d.type}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Additional damage */}
                    {strike.additionalDamage && strike.additionalDamage.length > 0 && (
                      <div className="mt-1 text-sm space-y-0.5">
                        {strike.additionalDamage.map((ad, adi) => (
                          <div key={adi}>
                            {ad.label && (
                              <span className="text-muted-foreground text-xs">{ad.label}: </span>
                            )}
                            <span className="font-mono">{ad.formula}</span>
                            {ad.type && (
                              <span className={cn("font-mono", damageTypeColor(ad.type))}> {ad.type}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Weapon group badge */}
                    {strike.group && (
                      <div className="mt-1">
                        <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/60">
                          Group: {strike.group}
                        </span>
                      </div>
                    )}
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">
                        MAP: <span className="text-primary">{fmt(strike.modifier)}</span>
                        {' / '}
                        <span className="text-muted-foreground">{fmt(map1)}</span>
                        {' / '}
                        <span className="text-muted-foreground">{fmt(map2)}</span>
                      </span>
                    </div>
                    {strike.traits.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {strike.traits.map((trait) => (
                          <span
                            key={trait}
                            className="px-1.5 py-0.5 text-xs rounded bg-secondary text-secondary-foreground"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Abilities */}
        {creature.abilities.length > 0 && (
          <>
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
                <span className="font-semibold text-sm text-foreground">Abilities</span>
                <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 py-3 space-y-3">
                  {creature.abilities.map((ability, i) => (
                    <div key={i} className="p-3 rounded bg-pf-parchment border-l-2 border-primary/30">
                      <div className="flex items-center gap-2">
                        {ability.actionCost !== undefined && ability.actionCost !== 0 && (
                          <ActionIcon cost={ability.actionCost} className="text-lg text-primary" />
                        )}
                        <span className="font-semibold text-sm">{ability.name}</span>
                      </div>
                      <p className="mt-1 text-sm text-foreground/80 leading-relaxed">{highlightGameText(ability.description)}</p>
                      {ability.traits && ability.traits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ability.traits.map((trait) => (
                            <span
                              key={trait}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider"
                            >
                              {trait}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
            <Separator />
          </>
        )}

        {/* Spellcasting */}
        {creature.spellcasting && creature.spellcasting.length > 0 && (
          <>
            {creature.spellcasting.map((section) => (
              <SpellcastingBlock
                key={section.entryId}
                section={section}
                {...(encounterContext ? { encounterContext } : {})}
              />
            ))}
            <Separator />
          </>
        )}

        {/* Equipment */}
        {creature.equipment && creature.equipment.length > 0 && (
          <>
            <EquipmentBlock items={creature.equipment} />
            <Separator />
          </>
        )}

        {/* Skills — all 17 standard skills in Collapsible */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
            <span className="font-semibold text-sm text-foreground">Skills</span>
            <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {creature.skills.map((skill) => (
                  <span key={skill.name} className={skill.calculated ? "opacity-40" : ""}>
                    <span className="text-muted-foreground">{skill.name}</span>{" "}
                    <span className="font-mono text-primary">
                      {skill.modifier >= 0 ? "+" : ""}{skill.modifier}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
        <Separator />

        {/* Languages & Senses */}
        <div className="p-4 space-y-2">
          {creature.languages.length > 0 && (
            <div className="flex gap-2 text-sm">
              <span className="font-semibold text-muted-foreground w-24 shrink-0">Languages</span>
              <span>{creature.languages.join(", ")}</span>
            </div>
          )}
          {creature.senses.length > 0 && (
            <div className="flex gap-2 text-sm">
              <span className="font-semibold text-muted-foreground w-24 shrink-0">Senses</span>
              <span>{creature.senses.join(", ")}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {creature.description && (
          <>
            <Separator />
            <div className="p-4">
              <div className="p-4 rounded-md bg-pf-parchment">
                <p className="text-sm italic text-foreground/80">{creature.description}</p>
              </div>
            </div>
          </>
        )}

        {/* Source */}
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground">
            Source: {creature.source}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Damage type color coding for PF2e
const DAMAGE_TYPE_COLORS: Record<string, string> = {
  // Physical — dark grey
  bludgeoning: "text-zinc-400",
  slashing:    "text-zinc-400",
  piercing:    "text-zinc-400",
  // Energy
  fire:        "text-orange-400",
  cold:        "text-cyan-300",
  electricity: "text-yellow-300",
  acid:        "text-lime-400",
  sonic:       "text-violet-400",
  force:       "text-blue-400",
  // Positive/Negative
  positive:    "text-green-400",
  healing:     "text-green-400",
  negative:    "text-pink-400",
  // Other
  poison:      "text-emerald-400",
  mental:      "text-indigo-400",
  bleed:       "text-red-400",
  holy:        "text-yellow-200",
  unholy:      "text-purple-600",
  chaotic:     "text-orange-500",
  lawful:      "text-slate-400",
  good:        "text-amber-300",
  evil:        "text-purple-800",
  untyped:     "text-zinc-500",
  spirit:      "text-violet-300",
}

function damageTypeColor(type: string): string {
  return DAMAGE_TYPE_COLORS[type.toLowerCase()] ?? "text-pf-blood"
}

// Strip Foundry VTT inline roll tags: [[/gmr 2d6 #rounds]]{2d6 rounds} → "2d6 rounds"
// If no display text, strip the tag entirely.
const FOUNDRY_TAG_RE = /\[\[.*?\]\](?:\{([^}]*)\})?/g
function stripFoundryTags(text: string): string {
  return text.replace(FOUNDRY_TAG_RE, (_, display) => display ?? "")
}

// Inline highlighting for DC values and damage dice in ability text
// Group 2 = dice formula, Group 3 = damage type (stripped of brackets)
const GAME_TEXT_RE = /(DC\s+\d+)|(\d+d\d+(?:\s*[+\-]\s*\d+)?)(?:\[(\w+)\])?/gi

function highlightGameText(raw: string): ReactNode {
  const text = stripFoundryTags(raw)
  const parts: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(GAME_TEXT_RE)) {
    const idx = match.index!
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx))

    if (match[1]) {
      // DC value
      parts.push(
        <span key={key++} className="text-pf-gold font-semibold font-mono">{match[1]}</span>
      )
    } else if (match[2]) {
      // Dice formula
      parts.push(
        <span key={key++} className="text-pf-blood font-mono">{match[2]}</span>
      )
      // Damage type (if present, stripped of brackets)
      if (match[3]) {
        parts.push(
          <span key={key++} className={cn("font-mono", damageTypeColor(match[3]))}> {match[3]}</span>
        )
      }
    }
    lastIndex = idx + match[0].length
  }

  if (lastIndex === 0) return text
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <>{parts}</>
}

// ── Spellcasting ──────────────────────────────────────────────────────────────

function traditionColor(tradition: string): string {
  const map: Record<string, string> = {
    arcane:  'bg-blue-500/20 text-blue-300 border-blue-500/30',
    divine:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    occult:  'bg-purple-500/20 text-purple-300 border-purple-500/30',
    primal:  'bg-green-500/20 text-green-300 border-green-500/30',
  }
  return map[tradition.toLowerCase()] ?? 'bg-secondary text-secondary-foreground border-border'
}

function rankLabel(rank: number): string {
  return rank === 0 ? 'Cantrips' : `Rank ${rank}`
}

function actionCostLabel(cost: string): string {
  if (cost === 'free') return '◇'
  if (cost === 'reaction') return '↺'
  const n = parseInt(cost)
  if (n === 1) return '◆'
  if (n === 2) return '◆◆'
  if (n === 3) return '◆◆◆'
  return cost
}

function stripHtmlInline(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
}

function SpellCard({ foundryId, name }: { foundryId: string | null; name: string }) {
  const [open, setOpen] = useState(false)
  const [spell, setSpell] = useState<SpellRow | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    if (!open && !spell && foundryId) {
      setLoading(true)
      try {
        const data = await getSpellById(foundryId)
        setSpell(data)
      } finally {
        setLoading(false)
      }
    }
    setOpen((v) => !v)
  }

  const traditions: string[] = spell?.traditions ? JSON.parse(spell.traditions) : []
  const traits: string[] = spell?.traits ? JSON.parse(spell.traits) : []

  return (
    <div className="rounded border border-border/30 bg-secondary/30 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-sm text-left hover:bg-secondary/60 transition-colors"
      >
        {open
          ? <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
          : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
        }
        <span className="font-medium">{name}</span>
        {loading && <span className="text-xs text-muted-foreground ml-auto">…</span>}
        {!spell && !loading && !foundryId && (
          <span className="text-xs text-muted-foreground ml-auto italic">no data</span>
        )}
      </button>

      {open && spell && (
        <div className="px-3 pb-2 pt-1 space-y-1.5 border-t border-border/30">
          {/* Meta row */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {spell.action_cost && (
              <span className="font-mono text-primary">{actionCostLabel(spell.action_cost)}</span>
            )}
            {spell.range_text && (
              <span className="text-muted-foreground">Range: <span className="text-foreground">{spell.range_text}</span></span>
            )}
            {spell.area && (() => {
              const a = JSON.parse(spell.area) as { type?: string; value?: number }
              return a.value
                ? <span className="text-muted-foreground">Area: <span className="text-foreground">{a.value}-foot {a.type}</span></span>
                : null
            })()}
            {spell.duration_text && (
              <span className="text-muted-foreground">Duration: <span className="text-foreground">{spell.duration_text}</span></span>
            )}
            {spell.save_stat && (
              <span className="text-muted-foreground">Save: <span className="text-foreground capitalize">{spell.save_stat}</span></span>
            )}
          </div>
          {/* Damage */}
          {spell.damage && (() => {
            const dmg = JSON.parse(spell.damage) as Record<string, { formula?: string; damage?: string; damageType?: string; type?: string }>
            const parts = Object.values(dmg)
              .map((d) => `${d.formula ?? d.damage ?? '?'} ${d.damageType ?? d.type ?? ''}`.trim())
              .filter(Boolean)
            return parts.length > 0
              ? <p className="text-xs"><span className="text-muted-foreground">Damage: </span><span className="font-mono text-pf-blood">{parts.join(' + ')}</span></p>
              : null
          })()}
          {/* Traits */}
          {(traits.length > 0 || traditions.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {[...traditions, ...traits].map((t) => (
                <span key={t} className="px-1 py-0.5 text-[10px] rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">{t}</span>
              ))}
            </div>
          )}
          {/* Description */}
          {spell.description && (
            <p className="text-xs text-foreground/75 leading-relaxed line-clamp-4">
              {stripHtmlInline(resolveFoundryTokensForSpell(spell.description))}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Slot pips ─────────────────────────────────────────────────────────────────

function SlotPips({ total, used, onToggle }: { total: number; used: number; onToggle: (idx: number) => void }) {
  if (total <= 0) return null
  return (
    <div className="flex gap-0.5 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); onToggle(i) }}
          title={i < used ? 'Mark slot available' : 'Mark slot used'}
          className={cn(
            "w-3.5 h-3.5 rounded-full border transition-colors text-[8px] flex items-center justify-center",
            i < used
              ? "bg-primary/70 border-primary text-primary-foreground"
              : "bg-transparent border-border/60 hover:border-primary/60"
          )}
        />
      ))}
    </div>
  )
}

// ── Spell override row ────────────────────────────────────────────────────────

function AddSpellRow({ rank, onAdd }: {
  rank: number
  onAdd: (name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SpellRow[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      const r = await searchSpells(query, rank)
      setResults(r.slice(0, 8))
    }, 200)
    return () => clearTimeout(t)
  }, [query, rank])

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <input
          className="flex-1 text-xs bg-transparent border border-border/40 rounded px-2 py-0.5 focus:outline-none focus:border-primary/60"
          placeholder="Add spell…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-0.5 bg-card border border-border rounded shadow-lg max-h-40 overflow-y-auto">
          {results.map((s) => (
            <button
              key={s.id}
              className="w-full text-left px-2 py-1 text-xs hover:bg-secondary/70 flex items-center justify-between"
              onMouseDown={() => { onAdd(s.name); setQuery(''); setOpen(false) }}
            >
              <span>{s.name}</span>
              <span className="text-muted-foreground">{rankLabel(s.rank)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SpellcastingBlock (with encounter-aware slots + overrides) ────────────────

function SpellcastingBlock({ section, encounterContext }: {
  section: SpellcastingSection
  encounterContext?: EncounterContext
}) {
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

  // Slot state — keyed by rank
  const [usedSlots, setUsedSlots] = useState<Record<number, number>>({})
  // Override state
  const [overrides, setOverrides] = useState<SpellOverrideRow[]>([])

  const { encounterId, combatantId } = encounterContext ?? {}

  const loadSlotState = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSpellSlots(encounterId, combatantId)
    const byRank: Record<number, number> = {}
    for (const r of rows) {
      if (r.entryId === section.entryId) byRank[r.rank] = r.usedCount
    }
    setUsedSlots(byRank)
  }, [encounterId, combatantId, section.entryId])

  const loadOverrideState = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSpellOverrides(encounterId, combatantId)
    setOverrides(rows.filter((r) => r.entryId === section.entryId))
  }, [encounterId, combatantId, section.entryId])

  useEffect(() => {
    loadSlotState()
    loadOverrideState()
  }, [loadSlotState, loadOverrideState])

  async function handleTogglePip(rank: number, idx: number, total: number) {
    if (!encounterId || !combatantId) return
    const current = usedSlots[rank] ?? 0
    // Click on used pip → reduce; click on unused pip → use up to that index
    const newUsed = idx < current ? idx : Math.min(idx + 1, total)
    setUsedSlots((prev) => ({ ...prev, [rank]: newUsed }))
    await saveSpellSlotUsage(encounterId, combatantId, section.entryId, rank, newUsed)
  }

  async function handleAddSpell(name: string, rank: number) {
    if (!encounterId || !combatantId) return
    const id = `${combatantId}:${section.entryId}:add:${name}:${rank}`
    const override: SpellOverrideRow = {
      id, encounterId, combatantId, entryId: section.entryId,
      spellName: name, rank, isRemoved: false, sortOrder: Date.now(),
    }
    await upsertSpellOverride(override)
    setOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
  }

  async function handleRemoveSpell(spellName: string, rank: number, isDefault: boolean) {
    if (!encounterId || !combatantId) return
    if (isDefault) {
      // Mark default spell as removed for this encounter
      const id = `${combatantId}:${section.entryId}:rm:${spellName}:${rank}`
      const override: SpellOverrideRow = {
        id, encounterId, combatantId, entryId: section.entryId,
        spellName, rank, isRemoved: true, sortOrder: 0,
      }
      await upsertSpellOverride(override)
      setOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
    } else {
      // Remove an added spell
      const id = `${combatantId}:${section.entryId}:add:${spellName}:${rank}`
      await deleteSpellOverride(id)
      setOverrides((prev) => prev.filter((o) => o.id !== id))
    }
  }

  const removedSpells = new Set(overrides.filter((o) => o.isRemoved).map((o) => `${o.rank}:${o.spellName}`))
  const addedByRank = overrides
    .filter((o) => !o.isRemoved)
    .reduce<Record<number, string[]>>((acc, o) => {
      if (!acc[o.rank]) acc[o.rank] = []
      acc[o.rank].push(o.spellName)
      return acc
    }, {})

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">Spellcasting</span>
          <span className={cn("px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold", traditionColor(section.tradition))}>
            {section.tradition} {section.castType}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 pt-2 space-y-3">
          {/* DC + Attack */}
          <div className="flex gap-4 text-sm">
            {section.spellDc > 0 && (
              <span className="text-muted-foreground">DC <span className="font-mono text-primary font-bold">{section.spellDc}</span></span>
            )}
            {section.spellAttack !== 0 && (
              <span className="text-muted-foreground">Attack <span className="font-mono text-primary font-bold">{fmt(section.spellAttack)}</span></span>
            )}
          </div>
          {/* Spells by rank */}
          {section.spellsByRank.map((byRank: SpellsByRank) => {
            const used = usedSlots[byRank.rank] ?? 0
            const visibleSpells = byRank.spells.filter(
              (s) => !removedSpells.has(`${byRank.rank}:${s.name}`)
            )
            const added = addedByRank[byRank.rank] ?? []
            return (
              <div key={byRank.rank}>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {rankLabel(byRank.rank)}
                  </span>
                  {encounterId && byRank.slots > 0 ? (
                    <SlotPips
                      total={byRank.slots}
                      used={used}
                      onToggle={(idx) => handleTogglePip(byRank.rank, idx, byRank.slots)}
                    />
                  ) : byRank.slots > 0 ? (
                    <span className="text-xs text-muted-foreground">({byRank.slots} slots)</span>
                  ) : null}
                </div>
                <div className="space-y-1">
                  {visibleSpells.map((spell, i) => (
                    <div key={i} className="flex items-center gap-1 group/spell">
                      <div className="flex-1">
                        <SpellCard name={spell.name} foundryId={spell.foundryId} />
                      </div>
                      {encounterId && (
                        <button
                          onClick={() => handleRemoveSpell(spell.name, byRank.rank, true)}
                          className="opacity-0 group-hover/spell:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          title="Remove for this encounter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {/* Added spells for this encounter */}
                  {added.map((name, i) => (
                    <div key={`added-${i}`} className="flex items-center gap-1 group/spell">
                      <div className="flex-1">
                        <SpellCard name={name} foundryId={null} />
                      </div>
                      {encounterId && (
                        <button
                          onClick={() => handleRemoveSpell(name, byRank.rank, false)}
                          className="opacity-0 group-hover/spell:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          title="Remove added spell"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {/* Add spell row — only in encounter context */}
                  {encounterId && (
                    <AddSpellRow
                      rank={byRank.rank}
                      onAdd={(name) => handleAddSpell(name, byRank.rank)}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// Minimal token resolver for spell descriptions (subset of full resolver)
function resolveFoundryTokensForSpell(text: string): string {
  text = text.replace(/@UUID\[[^\]]*\]\{([^}]+)\}/g, '$1')
  text = text.replace(/@UUID\[([^\]]+)\]/g, (_, path: string) => path.split('.').pop() ?? '')
  text = text.replace(/@Damage\[([^\]]*)\]/g, (_, inner: string) => {
    return inner.split(/,\s*/).map((p: string) => {
      const m = p.trim().match(/^(.+?)\[(.+?)\]$/)
      return m ? `${m[1]} ${m[2]}` : p.trim()
    }).join(' plus ')
  })
  text = text.replace(/@Check\[([^\]]+)\]/g, (_, inner: string) => {
    const params = Object.fromEntries(inner.split('|').map((p: string) => p.split(':')))
    return `${params.dc ? `DC ${params.dc} ` : ''}${params.type ?? 'check'} check`
  })
  text = text.replace(/@Localize\[[^\]]+\]/g, '')
  return text
}

interface StatItemProps {
  label: string
  value: number
  modifier?: boolean
  highlight?: boolean
  colorClass?: string
  showDc?: boolean
}

function StatItem({ label, value, modifier, highlight, colorClass, showDc }: StatItemProps) {
  const displayValue = modifier && value > 0 ? `+${value}` : `${value}`
  const dc = showDc ? ` (DC ${10 + value})` : ''
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p
        className={cn(
          "font-mono font-bold text-lg",
          highlight && "text-pf-threat-extreme",
          colorClass
        )}
      >
        {displayValue}{dc}
      </p>
    </div>
  )
}

// ── EquipmentBlock ────────────────────────────────────────────────────────────

function EquipmentBlock({ items }: { items: CreatureItemRow[] }) {
  if (items.length === 0) return null

  return (
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
        <div className="flex items-center gap-2">
          <Backpack className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold text-sm text-foreground">Equipment</span>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 pt-2 space-y-1">
          {items.map((item) => {
            const typeColor = ITEM_TYPE_COLORS[item.item_type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
            const qty = item.quantity > 1 ? ` ×${item.quantity}` : ''
            const stat = item.damage_formula
              ? item.damage_formula
              : item.ac_bonus !== null
                ? `AC +${item.ac_bonus}`
                : null

            return (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className={cn("px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0", typeColor)}>
                  {item.item_type[0].toUpperCase()}
                </span>
                <span className="font-medium flex-1 min-w-0 truncate">
                  {item.item_name}{qty}
                </span>
                {stat && (
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{stat}</span>
                )}
                {item.bulk && item.bulk !== '-' && (
                  <span className="text-xs text-muted-foreground shrink-0">L{item.bulk}</span>
                )}
              </div>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
