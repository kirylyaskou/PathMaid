---
status: partial
phase: 84-html-parser-library
source: [84-VERIFICATION.md]
started: "2026-04-24T00:00:00Z"
updated: "2026-04-24T00:00:00Z"
---

## Current Test

[awaiting human testing]

## Tests

### 1. Прогон debug-харнесса в Tauri WebView DevTools
expected: После `pnpm tauri dev` открыть DevTools (Ctrl+Shift+I), выполнить `__pathmaid_parseMonsterDebug()` в консоли. Итоговый лог `[parse-monster.debug] Succubus: 57/57 assertions passed` без FAIL. Ключевые новые assertions из gap-closure:
- A5, A6, A7 — actionCount для "Смена формы", "Объятия", "Нечистый дар" (было always null до CR-01 fix)
- A22b — weaknessesLoc не содержит цифр (D-03)
- A34–A41 — abilityScoresLoc: 6 labels присутствуют и соответствуют pf2.ru HTML ("Сил/Лвк/Вын/Инт/Мдр/Хар")
result: [pending]

### 2. Startup message в DevTools Console
expected: При запуске `pnpm tauri dev` в Console должно появиться сообщение `[parse-monster.debug] Available via window.__pathmaid_parseMonsterDebug()` в DEV mode. Требует открытой DevTools на старте.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
