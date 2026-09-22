# PathMaid

PathMaid — desktop assistant for Game Masters running [Pathfinder Second Edition](https://paizo.com/pathfinder).
Built with Tauri 2 + React 19. Bestiary, encounter builder, combat tracker, spell reference, items reference — all offline, all local.

Repository: [github.com/kirylyaskou/PathMaid](https://github.com/kirylyaskou/PathMaid)

## Developer Docs

- [Вводный документ для разработчика](docs/developer-onboarding.md)
- [Инженерный аудит и план рефакторинга](docs/refactoring-plan.md)
- [Архитектурные графы рефакторинга](docs/architecture-graphs.md)

## Android releases

The release workflow builds a signed ARM64 APK and attaches it to the same GitHub release as the desktop installers. Assets include `PathMaid_<version>_android_arm64.apk` and the stable download alias `PathMaid_android_arm64.apk`. Publication waits for all desktop and Android builds to succeed.

Configure these repository Actions secrets before running a release:

| Secret | Value |
| --- | --- |
| `ANDROID_KEY_BASE64` | Base64-encoded Android signing keystore |
| `ANDROID_KEY_ALIAS` | Signing key alias in the keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_PASSWORD` | Signing key password (may be the same as the keystore password) |

Use the same keystore for subsequent releases so Android can install updates over the existing app. Keep the keystore and passwords outside the repository. See [Tauri's Android signing guide](https://v2.tauri.app/distribute/sign/android/) for key creation. The workflow also requires the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets.

Android uses manual APK installation and updates. The desktop Python/PaddleOCR sidecar is excluded from the APK, so OCR import is unavailable on Android.

## Licenses

PathMaid bundles game content and community translations subject to multiple licenses. Full license texts and attribution chains are committed under [`LICENSES/`](LICENSES/):

- [`LICENSES/OGL-1.0a.txt`](LICENSES/OGL-1.0a.txt) — Open Game License v1.0a (verbatim WoTC text)
- [`LICENSES/PAIZO-COMMUNITY-USE.md`](LICENSES/PAIZO-COMMUNITY-USE.md) — Paizo Community Use Policy disclaimer
- [`LICENSES/OGL-SECTION-15.md`](LICENSES/OGL-SECTION-15.md) — OGL §6 COPYRIGHT NOTICE chain (verbatim)
- [`LICENSES/pf2-locale-ru-CONTRIBUTORS.md`](LICENSES/pf2-locale-ru-CONTRIBUTORS.md) — community translation attribution

## Russian Translations

Russian-language game content displayed by PathMaid is sourced from the [pf2-locale-ru](https://gitlab.com/gnuraco/pf2r) community Foundry VTT module, vendored point-in-time under [`vendor/pf2e-locale-ru/`](vendor/pf2e-locale-ru/).

Vendor metadata (source URL, commit SHA, scope, update procedure): [`vendor/pf2e-locale-ru/VERSION.txt`](vendor/pf2e-locale-ru/VERSION.txt).

---

This product uses trademarks and/or copyrights owned by Paizo Inc., used under Paizo's [Community Use Policy](https://paizo.com/communityuse). We are expressly prohibited from charging you to use or access this content. **This product is not published, endorsed, or specifically approved by Paizo.** For more information about Paizo Inc. and Paizo products, please visit [paizo.com](https://paizo.com).

Pathfinder is a trademark of Paizo Inc., and the Pathfinder Roleplaying Game and the Paizo logo are registered trademarks of Paizo Inc.
