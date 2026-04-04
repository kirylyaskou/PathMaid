import type { ReactNode } from "react"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { rollDice } from '@engine'
import { useRollStore } from '@/shared/model/roll-store'
import { ClickableFormula } from '@/shared/ui/clickable-formula'
import { cn } from "@/shared/lib/utils"
import { Card, CardContent, CardHeader } from "@/shared/ui/card"
import { Separator } from "@/shared/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible"
import { ChevronDown, ChevronRight, X, Backpack, Plus, Minus, HelpCircle, Search, Zap, Flame, Leaf, Feather } from "lucide-react"
import { LevelBadge } from "@/shared/ui/level-badge"
import { TraitList } from "@/shared/ui/trait-pill"
import { ActionIcon } from "@/shared/ui/action-icon"
import type { CreatureStatBlockData } from '../model/types'
import type { SpellcastingSection } from '@/entities/spell'
import type { SpellRow } from '@/entities/spell'
import { getSpellById, getSpellByName, searchSpells, saveSpellSlotUsage, loadSpellSlots, loadSpellOverrides, upsertSpellOverride, deleteSpellOverride, loadItemOverrides, upsertItemOverride, deleteItemOverride, searchItems, saveSlotOverride, loadSlotOverrides } from '@/shared/api'
import type { SpellOverrideRow, CreatureItemRow, EncounterItemRow, ItemRow } from '@/shared/api'
import { detectCasterProgression, getMaxRecommendedRank } from '@engine'
import { ITEM_TYPE_COLORS, ItemReferenceDrawer } from '@/entities/item'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/shared/ui/tooltip'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { resolveFoundryTokens } from '@/shared/lib/foundry-tokens'
import { stripHtml } from '@/shared/lib/html'

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
  const addRoll = useRollStore((state) => state.addRoll)
  function handleRoll(formula: string, label?: string) {
    addRoll(rollDice(formula, label))
  }

  return (
    <Card className={cn("overflow-hidden card-grimdark border-border/50 border-l-[3px] border-l-pf-gold", className)}>
      {/* Header - Grimdark */}
      <CardHeader className="-mt-6 pb-2 stat-block-header border-b border-primary/20">
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
        <div className="pb-4 bg-card [@container-type:inline-size]">
          <div className="flex flex-nowrap overflow-hidden">
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
                      <button
                        onClick={() => handleRoll(`1d20+${strike.modifier}`, `${strike.name} attack`)}
                        title={`Roll 1d20+${strike.modifier}`}
                        className="font-mono text-primary font-bold cursor-pointer underline decoration-dotted underline-offset-2 decoration-primary/50 hover:text-pf-gold transition-colors duration-100"
                      >
                        +{strike.modifier}
                      </button>
                    </div>
                    {/* Main damage */}
                    {strike.damage.length > 0 && (
                      <div className="mt-1 text-sm">
                        <span className="font-semibold">Damage </span>
                        {strike.damage.map((d, di) => (
                          <span key={di}>
                            {di > 0 && <span className="text-muted-foreground"> plus </span>}
                            <ClickableFormula formula={d.formula} label={`${strike.name} damage`} />
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
                            <ClickableFormula formula={ad.formula} label={ad.label ?? `${strike.name} damage`} />
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
                      <p className="mt-1 text-sm text-foreground/80 leading-relaxed">{highlightGameText(ability.description, handleRoll)}</p>
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
                creatureLevel={creature.level}
                {...(encounterContext ? { encounterContext } : {})}
              />
            ))}
            <Separator />
          </>
        )}

        {/* Equipment */}
        {(creature.equipment && creature.equipment.length > 0 || encounterContext) && (
          <>
            <EquipmentBlock
              items={creature.equipment ?? []}
              {...(encounterContext ? { encounterContext } : {})}
            />
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

function highlightGameText(raw: string, onRoll?: (formula: string) => void): ReactNode {
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
      // Dice formula — clickable if onRoll provided
      const formula = match[2]
      if (onRoll) {
        parts.push(
          <button
            key={key++}
            onClick={(e) => { e.stopPropagation(); onRoll(formula) }}
            title={`Roll ${formula}`}
            className="text-pf-blood font-bold font-mono cursor-pointer underline decoration-dotted underline-offset-2 decoration-pf-blood/50 hover:text-pf-gold transition-colors duration-100"
          >
            {formula}
          </button>
        )
      } else {
        parts.push(
          <span key={key++} className="text-pf-blood font-mono">{formula}</span>
        )
      }
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

const stripHtmlInline = stripHtml

function SpellCard({ foundryId, name }: { foundryId: string | null; name: string }) {
  const [open, setOpen] = useState(false)
  const [spell, setSpell] = useState<SpellRow | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    if (!open && !spell) {
      setLoading(true)
      try {
        let data: SpellRow | null = null
        if (foundryId) {
          data = await getSpellById(foundryId)
        }
        if (!data) {
          data = await getSpellByName(name)
        }
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

const TRADITION_SLOT_CONFIG: Record<string, {
  icon: typeof Zap
  available: string
  spent: string
}> = {
  arcane: {
    icon: Zap,
    available: 'bg-blue-500/80 text-blue-100 border-blue-400/70',
    spent: 'border-blue-500/30',
  },
  occult: {
    icon: Flame,
    available: 'bg-purple-500/80 text-purple-100 border-purple-400/70',
    spent: 'border-purple-500/30',
  },
  primal: {
    icon: Leaf,
    available: 'bg-green-500/80 text-green-100 border-green-400/70',
    spent: 'border-green-500/30',
  },
  divine: {
    icon: Feather,
    available: 'bg-yellow-500/80 text-yellow-100 border-yellow-400/70',
    spent: 'border-yellow-500/30',
  },
}

const DEFAULT_SLOT_CONFIG = TRADITION_SLOT_CONFIG.arcane

function SlotPips({ total, used, baseSlots, tradition, onToggle }: {
  total: number; used: number; baseSlots: number; tradition: string; onToggle: (idx: number) => void
}) {
  if (total <= 0) return null
  const cfg = TRADITION_SLOT_CONFIG[tradition] ?? DEFAULT_SLOT_CONFIG
  const Icon = cfg.icon
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: total }).map((_, i) => {
        const isCustom = i >= baseSlots
        const isAvailable = i >= used
        return (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); onToggle(i) }}
            title={isAvailable ? 'Mark slot spent' : 'Mark slot available'}
            className={cn(
              "w-5 h-5 rounded flex items-center justify-center border transition-colors",
              isCustom && "border-dashed",
              isAvailable
                ? cfg.available
                : cn(cfg.spent, "bg-transparent hover:bg-muted/30")
            )}
          >
            {isAvailable && <Icon className="w-3 h-3" />}
          </button>
        )
      })}
    </div>
  )
}

// ── Spell search dialog ──────────────────────────────────────────────────────

const DIALOG_TRADITIONS = ['arcane', 'divine', 'occult', 'primal'] as const
const DIALOG_TRADITION_COLORS: Record<string, string> = {
  arcane:  'bg-blue-500/20 text-blue-300 border-blue-500/40',
  divine:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  occult:  'bg-purple-500/20 text-purple-300 border-purple-500/40',
  primal:  'bg-green-500/20 text-green-300 border-green-500/40',
}

function SpellSearchDialog({ open, onOpenChange, defaultRank, defaultTradition, focusOnly, onAdd }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  defaultRank: number
  defaultTradition?: string
  focusOnly?: boolean
  onAdd: (name: string, rank: number) => void
}) {
  const [query, setQuery] = useState('')
  const [tradition, setTradition] = useState<string | null>(defaultTradition ?? null)
  const [rank, setRank] = useState<number | null>(defaultRank)
  const [results, setResults] = useState<SpellRow[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset filters when dialog opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setTradition(defaultTradition ?? null)
      setRank(defaultRank)
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, defaultRank, defaultTradition])

  // Debounced search
  useEffect(() => {
    if (!open) return
    setLoading(true)
    const t = setTimeout(async () => {
      const r = await searchSpells(
        query,
        rank ?? undefined,
        focusOnly ? undefined : (tradition ?? undefined),
        focusOnly ? 'focus' : undefined
      )
      setResults(r)
      setLoading(false)
    }, 200)
    return () => clearTimeout(t)
  }, [query, rank, tradition, open, focusOnly])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-sm">{focusOnly ? 'Add Focus Spell' : 'Add Spell'}</DialogTitle>
        </DialogHeader>

        {/* Search + filters */}
        <div className="px-4 pt-3 pb-2 space-y-2 border-b border-border/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              placeholder={focusOnly ? "Search focus spells…" : "Search spells…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-8 h-8 text-sm rounded-md border border-border bg-secondary/30 px-3 focus:outline-none focus:border-primary/50"
            />
          </div>
          {/* Tradition filter (hidden for focus spells) */}
          {!focusOnly && (
            <div className="flex flex-wrap gap-1.5">
              {DIALOG_TRADITIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTradition((p) => (p === t ? null : t))}
                  className={cn(
                    "px-2 py-0.5 text-[11px] rounded border uppercase tracking-wider font-semibold transition-opacity",
                    DIALOG_TRADITION_COLORS[t],
                    tradition && tradition !== t && "opacity-30"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          {/* Rank filter */}
          <div className="flex flex-wrap gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
              <button
                key={r}
                onClick={() => setRank((p) => (p === r ? null : r))}
                className={cn(
                  "w-7 h-6 text-xs rounded border transition-colors font-mono",
                  rank === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/50 text-muted-foreground border-border/40 hover:border-border"
                )}
              >
                {r === 0 ? 'C' : r}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {loading ? 'Searching…' : `${results.length} spell${results.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
          {results.map((s) => {
            const traditions: string[] = s.traditions ? JSON.parse(s.traditions) : []
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{s.name}</span>
                    {s.action_cost && (
                      <span className="font-mono text-primary text-xs shrink-0">
                        {s.action_cost === 'free' ? '◇' : s.action_cost === 'reaction' ? '↺' : '◆'.repeat(Math.min(3, Number(s.action_cost) || 1))}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{rankLabel(s.rank)}</span>
                    {traditions.map((t) => (
                      <span key={t} className={cn("px-1 py-0 text-[9px] rounded border uppercase font-semibold", DIALOG_TRADITION_COLORS[t] ?? '')}>
                        {t.slice(0, 3)}
                      </span>
                    ))}
                    {s.save_stat && <span className="text-[10px] text-muted-foreground capitalize">{s.save_stat}</span>}
                  </div>
                </div>
                <button
                  onClick={() => onAdd(s.name, rank ?? s.rank)}
                  className="shrink-0 px-2 py-1 text-xs rounded border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
                >
                  Add
                </button>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Meme warnings ────────────────────────────────────────────────────────────

const RANK_WARNINGS: Record<number, string> = {
  1: "GIT GUD",
  2: "Mister wizard pants, huh?",
  3: "Morrigan disapproves.",
  4: "Fane raises an eyebrow. He has no eyebrows.",
  5: "Optimism is a moral imperative. But I think you've moved beyond optimism.",
  6: "Daeran finds this mildly amusing.",
  7: "Ignorant slaves, how quickly you forget!",
  8: "The Greybeards shout \"FUS RO NO\".",
  9: "Areelu Vorlesh takes notes. This is now a thesis on hubris.",
  10: "Fear not the dark, my friend. And let the feast begin.",
}

// ── SpellcastingBlock (with encounter-aware slots + overrides) ────────────────

function SpellcastingBlock({ section, creatureLevel, encounterContext }: {
  section: SpellcastingSection
  creatureLevel: number
  encounterContext?: EncounterContext
}) {
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`)

  // Slot state — keyed by rank
  const [usedSlots, setUsedSlots] = useState<Record<number, number>>({})
  // Override state
  const [overrides, setOverrides] = useState<SpellOverrideRow[]>([])
  // Slot overrides — keyed by rank
  const [slotDeltas, setSlotDeltas] = useState<Record<number, number>>({})
  // Spell search dialog state
  const [spellDialogOpen, setSpellDialogOpen] = useState(false)
  const [spellDialogRank, setSpellDialogRank] = useState(0)

  const { encounterId, combatantId } = encounterContext ?? {}

  // Caster progression detection
  const maxSlotRank = useMemo(() => {
    let max = 0
    for (const byRank of section.spellsByRank) {
      if (byRank.rank > 0 && byRank.slots > 0 && byRank.rank > max) max = byRank.rank
    }
    return max
  }, [section.spellsByRank])

  const progression = useMemo(
    () => detectCasterProgression(creatureLevel, maxSlotRank),
    [creatureLevel, maxSlotRank]
  )
  const recommendedMaxRank = useMemo(
    () => getMaxRecommendedRank(creatureLevel, progression),
    [creatureLevel, progression]
  )

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

  const loadSlotOverrideState = useCallback(async () => {
    if (!encounterId || !combatantId) return
    const rows = await loadSlotOverrides(encounterId, combatantId)
    const byRank: Record<number, number> = {}
    for (const r of rows) {
      if (r.entryId === section.entryId) byRank[r.rank] = r.slotDelta
    }
    setSlotDeltas(byRank)
  }, [encounterId, combatantId, section.entryId])

  useEffect(() => {
    loadSlotState()
    loadOverrideState()
    loadSlotOverrideState()
  }, [loadSlotState, loadOverrideState, loadSlotOverrideState])

  async function handleTogglePip(rank: number, idx: number, total: number) {
    if (!encounterId || !combatantId) return
    const current = usedSlots[rank] ?? 0
    const newUsed = idx < current ? idx : Math.min(idx + 1, total)
    setUsedSlots((prev) => ({ ...prev, [rank]: newUsed }))
    await saveSpellSlotUsage(encounterId, combatantId, section.entryId, rank, newUsed)
  }

  async function handleSlotDelta(rank: number, change: 1 | -1) {
    if (!encounterId || !combatantId) return
    const currentDelta = slotDeltas[rank] ?? 0
    const newDelta = currentDelta + change
    setSlotDeltas((prev) => ({ ...prev, [rank]: newDelta }))
    await saveSlotOverride(encounterId, combatantId, section.entryId, rank, newDelta)

    // For prepared casters: adding a slot opens spell search
    if (change === 1 && section.castType === 'prepared') {
      setSpellDialogRank(rank)
      setSpellDialogOpen(true)
    }
  }

  async function handleAddRank(newRank: number) {
    if (!encounterId || !combatantId) return
    setSlotDeltas((prev) => ({ ...prev, [newRank]: 1 }))
    await saveSlotOverride(encounterId, combatantId, section.entryId, newRank, 1)
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
      const id = `${combatantId}:${section.entryId}:rm:${spellName}:${rank}`
      const override: SpellOverrideRow = {
        id, encounterId, combatantId, entryId: section.entryId,
        spellName, rank, isRemoved: true, sortOrder: 0,
      }
      await upsertSpellOverride(override)
      setOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
    } else {
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

  // Build effective ranks list: base + custom-added ranks from overrides
  const effectiveRanks = useMemo(() => {
    const baseRanks = section.spellsByRank.map((br) => br.rank)
    const customRanks = Object.entries(slotDeltas)
      .filter(([r, d]) => !baseRanks.includes(Number(r)) && d > 0)
      .map(([r]) => Number(r))
    const allRanks = [...baseRanks, ...customRanks].sort((a, b) => a - b)
    return allRanks
  }, [section.spellsByRank, slotDeltas])

  // Next available rank for "Add rank" button
  const nextRank = useMemo(() => {
    if (effectiveRanks.length === 0) return 1
    const max = Math.max(...effectiveRanks.filter((r) => r > 0))
    return max + 1
  }, [effectiveRanks])

  // Tradition filter for AddSpellRow (innate/focus = no tradition filter)
  const isFocus = section.castType === 'focus'
  const traditionFilter = (section.castType === 'innate' || isFocus) ? undefined : section.tradition

  function rankWarning(rank: number): string | null {
    if (rank <= 0 || rank <= recommendedMaxRank) return null
    return RANK_WARNINGS[rank] ?? RANK_WARNINGS[10]!
  }

  return (
    <Collapsible defaultOpen>
      <div className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40">
        <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="font-semibold text-sm text-foreground">Spellcasting</span>
          <span className={cn("px-1.5 py-0.5 text-[10px] rounded border uppercase tracking-wider font-semibold", traditionColor(section.tradition))}>
            {section.tradition} {section.castType}
          </span>
          <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        {encounterId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-0.5" type="button">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              {progression === 'unknown'
                ? `Custom progression — max rank ${recommendedMaxRank} at level ${creatureLevel}`
                : `${progression === 'full' ? 'Full' : 'Bounded'} caster (${section.tradition} ${section.castType}) — max rank ${recommendedMaxRank} at level ${creatureLevel}`
              }
            </TooltipContent>
          </Tooltip>
        )}
      </div>
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
          {effectiveRanks.map((rank) => {
            const byRank = section.spellsByRank.find((br) => br.rank === rank)
            const baseSlots = byRank?.slots ?? 0
            const delta = slotDeltas[rank] ?? 0
            const totalSlots = Math.max(0, baseSlots + delta)
            const used = usedSlots[rank] ?? 0
            const visibleSpells = byRank
              ? byRank.spells.filter((s) => !removedSpells.has(`${rank}:${s.name}`))
              : []
            const added = addedByRank[rank] ?? []
            const warn = encounterId ? rankWarning(rank) : null
            return (
              <div key={rank}>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {warn ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider cursor-help">
                          {rankLabel(rank)} ⚠
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-amber-300 bg-amber-950 border-amber-500/40">
                        {warn}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {rankLabel(rank)}
                    </span>
                  )}
                  {rank === 0 ? null
                  : encounterId && totalSlots > 0 ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSlotDelta(rank, -1)}
                        disabled={totalSlots <= 0}
                        className="w-5 h-5 flex items-center justify-center rounded border border-border/60 bg-secondary/60 text-muted-foreground hover:text-destructive hover:border-destructive/40 disabled:opacity-30 transition-colors"
                        title="Remove slot"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <SlotPips
                        total={totalSlots}
                        used={used}
                        baseSlots={baseSlots}
                        tradition={section.tradition}
                        onToggle={(idx) => handleTogglePip(rank, idx, totalSlots)}
                      />
                      <button
                        onClick={() => handleSlotDelta(rank, 1)}
                        className="w-5 h-5 flex items-center justify-center rounded border border-border/60 bg-secondary/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                        title="Add slot"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : encounterId && totalSlots === 0 ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">(0 slots)</span>
                      <button
                        onClick={() => handleSlotDelta(rank, 1)}
                        className="w-5 h-5 flex items-center justify-center rounded border border-border/60 bg-secondary/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                        title="Add slot"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : !encounterId && baseSlots > 0 ? (
                    <span className="text-xs text-muted-foreground">({baseSlots} slots)</span>
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
                          onClick={() => handleRemoveSpell(spell.name, rank, true)}
                          className="opacity-0 group-hover/spell:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          title="Remove for this encounter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {added.map((name, i) => (
                    <div key={`added-${i}`} className="flex items-center gap-1 group/spell">
                      <div className="flex-1">
                        <SpellCard name={name} foundryId={null} />
                      </div>
                      {encounterId && (
                        <button
                          onClick={() => handleRemoveSpell(name, rank, false)}
                          className="opacity-0 group-hover/spell:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          title="Remove added spell"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {encounterId && (
                    <button
                      onClick={() => { setSpellDialogRank(rank); setSpellDialogOpen(true) }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add spell…</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {/* Add new rank button */}
          {encounterId && nextRank <= 10 && (
            <button
              onClick={() => handleAddRank(nextRank)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Add rank {nextRank}</span>
            </button>
          )}
        </div>
      </CollapsibleContent>

      {/* Spell search dialog */}
      {encounterId && (
        <SpellSearchDialog
          open={spellDialogOpen}
          onOpenChange={setSpellDialogOpen}
          defaultRank={spellDialogRank}
          defaultTradition={traditionFilter}
          focusOnly={isFocus}
          onAdd={(name, rank) => handleAddSpell(name, rank)}
        />
      )}
    </Collapsible>
  )
}

const resolveFoundryTokensForDisplay = resolveFoundryTokens
const resolveFoundryTokensForSpell = resolveFoundryTokens

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
  const dc = showDc ? ` (${10 + value})` : ''
  return (
    <div className="px-4">
      <p className="text-[clamp(0.55rem,1.8cqw,0.75rem)] text-muted-foreground mb-1">{label}</p>
      <p
        className={cn(
          "font-mono font-bold text-[clamp(0.7rem,2.8cqw,1.125rem)]",
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

function EquipmentBlock({
  items,
  encounterContext,
}: {
  items: CreatureItemRow[]
  encounterContext?: EncounterContext
}) {
  const [overrides, setOverrides] = useState<EncounterItemRow[]>([])
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState<ItemRow[]>([])
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null)

  useEffect(() => {
    if (!encounterContext) return
    loadItemOverrides(encounterContext.encounterId, encounterContext.combatantId)
      .then(setOverrides)
      .catch(() => {})
  }, [encounterContext?.encounterId, encounterContext?.combatantId])

  useEffect(() => {
    if (!encounterContext || !addQuery.trim()) { setAddResults([]); return }
    const timer = setTimeout(() => {
      searchItems(addQuery).then((r) => setAddResults(r.slice(0, 8))).catch(() => {})
    }, 200)
    return () => clearTimeout(timer)
  }, [addQuery, encounterContext])

  const handleRemove = useCallback(async (item: CreatureItemRow) => {
    if (!encounterContext) return
    const override: EncounterItemRow = {
      id: `${encounterContext.encounterId}:${encounterContext.combatantId}:${item.id}`,
      encounterId: encounterContext.encounterId,
      combatantId: encounterContext.combatantId,
      itemName: item.item_name,
      itemFoundryId: item.foundry_item_id,
      itemType: item.item_type,
      quantity: item.quantity,
      damageFormula: item.damage_formula,
      acBonus: item.ac_bonus,
      isRemoved: true,
    }
    setOverrides((prev) => [...prev.filter((o) => o.id !== override.id), override])
    await upsertItemOverride(override).catch(() => {})
  }, [encounterContext])

  const handleRestoreBase = useCallback(async (item: CreatureItemRow) => {
    if (!encounterContext) return
    const id = `${encounterContext.encounterId}:${encounterContext.combatantId}:${item.id}`
    setOverrides((prev) => prev.filter((o) => o.id !== id))
    await deleteItemOverride(id).catch(() => {})
  }, [encounterContext])

  const handleAddItem = useCallback(async (catalogItem: ItemRow) => {
    if (!encounterContext) return
    const id = `${encounterContext.encounterId}:${encounterContext.combatantId}:added:${catalogItem.id}`
    const override: EncounterItemRow = {
      id,
      encounterId: encounterContext.encounterId,
      combatantId: encounterContext.combatantId,
      itemName: catalogItem.name,
      itemFoundryId: catalogItem.id,
      itemType: catalogItem.item_type,
      quantity: 1,
      damageFormula: catalogItem.damage_formula,
      acBonus: catalogItem.ac_bonus,
      isRemoved: false,
    }
    setOverrides((prev) => [...prev.filter((o) => o.id !== id), override])
    setAddQuery('')
    setAddResults([])
    await upsertItemOverride(override).catch(() => {})
  }, [encounterContext])

  const handleRemoveAdded = useCallback(async (override: EncounterItemRow) => {
    setOverrides((prev) => prev.filter((o) => o.id !== override.id))
    await deleteItemOverride(override.id).catch(() => {})
  }, [])

  const removedIds = new Set(overrides.filter((o) => o.isRemoved).map((o) => o.itemFoundryId ?? o.itemName))
  const addedItems = overrides.filter((o) => !o.isRemoved)

  const visibleBase = items.filter((item) => {
    const key = item.foundry_item_id ?? item.item_name
    return !removedIds.has(key)
  })

  const totalCount = visibleBase.length + addedItems.length
  if (totalCount === 0 && !encounterContext) return null

  function ItemRow_({ item, onRemove, onRestore, isRemoved, foundryItemId, onItemClick }: {
    item: { name: string; type: string; qty: number; damageFormula: string | null; acBonus: number | null; bulk?: string | null }
    onRemove?: () => void
    onRestore?: () => void
    isRemoved?: boolean
    foundryItemId?: string | null
    onItemClick?: (id: string) => void
  }) {
    const typeColor = ITEM_TYPE_COLORS[item.type] ?? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40'
    const qty = item.qty > 1 ? ` ×${item.qty}` : ''
    const stat = item.damageFormula ?? (item.acBonus !== null ? `AC +${item.acBonus}` : null)
    return (
      <div className={cn("group flex items-center gap-2 text-sm", isRemoved && "opacity-40 line-through")}>
        <span className={cn("px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0", typeColor)}>
          {item.type[0].toUpperCase()}
        </span>
        {foundryItemId && onItemClick ? (
          <button
            className="font-medium flex-1 min-w-0 truncate text-left hover:text-primary hover:underline cursor-pointer"
            onClick={(e) => { e.stopPropagation(); onItemClick(foundryItemId) }}
          >
            {item.name}{qty}
          </button>
        ) : (
          <span className="font-medium flex-1 min-w-0 truncate">{item.name}{qty}</span>
        )}
        {stat && <span className="text-xs font-mono text-muted-foreground shrink-0">{stat}</span>}
        {item.bulk && item.bulk !== '-' && <span className="text-xs text-muted-foreground shrink-0">L{item.bulk}</span>}
        {encounterContext && onRemove && !isRemoved && (
          <button onClick={onRemove} className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity shrink-0">
            <X className="w-3 h-3" />
          </button>
        )}
        {encounterContext && onRestore && isRemoved && (
          <button onClick={onRestore} className="ml-auto text-xs text-primary hover:underline shrink-0">undo</button>
        )}
      </div>
    )
  }

  return (
    <>
    <Collapsible defaultOpen={false}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-gradient-to-r from-primary/10 to-transparent border-l-2 border-primary/40 hover:from-primary/15 hover:to-transparent transition-colors">
        <div className="flex items-center gap-2">
          <Backpack className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold text-sm text-foreground">Equipment</span>
          <span className="text-xs text-muted-foreground">({totalCount})</span>
        </div>
        <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3 pt-2 space-y-1">
          {visibleBase.map((item) => (
            <ItemRow_
              key={item.id}
              item={{ name: item.item_name, type: item.item_type, qty: item.quantity, damageFormula: item.damage_formula, acBonus: item.ac_bonus, bulk: item.bulk }}
              onRemove={encounterContext ? () => handleRemove(item) : undefined}
              foundryItemId={item.foundry_item_id}
              onItemClick={(id) => setDrawerItemId(id)}
            />
          ))}
          {/* Removed items shown struck-through with undo */}
          {overrides.filter((o) => o.isRemoved).map((o) => {
            const base = items.find((i) => (i.foundry_item_id ?? i.item_name) === (o.itemFoundryId ?? o.itemName))
            if (!base) return null
            return (
              <ItemRow_
                key={o.id}
                item={{ name: o.itemName, type: o.itemType, qty: o.quantity, damageFormula: o.damageFormula, acBonus: o.acBonus }}
                isRemoved
                onRestore={() => handleRestoreBase(base)}
                foundryItemId={o.itemFoundryId}
                onItemClick={(id) => setDrawerItemId(id)}
              />
            )
          })}
          {/* Added items */}
          {addedItems.map((o) => (
            <ItemRow_
              key={o.id}
              item={{ name: o.itemName, type: o.itemType, qty: o.quantity, damageFormula: o.damageFormula, acBonus: o.acBonus }}
              onRemove={() => handleRemoveAdded(o)}
              foundryItemId={o.itemFoundryId}
              onItemClick={(id) => setDrawerItemId(id)}
            />
          ))}

          {/* Add item row — encounter context only */}
          {encounterContext && (
            <div className="relative mt-2">
              <input
                type="text"
                placeholder="Add item…"
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                className="w-full text-xs px-2 py-1 rounded border border-border/50 bg-secondary/40 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
              {addResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 top-full mt-0.5 rounded border border-border bg-popover shadow-md max-h-40 overflow-y-auto">
                  {addResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleAddItem(r)}
                      className="w-full flex items-center gap-2 px-2 py-1 text-xs text-left hover:bg-secondary/60 transition-colors"
                    >
                      <span className={cn("px-1 py-0.5 text-[9px] rounded border uppercase tracking-wider font-semibold shrink-0", ITEM_TYPE_COLORS[r.item_type] ?? '')}>{r.item_type[0].toUpperCase()}</span>
                      <span className="flex-1 truncate">{r.name}</span>
                      {r.damage_formula && <span className="font-mono text-muted-foreground shrink-0">{r.damage_formula}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
    <ItemReferenceDrawer itemId={drawerItemId} onClose={() => setDrawerItemId(null)} />
    </>
  )
}
