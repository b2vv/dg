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
| Rust WASM contour (magnetism) | ✅ реалізовано, 4 тести |
| SDK data + mappers + worker helpers | ✅ частково |
| SDK contour bridge | ✅ реалізовано |
| Pixi renderer | ❌ не розпочато |
| Org matrix / row-tree | ❌ WASM layout є, SDK інтеграції немає |
| Demo app (Rsbuild) | ✅ `packages/demo` — `npm run dev` |
| Export SVG/PNG/PDF | ❌ не розпочато |

## Запуск demo

```bash
npm install
npm run build:wasm   # якщо wasm pkg не зібраний
npm run dev          # http://localhost:3000
```

| Гілка | Зміст |
|-------|-------|
| `cursor/data-mappers-worker-foundation-babc` | DiagramData, mappers, WorkerPool |
| `cursor/wasm-contour-magnetism-babc` | contour.rs, WASM export, SDK bridge |

## Задачі (пріоритет)

1. [T01-pixi-renderer.md](./tasks/T01-pixi-renderer.md) — Pixi: OrganizationNode, PersonNode, DepartmentBlob
2. [T02-worker-contour-pipeline.md](./tasks/T02-worker-contour-pipeline.md) — contour + layout у Web Worker
3. [T03-org-matrix-row-tree.md](./tasks/T03-org-matrix-row-tree.md) — режими org matrix / row-tree
4. [T04-interactions.md](./tasks/T04-interactions.md) — D&D, search, context menu, block shift
5. [T05-export.md](./tasks/T05-export.md) — SVG, PNG, PDF, print
6. [T06-demo-app-rsbuild.md](./tasks/T06-demo-app-rsbuild.md) — demo на Rsbuild
7. [T07-contour-algorithm-gaps.md](./tasks/T07-contour-algorithm-gaps.md) — M4, magnetRadius, G6 явно

## Технічний борг

- [TD01-git-remote-and-ci.md](./tech-debt/TD01-git-remote-and-ci.md)
- [TD02-legacy-web-rspack.md](./tech-debt/TD02-legacy-web-rspack.md)
- [TD03-contour-config-drift.md](./tech-debt/TD03-contour-config-drift.md)
- [TD04-sdk-skeleton-no-render.md](./tech-debt/TD04-sdk-skeleton-no-render.md)
- [TD05-wasm-pkg-in-repo.md](./tech-debt/TD05-wasm-pkg-in-repo.md)
- [TD06-vitest-not-configured.md](./tech-debt/TD06-vitest-not-configured.md)
- [TD07-pixi-react-promote-overlay.md](./tech-debt/TD07-pixi-react-promote-overlay.md) — v1.x backlog

## Джерела правди

| Документ | Призначення |
|----------|-------------|
| `docs/REQUIREMENTS.md` | Бізнес-вимоги, UI, magnetism rules |
| `docs/TECH_STACK.md` | Архітектура та стек |
| `work/SPEC.md` | Алгоритми, API, стан імплементації |
| `work/TDD.md` | TDD: тести перед кодом, success + failure |
| `packages/core/src/contour.rs` | Референс contour algorithm |
