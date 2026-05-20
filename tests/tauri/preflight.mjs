import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'

const isWindows = process.platform === 'win32'
const repoRoot = path.resolve(import.meta.dirname, '..', '..')
const localDriverRoot = path.resolve(repoRoot, 'tests', 'tauri', '.drivers')

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
  if (explicit) return fs.existsSync(explicit)

  const cargoPath = cargoBin(command)
  return fs.existsSync(cargoPath) || commandExists(isWindows ? `${command}.exe` : command)
}

function findLocalEdgeDriver() {
  if (!fs.existsSync(localDriverRoot)) return false
  const entries = fs.readdirSync(localDriverRoot, { recursive: true, withFileTypes: true })
  return entries.some((entry) => entry.isFile() && entry.name.toLowerCase() === 'msedgedriver.exe')
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

if (process.platform === 'darwin') {
  fail('Tauri WebDriver desktop tests are supported on Windows and Linux, not macOS.')
}

if (!resolveExecutable('TAURI_DRIVER_BIN', 'tauri-driver')) {
  fail('tauri-driver not found. Install it with: cargo install tauri-driver --locked')
}

if (isWindows) {
  const explicitNativeDriver = process.env.TAURI_NATIVE_DRIVER
  const hasNativeDriver = explicitNativeDriver
    ? fs.existsSync(explicitNativeDriver)
    : commandExists('msedgedriver.exe') || findLocalEdgeDriver()

  if (!hasNativeDriver) {
    fail('msedgedriver.exe not found. Put it in PATH or set TAURI_NATIVE_DRIVER to its full path.')
  }
}
