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
            <StatItem label="AC" value={creature.ac} />
            <StatItem label="Fort" value={creature.fort} modifier />
            <StatItem label="Ref" value={creature.ref} modifier />
            <StatItem label="Will" value={creature.will} modifier />
            <StatItem label="Perception" value={creature.perception} modifier />
          </div>
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
          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent/50 transition-colors">
            <span className="font-semibold">Strikes</span>
            <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-3">
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
                    <div className="mt-1 text-sm">
                      <span className="font-semibold">Damage </span>
                      <span className="font-mono">{strike.damage}</span>
                    </div>
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
              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-accent/50 transition-colors">
                <span className="font-semibold">Abilities</span>
                <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  {creature.abilities.map((ability, i) => (
                    <div key={i} className="p-3 rounded bg-pf-parchment border-l-2 border-primary/30">
                      <div className="flex items-center gap-2">
                        {ability.actionCost !== undefined && ability.actionCost !== 0 && (
                          <ActionIcon cost={ability.actionCost} className="text-lg text-primary" />
                        )}
                        <span className="font-semibold text-sm">{ability.name}</span>
                      </div>
                      <p className="mt-1 text-sm text-foreground/70">{ability.description}</p>
                      {ability.traits && ability.traits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {ability.traits.map((trait) => (
                            <span
                              key={trait}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-secondary/80 text-secondary-foreground uppercase tracking-wider"
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

        {/* Skills — always rendered, all 17 standard skills */}
        <div className="p-4">
          <h4 className="font-semibold mb-2">Skills</h4>
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

interface StatItemProps {
  label: string
  value: number
  modifier?: boolean
  highlight?: boolean
}

function StatItem({ label, value, modifier, highlight }: StatItemProps) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p
        className={cn(
          "font-mono font-bold text-lg",
          highlight && "text-pf-threat-extreme"
        )}
      >
        {modifier && value > 0 ? "+" : ""}
        {value}
      </p>
    </div>
  )
}
