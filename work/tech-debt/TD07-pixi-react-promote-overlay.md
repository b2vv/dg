# TD07 — Pixi + HTML/React promote overlay (v1.x)

**Пріоритет:** низький (після v1)  
**Статус:** done (first slice — T26)  
**Дата:** 2026-08-20

## Опис

Після стабільної **v1** (Pixi-only ноди) розглянути покращення:

- Pixi лишається підкладкою (pan/zoom, LOD, edges, contours, маса нод);
- при near-zoom / selection — **promote** нод у HTML/React/SVG overlay;
- можливість кріпити custom React, img, SVG, вкладений Chart.js у картку;
- один camera transform з Pixi viewport.

## Acceptance

- [x] v1 прийнята (org + staff vertical slice + export)
- [x] Host use-case: custom React slot in promote card (demo placeholder for Chart.js)
- [x] SPEC §5.1 + TDD success/failure на promote/demote і sync pan/zoom (T26)
- [x] Export стратегія: interactive-only (Pixi export; HTML not rasterized)

## Delivered

See [T26-promote-overlay.md](../tasks/T26-promote-overlay.md).

## Референс

- `work/SPEC.md` §5.1, §11 фаза 5
