# T82 — Рефакторинг: розбивка коду по модулях і сервісах

**Пріоритет:** P1 · **Статус:** ✅ done (2026-08-25)
**Обсяг:** `packages/sdk/src`, `packages/demo/src` · без змін публічного API

---

## Навіщо

Чотири файли тримали більшість логіки:

| Файл | Було | Стало |
|------|------|-------|
| `sdk/src/index.ts` | 1683 | 277 (барель) + `OrgHierarchyDiagram.ts` 1125 |
| `sdk/src/render/DiagramRenderer.ts` | 1541 | 1157 |
| `demo/src/app/App.ts` | 1144 | 760 |
| `demo/src/scenarios/mockupFigma.ts` | 953 | 36 (барель) + 5 модулів |

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
- `renderStaff` розбито на `renderStaffCanvas` / `renderPositionGrid` + `paintStaffZones`,
  `paintStaffDepartments`, `paintStaffFrameAndEdges`, `addStaffPersonCards`, `addStaffOrgCards`.

**Demo:**
- `app/tabs.ts` (union + `TAB_META`), `app/tabConfigs.ts` (`buildTabConfig`), `app/captions.ts`.
- `scenarios/mockupSymbols|mockupLayouts|mockupOrgs|mockupStaff|mockupStyles.ts`,
  `mockupFigma.ts` лишається барелем.

**Шари:**
- `render/contour/` — 35 модулів фарбування контурів (окремо від `src/contour/`, який є
  WASM/worker-мостом без Pixi).
- Виправлено три залежності «назовні»: `contour/magnetRadius.ts`, `layout/staffEdgeGeometry.ts`,
  `media/nodeMedia.ts` переїхали в шар, який ними володіє.

## Чого рефакторинг **не** робив

- Публічний API не змінювався — ті самі експорти, ті самі типи.
- Візуальні бейзлайни не перегенеровані (Linux-only, [відкладено](./MOCKUP-styles-review.md)),
  тому єдина свідома візуальна зміна — фаза пунктиру на кутах вакантної картки.
- `PersonNode.ts` (≈960) лишився цілим: його layout-методи мутують ~15 приватних
  display-обʼєктів, і виносити їх без скріншотної перевірки — ризик без вигоди.

## Acceptance

- [x] Жоден файл рівня «god object» не лишився в `sdk/src` поза `PersonNode`/`DiagramRenderer`.
- [x] Кожен винесений модуль має тест на success **і** failure
      (`mergeData`, `nodeRefs`, `SearchIndexService`, `ContextMenuController`, `SceneRegistry`,
      `dashedStroke`, `tabConfigs`).
- [x] `npm run typecheck`, 629 sdk + 61 demo unit, 35 e2e — зелені після кожного кроку.
- [x] Публічний API незмінний (барель `index.ts` + `render/index.ts`).
