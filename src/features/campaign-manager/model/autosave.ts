export function createDebouncedTask<T>(
  delayMs: number,
  task: (value: T) => Promise<void>,
): (value: T) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return (value) => {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      void task(value)
    }, delayMs)
  }
}

interface KeyedLatestEntry<T> {
  latestValue: T
  running: boolean
  sequence: number
  timer: ReturnType<typeof setTimeout> | null
}

export function createKeyedLatestTask<T, K>(
  delayMs: number,
  keyOf: (value: T) => K,
  task: (value: T) => Promise<void>,
): (value: T) => void {
  const entries = new Map<K, KeyedLatestEntry<T>>()

  const run = async (key: K): Promise<void> => {
    const entry = entries.get(key)
    if (!entry || entry.running) {
      return
    }

    entry.running = true
    const sequence = entry.sequence
    const value = entry.latestValue

    try {
      await task(value)
    } catch (error) {
      console.warn('Campaign background task failed', error)
    } finally {
      entry.running = false

      if (entry.sequence !== sequence) {
        if (entry.timer) {
          clearTimeout(entry.timer)
        }

        entry.timer = setTimeout(() => {
          entry.timer = null
          void run(key)
        }, 0)
      }
    }
  }

  return (value) => {
    const key = keyOf(value)
    const entry = entries.get(key) ?? {
      latestValue: value,
      running: false,
      sequence: 0,
      timer: null,
    }

    entry.latestValue = value
    entry.sequence += 1

    if (entry.timer) {
      clearTimeout(entry.timer)
    }

    entries.set(key, entry)

    if (!entry.running) {
      entry.timer = setTimeout(() => {
        entry.timer = null
        void run(key)
      }, delayMs)
    }
  }
}
