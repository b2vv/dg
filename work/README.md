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
| Pixi renderer | ✅ T01 (+ pan/zoom + LOD) |
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
11. [T11-ci-hygiene.md](./tasks/T11-ci-hygiene.md) — ✅ CI + debt hygiene
12. [T12-setdata-readme.md](./tasks/T12-setdata-readme.md) — ✅ `setData` + root README
13. [T13-lod-viewport.md](./tasks/T13-lod-viewport.md) — ✅ LOD far/mid/near by zoom
14. [T14-contour-g6.md](./tasks/T14-contour-g6.md) — ✅ G6 no far-side wall
15. [T15-fitview-context.md](./tasks/T15-fitview-context.md) — ✅ fitView + CONTEXT.md
16. [T16-incremental-contours-search.md](./tasks/T16-incremental-contours-search.md) — ✅ incremental contours + search scale
17. [T17-g8-contour-morph.md](./tasks/T17-g8-contour-morph.md) — ✅ G8 contour morph during drag
18. [T18-worker-search-index.md](./tasks/T18-worker-search-index.md) — ✅ worker/pool search index
19. [T19-camera-tween.md](./tasks/T19-camera-tween.md) — ✅ animated fitView / resetView / panTo
20. [T21-chunked-mapper-facade.md](./tasks/T21-chunked-mapper-facade.md) — ✅ pooled array mapper facade

## Технічний борг

- [TD01-git-remote-and-ci.md](./tech-debt/TD01-git-remote-and-ci.md) — ✅ closed (`b2vv/dg`)
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
