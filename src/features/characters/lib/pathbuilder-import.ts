import type { PathbuilderExport } from '@engine'

function validateExport(data: unknown, source: 'json' | 'remote'): PathbuilderExport {
  const exp = data as PathbuilderExport
  if (exp?.success !== true) {
    if (source === 'remote') {
      throw new Error(
        'Pathbuilder returned success:false for this id. Use the id from Pathbuilder json.php?id=... export, or export JSON and use File/Paste.'
      )
    }
    throw new Error('File is not a valid Pathbuilder export (success: false)')
  }
  if (!exp.build?.name) {
    throw new Error('Missing build.name field')
  }
  if (!exp.build?.class) {
    throw new Error('Missing build.class field')
  }
  return exp
}

function extractFirstJsonObject(rawInput: string): string {
  const start = rawInput.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in text')
  let depth = 0
  let end = -1
  let inStr = false
  let esc = false
  for (let i = start; i < rawInput.length; i += 1) {
    const ch = rawInput[i]
    if (esc) {
      esc = false
      continue
    }
    if (ch === '\\' && inStr) {
      esc = true
      continue
    }
    if (ch === '"') {
      inStr = !inStr
      continue
    }
    if (inStr) continue
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  return end !== -1 ? rawInput.slice(start, end + 1) : rawInput.slice(start)
}

export function parsePathbuilderExportText(rawInput: string): PathbuilderExport {
  const json = extractFirstJsonObject(rawInput)
  return validateExport(JSON.parse(json), 'json')
}

export function extractPathbuilderBuildId(input: string): string | null {
  const trimmed = input.trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  try {
    const url = new URL(trimmed)
    if (!/pathbuilder2e\.com$/i.test(url.hostname)) return null
    return url.searchParams.get('build') ?? url.searchParams.get('id')
  } catch {
    return null
  }
}

export async function fetchPathbuilderExport(input: string): Promise<PathbuilderExport> {
  const buildId = extractPathbuilderBuildId(input)
  if (!buildId) {
    throw new Error('Enter a Pathbuilder link or numeric build id')
  }
  const response = await fetch(`https://pathbuilder2e.com/json.php?id=${encodeURIComponent(buildId)}`, {
    headers: { Accept: 'application/json' },
  })
  const text = await response.text()
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('text/html') || /^\s*<!doctype html/i.test(text) || /^\s*<html/i.test(text)) {
    throw new Error('Pathbuilder blocked direct import. Export JSON from Pathbuilder and use File/Paste instead.')
  }
  if (!response.ok) {
    throw new Error(`Pathbuilder returned HTTP ${response.status}`)
  }
  const json = extractFirstJsonObject(text)
  return validateExport(JSON.parse(json), 'remote')
}
