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
