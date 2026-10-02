export interface HazardDamageTemplate {
  formula: string
  type: string
  persistent?: boolean
  category?: 'precision' | 'splash'
}

const DAMAGE_TOKEN = /@Damage\[((?:[^[\]]|\[[^\]]*\])*)\]/g
const ROLL_FORMULA = /^(?:(?:\d*d\d+|\d+)(?:\+\d*d\d+|[+-]\d+)*|\d+\*\d*d\d+)$/i

function splitDamageInstances(formula: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < formula.length; i++) {
    if (formula[i] === '[' || formula[i] === '(') depth++
    else if (formula[i] === ']' || formula[i] === ')') depth--
    else if (formula[i] === ',' && depth === 0) {
      parts.push(formula.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(formula.slice(start).trim())
  return parts
}

/** Each @Damage token is one roll, possibly containing several damage types. */
export function hazardDamageRolls(description: string): HazardDamageTemplate[][] {
  return [...description.matchAll(DAMAGE_TOKEN)].flatMap((match) => {
    const body = match[1].split('|')[0]
    const entries = splitDamageInstances(body).map((part) => {
      const typed = /^(.*)\[([a-z,-]+)\]$/i.exec(part)
      const expression = (typed ? typed[1] : part).trim().replace(/^\((.*)\)$/, '$1').replace(/\s+/g, '')
      const component = /^(.*)\[(precision|splash)\]$/i.exec(expression)
      const formula = component ? component[1] : expression
      if (!ROLL_FORMULA.test(formula)) return null
      const tags = typed?.[2].split(',') ?? []
      return {
        formula,
        type: tags.find((tag) => tag !== 'persistent') ?? '',
        persistent: tags.includes('persistent') || tags.includes('bleed'),
        ...(component && { category: component[2].toLowerCase() as 'precision' | 'splash' }),
      }
    })
    return entries.length > 0 && entries.every((entry) => entry !== null) ? [entries as HazardDamageTemplate[]] : []
  })
}
