import { useState, useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Textarea } from '@/shared/ui/textarea'
import type { CharacterRecord } from '@/shared/api/characters'
import { updateCharacterNotes } from '@/shared/api/characters'
import type { PathbuilderBuild } from '@engine'
import { calculatePCMaxHP } from '@engine'
import type { PathbuilderAbilities } from '@engine'
import { SpellInlineCard } from '@/entities/spell'
import { FeatInlineCard } from '@/entities/feat'

// ── Internal tab content stubs (filled in by Plans 02 and 03) ────────────

function CoreSkillsContent({ build }: { build: PathbuilderBuild }) {
  const maxHp = calculatePCMaxHP(build)
  const ac = build.acTotal.acProfBonus + build.acTotal.acAbilityBonus + build.acTotal.acItemBonus
  const speed = build.attributes.speed + build.attributes.speedBonus

  const abilityMod = (score: number) => Math.floor((score - 10) / 2)
  const signed = (n: number) => (n >= 0 ? `+${n}` : String(n))

  const rankLabel = (prof: number): string =>
    prof >= 8 ? 'L' : prof >= 6 ? 'M' : prof >= 4 ? 'E' : prof >= 2 ? 'T' : 'U'

  const RANK_CLASS: Record<string, string> = {
    U: 'bg-muted text-muted-foreground',
    T: 'bg-pf-threat-low/15 text-pf-threat-low',
    E: 'bg-pf-skill-expert/15 text-pf-skill-expert',
    M: 'bg-pf-rarity-rare/15 text-pf-rarity-rare',
    L: 'bg-pf-gold/15 text-pf-gold',
  }

  const modWithProf = (prof: number, score: number) => {
    const mod = abilityMod(score)
    return prof > 0 ? mod + build.level + prof : mod
  }

  const { abilities } = build

  const ABILITY_DISPLAY: Array<[string, keyof PathbuilderAbilities]> = [
    ['STR', 'str'], ['DEX', 'dex'], ['CON', 'con'],
    ['INT', 'int'], ['WIS', 'wis'], ['CHA', 'cha'],
  ]

  const saves = [
    { label: 'Fort', value: modWithProf(build.proficiencies.fortitude, abilities.con) },
    { label: 'Ref', value: modWithProf(build.proficiencies.reflex, abilities.dex) },
    { label: 'Will', value: modWithProf(build.proficiencies.will, abilities.wis) },
    { label: 'Perception', value: modWithProf(build.proficiencies.perception, abilities.wis) },
  ]

  const SKILL_ABILITY: Record<string, keyof PathbuilderAbilities> = {
    acrobatics: 'dex', arcana: 'int', athletics: 'str', crafting: 'int',
    deception: 'cha', diplomacy: 'cha', intimidation: 'cha',
    medicine: 'wis', nature: 'wis', occultism: 'int', performance: 'cha',
    religion: 'wis', society: 'int', stealth: 'dex', survival: 'wis',
    thievery: 'dex',
  }

  const profs: Record<string, number> = { ...build.proficiencies }
  const sortedSkills = Object.keys(SKILL_ABILITY)
    .map((key) => ({ name: key.charAt(0).toUpperCase() + key.slice(1), proficiency: profs[key] ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">

      {/* HP / AC / Speed chips */}
      <div>
        <h3 className="text-base font-semibold mb-3">Core Stats</h3>
        <div className="flex gap-2">
          {([
            ['HP', `${maxHp} / ${maxHp}`],
            ['AC', String(ac)],
            ['Speed', `${speed} ft`],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex-1 rounded-md border border-border bg-card px-3 py-2 flex flex-col items-center">
              <span className="text-base font-semibold">{value}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ability scores 3×2 grid */}
      <div>
        <h3 className="text-base font-semibold mb-3">Ability Scores</h3>
        <div className="grid grid-cols-3 gap-2">
          {ABILITY_DISPLAY.map(([label, key]) => {
            const score = abilities[key]
            const mod = abilityMod(score)
            return (
              <div key={key} className="rounded-md border border-border bg-card px-3 py-2 flex flex-col items-center">
                <span className="text-base font-semibold">{score}</span>
                <span className="text-xs text-muted-foreground">{signed(mod)}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Saves & Perception */}
      <div>
        <h3 className="text-base font-semibold mb-3">Saves & Perception</h3>
        <div className="flex gap-2 flex-wrap">
          {saves.map(({ label, value }) => (
            <div key={label} className="flex-1 min-w-[60px] rounded-md border border-border bg-card px-3 py-2 flex flex-col items-center">
              <span className="text-sm font-semibold">{signed(value)}</span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Skills list */}
      <div>
        <h3 className="text-base font-semibold mb-3">Skills</h3>
        <div className="divide-y divide-border">
          {sortedSkills.map((skill) => {
            const abilityKey = SKILL_ABILITY[skill.name.toLowerCase()] ?? 'int'
            const total = modWithProf(skill.proficiency, abilities[abilityKey])
            const rank = rankLabel(skill.proficiency)
            return (
              <div key={skill.name} className="flex items-center gap-2 h-7">
                <span className={`w-5 h-[18px] flex items-center justify-center rounded-sm text-xs font-semibold shrink-0 ${RANK_CLASS[rank]}`}>
                  {rank}
                </span>
                <span className="flex-1 text-sm">{skill.name}</span>
                <span className="text-sm">{signed(total)}</span>
              </div>
            )
          })}
          {(build.lores ?? []).map(([name, prof]) => {
            const total = modWithProf(prof, abilities.int)
            const rank = rankLabel(prof)
            return (
              <div key={name} className="flex items-center gap-2 h-7">
                <span className={`w-5 h-[18px] flex items-center justify-center rounded-sm text-xs font-semibold shrink-0 ${RANK_CLASS[rank]}`}>
                  {rank}
                </span>
                <span className="flex-1 text-sm italic">{name} Lore</span>
                <span className="text-sm">{signed(total)}</span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

function EquipmentContent({ build }: { build: PathbuilderBuild }) {
  const armor = build.armor ?? []
  const weapons = build.weapons ?? []
  const equipment = build.equipment ?? []

  if (armor.length === 0 && weapons.length === 0 && equipment.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground py-8">
        No equipment recorded
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {armor.length > 0 && (
        <div>
          <h3 className="text-base font-semibold border-b border-border pb-1 mb-2">Armor</h3>
          <div className="space-y-1">
            {armor.map((a, i) => (
              <div key={i} className="text-sm flex items-baseline gap-1">
                <span>{a.name}</span>
                {(a.pot > 0 || a.res || a.runes.length > 0) && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {a.pot > 0 ? `+${a.pot}` : ''}
                    {a.res ? ` [${a.res}]` : ''}
                    {a.runes.length > 0 ? ` [${a.runes.join(', ')}]` : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {weapons.length > 0 && (
        <div>
          <h3 className="text-base font-semibold border-b border-border pb-1 mb-2">Weapons</h3>
          <div className="space-y-1">
            {weapons.map((w, i) => (
              <div key={i} className="text-sm flex items-baseline gap-1">
                <span>{w.name}</span>
                {(w.pot > 0 || w.str || w.runes.length > 0) && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {w.pot > 0 ? `+${w.pot}` : ''}
                    {w.str ? ` [${w.str}]` : ''}
                    {w.runes.length > 0 ? ` [${w.runes.join(', ')}]` : ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {equipment.length > 0 && (
        <div>
          <h3 className="text-base font-semibold border-b border-border pb-1 mb-2">Inventory</h3>
          <div className="space-y-0.5">
            {equipment.map(([name, qty, container], idx) => (
              <div key={idx} className="text-sm flex justify-between items-baseline">
                <span>
                  {name}
                  {container === 'Invested' && (
                    <span className="ml-1 text-xs text-pf-gold">(invested)</span>
                  )}
                </span>
                {qty > 1 && <span className="text-xs text-muted-foreground shrink-0 ml-2">×{qty}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

function SpellsContent({ build }: { build: PathbuilderBuild }) {
  const casters = build.spellCasters ?? []

  if (casters.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground py-8">
        No spellcasting
      </div>
    )
  }

  const spellLevelLabel = (lvl: number): string => {
    if (lvl === 0) return 'Cantrips'
    if (lvl === 1) return '1st Level'
    if (lvl === 2) return '2nd Level'
    if (lvl === 3) return '3rd Level'
    return `${lvl}th Level`
  }

  return (
    <div className="space-y-6">
      {casters.map((caster, i) => {
        const isFocus = caster.spellcastingType === 'focus'
        const tradition =
          caster.magicTradition.charAt(0).toUpperCase() + caster.magicTradition.slice(1)
        const type = isFocus
          ? 'Focus'
          : caster.spellcastingType.charAt(0).toUpperCase() + caster.spellcastingType.slice(1)

        return (
          <div key={i}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-base font-semibold">
                {tradition} · {type}
              </h3>
              {isFocus && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-sm bg-pf-rarity-rare/15 text-pf-rarity-rare">
                  Focus
                </span>
              )}
            </div>
            <div className="space-y-3">
              {(caster.spells ?? []).map((group) => (
                <div key={group.spellLevel}>
                  <p className="text-xs text-muted-foreground mb-1">
                    {spellLevelLabel(group.spellLevel)}
                  </p>
                  <div className="space-y-1">
                    {group.list.map((name) => (
                      <SpellInlineCard key={name} spellName={name} compact />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function FeatsContent({ build }: { build: PathbuilderBuild }) {
  const feats = build.feats ?? []
  const specials = (build.specials ?? []).filter(
    (s) => s !== 'Low-Light Vision' && s !== 'Darkvision'
  )

  if (feats.length === 0 && specials.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground py-8">
        No feats recorded
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {feats.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-2">Feats</h3>
          <div className="space-y-1">
            {feats.map(([name, , type, level, note], i) => (
              <FeatInlineCard
                key={i}
                featName={name}
                typeLabel={type}
                level={level}
                note={note && !UUID_RE.test(note) ? note : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {specials.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-2">Class Features</h3>
          <div className="space-y-1">
            {specials.map((name, i) => (
              <FeatInlineCard key={i} featName={name} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

function NotesContent({ character }: { character: CharacterRecord }) {
  const [value, setValue] = useState(character.notes ?? '')

  async function handleBlur() {
    await updateCharacterNotes(character.id, value)
  }

  return (
    <div>
      <Textarea
        className="w-full resize-none min-h-[200px] p-2 text-sm"
        placeholder="DM notes for this character..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  )
}

// ── Main PCSheetPanel ─────────────────────────────────────────────────────

interface PCSheetPanelProps {
  character: CharacterRecord | null
  onClose: () => void
}

export function PCSheetPanel({ character, onClose }: PCSheetPanelProps) {
  const build = useMemo(() => {
    if (!character) return null
    try {
      return JSON.parse(character.rawJson) as PathbuilderBuild
    } catch {
      return null
    }
  }, [character])

  return (
    <Sheet open={character !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-[540px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-4 pt-4 pb-3 shrink-0 border-b border-border">
          <SheetTitle className="text-xl font-semibold text-primary">
            {character?.name ?? ''}
          </SheetTitle>
          {build && (
            <p className="text-xs text-muted-foreground">
              {build.class} · {build.level} · {build.ancestry}
            </p>
          )}
        </SheetHeader>

        {build === null && character !== null ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Could not read character data.
          </div>
        ) : build ? (
          <Tabs defaultValue="core" className="flex flex-col flex-1 min-h-0">
            <TabsList className="w-full rounded-none border-b border-border h-auto shrink-0 gap-0">
              <TabsTrigger value="core" className="text-xs flex-1">Core & Skills</TabsTrigger>
              <TabsTrigger value="equipment" className="text-xs flex-1">Equipment</TabsTrigger>
              <TabsTrigger value="spells" className="text-xs flex-1">Spells</TabsTrigger>
              <TabsTrigger value="feats" className="text-xs flex-1">Feats</TabsTrigger>
              <TabsTrigger value="notes" className="text-xs flex-1">Notes</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <TabsContent value="core" className="m-0">
                  <CoreSkillsContent build={build} />
                </TabsContent>
                <TabsContent value="equipment" className="m-0">
                  <EquipmentContent build={build} />
                </TabsContent>
                <TabsContent value="spells" className="m-0">
                  <SpellsContent build={build} />
                </TabsContent>
                <TabsContent value="feats" className="m-0">
                  <FeatsContent build={build} />
                </TabsContent>
                <TabsContent value="notes" className="m-0">
                  {character ? <NotesContent character={character} /> : null}
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
