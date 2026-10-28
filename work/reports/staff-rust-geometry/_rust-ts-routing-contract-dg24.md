# Rust↔TS routing — міні-контракт мапінгу (підготовка R7)

> Dg24, після R6-5/R6-6. Мета: зафіксувати відповідність виходів **Rust-роутера**
> (`packages/core/src/staff_routes.rs`) і **TS-seam** (`render/staffRouterV2.ts`), щоб
> R7-wiring був механічним ТАМ, ДЕ МОЖЛИВО, і щоб видно було, де він механічним **не** буде.

## 🔴 Головне застереження (з архогляду `_r6-arch-review-dg24.md`)
R7 — це **поведінкова ЗАМІНА алгоритму, не механічне злиття**. Це ДВА РІЗНІ роутери:
- **Rust** (`staff_routes.rs`) — НОВА модель власника: джерело = низ картки, ціль = верх,
  Y-detour (per-ребро, локальний), §12-маркер залишку.
- **TS прод** (`layout/staffEdgeGeometry.ts:314 classifyStaffEdgeRoute`) — СТАРА багата модель:
  side-порти, around-left/top, cross-tier-drop, kind-preference (matrix/dotted гілкуються).
Вигляд лінків на R7 ЗМІНИТЬСЯ (закладено: R6=«повні маршрути», H4 поведінкова, R0-golden точки не стереже).
Отже контракт нижче — про **формат даних**, а не про еквівалентність поведінки.

## Відповідність структур (формат — дешево в адаптері)
| Rust (`types.rs`) | TS (`staffEdgeGeometry.ts`) | Міст R7 |
|---|---|---|
| `StaffRouteSet { lod: String, segments }` | (немає обгортки; seam віддає `routedSegments[]` + `markedCrossings[]`) | адаптер: розпакувати `segments`, lod уже відомий виклику |
| `StaffEdgeRoute { from_id, to_id, kind: String, points: Vec<{x,y}>, marked: Option<bool> }` | `StaffEdgeSegment { fromId, toId, kind, x1,y1,x2,y2, points }` | `from_id→fromId`; `points` 1:1; **`x1..y2` вивести** з `points[0]`/`points[last]`; `kind: String→union` (валідувати) |
| `marked: Option<bool>` (на РЕБРО) | `markedCrossings: Array<{fromId,toId}>` (список) | зібрати ребра з `marked==Some(true)` → список; семантика та сама (§12 = foreign-frame intrusion) |

## Справжня робота R7 (НЕ механічна)
1. **Заміна алгоритму** (а) — TS `classifyStaffEdgeRoute` → Rust `staff_routes`. Поведінкова; H4 стереже «0 перетинів/§12-маркер», не збіг зі старим виглядом.
2. **Per-part рамки** (б) — Rust `FrameRect { department_id, part_index, x,y,w,h }` (per-part, A)
   проти TS `StaffEdgeFrame { deptId, rect, memberIds }` (whole-dept). `department_frames` ще **НЕ wired**
   у WASM-вихід — producer `StaffDepartmentFrameGeo` staged (борг R7, handoff п.5).
3. **Членство** (в) — Rust `member_of: id→(department_id, part_index)` проти TS `memberIds: Set` на рамку.
   Звести до одного джерела при wiring.
4. **lod** — TS `LodLevel` ('near'|'mid'|'far') ↔ Rust `lod: String`; валідувати на межі (unknown→far, як `staff_edge_box`).

## Латентні другі правди роутингу (прибрати/злити на R7)
- `render/StaffEdgesView.ts` — **ВЖЕ прибрано** fallback `buildStaffEdgeSegments` (Dg24, Топ-1): view = чистий маляр.
- `layout/matrixLayout.ts:125`, `render/contour/spineBusEdges.ts:187` — вживають `staffEdgePolyline` для
  **ORG-tier** (інший домен, не staff-картки) → R7 **НЕ** може видалити `staffEdgeGeometry` цілком.

## Перф (вимір R10, не зараз)
Rust-роутер без просторового індексу; TS мав n²→855ms і отримав `ObstacleIndex`. Ризик A10 (≤2-3с) на 1M —
якщо R10 покаже гаряче, додати індекс у Rust (модульно, не Singleton).

## Рішення власника перед R7 (контракт вигляду, не агента)
**matrix/dotted ребра:** лишити side-порти/власний маршрут (стара TS-модель, M6 design-v3) чи звести до
bottom→top (нова Rust-модель)? Rust зараз НЕ розгалужується за kind; TS — так. Визначає вигляд пунктирних ліній.
