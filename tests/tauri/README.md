# Tauri E2E Tests

These tests run PathMaid in the native Tauri WebView through WebDriver. They do
not use the browser-only Vite page, so Tauri IPC and the SQLite plugin are
available during the run.

## Prerequisites

Install `tauri-driver`:

```bash
cargo install tauri-driver --locked
```

On Windows, install the Microsoft Edge WebDriver that matches the installed Edge
version. Put `msedgedriver.exe` in `PATH`, or set:

```bash
$env:TAURI_NATIVE_DRIVER = 'C:\path\to\msedgedriver.exe'
```

If `tauri-driver` is not in `PATH` or `C:\Users\<user>\.cargo\bin`, set:

```bash
$env:TAURI_DRIVER_BIN = 'C:\path\to\tauri-driver.exe'
```

Run:

```bash
npm run test:tauri
```

Set `$env:TAURI_E2E_SKIP_BUILD = '1'` to reuse an existing
`src-tauri/target/debug/pathmaid.exe`.

## Playwright native-app mode

Playwright tests launch the real debug Tauri binary and connect to the WebView2
remote debugging port. They do not use Vite's browser page.

Run:

```bash
pnpm test:playwright
```

This mode is Windows-only because it relies on WebView2 CDP. Set
`$env:TAURI_E2E_SKIP_BUILD = '1'` to reuse an existing debug binary.
Set `$env:TAURI_APP_BINARY = 'D:\pathmaid\src-tauri\target\release\pathmaid.exe'`
to run against a specific already-built native executable.
