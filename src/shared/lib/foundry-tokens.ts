import { stripHtml } from './html'

export interface ResolveFoundryTokensOptions {
  /** Effective `@item.level` for expressions like `ceil(@item.level/2)`. For
   *  cantrips this is the heightened rank (`ceil(casterLevel/2)`), for ranked
   *  spells it's the slot rank. Omit to leave expressions as scaffolding. */
  itemLevel?: number
}

/** Split by delim at top level only — respects [] and () nesting */
function splitTopLevel(s: string, delim: string): string[] {
  const parts: string[] = []
  let depth = 0
  let buf = ''
  for (const ch of s) {
    if (ch === '[' || ch === '(') depth++
    else if (ch === ']' || ch === ')') depth = Math.max(0, depth - 1)
    if (ch === delim && depth === 0) {
      parts.push(buf)
      buf = ''
      continue
    }
    buf += ch
  }
  if (buf) parts.push(buf)
  return parts
}

/**
 * Resolve simple `@item.level` arithmetic expressions. Handles `ceil(...)`,
 * `floor(...)`, and bare `@item.level`. Returns the scaffolding-stripped
 * string when `itemLevel` is undefined (display stays readable either way).
 */
function resolveItemLevelExpr(expr: string, itemLevel: number | undefined): string {
  if (itemLevel === undefined) {
    return expr.replace(/@item\./g, '')
  }
  // ceil(@item.level/N)
  expr = expr.replace(/ceil\(\s*@item\.level\s*\/\s*(\d+)\s*\)/gi, (_, n: string) =>
    String(Math.ceil(itemLevel / parseInt(n, 10))),
  )
  // floor(@item.level/N)
  expr = expr.replace(/floor\(\s*@item\.level\s*\/\s*(\d+)\s*\)/gi, (_, n: string) =>
    String(Math.floor(itemLevel / parseInt(n, 10))),
  )
  // @item.level alone
  expr = expr.replace(/@item\.level/g, String(itemLevel))
  // Strip remaining @item.* scaffolding (e.g. @item.rank) with no numeric resolve
  expr = expr.replace(/@item\./g, '')
  return expr
}

/**
 * Resolve Foundry VTT inline tokens to human-readable text.
 * Handles @UUID, @Condition, @Damage, @Check, @Template, [[/act]], [[/br]], etc.
 */
export function resolveFoundryTokens(text: string, options: ResolveFoundryTokensOptions = {}): string {
  const { itemLevel } = options
  // @UUID with alias → alias text
  text = text.replace(/@UUID\[[^\]]*\]\{([^}]+)\}/g, '$1')
  // @UUID without alias → last path segment (Foundry IDs ~16 chars are dropped)
  text = text.replace(/@UUID\[([^\]]+)\]/g, (_, path: string) => {
    const seg = path.split('.').pop() ?? ''
    return /^[A-Za-z0-9]{16,}$/.test(seg) ? '' : seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  })
  // @Condition[slug]{alias} or @Condition[slug]
  text = text.replace(/@Condition\[[^\]]*\]\{([^}]+)\}/g, '$1')
  text = text.replace(/@Condition\[([^\]]+)\]/g, (_, slug: string) =>
    slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  )
  // @Damage supports:
  //   @Damage[2d6[fire], 1d4[bleed]]                                   → "2d6 fire plus 1d4 bleed"
  //   @Damage[(@item.rank+1)d8[acid]|options:area-damage]              → "(rank+1)d8 acid"
  //   @Damage[(ceil(@item.level/2))[persistent,acid]|options:…]        → "4 persistent acid"  (itemLevel=7)
  // Handles ONE level of nested brackets in the damage-type tag. Uses a
  // top-level-comma helper so `[persistent,acid]` doesn't get shredded.
  text = text.replace(/@Damage\[((?:[^[\]]|\[[^\]]*\])*)\]/g, (_, inner: string) => {
    // Strip Foundry option flags (e.g. `|options:area-damage`) globally;
    // @item.level expressions are evaluated downstream if itemLevel is set.
    const cleaned = inner.replace(/\|options?:[^|,\[\]]+/g, '')
    return splitTopLevel(cleaned, ',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .map((p) => {
        // Pipe-separated damage alternatives: take the primary, drop the rest.
        const primary = p.split('|')[0]!.trim()
        const m = primary.match(/^(.+?)\[([^\]]+)\]$/)
        if (!m) return resolveItemLevelExpr(primary, itemLevel)
        const rawFormula = resolveItemLevelExpr(m[1]!.trim(), itemLevel)
        // `(4)` → `4` when the formula resolved to a bare number.
        const formula = /^\(\s*-?\d+(?:\.\d+)?\s*\)$/.test(rawFormula) ? rawFormula.slice(1, -1).trim() : rawFormula
        const types = m[2]!.split(/,\s*/).map((t) => t.split('|')[0]!.trim()).filter(Boolean).join(' ')
        return `${formula} ${types}`.trim()
      })
      .join(' plus ')
  })
  // @Check[type:perception|dc:20] → "DC 20 Perception check"
  // @Check[will|dc:17]             → "DC 17 Will check" (Foundry positional)
  // @Check[dc:25]                  → "DC 25"            (no type)
  text = text.replace(/@Check\[([^\]]+)\]/g, (_, inner: string) => {
    const segments = inner.split('|')
    const params: Record<string, string> = {}
    let positionalType: string | undefined
    for (const seg of segments) {
      if (seg.includes(':')) {
        const [k, v] = seg.split(':')
        params[k] = v
      } else if (!positionalType && seg) {
        positionalType = seg
      }
    }
    const rawType = params.type ?? positionalType
    if (!rawType) {
      return params.dc ? `DC ${params.dc}` : 'flat check'
    }
    const type = rawType.charAt(0).toUpperCase() + rawType.slice(1)
    const dc = params.dc ? `DC ${params.dc} ` : ''
    return `${dc}${type} check`
  })
  // Collapse accidental duplicate " check check" from source text that
  // already had a manual " check" suffix after the token.
  text = text.replace(/\bcheck\s+check\b/gi, 'check')
  // @Template[type:cone|distance:15] → "15-foot cone"
  // @Template[cone|distance:30]      → "30-foot cone"  (Foundry positional)
  // @Template[burst|distance:15]     → "15-foot burst"
  text = text.replace(/@Template\[([^\]]+)\]/g, (_, inner: string) => {
    const segments = inner.split('|')
    const params: Record<string, string> = {}
    let positionalType: string | undefined
    for (const seg of segments) {
      if (seg.includes(':')) {
        const [k, v] = seg.split(':')
        params[k] = v
      } else if (!positionalType && seg) {
        positionalType = seg
      }
    }
    const type = params.type ?? positionalType ?? 'area'
    return `${params.distance ?? '?'}-foot ${type}`
  })
  // [[/act slug]] → readable action name
  text = text.replace(/\[\[\/act\s+([^#\s\]]*)[^\]]*\]\]/g, (_, slug: string) => {
    if (!slug) return ''
    return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  })
  // [[/br expr #label]]{display} → display text
  text = text.replace(/\[\[\/br\s+[^\]]*\]\]\{([^}]+)\}/g, '$1')
  // [[/br expr]] → expr
  text = text.replace(/\[\[\/br\s+([^#\s\]]+)[^\]]*\]\]/g, '$1')
  // [[/r 1d8 #Prismatic Spray]]{display} → display text
  text = text.replace(/\[\[\/r\s+[^\]]*\]\]\{([^}]+)\}/g, '$1')
  // [[/r 1d8 #Prismatic Spray]]     → 1d8  (drop hash label, keep formula)
  text = text.replace(/\[\[\/r\s+([^#\]]+?)(?:\s+#[^\]]*)?\]\]/g, (_, formula: string) => formula.trim())
  // Generic fallback for any other [[/cmd ...]]{alias} → alias
  text = text.replace(/\[\[\/\w+\s+[^\]]*\]\]\{([^}]+)\}/g, '$1')
  // Generic fallback for any other [[/cmd ...]] with no alias → stripped
  text = text.replace(/\[\[\/\w+\s+[^\]]*\]\]/g, '')
  // {Nfeet} → "N feet"
  text = text.replace(/\{(\d+)feet?\}/gi, '$1 feet')
  // Strip remaining unresolved @ tokens
  text = text.replace(/@\w+\[[^\]]*\](?:\{[^}]*\})?/g, '')
  // Orphaned alias braces after @UUID resolution: Foundry source sometimes
  // emits `Word{Word}` or `Word{Word}{Word}` when an alias is doubled;
  // the first `{alias}` was already consumed, drop the remainder.
  //   - `Grapple{Grapple}`             → `Grapple`
  //   - `...the Grapple{Grapple} action` → `...the Grapple action`
  text = text.replace(/(\b\w[\w\s-]*?)\s*\{\1\}/g, '$1')
  // Fallback: strip any standalone `{Alias}` where Alias is simple
  // identifier text (letters, spaces, hyphens). Preserves legitimate
  // braces only if content contains non-text (numbers, operators).
  text = text.replace(/\s*\{([A-Za-z][A-Za-z\s-]{0,40})\}/g, ' $1')
  // Final whitespace sweep after all token substitutions.
  text = text.replace(/[ \t]{2,}/g, ' ').replace(/ +\n/g, '\n')
  return text
}

/**
 * Resolve Foundry tokens then strip HTML — canonical sanitize for display text.
 * Optional `itemLevel` resolves `@item.level` expressions in @Damage formulas.
 */
export function sanitizeFoundryText(
  html: string | null | undefined,
  options: ResolveFoundryTokensOptions = {},
): string {
  if (!html) return ''
  return stripHtml(resolveFoundryTokens(html, options))
}
