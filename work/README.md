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
20. [T20-staff-expand-inplace.md](./tasks/T20-staff-expand-inplace.md) — ✅ tier-3 expand-in-place
21. [T21-chunked-mapper-facade.md](./tasks/T21-chunked-mapper-facade.md) — ✅ pooled array mapper facade
22. [T22-demo-pooled-mapper.md](./tasks/T22-demo-pooled-mapper.md) — ✅ demo uses pooled mapper facade
23. [T23-node-media-textures.md](./tasks/T23-node-media-textures.md) — ✅ person photo + org symbol sprites
24. [T24-layout-diagnostics.md](./tasks/T24-layout-diagnostics.md) — ✅ layout diagnostics API
25. [T25-demo-github-pages.md](./tasks/T25-demo-github-pages.md) — ✅ Pages workflow (needs public repo / paid)
26. [T26-promote-overlay.md](./tasks/T26-promote-overlay.md) — ✅ React promote overlay (TD07)
27. [T27-pages-css-mobile-fix.md](./tasks/T27-pages-css-mobile-fix.md) — ✅ Pages CSS + mobile canvas height
28. [T28-dark-theme-pixi.md](./tasks/T28-dark-theme-pixi.md) — ✅ dark Pixi palette + canvas bg
29. [T29-visual-polish.md](./tasks/T29-visual-polish.md) — ✅ cards-in-cells + demo layout polish
30. [T30-ux-edges-contour-zoom.md](./tasks/T30-ux-edges-contour-zoom.md) — ✅ edges, contour padding, pinch/zoom UI
31. [T31-regression-zoom-100k.md](./tasks/T31-regression-zoom-100k.md) — ✅ regression tests, zoom FAB, 100k window
32. [T32-card-in-cell-tighten.md](./tasks/T32-card-in-cell-tighten.md) — ✅ option A card≈cell geometry
33. [T33-demo-live-audit-plan.md](./tasks/T33-demo-live-audit-plan.md) — 📋 live demo audit: проблеми + план фіксів (P0→P2)
34. [T34-p0-contour-staff-flat-edges.md](./tasks/T34-p0-contour-staff-flat-edges.md) — ✅ P0: IT C-contour, staff cross-tier, flat edge avoid
35. [T35-polish-zoom-chrome.md](./tasks/T35-polish-zoom-chrome.md) — ✅ P1: padding/smooth defaults, Hi-DPI, demo chrome
36. [T36-card-chrome-polish.md](./tasks/T36-card-chrome-polish.md) — ✅ P2: initials, contrast, hover, Variant B caption
37. [T37-variant-b-edge-gaps.md](./tasks/T37-variant-b-edge-gaps.md) — ✅ Variant B corridor gaps for readable report edges
38. [T38-contour-stroke-clearance.md](./tasks/T38-contour-stroke-clearance.md) — ✅ Chaikin contour clear of cards + round stroke joins
39. [T39-tree-arrows-quiet-contour.md](./tasks/T39-tree-arrows-quiet-contour.md) — ✅ admin arrows + quieter dept fill; Smooth default 1
40. [T40-g7-stroke-punchout.md](./tasks/T40-g7-stroke-punchout.md) — ✅ pad0 + own-AABB px clearance; contour stroke above cards
41. [T41-contour-corner-fillet.md](./tasks/T41-contour-corner-fillet.md) — ✅ convex contour corners filleted to card radius
42. [T42-svg-contour-parity.md](./tasks/T42-svg-contour-parity.md) — ✅ SVG export matches live fillet/nudge/stroke/arrows
43. [T43-rust-g7-peel.md](./tasks/T43-rust-g7-peel.md) — ✅ Rust G7 Manhattan peel of vacant tongues; pad=1 safe
44. [T44-magnetism-edges-zoom-analysis.md](./tasks/T44-magnetism-edges-zoom-analysis.md) — 📋 magnetism sketch vs LOD edge ports / zoom
45. [T45-lod-edge-ports.md](./tasks/T45-lod-edge-ports.md) — ✅ LOD-aware edge AABBs (mid/far ports on visual chrome)
46. [T46-notch-singleton-contour.md](./tasks/T46-notch-singleton-contour.md) — ✅ hide singleton CEO wash so IT notch stays empty
47. [T47-magnet-radius-canonical.md](./tasks/T47-magnet-radius-canonical.md) — ⚠️ radius 2 still forced C; superseded by T49
48. [T48-100k-tree-matrix.md](./tasks/T48-100k-tree-matrix.md) — ✅ 100k row-tree by default; matrix when all collapsed
49. [T49-adjacency-magnetism.md](./tasks/T49-adjacency-magnetism.md) — ✅ magnetRadius 1.5: top row + two bottom blobs
50. [T50-chebyshev-pad-rect.md](./tasks/T50-chebyshev-pad-rect.md) — ✅ Chebyshev pad: adjacent row → rectangle, not hat
51. [T51-zoom-mid-button-group.md](./tasks/T51-zoom-mid-button-group.md) — ✅ mid LOD center + button-group contour polish
52. [T52-node-chrome-context-menu.md](./tasks/T52-node-chrome-context-menu.md) — ✅ ⋮ menu + expand chrome on cards
53. [T53-flat-orgs-root-viewport.md](./tasks/T53-flat-orgs-root-viewport.md) — ✅ root click viewport; 100k focus without reload
54. [T54-e2e-playwright.md](./tasks/T54-e2e-playwright.md) — ✅ Playwright smoke for demo tabs
55. [T55-node-testid-anchors.md](./tasks/T55-node-testid-anchors.md) — ✅ testId + DOM anchors for e2e/search/focus
56. [T56-gojs-feature-inventory.md](./tasks/T56-gojs-feature-inventory.md) — 📋 GoJS catalog + checkbox selection (§16)
57. [T61-group-recursion-tier3.md](./tasks/T61-group-recursion-tier3.md) — 📋 B8c рекурсія груп орг (макет Figma — пізніше)
58. [T63-spine-bus-edges.md](./tasks/T63-spine-bus-edges.md) — ✅ B3 spine/шина org-matrix
59. [T64-named-display-zones-paint.md](./tasks/T64-named-display-zones-paint.md) — ✅ **P0** B8 іменовані зони (paint)
60. [T65-multi-root-forest.md](./tasks/T65-multi-root-forest.md) — ✅ B9 detached side-column
61. [T66-position-expand-depth.md](./tasks/T66-position-expand-depth.md) — ✅ **P0** C2/C3 expand посади + depth
62. [T67-multi-select.md](./tasks/T67-multi-select.md) — ✅ D2 Phase 1 (marquee — Phase 2 optional)
63. [T68-org-period-display.md](./tasks/T68-org-period-display.md) — ✅ D4* період на організації
64. [T69-node-double-click.md](./tasks/T69-node-double-click.md) — ✅ D5 dblclick → sidebar
65. [T70-position-card-chrome.md](./tasks/T70-position-card-chrome.md) — ✅ E* chrome посад + org symbol contain
66. [T71-gojs-to-dg-migration-plan.md](./tasks/T71-gojs-to-dg-migration-plan.md) — ✅ **план міграції GoJS→dg** (cutover queue complete)
67. [PARITY-gojs-to-dg.md](./tasks/PARITY-gojs-to-dg.md) — ✅ parity ред. 2.2 (вимога→можливість)
68. [T72-types-algorithms-agreement.md](./tasks/T72-types-algorithms-agreement.md) — ✅ узгоджені типи + алгоритми P0 (+ fitContain)
69. [T74-node-media-lifecycle.md](./tasks/T74-node-media-lifecycle.md) — ✅ media lifecycle M0–M6
70. [T75-rebuild-vs-repaint.md](./tasks/T75-rebuild-vs-repaint.md) — ✅ D1–D3 (selection repaint; LOD/theme rebuild by design)
71. [T76-diagram-facade-stores.md](./tasks/T76-diagram-facade-stores.md) — ✅ D4 stores
72. [REVIEW-dg-pr56-media-and-abstraction.md](./tasks/REVIEW-dg-pr56-media-and-abstraction.md) — ✅ D6 remediated
73. [REVIEW-t74-t76-pocock-gof.md](./tasks/REVIEW-t74-t76-pocock-gof.md) — ✅ Pocock + GoF pass

## Технічний борг

- [REVIEW-dg-805efee-architecture.md](./tech-debt/REVIEW-dg-805efee-architecture.md) — ✅ D1–D7 closed
- [D5-orphan-position-layout.md](./tech-debt/D5-orphan-position-layout.md) — ✅ documented (not a bug)
- [TD01-git-remote-and-ci.md](./tech-debt/TD01-git-remote-and-ci.md) — ✅ closed (`b2vv/dg`)
- [TD02-legacy-web-rspack.md](./tech-debt/TD02-legacy-web-rspack.md) — ✅
- [TD03-contour-config-drift.md](./tech-debt/TD03-contour-config-drift.md) — ✅ closed (T07)
- [TD04-sdk-skeleton-no-render.md](./tech-debt/TD04-sdk-skeleton-no-render.md) — ✅ closed (T01)
- [TD05-wasm-pkg-in-repo.md](./tech-debt/TD05-wasm-pkg-in-repo.md)
- [TD06-vitest-not-configured.md](./tech-debt/TD06-vitest-not-configured.md) — ✅
- [TD07-pixi-react-promote-overlay.md](./tech-debt/TD07-pixi-react-promote-overlay.md) — ✅ first slice (T26)

## CI

```bash
npm run test:rust
npm run build:wasm
npm run typecheck
npm test
npm run test:e2e   # Playwright (needs build:demo via webServer)
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
