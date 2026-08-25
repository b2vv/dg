# T82 — Рефакторинг: розбивка коду по модулях і сервісах

**Пріоритет:** P1 · **Статус:** ✅ done (2026-08-25)
**Обсяг:** `packages/sdk/src`, `packages/demo/src` · без змін публічного API

---

## Навіщо

Чотири файли тримали більшість логіки:

| Файл | Було | Стало |
|------|------|-------|
| `sdk/src/index.ts` | 1683 | 277 (барель) + `OrgHierarchyDiagram.ts` 1125 |
| `sdk/src/render/DiagramRenderer.ts` | 1541 | 1006 |
| `demo/src/app/App.ts` | 1144 | 760 |
| `demo/src/scenarios/mockupFigma.ts` | 953 | 36 (барель) + 5 модулів |
| `sdk/src/render/PersonNode.ts` | 953 | 656 + `personCardContent.ts` 359 |

`index.ts` одночасно був публічним барелем, фасадом і купою data-хелперів —
не було видно, що саме експортує пакет. `DiagramRenderer` тримав чотири різні
роботи. `App.buildConfig` був switch на 280 рядків. `mockupFigma` змішував
токени теми, layout-константи й дані сцен.

## Що винесено

**SDK — сервіси:**
- `data/mergeData.ts` — merge/dedupe для `appendData` (за `id`, для ребер — за `from/to/kind`).
- `interaction/SearchIndexService.ts` — індекс пошуку: sync build, worker build, merge чанка.
- `interaction/ContextMenuController.ts` — побудова запиту меню й диспетч дії; залежить від
  інтерфейсу `commands`, а не від діаграми.
- `interaction/nodeRefs.ts` + `interaction/nodeKey.ts` — data → `NodeRef` і typed-ключі.
- `render/SceneRegistry.ts` — бокси, view, media-URL, promote-набір останнього рендеру.
- `render/ContourPainter.ts` — сесія контурів, вибір рушія, morph під час drag.
- `render/LayerManager.ts`, `render/dashedStroke.ts` (одна реалізація пунктиру замість двох).
- `render/personInteractions.ts` — клік / double-tap / контекстне меню / drag картки посади
  разом зі станом драга (renderer більше не тримає pointer-сесію).
- `render/personCardContent.ts` — чотири варіанти розкладки тексту в картці + period-chip;
  пишуть у явний `PersonCardParts`, а не в приватні поля view.
- `renderStaff` розбито на `renderStaffCanvas` / `renderPositionGrid` + `paintStaffZones`,
  `paintStaffDepartments`, `paintStaffFrameAndEdges`, `addStaffPersonCards`, `addStaffOrgCards`.

**Demo:**
- `app/tabs.ts` (union + `TAB_META`), `app/tabConfigs.ts` (`buildTabConfig`), `app/captions.ts`.
- `scenarios/mockupSymbols|mockupLayouts|mockupOrgs|mockupStaff|mockupStyles.ts`,
  `mockupFigma.ts` лишається барелем.

**Шари й чиста логіка:**
- `layout/matrixGrid.ts` — `occupantAtCell` і `applyMatrixPlacement` (повертає ще й `ejectedOrgId`,
  щоб не робити другий прохід `assignMatrixCells` заради патча).
- `layout/staff/positionExpand.ts` — `victimsForExpand`: ліміт `maxExpandedPositions` як чиста функція.

- `render/contour/` — 35 модулів фарбування контурів (окремо від `src/contour/`, який є
  WASM/worker-мостом без Pixi).
- Виправлено три залежності «назовні»: `contour/magnetRadius.ts`, `layout/staffEdgeGeometry.ts`,
  `media/nodeMedia.ts` переїхали в шар, який ними володіє.

## Чого рефакторинг **не** робив

- Публічний API не змінювався — ті самі експорти, ті самі типи (перевірено звіркою набору
  експортів `index.ts` до і після; `render/index.ts` теж без приросту).
- Візуальні бейзлайни не перегенеровані (Linux-only, [відкладено](./MOCKUP-styles-review.md)),
  тому єдина свідома візуальна зміна — фаза пунктиру на кутах вакантної картки.
- Геометрія карток не змінювалась: `personCardContent.ts` — дослівний перенос, і його
  тести фіксують саме поведінку, яка раніше перевірялась лише повним рендером.
- `PersonNodeView` лишається класом Pixi (656) — малювання картки, chrome і медіа
  зав'язані на життєвий цикл view, виносити їх нема куди.

## Acceptance

- [x] Немає файлів-«god object»: найбільші — фасад `OrgHierarchyDiagram` (1102, широкий
      публічний API з тонкими методами) і `DiagramRenderer` (928, тільки збірка сцен).
- [x] Кожен винесений модуль має тест на success **і** failure
      (`mergeData`, `nodeRefs`, `SearchIndexService`, `ContextMenuController`, `SceneRegistry`,
      `dashedStroke`, `tabConfigs`, `personCardContent`, `ContourPainter`, `personInteractions`,
      `orgCardInteractions`, `applyMatrixPlacement`, `victimsForExpand`).
- [x] `npm run typecheck`, 662 sdk + 61 demo unit, 35 e2e (без скріншотних специфікацій — усього їх 41) — зелені після кожного кроку.
- [x] Публічний API незмінний (барель `index.ts` + `render/index.ts`).
