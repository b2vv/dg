# R7 A4.1 — Review адаптера buildStaffLayoutInput (dg28, fresh context)

claude-opus-4-8

ДАЛІ: прочитати код адаптера, тести, контракт критика, rust-types, DEFAULT_STAFF_LAYOUT_OPTIONS, data/types.ts, coords.ts. Потім оцінити C1–C7.

## ФАКТ — прочитано
- adapter `buildStaffLayoutInput.ts` 1-107; test 1-153; critic dg28 (мапінг-таблиця §70-78, B1/B2 §85-86); rust-types.ts (StaffLayoutInput:98-102, StaffLayoutMetrics:109 — 13 полів, StaffPositionInput:152-158 з optional order, StaffDepartmentInput:38-44, StaffOrgInput:147, StaffEdgeInput:70, StaffNodeSize:136, StaffDockHintInput:60); DEFAULT_STAFF_LAYOUT_OPTIONS (types.ts:60-85); data/types.ts (DiagramPosition:116-173 — БЕЗ order, DiagramDepartment order:100, DiagramOrganization parentOrgId:54, DiagramReportLine kind:178); coords.ts positionSize:38-43; lod.ts LodLevel:2.

## C1 — мапінг полів ✅
- currentOrgId ← арг (buildStaffLayoutInput.ts:90) ✓
- positions ← {id, organizationId, isHead:p.isHead===true, departmentId} (:91-96) ✓ імена реальні (data/types.ts:119-126)
- reports ← reportLines {fromId,toId,kind} дослівно (:97), kind-union 'admin'|'matrix'|'dotted' (data/types.ts:178), lead-org НЕ синтезується ✓ (N2)
- organizations ← {id, parentOrgId} (:98) ← DiagramOrganization.parentOrgId:54 ✓
- departments ← {id, order:d.order} (:99) ← DiagramDepartment.order:100, ВСІ нефільтровані ✓
- nodeSizes/options/dockHints/expandedOrgIds/lod — див. C3/C4. expandedOrgIds spread у mutable (:103) ✓

## C2 — B2 order НЕ емітиться ✅
- DiagramPosition без поля order (data/types.ts:116-173 — підтверджено). Адаптер map не кладе order (:91-96). StaffPositionInput.order опціональне (rust-types:158), None⟺0 паритет.
- Тест доводить: `'order' in input.positions[0/1]` toBe(false) (test:94-95) — ловить емісію `order:undefined` (key present). ✓ дискримінує.

## C3 — B1 contentPadding з арг; 13 полів ✅
- resolveMetrics(options, contentPadding) (:50); contentPadding ← арг (:64), НЕ з options. StaffLayoutOptions не має поля contentPadding (types.ts:12-58) — джерела в options нема, тож арг обов'язковий.
- 13 полів резолву (:53-65) == StaffLayoutMetrics (rust-types:109): nodeWidth, nodeHeight, refCellWidth, refCellHeight, horizontalGap, verticalGap, margin, tierGap, orgCardWidth, orgCardHeight, zoneLabelBand, contentPadding, deptGrouping. Рівно 13, без зайвих StaffLayoutOptions-полів (staffCoordMode/collapse*/maxExpanded* НЕ протікають). ✓

## C4 — nodeSizes парність ✅
- deriveNodeSizes (:69-82): `if (p.width===undefined && p.height===undefined) continue` — оминає лише БЕЗ-обох; пушить {width:p.width??metrics.nodeWidth, height:p.height??metrics.nodeHeight}.
- Дзеркалить positionSize (coords.ts:38-43 p.width??geom.nodeWidth). Фолбек на резолвнуту метрику (:77-78) — N4 derive-only-explicit. Оминута без-розмірна позиція → Rust фолбек на metrics.nodeWidth/Height == той самий результат, що TS positionSize. Off-by немає. ✓

## C5 — тести дискримінують ✅ (прогнано: 5/5 pass)
- order-emit → `'order' in` (test:94-95) ✓
- isHead без коерсу → p2 очікує isHead:false (test:87-92); actual {isHead:undefined} ≠ {isHead:false} у toEqual → fail ✓
- contentPadding з options → очікує 16 з арг (test:111-134); читання з options дало б undefined ✓
- nodeSize для без-розмірної → nodeSizes toEqual [{id:'h'}] лише (test:108); p2 включення зламало б ✓

## C6 — golden-нейтральність ✅
- grep по packages/sdk/src — ЖОДНОГО імпортера buildStaffLayoutInput поза власними файлами. DiagramRenderer/staffLiveGeometry/svgExport НЕ імпортують. Не в barrel (index.ts). computeStaffGeometryWasm теж без консюмерів. Ланцюг render/export незмінний → golden не зрушить.

## C7 — шар ✅
- Файл у render/; імпортує з layout/staff/types, data/types, wasm/layoutBridge — render→(layout/data/wasm) вниз, НЕ інверсія (layout→render відсутня).
- LodLevel ← render/lod (lod.ts:2) — коректно, той самий шар.

## Гейти
- `npx rstest run buildStaffLayoutInput`: 5/5 pass.
- `npm run typecheck` (корінь): чисто (sdk + demo + e2e).

## ВЕРДИКТ: 🟢
Мапінг повний і відповідає контракту критика + реальним полям DiagramData. B1 (contentPadding з арг) і B2 (order омінається) виконані. Тести дискримінують усі 4 названі хибнозелені сценарії. Golden-нейтральність збережена (нуль імпортерів). Шар коректний. Блокерів немає.
