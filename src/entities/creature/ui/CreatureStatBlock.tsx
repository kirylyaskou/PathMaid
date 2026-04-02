import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"
import { Card, CardContent, CardHeader } from "@/shared/ui/card"
import { Separator } from "@/shared/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { LevelBadge } from "@/shared/ui/level-badge"
import { TraitList } from "@/shared/ui/trait-pill"
import { ActionIcon } from "@/shared/ui/action-icon"
import type { CreatureStatBlockData } from '../model/types'

interface CreatureStatBlockProps {
  creature: CreatureStatBlockData
  className?: string
}

export function CreatureStatBlock({ creature, className }: CreatureStatBlockProps) {
  return (
    <Card className={cn("overflow-hidden card-grimdark border-border/50", className)}>
      {/* Header - Grimdark */}
      <CardHeader className="pb-3 stat-block-header border-b border-primary/20">
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
                              <span className="text-pf-blood font-mono"> {d.type}</span>
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
                              <span className="text-pf-blood font-mono"> {ad.type}</span>
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

// Inline highlighting for DC values and damage dice in ability text
const GAME_TEXT_RE = /(DC\s+\d+)|(\d+d\d+(?:\s*[+\-]\s*\d+)?(?:\[\w+\])?)/gi

function highlightGameText(text: string): ReactNode {
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
      // Dice/damage formula
      parts.push(
        <span key={key++} className="text-pf-blood font-mono">{match[2]}</span>
      )
    }
    lastIndex = idx + match[0].length
  }

  if (lastIndex === 0) return text
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <>{parts}</>
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
