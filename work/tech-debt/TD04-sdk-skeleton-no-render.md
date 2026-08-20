# TD04 — SDK skeleton без render pipeline

**Пріоритет:** високий (блокує demo)  
**Статус:** closed (T01 + T04)  
**Дата:** 2026-08-20

## Опис

Раніше `OrgHierarchyDiagram` був skeleton без Pixi mount.

## Закриття

Після T01 / T02 / T04:

- [x] `create()` монтує Pixi canvas у container
- [x] Contours + staff/org render sync з `getData()`
- [x] `destroy()` teardown Pixi, workers
- [x] Interactions: click, drag, search, context menu hook

Залишок v1.x: [TD07](./TD07-pixi-react-promote-overlay.md) promote overlay.
