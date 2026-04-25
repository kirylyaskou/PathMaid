import { Fragment, type ReactNode } from 'react'

/** Exact degree-of-success labels (EN + RU). Case-insensitive, trim. */
export const DEGREE_LABELS: Record<string, 'crit-success' | 'success' | 'failure' | 'crit-failure'> = {
  'critical success': 'crit-success',
  'критический успех': 'crit-success',
  'success': 'success',
  'успех': 'success',
  'failure': 'failure',
  'провал': 'failure',
  'critical failure': 'crit-failure',
  'критический провал': 'crit-failure',
}

function classifyDegree(text: string): 'crit-success' | 'success' | 'failure' | 'crit-failure' | null {
  return DEGREE_LABELS[text.trim().toLowerCase()] ?? null
}

export interface RenderDescriptionOptions {
  /**
   * Optional transformer for plain text nodes. Receives the raw text and a
   * key prefix; returns a ReactNode (e.g. with DC/dice highlighting spans).
   * When omitted, text nodes are emitted as-is.
   */
  textTransform?: (text: string, keyPrefix: string) => ReactNode
}

/**
 * Walk DOM nodes, emit ReactNode array. Does not perform sanitisation — input
 * is either Foundry source or bundled pf2.ru content (both trusted).
 * Block tags become <br/>; <b>/<strong> with a recognised degree label get
 * a coloured class, all other <b>/<strong> emit as plain <strong>.
 */
function walk(node: Node, keyPrefix: string, options: RenderDescriptionOptions): ReactNode[] {
  const out: ReactNode[] = []
  let i = 0
  node.childNodes.forEach((child) => {
    const key = `${keyPrefix}-${i++}`
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? ''
      out.push(options.textTransform ? options.textTransform(text, key) : text)
      return
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return
    const el = child as Element
    const tag = el.tagName.toLowerCase()

    if (tag === 'b' || tag === 'strong') {
      const text = el.textContent ?? ''
      const variant = classifyDegree(text)
      if (variant) {
        out.push(
          <strong key={key} className={`pf2e-degree pf2e-degree--${variant}`}>{text}</strong>
        )
      } else {
        out.push(<strong key={key}>{walk(el, key, options)}</strong>)
      }
      return
    }

    if (tag === 'br' || tag === 'hr') {
      out.push(<br key={key} />)
      return
    }

    if (tag === 'p' || tag === 'div' || tag === 'li') {
      out.push(<Fragment key={key}>{walk(el, key, options)}<br /></Fragment>)
      return
    }

    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      out.push(<Fragment key={key}>{walk(el, key, options)}<br /></Fragment>)
      return
    }

    // i / em / span / u / other inline — emit children without wrapper.
    out.push(<Fragment key={key}>{walk(el, key, options)}</Fragment>)
  })
  return out
}

/**
 * Convert an HTML string to a ReactNode with degree-of-success labels
 * highlighted (bold + colour class). Uses DOMParser (available in Tauri WebView).
 * Does NOT use dangerouslySetInnerHTML.
 */
export function renderDescription(
  html: string | null | undefined,
  options: RenderDescriptionOptions = {},
): ReactNode {
  if (!html) return null
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html')
  const root = doc.body.firstElementChild
  if (!root) return html
  return <>{walk(root, 'd', options)}</>
}
