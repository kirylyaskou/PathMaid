/** Safely parse a JSON string as T[], returning [] on null / undefined / parse error. */
export function parseJsonArray<T = string>(json: string | null | undefined): T[] {
  if (!json) return []
  try {
    return JSON.parse(json) as T[]
  } catch {
    return []
  }
}

/** Safely parse a JSON string as T, returning null on null / undefined / parse error. */
export function parseJsonOrNull<T>(json: string | null | undefined): T | null {
  if (!json) return null
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}
