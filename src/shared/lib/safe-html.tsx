/**
 * Safe HTML renderer for translation content.
 *
 * Input: raw HTML from vendored Babele/Foundry pack content (see
 * shared/i18n/pf2e-content/ingest).
 * Output: sanitized React node.
 *
 * Pipeline:
 *   1. Pre-process Foundry inline tokens (`@UUID[...]{label}`, `@Trait[...]`,
 *      `@Check[...]`, `@Damage[...]`, generic `@Kind[ref]{label}`) into span
 *      elements with semantic class names. Runs FIRST so the injected markup
 *      passes through the same DOMPurify allowlist.
 *   2. Pre-process action-cost tokens (`[one-action]`, `[reaction]`, …)
 *      into span elements carrying canonical PF2e glyphs.
 *   3. DOMPurify sanitize with an explicit tag+attribute allowlist. Anything
 *      outside the allowlist (script, iframe, onclick handlers, inline styles)
 *      is stripped.
 *   4. Render via dangerouslySetInnerHTML — necessary because pack content
 *      contains rich structure (lists, tables, collapsibles, nested
 *      bold/italic). Constructing React nodes manually would require a full
 *      HTML parser and still end up as dangerouslySetInnerHTML internally.
 *
 * XSS posture:
 *   - DOMPurify is the single source of sanitization (no hand-rolled regex).
 *   - ALLOWED_TAGS is a whitelist — additions must be reviewed for XSS impact.
 *   - ALLOWED_ATTR limited to `class` (styling hooks) and `data-trait` (used
 *     for trait-pill hover wiring at the component layer). No `style`, no
 *     `on*`, no `href` (Foundry @UUID tokens are normalized to plain spans).
 *   - `ALLOW_DATA_ATTR: false` keeps every other data-* attribute out, even
 *     though `data-trait` is whitelisted explicitly via ALLOWED_ATTR.
 */

import DOMPurify from 'dompurify'
import { useMemo } from 'react'
import { cn } from '@/shared/lib/utils'
import { actionCostLabel } from '@/shared/lib/pf2e-display'

const ALLOWED_TAGS = [
  // Text structure
  'b', 'strong', 'i', 'em', 'u', 'br', 'hr', 'p',
  // Inline containers
  'span',
  // Headings (Babele uses h2/h3 inside collapsibles and item breakdowns)
  'h2', 'h3',
  // Lists (frequent in description / descriptionGM blocks)
  'ul', 'ol', 'li',
  // Tables (mutation tables, ability charts)
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  // Collapsibles (descriptionGM uses <details><summary>)
  'details', 'summary',
]

const ALLOWED_ATTR = ['class', 'data-trait']

const ACTION_TOKEN_MAP: Record<string, string> = {
  'one-action': actionCostLabel('1'),
  'two-actions': actionCostLabel('2'),
  'three-actions': actionCostLabel('3'),
  'reaction': actionCostLabel('reaction'),
  'free-action': actionCostLabel('free'),
}

const ACTION_TOKEN_REGEX = /\[(one-action|two-actions|three-actions|reaction|free-action)\]/g

/**
 * Replace `[one-action]` style tokens with span-wrapped glyphs.
 * The wrapper class `pf2e-action-cost` lets us style them uniformly via
 * globals.css (monospace font, slight kerning to group the diamonds).
 */
function preprocessActionTokens(html: string): string {
  return html.replace(ACTION_TOKEN_REGEX, (_match, token) => {
    const glyph = ACTION_TOKEN_MAP[token as keyof typeof ACTION_TOKEN_MAP] ?? ''
    return `<span class="pf2e-action-cost" aria-label="${token}">${glyph}</span>`
  })
}

/**
 * Replace Foundry inline-link tokens (`@UUID[ref]{label}`, `@Trait[slug]`,
 * `@Check[…]{label}`, `@Damage[formula]`, generic `@Kind[ref]{label}`)
 * plus PF2e bracket notation `(formula)[type]` / `[[/act name]]{label}` /
 * `[[/gmr roll]]{label}` with semantically-classed `<span>` elements that
 * survive DOMPurify.
 *
 * The reference component of @UUID is intentionally dropped — Foundry-side
 * UUIDs are not resolvable in PathMaid's offline DB. Trait `data-trait`
 * survives the allowlist so a future hover-tooltip wiring can read it.
 *
 * Bracket-formula tokens (`(3d10+17)[bludgeoning]`, `30[healing]`,
 * `15d6[fire|options:area-damage]`) are emitted by the Foundry toolkit
 * macros and ship through the pf2-locale-ru pack verbatim. We strip the
 * options-list and route both formula + type into the styled spans so the
 * pill renders the same way as engine-side ClickableFormula output.
 */
// `@Glyph[Action 1]` / `@Glyph[Reaction]` / `@Glyph[Free Action]` —
// Foundry Babele markup for action-cost icons that the upstream module
// uses inside item / spell descriptions. Map to the same canonical
// glyphs that ACTION_TOKEN_MAP produces for `[one-action]`-style markers.
const GLYPH_TOKEN_MAP: Record<string, string> = {
  'Action 1': actionCostLabel('1'),
  'Action 2': actionCostLabel('2'),
  'Action 3': actionCostLabel('3'),
  'Reaction': actionCostLabel('reaction'),
  'Free Action': actionCostLabel('free'),
}

function preprocessFoundryTokens(html: string): string {
  let out = html
  // Order matters: greedy `@UUID[…]{label}` BEFORE the generic catch-all so
  // we keep the explicit class. Same for Trait/Check/Damage.
  out = out.replace(/@UUID\[[^\]]+\]\{([^}]+)\}/g, '<span class="pf2e-uuid-ref">$1</span>')
  out = out.replace(/@UUID\[[^\]]+\]/g, '')
  // `@Glyph[Action 1]` etc. — render as canonical action-cost glyph span.
  // Unknown glyph kinds collapse to the kind text inside a generic span so
  // they don't slip into the catch-all (which would print a literal `$1`).
  out = out.replace(/@Glyph\[([^\]]+)\]/g, (_m, kind: string) => {
    const glyph = GLYPH_TOKEN_MAP[kind] ?? ''
    return glyph
      ? `<span class="pf2e-action-cost" aria-label="${kind}">${glyph}</span>`
      : `<span>${kind}</span>`
  })
  out = out.replace(/@Trait\[([^\]]+)\]\{([^}]+)\}/g, '<span class="pf2e-trait" data-trait="$1">$2</span>')
  out = out.replace(/@Trait\[([^\]]+)\]/g, '<span class="pf2e-trait" data-trait="$1">$1</span>')
  out = out.replace(/@Check\[[^\]]+\]\{([^}]+)\}/g, '<span class="pf2e-check">$1</span>')
  out = out.replace(/@Damage\[([^\]]+)\]/g, (_m, body: string) => {
    // `@Damage[2d6[fire]]` / `@Damage[1d4[poison]]` — strip nested type.
    const inner = body.replace(/\[([^\]]+)\]/g, ' $1')
    return `<span class="pf2e-damage">${inner}</span>`
  })
  // `[[/act steal]]{Воровства}` / `[[/gmr 1d6 #label]]{1d6 раундов}` —
  // chat-command tokens. Drop the command body, keep the visible label.
  out = out.replace(/\[\[\/(act|gmr|r|br)\s+[^\]]+\]\]\{([^}]+)\}/g, '<span class="pf2e-action">$2</span>')
  out = out.replace(/\[\[\/(act|gmr|r|br)\s+[^\]]+\]\]/g, '')
  // Bracket formulas: `30[healing]`, `(3d10+17)[bludgeoning]`,
  // `15d6[fire|options:area-damage]`. Capture group 1 = formula, 2 = type
  // (everything before any `|options:…`). The option list after `|` is
  // dropped — it's metadata the chat command would consume but offers no
  // visual value to the DM.
  out = out.replace(
    /\(([^)]+)\)\[([^\]|]+)(?:\|[^\]]*)?\]/g,
    '<span class="pf2e-damage">($1) $2</span>',
  )
  out = out.replace(
    /(\d+(?:d\d+)?(?:[+-]\d+)?)\[([^\]|]+)(?:\|[^\]]*)?\]/g,
    '<span class="pf2e-damage">$1 $2</span>',
  )
  // Generic catch-all for any `@Kind[ref]{label}` we didn't enumerate.
  out = out.replace(/@\w+\[[^\]]+\]\{([^}]+)\}/g, '<span>$1</span>')
  // Catch-all without label — drop the bracketed reference (was emitting
  // literal `$1` because the regex had no capturing group).
  out = out.replace(/@\w+\[[^\]]+\]/g, '')
  return out
}

export interface SafeHtmlProps {
  html: string
  className?: string
  /** Override the outer tag (default: <div>). Use 'span' for inline contexts. */
  as?: 'div' | 'span'
}

export function SafeHtml({ html, className, as = 'div' }: SafeHtmlProps) {
  const sanitized = useMemo(() => {
    const tokensExpanded = preprocessFoundryTokens(html)
    const actionsExpanded = preprocessActionTokens(tokensExpanded)
    return DOMPurify.sanitize(actionsExpanded, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      USE_PROFILES: { html: true },
    })
  }, [html])

  const Tag = as
  return (
    <Tag
      className={cn('pf2e-safe-html', className)}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
