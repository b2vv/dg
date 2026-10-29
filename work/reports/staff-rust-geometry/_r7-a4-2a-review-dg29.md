claude-opus-4-8

# R6 незалежне рев'ю T126 R7 A4.2a (dg29)

ДАЛІ: подивлюся діф buildStaffLayoutInput.ts + .test.ts, тоді первинні джерела ground truth (canvasLayout.ts, orgBlockLayout.ts, staff_layout.rs, staff_routes.rs, types.rs).

## ВЕРДИКТ: OK (жодної блокуючої знахідки) — гейт ЗЕЛЕНИЙ

ФАКТ (1 паритет): leadershipOf адаптера (buildStaffLayoutInput.ts:91-100) ≡ canvasLayout.ts:27-36 ≡ Rust leadership_of (staff_layout.rs:909-923). Per-org collapse (collapseVisiblePositions) дзеркалить orgBlockLayout.ts:378-383 (visiblePositions per блок). Rust НЕ робить collapse (staff_layout.rs:6) і сам застосовує leadership_of для tier-1 (1011) + not-a-child діагностику (1092). Чистий поділ: cap=адаптер, leadership_of+not-a-child=Rust.
ФАКТ (2): U1 per-org ✔ (visiblePositions викликано окремо на managing/current/кожну дитину, не глобально). U2 НЕ тавтологія ✔ (тест розкриває mh+m2; m3 відсутній, бо leadership-підмножина виключає depth-2 ще до visiblePositions — відрізняє правильну impl від visiblePositions(всі позиції)). U3 ✔: positionCount — TS-enrich (types.rs:498 / rust-types.ts:139 «name/positionCount/expanded — TS, не тут»), стрип позицій його не ламає; report-фільтр subset-safe проти Rust node_ids-гейта (staff_layout.rs:1204). U5 ✔ positionExpand.ts не чіпано (git status). U6 ✔ V2a (не V2b).
ФАКТ (3 cap-gap): over-cap діти вилучені з forwardedExpandedOrgIds, non-child id збережені (Rust діагностує not-a-child 1092). Діагностичний рядок (ts:196) посимвольно = canvasLayout.ts:165-166.
ФАКТ (4 крайові): multi/no-head managing → raw позиції інертні (Rust tier-1 skip 1030-1037 + node_ids дропає висячі ребра); тест not.toThrow ✔. cap=0 → Math.max(0,…) ✔. Порожні орг → visiblePositions повертає [] (positionExpand.ts:55). Union без дедупу між орг — байдуже, бо Rust ре-фільтрує по organizationId.
ФАКТ (5 golden-neutral): адаптер без імпортерів (лише computeStaffGeometryWasm визначено layoutBridge.ts:81, не в рендер-шляху). 20/20 тестів зелені, typecheck чистий.

РІШЕННЯ: BLOCKING=0. NON-BLOCKING: (а) A4.2b-wiring — при collapse ON non-expanded діти ПОВНІСТЮ відсутні у forwarded positions; enrich positionCount мусить читати повний DiagramData (як canvasLayout.ts:179 data.positions.filter), не стрипнутий вихід адаптера. (б) multi/no-head managing форвардить raw-uncollapsed позиції — за дизайном (рішення власника: raw замість throw), інертно.
