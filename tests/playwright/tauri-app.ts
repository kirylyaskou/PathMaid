import { chromium, test as base, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

interface TauriFixtures {
  appPage: Page
}

interface TauriWorkerFixtures {
  tauriApp: {
    browser: Browser
    context: BrowserContext
    page: Page
    process: ChildProcess
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const isWindows = process.platform === 'win32'
const defaultAppBinary = path.resolve(
  repoRoot,
  'src-tauri',
  'target',
  'debug',
  isWindows ? 'pathmaid.exe' : 'pathmaid',
)

function commandForPlatform(command: string): string {
  return isWindows ? `${command}.cmd` : command
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => {
        if (!address || typeof address === 'string') {
          reject(new Error('Could not allocate a local CDP port.'))
          return
        }
        resolve(address.port)
      })
    })
  })
}

function buildDebugApp(): void {
  if (process.env.TAURI_APP_BINARY) return
  if (process.env.TAURI_E2E_SKIP_BUILD === '1') return

  const result = spawnSync(commandForPlatform('pnpm'), ['exec', 'tauri', 'build', '--debug', '--no-bundle'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
  })

  if (result.status !== 0) {
    throw new Error('Failed to build the debug Tauri app for Playwright tests.')
  }
}

function resolveAppBinary(): string {
  return process.env.TAURI_APP_BINARY
    ? path.resolve(process.env.TAURI_APP_BINARY)
    : defaultAppBinary
}

async function waitForCdp(port: number): Promise<void> {
  const endpoint = `http://127.0.0.1:${port}/json/version`
  const deadline = Date.now() + 30_000
  let lastError: unknown = null

  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint)
      if (response.ok) return
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Tauri WebView2 CDP endpoint did not open at ${endpoint}. Last error: ${String(lastError)}`)
}

async function firstAppPage(context: BrowserContext): Promise<Page> {
  const existing = context.pages().find((candidate) => !candidate.isClosed())
  if (existing) return existing
  return context.waitForEvent('page', { timeout: 15_000 })
}

export const test = base.extend<TauriFixtures, TauriWorkerFixtures>({
  tauriApp: [async ({}, use) => {
    if (!isWindows) {
      throw new Error('Playwright Tauri tests use WebView2 CDP and are currently supported on Windows only.')
    }

    buildDebugApp()

    const appBinary = resolveAppBinary()
    if (!fs.existsSync(appBinary)) {
      throw new Error(`Expected Tauri debug binary at ${appBinary}`)
    }

    const port = await findFreePort()
    const processEnv = {
      ...process.env,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: [
        process.env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS,
        `--remote-debugging-port=${port}`,
        '--remote-allow-origins=*',
      ].filter(Boolean).join(' '),
    }
    const child = spawn(appBinary, [], {
      cwd: repoRoot,
      env: processEnv,
      stdio: 'ignore',
      windowsHide: true,
    })

    try {
      await waitForCdp(port)
      const browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`)
      const context = browser.contexts()[0] ?? await browser.newContext()
      const page = await firstAppPage(context)

      await use({ browser, context, page, process: child })

      await browser.close()
    } finally {
      if (!child.killed) child.kill()
    }
  }, { scope: 'worker' }],

  appPage: async ({ tauriApp }, use) => {
    await use(tauriApp.page)
  },
})

export { expect } from '@playwright/test'
