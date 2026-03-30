/**
 * DAMAGE_TYPE_COLORS maps PF2e damage type names to Tailwind text-color classes.
 * Used by sanitizeDescription() to style @Damage inline elements.
 */
export const DAMAGE_TYPE_COLORS: Record<string, string> = {
  fire: 'text-orange-600',
  cold: 'text-blue-400',
  electricity: 'text-blue-600',
  acid: 'text-green-600',
  bleed: 'text-red-600',
  persistent: 'text-red-600',
  poison: 'text-green-700',
  mental: 'text-purple-600',
  void: 'text-gray-700',
  vitality: 'text-yellow-500',
  force: 'text-purple-500',
  sonic: 'text-gray-800',
  spirit: 'text-indigo-500',
}

/** Default Tailwind class when damage type is not in DAMAGE_TYPE_COLORS. */
const DAMAGE_DEFAULT_COLOR = 'text-gray-800'

/**
 * sanitizeDescription transforms raw Foundry VTT HTML (containing @-syntax tokens)
 * into clean, human-readable HTML with Tailwind-styled inline elements and
 * clickable entity anchor tags.
 *
 * All processing is synchronous and side-effect free.  Entity resolution for
 * @UUID links happens in the consuming component on click.
 *
 * @param html - Raw HTML string from a PF2e entity's `system.description.value`
 * @returns Transformed HTML ready for `v-html` rendering
 */
export function sanitizeDescription(html: string): string {
  if (!html) return html

  return html
    // Pass 1: @UUID[Compendium.pf2e.PACK.Item.ID]{Label} → <a> with label text
    .replace(
      /@UUID\[Compendium\.pf2e\.([^.\]]+)\.Item\.([^\]]+)\]\{([^}]+)\}/g,
      (_match, pack: string, id: string, label: string) =>
        `<a data-entity-pack="${pack}" data-entity-id="${id}" class="pf2e-link cursor-pointer text-blue-600 underline hover:text-blue-800 font-medium">${label}</a>`,
    )

    // Pass 2: @UUID[Compendium.pf2e.PACK.Item.ID] (no label) → <a> with [ID] as text
    .replace(
      /@UUID\[Compendium\.pf2e\.([^.\]]+)\.Item\.([^\]]+)\]/g,
      (_match, pack: string, id: string) =>
        `<a data-entity-pack="${pack}" data-entity-id="${id}" class="pf2e-link cursor-pointer text-blue-600 underline hover:text-blue-800 font-medium">[${id}]</a>`,
    )

    // Pass 3: @Damage[expr] → styled inline span
    // The outer bracket may contain inner brackets like @Damage[2d6[fire]] or
    // @Damage[2d6[fire]|persistent] — use a pattern that allows one level of
    // nesting: [outer content that may contain [inner] pairs]
    .replace(/@Damage\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\]/g, (_match, raw: string) => {
      // Take only the portion before the first pipe (ignore persistent flags etc.)
      const primary = raw.split('|')[0]
      // Replace inner [type] with " type" to get e.g. "2d6 fire"
      const cleaned = primary.replace(/\[([^\]]*)\]/g, ' $1')
      // Extract the damage type (last bracketed word) for colour lookup
      const typeMatch = primary.match(/\[([^\]]*)\]/)
      const dmgType = typeMatch ? typeMatch[1].toLowerCase() : ''
      const colorClass = DAMAGE_TYPE_COLORS[dmgType] ?? DAMAGE_DEFAULT_COLOR
      return `<span class="pf2e-damage font-bold ${colorClass}">${cleaned}</span>`
    })

    // Pass 4: @Check[expr] → styled inline span
    .replace(/@Check\[([^\]]+)\]/g, (_match, raw: string) => {
      const parts = raw.split('|')
      const type = parts[0]
      let dc: string | null = null
      let basic = false

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].toLowerCase()
        if (part.startsWith('dc:')) {
          dc = parts[i].slice(3)
        } else if (part === 'basic') {
          basic = true
        }
      }

      let text = basic ? `basic ${type}` : type
      if (dc !== null) text += ` DC ${dc}`

      return `<span class="pf2e-check font-bold text-gray-900">${text}</span>`
    })

    // Pass 5: @Template[expr] → styled inline span
    .replace(/@Template\[([^\]]+)\]/g, (_match, raw: string) => {
      const parts = raw.split('|')
      const type = parts[0]
      let distance: string | null = null

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i].toLowerCase()
        if (part.startsWith('distance:')) {
          distance = parts[i].slice(9)
        }
      }

      const text = distance !== null ? `${type} ${distance} ft.` : type
      return `<span class="pf2e-template font-bold text-gray-800">${text}</span>`
    })

    // Pass 6: @Type[...]{Label} fallback → keep Label only (strip @-syntax wrapper)
    .replace(/@\w+\[[^\]]*\]\{([^}]+)\}/g, '$1')

    // Pass 7: @Type[content] fallback → keep content only (strip @-syntax wrapper)
    .replace(/@\w+\[([^\]]*)\]/g, '$1')
}
