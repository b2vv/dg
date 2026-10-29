claude-opus-4-8

# R7 scope — аналіз двох варіантів (Dg26, критик)

ДАЛІ: звіряю наявну структуру коду — що Rust продюсить і що wired у TS.
Читаю: staff_packing.rs, staff_bounds.rs, staff_routes.rs, types.rs (core),
layoutBridge.ts (sdk/wasm). Паралельно — греп `tier` по sdk+demo.

## ФАКТ 1 — Rust staff-геометрія присутня, але НЕ wired (жодного)
- `packages/core/src/lib.rs:38` — ЄДИНИЙ `#[wasm_bindgen(js_name=computeOrgRowTreeLayout)]` + `init` (`:71`).
- Усі staff-функції лише `pub use`, БЕЗ wasm_bindgen:
  - `enrich_namespaces, namespace_bounds` (`lib.rs:21`)
  - `compose_org_cards, compose_tiers, canvas_dimensions` (`lib.rs:22-25`)
  - `visual_org_edge_box, visual_person_edge_box` (`lib.rs:26-28`)
  - `pack_departments` (`lib.rs:29`), `staff_routes` (`lib.rs:30`).
- `layoutBridge.ts:30-31` викликає ЛИШЕ `wasm.computeOrgRowTreeLayout`. Жодного staff-мосту.
- ВИСНОВОК: producer (Rust) є + unit-tested, але ланцюг producer→bridge→consumer ОБІРВАНИЙ
  на межі WASM для ВСІХ staff-модулів, не лише department_frames. R7 — це крок, що вперше
  додає wasm_bindgen-обгортки + bridge + TS-споживача для staff-геометрії.
- `staff_packing.rs:15 department_frame`, `:48 DepartmentMembers`, `:61 StaffPackResult`,
  `:69 pack_departments`; `staff_bounds.rs:58 namespace_bounds`, `:135 enrich_namespaces`.

## ФАКТ 2 — TS-роутинг: ЄДИНИЙ шов, зі щойно-вкладеними kind-гілками
- `render/staffRouterV2.ts:53 resolveStaffRouting` — ЄДИНИЙ шов: live+SVG обидва сюди (R6-6,
  коментар :20-25). Отже РОУТИНГ уже одна правда в TS.
- Що треба портувати для В2 (у `staff_routes.rs`):
  - lead-org вертикальний плінк: `staffEdgeGeometry.ts:373-382` (щойно R6-7).
  - deptTop синтетична ціль: `buildStaffEdgeSegments` `:454-473`, `headFrame`/`endsOnDeptTop`
    (щойно R6-7b).
  - matrix/dotted preferHorizontal: `:330`, `:403 preferTop`.
  - ObstacleIndex (sorted+binary search): `:290-318 obstacleIndexFor/lowerBound` — просторовий
    індекс, що дає TS перф. Коментар `:332-343` МІРЯЄ: наївний filter = 855ms з 1.2s рендера,
    росло як n² (A10). Rust-роутер без еквівалента індексу → ризик A10 на 1M.
  - `edgeIntrudesForeignFrame` + markedCrossings (`staffRouterV2.ts:83-88`).
- `deptHeadById` мапа будується кожним caller'ом (`staffRouterV2.ts:34-37, 71`) — вхід роутера.
- В2 портує у Rust САМЕ той код, який R6-7/R6-7b щойно вклали в TS → дублювання свіжого коду.

## ДАЛІ: staff_routes.rs (kind-агностичність? індекс?), пост-проходи та їхні caller'и.

## ФАКТ 3 — цільовий контракт спроєктовано, але БЕЗ оркестратора й producer'а
- `types.rs:579 StaffGeometryResult` {nodes, orgCards, namespaces, departmentFrames, edges,
  routes:StaffRouteSet, width, height, diagnostics} + `:398 StaffLayoutInput`.
- Ці типи існують ЛИШЕ як def + ts-rs `export()` у тесті (`:616,:625`) → генерять
  `generated/rust-types.ts:69,75`. НЕМАЄ жодної fn, що СПОЖИВАЄ StaffLayoutInput чи ПРОДЮСИТЬ
  StaffGeometryResult (grep порожній). Оркестратора нема; wasm_bindgen-обгортки нема.
- `generated/rust-types.ts` уже має `namespaces` (не tiers) та `routes` у StaffGeometryResult
  (`:67` коментар «замінює StaffCanvasResult; tiers→namespaces»). Тобто ЦІЛЬОВИЙ контракт
  розрахований на ПОВНУ заміну (routes всередині єдиного виходу).
- `StaffNamespace` (`rust-types.ts:89`, `types.rs:498`) ВСЕ ОДНО має `tier: number` + `kind`;
  `StaffNodeGeo.tier:1|2|3` (`:95`). Отже tiers→namespaces — це перейменування ТИПУ/масиву
  (StaffTierBand→StaffNamespace, canvas.tiers→.namespaces), а числовий дискримінант `tier`
  ЛИШАЄТЬСЯ. Фільтри `n.tier===3` (`staffZoneBounds.ts:59,93`) НЕ змінюються.

## ФАКТ 4 — спільна база обох варіантів (НЕ розрізняє їх)
- Обидва мусять: написати Rust-оркестратор (packing+compose+bounds [+routes]) → StaffGeometryResult;
  wasm_bindgen-обгортку; метод у layoutBridge.ts; перепідключити геометрію-споживачів; зробити
  tiers→namespaces міграцію.
- Rust staff-геометрія-шматки готові+тестовані: `pack_departments`/`department_frame`
  (packing.rs), `compose_org_cards`/`compose_tiers` (compose.rs), `namespace_bounds`/
  `enrich_namespaces` (bounds.rs), edge-boxes (edge_box.rs).
- Геометрія-споживачі (rewire в ОБОХ): `OrgHierarchyDiagram.ts:787`, `staffLiveGeometry.ts:84`,
  `svgExport.ts:208`, `e2eBridge.ts:174` — усі звуть `layoutStaffCanvas`.
- tiers→namespaces ідентифікатор-блас: `StaffTierBand` + `.tiers` + `enrichStaffTierBands` у
  `staff/types.ts`, `canvasLayout.ts:271`, `StaffZonesView.ts:2,64`, `render/types.ts:279`,
  `staffLiveGeometry.ts:20,26,101`, `staffZoneBounds.ts:2,16,113-139`, `render/index.ts:151`,
  `svgExport.ts:24,225` (~9-11 файлів, збігається з plan §4).

## ФАКТ 5 — що РОЗРІЗНЯЄ варіанти: лише routing-порція
- Rust `staff_routes` (`:299`) kind-НЕ-гілкує в геометрії: `route_ortho`+`detour_edge` kind-агностичні;
  `kind` лише переноситься у вихід (`:368`); тест lead-org (`:554`) перевіряє тільки resolve+kind-string,
  точки = route_ortho (`[50,50]→[280,300]`), БЕЗ вертикального-drop префа.
- Відсутнє в Rust (є в TS): lead-org drop (`staffEdgeGeometry.ts:373-382`), deptTop синтет-порт
  (`:454-473`), preferHorizontal matrix/dotted (`:330,:403`).
- ПЕРФ/A10: Rust `obstacles_for_edge` (`:191-213`) O(cards) на ребро + `route_clear_of` (`:217-226`)
  лінійний по ВСІХ obstacles — БЕЗ просторового індексу. Це саме та n², яку TS `obstacleIndexFor`
  (`staffEdgeGeometry.ts:290-318`) прибрав (виміряно 855ms з 1.2s, коментар `:332-343`). У В1 роутинг
  лишається TS → індекс лишається, A10 не чіпається. У В2 Rust-роутер стає шляхом → мусить додати
  індекс або регресує на 1M.
- В2 портує у Rust САМЕ код R6-7/R6-7b (щойно вкладений у TS) → дублювання + ризик регресу lead-org/deptTop.

## РІШЕННЯ: фінал готую через SubagentHandback (не обираю варіант — ґрунт власнику).
