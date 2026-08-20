# TD04 — SDK skeleton без render pipeline

**Пріоритет:** високий (блокує demo)  
**Статус:** відкрито  
**Дата:** 2026-08-20

## Опис

`OrgHierarchyDiagram` у `packages/sdk/src/index.ts` — **skeleton**:

- Приймає `data` + `mappers`, зберігає `DiagramData`
- `create(container, config)` **не монтує** нічого в DOM/canvas
- `destroy()` — порожній stub
- Немає Pixi Application, viewport, hit testing

## Наслідки

- Host не може побачити діаграму після `create()`
- Contour WASM працює ізольовано, але не відображається
- Немає event loop для interactions (T04)

## Залежності

- Блокується задачею T01 (Pixi renderer)
- Потребує рішення по theme (CSS vars vs prop)

## Рекомендовані дії

1. T01 — реалізувати Pixi layer
2. Підключити `computeAllContours` при staff layout change
3. `destroy()` — teardown Pixi app, workers, listeners

## Критерії закриття

- [ ] `create()` рендерить viewport у container
- [ ] `getData()` + render sync
- [ ] `destroy()` звільняє ресурси
