import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { damageTypeColor } from '@/shared/lib/damage-colors'

// Strip Foundry VTT inline roll tags: [[/gmr 2d6 #rounds]]{2d6 rounds} → "2d6 rounds"
// If no display text, strip the tag entirely.
const FOUNDRY_TAG_RE = /\[\[.*?\]\](?:\{([^}]*)\})?/g

export function stripFoundryTags(text: string): string {
  return text.replace(FOUNDRY_TAG_RE, (_, display) => display ?? '')
}

// Inline highlighting for DC values and damage dice in ability text
// Group 2 = dice formula, Group 3 = damage type (stripped of brackets)
const GAME_TEXT_RE = /(DC\s+\d+)|(\d+d\d+(?:\s*[+\-]\s*\d+)?)(?:\[(\w+)\])?/gi

export function highlightGameText(raw: string, onRoll?: (formula: string) => void): ReactNode {
  const text = stripFoundryTags(raw)
  const parts: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(GAME_TEXT_RE)) {
    const idx = match.index!
    if (idx > lastIndex) parts.push(text.slice(lastIndex, idx))

    if (match[1]) {
      // DC value
      parts.push(
        <span key={key++} className="text-pf-gold font-semibold font-mono">{match[1]}</span>
      )
    } else if (match[2]) {
      // Dice formula — clickable if onRoll provided
      const formula = match[2]
      if (onRoll) {
        parts.push(
          <button
            key={key++}
            onClick={(e) => { e.stopPropagation(); onRoll(formula) }}
            title={`Roll ${formula}`}
            className="text-pf-blood font-bold font-mono cursor-pointer underline decoration-dotted underline-offset-2 decoration-pf-blood/50 hover:text-pf-gold transition-colors duration-100"
          >
            {formula}
          </button>
        )
      } else {
        parts.push(
          <span key={key++} className="text-pf-blood font-mono">{formula}</span>
        )
      }
      // Damage type (if present, stripped of brackets)
      if (match[3]) {
        parts.push(
          <span key={key++} className={cn('font-mono', damageTypeColor(match[3]))}> {match[3]}</span>
        )
      }
    }
    lastIndex = idx + match[0].length
  }

  if (lastIndex === 0) return text
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return <>{parts}</>
}
