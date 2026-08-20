# Work — робоча документація Org Hierarchy SDK

Ця папка доповнює `docs/REQUIREMENTS.md` і `docs/TECH_STACK.md`: фіксує **поточний стан**, **алгоритми**, **технічний борг** і **детальні задачі** для імплементації.

## Структура

```
work/
  README.md              ← цей файл (навігація)
  SPEC.md                ← специфікація + алгоритми + §13 стандарти TS
  TDD.md                 ← політика: тести ПЕРЕД кодом (success + failure)
  CODING_STANDARDS.md    ← Clean Code / Architecture / SOLID / DRY / KISS / GoF (TS)
  tech-debt/             ← зафіксований технічний борг
  tasks/                 ← детальні задачі для розробки
```

## Процес розробки (TDD)

**Обов’язково:** перед production-кодом — тести на **success** і **failure** кейси.  
Цикл: **Red → Green → Refactor**. Деталі: [TDD.md](./TDD.md).

**Стандарти TS-коду:** [CODING_STANDARDS.md](./CODING_STANDARDS.md) — Clean Code / Architecture / SOLID / DRY / KISS / GoF + **Matt Pocock (Total TypeScript)**; також SPEC §13.

## Статус проєкту (2026-08-20)

| Область | Статус |
|---------|--------|
| Rust WASM contour (magnetism) | ✅ реалізовано |
| SDK data + mappers + worker helpers | ✅ |
| SDK contour bridge | ✅ |
| Pixi renderer | ✅ T01 |
| Org matrix / row-tree | ✅ T03 |
| Staff 3-tier layout + edges | ✅ T08–T09 |
| Demo app (Rsbuild) | ✅ `packages/demo` — `npm run dev` |
| Export SVG/PNG/PDF | ✅ T05 |
| Interactions (D&D, search) | ✅ T04 v1 core |

## Запуск demo

```bash
npm install
npm run build:wasm   # якщо wasm pkg не зібраний
npm run dev          # http://localhost:3000
```

## Задачі (пріоритет)

1. [T01-pixi-renderer.md](./tasks/T01-pixi-renderer.md) — ✅
2. [T02-worker-contour-pipeline.md](./tasks/T02-worker-contour-pipeline.md) — ✅
3. [T03-org-matrix-row-tree.md](./tasks/T03-org-matrix-row-tree.md) — ✅
4. [T08-staff-3-tier-layout.md](./tasks/T08-staff-3-tier-layout.md) — ✅
5. [T09-staff-edges-demo.md](./tasks/T09-staff-edges-demo.md) — ✅ edges + Staff tree demo
6. [T04-interactions.md](./tasks/T04-interactions.md) — ✅ v1 core (search, reveal, drag, block shift)
7. [T10-react-context-menu.md](./tasks/T10-react-context-menu.md) — ✅ React context menu + node payload
8. [T05-export.md](./tasks/T05-export.md) — ✅ SVG / PNG / PDF / print
9. [T06-demo-app-rsbuild.md](./tasks/T06-demo-app-rsbuild.md) — ✅
10. [T07-contour-algorithm-gaps.md](./tasks/T07-contour-algorithm-gaps.md) — ✅ M4 / magnetRadius / config

## Технічний борг

- [TD01-git-remote-and-ci.md](./tech-debt/TD01-git-remote-and-ci.md) — CI ✅; remote ⏳
- [TD02-legacy-web-rspack.md](./tech-debt/TD02-legacy-web-rspack.md) — ✅
- [TD03-contour-config-drift.md](./tech-debt/TD03-contour-config-drift.md) — ✅ closed (T07)
- [TD04-sdk-skeleton-no-render.md](./tech-debt/TD04-sdk-skeleton-no-render.md) — ✅ closed (T01)
- [TD05-wasm-pkg-in-repo.md](./tech-debt/TD05-wasm-pkg-in-repo.md)
- [TD06-vitest-not-configured.md](./tech-debt/TD06-vitest-not-configured.md) — ✅
- [TD07-pixi-react-promote-overlay.md](./tech-debt/TD07-pixi-react-promote-overlay.md) — v1.x backlog

## CI

```bash
npm run test:rust
npm run build:wasm
npm run typecheck
npm test
```

GitHub Actions: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

## Джерела правди

| Документ | Призначення |
|----------|-------------|
| `docs/REQUIREMENTS.md` | Бізнес-вимоги, UI, magnetism rules |
| `docs/TECH_STACK.md` | Архітектура та стек |
| `work/SPEC.md` | Алгоритми, API, стан імплементації |
| `work/TDD.md` | TDD: тести перед кодом, success + failure |
| `packages/core/src/contour.rs` | Референс contour algorithm |
