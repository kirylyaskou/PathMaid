# Phase 84: HTML Parser Library — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 84-html-parser-library
**Areas discussed:** Data shape scope, Matching strategy, Unit tests, Inline markup

---

## Data Shape Scope

| Option | Description | Selected |
|--------|-------------|----------|
| A — Minimum viable | Только поля, которые Phase 88 рендерит в CreatureStatBlock. Compact type, easier to test. | ✓ |
| B — Comprehensive | Все поля RU stat block, даже не используемые в v1.7.0. Готовность на будущее, больше surface area. | |

**User's choice:** A
**Notes:** Pragmatic YAGNI — type расширяем когда нужно. D-02 фиксирует точный shape для v1.7.0.

---

## Matching Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| A — Index-only | i-й RU ability overlay'ится на i-й EN. Simple but fragile on reordered data. | |
| B — Name-match first, index fallback | Normalized bolded-title lookup; если miss → index. | ✓ |
| C — Strict | Count mismatch → весь abilitiesLoc=null (EN fallback). Paranoid. | |

**User's choice:** B
**Notes:** pf2.ru может ре-ордерить блоки (legacy vs modern stat layout). Name-match ловит reorder; index fallback — для total chaos. Strict слишком paranoid.

---

## Unit Tests

| Option | Description | Selected |
|--------|-------------|----------|
| A — Vitest | Full test framework, automated runs. Зависимость — конфликт с "No test files" convention. | |
| B — Manual QA only | Pure manual проверка через dev console. Regression risk на unknown monsters. | |
| C — Debug script | `parse-monster.debug.ts` с fixtures + console.assert, запускается вручную через pnpm tsx. Zero deps. | ✓ |

**User's choice:** C
**Notes:** Sweet spot: ломает "no test files" минимально (файл с `.debug.ts` суффиксом, не автозапуск), но даёт regression coverage. Интеграция — UAT в Phase 88.

---

## Inline Markup

| Option | Description | Selected |
|--------|-------------|----------|
| A — Raw HTML | Parser preserve'ит HTML; Phase 88 нужен SafeHtml component + XSS mitigation. | |
| B — Plain strip | HTML → plain text + actionCount. Теряет inline italics/bold. | |
| C — Markdown-lite | `<b>` → `**`, `<i>` → `*`, `<br>` → `\n`, action markers → actionCount. Tiny renderer в Phase 88. | ✓ |

**User's choice:** C
**Notes:** Balance — сохраняем emphasis (Frequency / Effect markers) без XSS surface. Renderer ~15 строк regex→React, zero deps.

---

## Claude's Discretion

- Regex patterns для section boundaries (builder tunes на fixtures)
- Internal helper-function structure parse-monster.ts
- Exact picks of 5 additional fixture monsters помимо Succubus

## Deferred Ideas

- Parser для spell/item/feat/action structured RU — future milestone, data-driven
- SafeHtml component — not needed due to markdown-lite decision (D-07)
- CI integration для debug script — out of v1.7.0 scope
