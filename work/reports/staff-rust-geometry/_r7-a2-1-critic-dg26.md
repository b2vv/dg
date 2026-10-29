claude-opus-4-8

# R7 A2.1 spatial-index — критик ПЕРЕД зрізом (Dg26)

ДАЛІ: читаю TS-оракул `staffEdgeGeometry.ts` (283-367) і Rust `staff_routes.rs` (191-226) + `staff_geom.rs`, щоб звірити критерій blocked/clearance, bbox-inflate, maxHeight band, NaN-sort, детермінізм, scope індексу.

## ФАКТ — критерії різні (підтверджено)
- TS `blocked` (`staffEdgeGeometry.ts:344-367`): bbox полілінії, `obstacleIndexFor`, `lowerBound(tops, minY-1-maxHeight)`, break `r.y > maxY+1`, per-box reject на **1px** (`:361,:363`), тоді `polylineHitsBoxInterior` (interior-hit, eps 0.75).
- Rust `route_clear_of` (`staff_routes.rs:217-226`): `seg_rect_distance(...) < pad`, pad≥8 (`MIN_CARD_PAD=8`, `:44`). ТОЧНА відстань, НЕ interior-hit.
- Отже індекс TS обгортає критерій interior-hit із інфляцією 1px; Rust критерій — distance<pad. Інфляція 1px НЕКОРЕКТНА для distance<pad.

## ФАКТ — обстакли вже expanded через obstacle_rect
- `obstacles_for_edge:202` пушить `obstacle_rect(c)` (figma-row розгорнуто), рамки `:211` сирі. maxHeight/sort/band мають читати obstacle_rect, не box — у Rust це вже готові тюпли, АЛЕ лише якщо глобальний індекс будується так само.

## ФАКТ — scope: Rust per-edge Vec, TS глобальний + skip-inside
- Rust `obstacles_for_edge` будує Vec карток ЩЕ до скану, self/from/to вирізає ПЕРЕД (`:200-204`) → O(cards) алокація **на КОЖНЕ ребро** (навіть чисте).
- TS НЕ алокує per-edge масив узагалі (`:332-338`), ітерує глобальний sorted-індекс, skip from/to по id ВСЕРЕДИНІ (`:362`), кеш на identity масиву (WeakMap `:291`).
- Lane-gen Rust (`:254-257`) ітерує `obstacles` (усі картки) → ще одне O(cards)/blocked-ребро, але лише коли base блоковано.

## ФАКТ — немає зовнішніх викликачів
- grep: `route_clear_of`/`obstacles_for_edge`/`build_card_set`/`detour_edge` — приватні, лише в `staff_routes.rs`. Єдиний контракт — `staff_routes()`→`StaffRouteSet`. Рефактор локальний.

## ФАКТ — сорти вже роблять partial_cmp().unwrap()
- `:258,:262,:280,:285` — наявний код уже панікує на NaN. Новий sort-by-top додає ту саму експозицію. Layout дає скінченні f32.

## РІШЕННЯ — ранжування (нижче у фінал-репорті). Головне: інфляція має бути `pad`, не 1px (BLOCKING-1); індекс мусить бути ГЛОБАЛЬНИЙ по картках із skip-by-id всередині + lazy per-edge Vec лише на блоці (BLOCKING-2), інакше n² (Vec-build) лишається; lane-gen НЕ чіпати (byte-id).
