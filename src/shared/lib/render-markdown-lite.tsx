import type { ReactNode } from 'react'

/**
 * Renders a subset of markdown emitted by the PF2e monster ability description parser:
 * **bold**, *italic*, \n line breaks, and --- horizontal separators.
 *
 * Returns ReactNode[] safe to spread into <p> or <Fragment> children.
 * Zero runtime dependencies — regex-split produces JSX fragments without any DOM
 * string injection, so React's automatic escaping is always in effect.
 */
export function renderMarkdownLite(text: string): ReactNode[] {
  if (!text) return []

  const INLINE_RE = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  const nodes: ReactNode[] = []
  const lines = text.split('\n')

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!

    if (li > 0) {
      nodes.push(<br key={`br-${li}`} />)
    }

    if (line.trim() === '---') {
      nodes.push(<hr key={`hr-${li}`} className="my-1 border-border/40" />)
      continue
    }

    const tokens = line.split(INLINE_RE)
    for (let ti = 0; ti < tokens.length; ti++) {
      const tok = tokens[ti]!
      if (tok.startsWith('**') && tok.endsWith('**')) {
        nodes.push(<strong key={`m-${li}-${ti}`} className="font-semibold">{tok.slice(2, -2)}</strong>)
      } else if (tok.startsWith('*') && tok.endsWith('*')) {
        nodes.push(<em key={`m-${li}-${ti}`} className="italic">{tok.slice(1, -1)}</em>)
      } else if (tok.length > 0) {
        nodes.push(tok)
      }
    }
  }

  return nodes
}
