/**
 * Safe HTML renderer for translation content (Phase 79).
 *
 * Input: raw HTML from bundled pf2.ru translations (see shared/i18n/pf2e-content).
 * Output: sanitized React node.
 *
 * Pipeline:
 *   1. Pre-process Foundry-style action tokens (`[one-action]`, `[reaction]`, …)
 *      into span elements carrying canonical PF2e glyphs. Must happen BEFORE
 *      sanitization so the injected markup goes through the same allowlist.
 *   2. DOMPurify sanitize with an explicit tag+attribute allowlist. Anything
 *      outside the allowlist (script, iframe, onclick handlers, styles) is
 *      stripped.
 *   3. Render via dangerouslySetInnerHTML — necessary because translation
 *      content contains rich structure (sections, tables, nested bold/italic).
 *      Constructing React nodes manually would require a full HTML parser
 *      and still end up as dangerouslySetInnerHTML internally.
 *
 * XSS posture:
 *   - DOMPurify is the single source of sanitization (no hand-rolled regex).
 *   - ALLOWED_TAGS is a whitelist — additions must be reviewed for XSS impact.
 *   - ALLOWED_ATTR limited to `class` (styling hooks). No `style`, no `on*`.
 *   - `ALLOW_DATA_ATTR: false` and `SANITIZE_DOM: true` (DOMPurify defaults).
 */

import DOMPurify from 'dompurify'
import { useMemo } from 'react'
import { cn } from '@/shared/lib/utils'
import { actionCostLabel } from '@/shared/lib/pf2e-display'

const ALLOWED_TAGS = [
  // Text structure
  'b', 'strong', 'i', 'em', 'u', 'br', 'hr', 'p',
  // Inline containers (for pf2.ru's .in-box-ability / .h2-header)
  'span',
  // Headings used in pf2.ru item breakdowns
  'h2', 'h3',
]

const ALLOWED_ATTR = ['class']

// Foundry/pf2.ru action token → canonical glyph. Uses the same glyphs as
// shared/lib/pf2e-display.ts so the translated content matches the rest of
// the app's action-cost visual language.
const ACTION_TOKEN_MAP: Record<string, string> = {
  'one-action': actionCostLabel('1'),      // ◆
  'two-actions': actionCostLabel('2'),     // ◆◆
  'three-actions': actionCostLabel('3'),   // ◆◆◆
  'reaction': actionCostLabel('reaction'), // ↺
  'free-action': actionCostLabel('free'),  // ◇
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

export interface SafeHtmlProps {
  html: string
  className?: string
  /** Override the outer tag (default: <div>). Use 'span' for inline contexts. */
  as?: 'div' | 'span'
}

export function SafeHtml({ html, className, as = 'div' }: SafeHtmlProps) {
  const sanitized = useMemo(() => {
    const preprocessed = preprocessActionTokens(html)
    return DOMPurify.sanitize(preprocessed, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      // Explicit safety knobs (DOMPurify defaults, restated for audit clarity):
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
