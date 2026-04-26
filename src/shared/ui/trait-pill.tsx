import { cn } from "@/shared/lib/utils"
import { useCurrentLocale } from "@/shared/i18n"
import {
  getTraitLabel,
  getTraitDescription,
  getSizeLabel,
} from "@/shared/i18n/pf2e-content"
import { unmapSize } from "@/shared/lib/size-map"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./tooltip"

type Rarity = "common" | "uncommon" | "rare" | "unique"
type Size = "Tiny" | "Small" | "Medium" | "Large" | "Huge" | "Gargantuan"

interface TraitPillProps {
  trait: string
  rarity?: Rarity
  size?: Size
  className?: string
  /**
   * When the parent component already supplies a localized display string
   * (e.g. parser-derived `traitsLoc`), set `localized` to skip the dict
   * lookup. The pill renders `trait` verbatim and shows no tooltip.
   */
  localized?: boolean
}

const rarityColors: Record<Rarity, string> = {
  common: "bg-secondary text-secondary-foreground",
  uncommon: "bg-pf-rarity-uncommon/20 text-pf-rarity-uncommon border-pf-rarity-uncommon",
  rare: "bg-pf-rarity-rare/20 text-pf-rarity-rare border-pf-rarity-rare",
  unique: "bg-pf-rarity-unique/20 text-pf-rarity-unique border-pf-rarity-unique",
}

const sizeColors: Record<Size, string> = {
  Tiny: "bg-pf-threat-low/20 text-pf-threat-low",
  Small: "bg-pf-threat-low/20 text-pf-threat-low",
  Medium: "bg-secondary text-secondary-foreground",
  Large: "bg-pf-threat-moderate/20 text-pf-threat-moderate",
  Huge: "bg-pf-threat-severe/20 text-pf-threat-severe",
  Gargantuan: "bg-pf-threat-extreme/20 text-pf-threat-extreme",
}

// Trait category palette. Slug-keyed buckets — first match wins. The slugs
// the engine emits are kebab/lowercase, so we match by raw slug not by
// localized label. Adding a trait here is cheap; missing buckets fall
// through to the neutral secondary tone.
const TRADITION_COLOR: Record<string, string> = {
  arcane: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  divine: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  occult: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  primal: 'bg-green-500/15 text-green-300 border-green-500/30',
}

const SCHOOLS = new Set([
  'abjuration', 'conjuration', 'divination', 'enchantment',
  'evocation', 'illusion', 'necromancy', 'transmutation',
])

const DAMAGE_TYPE_COLOR: Record<string, string> = {
  fire: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  cold: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  acid: 'bg-green-600/15 text-green-300 border-green-600/30',
  electricity: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30',
  sonic: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  poison: 'bg-emerald-600/15 text-emerald-300 border-emerald-600/30',
  mental: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  force: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  spirit: 'bg-violet-400/15 text-violet-200 border-violet-400/30',
  void: 'bg-zinc-600/30 text-zinc-300 border-zinc-500/40',
  negative: 'bg-zinc-600/30 text-zinc-300 border-zinc-500/40',
  vitality: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  positive: 'bg-lime-500/15 text-lime-300 border-lime-500/30',
  bludgeoning: 'bg-stone-500/15 text-stone-300 border-stone-500/30',
  piercing: 'bg-stone-500/15 text-stone-300 border-stone-500/30',
  slashing: 'bg-stone-500/15 text-stone-300 border-stone-500/30',
  holy: 'bg-amber-300/15 text-amber-200 border-amber-300/30',
  unholy: 'bg-red-700/20 text-red-300 border-red-700/40',
  precision: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

const SAVE_COLOR = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
const SAVES = new Set(['fortitude', 'reflex', 'will'])

const ACTION_COLOR = 'bg-sky-500/15 text-sky-300 border-sky-500/30'
const ACTIONS = new Set([
  'concentrate', 'manipulate', 'move', 'auditory', 'visual',
  'flourish', 'olfactory', 'tactile', 'press', 'open', 'attack',
])

const EMOTION_FAMILY_COLOR = 'bg-rose-500/15 text-rose-300 border-rose-500/30'
const EMOTION_FAMILY = new Set([
  'emotion', 'fear', 'death', 'curse', 'disease',
  'morph', 'incapacitation', 'sleep', 'polymorph', 'mindshattering',
])

const ELEMENT_COLOR: Record<string, string> = {
  air: 'bg-sky-300/15 text-sky-200 border-sky-300/30',
  earth: 'bg-amber-700/20 text-amber-200 border-amber-700/40',
  metal: 'bg-zinc-400/20 text-zinc-200 border-zinc-400/40',
  water: 'bg-blue-400/15 text-blue-200 border-blue-400/30',
  wood: 'bg-emerald-700/20 text-emerald-300 border-emerald-700/40',
}

const SCHOOL_COLOR = 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'

/** Map a kebab-slug trait to a Tailwind color class set. Returns empty
 *  string when no category match — caller falls back to neutral. */
function colorForTraitSlug(slug: string): string {
  if (TRADITION_COLOR[slug]) return TRADITION_COLOR[slug]
  if (DAMAGE_TYPE_COLOR[slug]) return DAMAGE_TYPE_COLOR[slug]
  if (ELEMENT_COLOR[slug]) return ELEMENT_COLOR[slug]
  if (SAVES.has(slug)) return SAVE_COLOR
  if (ACTIONS.has(slug)) return ACTION_COLOR
  if (EMOTION_FAMILY.has(slug)) return EMOTION_FAMILY_COLOR
  if (SCHOOLS.has(slug)) return SCHOOL_COLOR
  return ''
}

export function TraitPill({ trait, rarity, size, className, localized }: TraitPillProps) {
  const locale = useCurrentLocale()
  const isSize = size !== undefined
  const isRarity = rarity !== undefined && rarity !== "common"

  // localized=true: parent already translated; render verbatim, no tooltip.
  // size pill: route through getSizeLabel (engine slug via unmapSize).
  // rarity / generic trait: route through getTraitLabel (slug lowercased).
  let displayLabel: string
  let description: string | null = null
  // Category color is keyed off the raw kebab slug, not the localized
  // label — adding tooltips/translations does not break the palette.
  const slugForColor = isSize || isRarity ? '' : trait.toLowerCase()
  const categoryClass = slugForColor ? colorForTraitSlug(slugForColor) : ''

  if (localized) {
    displayLabel = trait
  } else if (isSize) {
    displayLabel = getSizeLabel(unmapSize(size), locale)
  } else if (isRarity) {
    displayLabel = getTraitLabel(rarity, locale)
    description = getTraitDescription(rarity, locale)
  } else {
    const slug = trait.toLowerCase()
    displayLabel = getTraitLabel(slug, locale)
    description = getTraitDescription(slug, locale)
  }

  const pill = (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
        isRarity && rarityColors[rarity],
        isSize && sizeColors[size],
        // Generic traits: category palette if matched; otherwise neutral.
        // Border lives on category-colored pills + rarity pills so the
        // bordered shape reads as "categorized", neutral pills stay flat.
        !isRarity && !isSize && (categoryClass || "bg-secondary/80 text-secondary-foreground"),
        !isRarity && !isSize && categoryClass && "border",
        isRarity && "border",
        className
      )}
    >
      {displayLabel}
    </span>
  )

  if (description === null) return pill

  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>{pill}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs whitespace-pre-wrap">
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface TraitListProps {
  traits: string[]
  rarity?: Rarity
  size?: Size
  className?: string
  showRarity?: boolean
  showSize?: boolean
  /** Pass-through to underlying TraitPill — see TraitPillProps. */
  localized?: boolean
}

export function TraitList({
  traits,
  rarity,
  size,
  className,
  showRarity = true,
  showSize = true,
  localized,
}: TraitListProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {showRarity && rarity && rarity !== "common" && (
        <TraitPill trait={rarity} rarity={rarity} localized={localized} />
      )}
      {showSize && size && (
        <TraitPill trait={size} size={size} localized={localized} />
      )}
      {traits.map((trait) => (
        <TraitPill key={trait} trait={trait} localized={localized} />
      ))}
    </div>
  )
}
