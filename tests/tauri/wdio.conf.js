import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawn, spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')
const isWindows = process.platform === 'win32'
const appBinary = path.resolve(
  repoRoot,
  'src-tauri',
  'target',
  'debug',
  isWindows ? 'pathmaid.exe' : 'pathmaid',
)
const localDriverRoot = path.resolve(__dirname, '.drivers')

let tauriDriverProcess
let expectedShutdown = false

function commandExists(command) {
  const probe = spawnSync(isWindows ? 'where.exe' : 'which', [command], {
    encoding: 'utf8',
    shell: false,
  })
  return probe.status === 0
}

function cargoBin(command) {
  return path.resolve(os.homedir(), '.cargo', 'bin', isWindows ? `${command}.exe` : command)
}

function resolveExecutable(envName, command) {
  const explicit = process.env[envName]
  if (explicit) {
    return fs.existsSync(explicit) ? explicit : null
  }

  const cargoPath = cargoBin(command)
  if (fs.existsSync(cargoPath)) return cargoPath
  return commandExists(isWindows ? `${command}.exe` : command) ? command : null
}

function findLocalEdgeDriver() {
  if (!fs.existsSync(localDriverRoot)) return null
  const entries = fs.readdirSync(localDriverRoot, { recursive: true, withFileTypes: true })
  const match = entries.find((entry) => entry.isFile() && entry.name.toLowerCase() === 'msedgedriver.exe')
  return match ? path.join(match.parentPath, match.name) : null
}

function resolveNativeDriver() {
  if (!isWindows) return null
  const explicit = process.env.TAURI_NATIVE_DRIVER
  if (explicit) return fs.existsSync(explicit) ? explicit : null
  if (commandExists('msedgedriver.exe')) return null
  return findLocalEdgeDriver()
}

function requireExecutable(envName, command, installHint) {
  const executable = resolveExecutable(envName, command)
  if (!executable) {
    throw new Error(`${command} not found. ${installHint}`)
  }
  return executable
}

function buildDebugApp() {
  if (process.env.TAURI_E2E_SKIP_BUILD === '1') return

  const result = spawnSync('npm', ['run', 'build', '--', '--debug', '--no-bundle'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
  })

  if (result.status !== 0) {
    throw new Error('Failed to build the debug Tauri app for e2e tests.')
  }
}

function assertWindowsNativeDriver() {
  if (!isWindows) return
  if (resolveNativeDriver() !== null || commandExists('msedgedriver.exe')) return

  throw new Error(
    'msedgedriver.exe not found. Install the Edge WebDriver that matches Microsoft Edge, put it in PATH, or set TAURI_NATIVE_DRIVER.',
  )
}

function startTauriDriver(tauriDriver) {
  const args = []
  const nativeDriver = resolveNativeDriver()
  if (nativeDriver) {
    args.push('--native-driver', nativeDriver)
  }

  tauriDriverProcess = spawn(tauriDriver, args, {
    stdio: [null, process.stdout, process.stderr],
  })

  tauriDriverProcess.on('error', (error) => {
    throw error
  })

  tauriDriverProcess.on('exit', (code) => {
    if (!expectedShutdown) {
      throw new Error(`tauri-driver exited early with code ${code ?? 'null'}.`)
    }
  })
}

function stopTauriDriver() {
  expectedShutdown = true
  tauriDriverProcess?.kill()
  tauriDriverProcess = undefined
}

export const config = {
  host: '127.0.0.1',
  port: 4444,
  specs: [path.join(__dirname, 'specs', '**', '*.e2e.js')],
  maxInstances: 1,
  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: appBinary,
      },
    },
  ],
  logLevel: 'warn',
  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },
  waitforTimeout: 15000,

  onPrepare: () => {
    if (process.platform === 'darwin') {
      throw new Error('Tauri WebDriver desktop tests are supported on Windows and Linux, not macOS.')
    }

    requireExecutable(
      'TAURI_DRIVER_BIN',
      'tauri-driver',
      'Install it with: cargo install tauri-driver --locked',
    )
    assertWindowsNativeDriver()
    buildDebugApp()

    if (!fs.existsSync(appBinary)) {
      throw new Error(`Expected Tauri debug binary at ${appBinary}`)
    }
  },

  beforeSession: () => {
    const tauriDriver = requireExecutable(
      'TAURI_DRIVER_BIN',
      'tauri-driver',
      'Install it with: cargo install tauri-driver --locked',
    )
    startTauriDriver(tauriDriver)
  },

  afterSession: () => {
    stopTauriDriver()
  },

  onComplete: () => {
    stopTauriDriver()
  },
}
