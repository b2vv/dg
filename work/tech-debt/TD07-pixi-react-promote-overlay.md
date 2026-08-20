# TD06 — Pixi + HTML/React promote overlay (v1.x)

**Пріоритет:** низький (після v1)  
**Статус:** backlog  
**Дата:** 2026-08-20

## Опис

Після стабільної **v1** (Pixi-only ноди) розглянути покращення:

- Pixi лишається підкладкою (pan/zoom, LOD, edges, contours, маса нод);
- при near-zoom / selection — **promote** нод у HTML/React/SVG overlay;
- можливість кріпити custom React, img, SVG, вкладений Chart.js у картку;
- один camera transform з Pixi viewport.

## Чому не в v1

- Достатньо Pixi для org/staff карток, кліків, D&D;
- Overlay = друга підсистема (sync coords, hit-test, export);
- Немає жорсткої вимоги host на React-ноди зараз.

## Acceptance (коли брати в роботу)

- [ ] v1 прийнята (org + staff vertical slice + export)
- [ ] Є конкретний host use-case на custom React/Chart у ноді
- [ ] SPEC §5.1 v1.x + TDD success/failure на promote/demote і sync pan/zoom
- [ ] Export стратегія для overlay (rasterize або паралельний SVG path)

## Референс

- `work/SPEC.md` §5.1, §11 фаза 5
