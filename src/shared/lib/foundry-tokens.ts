import { stripHtml } from './html'

/**
 * Resolve Foundry VTT inline tokens to human-readable text.
 * Handles @UUID, @Condition, @Damage, @Check, @Template, [[/act]], [[/br]], etc.
 */
export function resolveFoundryTokens(text: string): string {
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
  // @Damage[2d6[fire], 1d4[bleed]] → "2d6 fire plus 1d4 bleed"
  text = text.replace(/@Damage\[([^\]]*)\]/g, (_, inner: string) =>
    inner.split(/,\s*/).map((p: string) => {
      const m = p.trim().match(/^(.+?)\[(.+?)\]$/)
      return m ? `${m[1]} ${m[2]}` : p.trim()
    }).join(' plus ')
  )
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
  text = text.replace(/@Template\[([^\]]+)\]/g, (_, inner: string) => {
    const params = Object.fromEntries(inner.split('|').map((p: string) => p.split(':')))
    return `${params.distance ?? '?'}-foot ${params.type ?? 'area'}`
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
  // {Nfeet} → "N feet"
  text = text.replace(/\{(\d+)feet?\}/gi, '$1 feet')
  // Strip remaining unresolved @ tokens
  text = text.replace(/@\w+\[[^\]]*\](?:\{[^}]*\})?/g, '')
  return text
}

/**
 * Resolve Foundry tokens then strip HTML — canonical sanitize for display text.
 */
export function sanitizeFoundryText(html: string | null | undefined): string {
  if (!html) return ''
  return stripHtml(resolveFoundryTokens(html))
}
