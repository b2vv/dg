
---
# R7 A3 bridge — critic (dg28)
model: claude-opus-4-8

ДАЛІ: читаю bridge.ts, layoutBridge.ts, lib.rs (staff export), generated/rust-types.ts, wasmLoad.test.ts — звіряю T1..T6 проти коду.

ФАКТ T1 (as-cast/serde↔ts-rs): структи staff мають явні `#[serde(rename="...")]` ПЛЮС ts-rs serde-compat (types.rs:257-280 тощо) — генерований TS `nodeWidth`... збігається з serde-виходом. Optional-поля: `#[serde(skip_serializing_if="Option::is_none")]` + `#[ts(optional)]` (types.rs:18-24,331-339) → serde пропускає None, ts-rs ставить `?`. Жодного null-vs-undefined розходження. У StaffGeometryResult немає map (лише Array/примітиви) → `to_value` дає plain-objects. `as`-каст компілюється завжди (метод інтерфейсу `=> unknown`), рантайм-вірність забезпечена serde↔ts-rs. => T1 non-blocking (зелено).

ФАКТ T2 (no TS-валідація): Rust валідує `parsed.options.validate()` (lib.rs:79-82) → всі 12 числових метрик через `validate_layout_metric` відхиляють NaN/Inf/знак (types.rs:286-300). Невалідний shape входу → `from_value` кидає "parse error: ...". Пропуск requireLayoutMetric коректний: єдиний структурований обʼєкт, метрики валідуються в Rust. => T2 non-blocking. Нюанс: помилка метрики повертається як кинутий рядок (snake_case "node_width"), не TS-дружній — але це по дизайну.

ФАКТ T3 (error-mirror): row-tree (layoutBridge.ts:30-40) НЕ обгортає compute-помилки — Err(JsValue) з wasm кидається як є; обгортається лише load-шлях у WasmLoadError (bridge.ts:61-65). Дзеркалення доречне й консистентне. Нюанс (== row-tree): JsValue::from_str кидається як JS-рядок, не Error — у caller немає `.message`. Прийнятно для дзеркала. => T3 non-blocking (зелено, консистентно).

ФАКТ T4 (re-export): row-tree реекспортує вхід+результат+вкладені (layoutBridge.ts:4: OrgFlatInput, OrgRowTreeLayoutResult, LayoutNode, LayoutEdge). Для staff повне замикання, щоб A4 не ліз у generated:
  ВХІД: StaffLayoutInput + StaffPositionInput, StaffEdgeInput, StaffOrgInput, StaffDepartmentInput, StaffNodeSize, StaffLayoutMetrics, StaffDockHintInput(→StaffDockHint)
  ВИХІД: StaffGeometryResult + StaffNodeGeo, StaffOrgCardGeo, StaffNamespace, StaffDepartmentFrameGeo, StaffEdge, StaffRouteSet(→StaffEdgeRoute→StaffRoutePoint)
  ~17 типів. План каже «потрібні вкладені типи» — РЕКОМЕНДАЦІЯ: реекспортнути повне замикання (або явно зафіксувати, що саме A4 торкає). => T4 non-blocking уточнення плану.

ФАКТ T5 (дискримінація тесту): щоб не був хибнозеленим — assert `spy.mock.calls[0][0]` === input (toBe на референс, не лише called), та результат === canned (toBe). Без requireLayoutMetric bridge форвардить input як є → toBe-референс ловить будь-яку обгортку/трансформацію. => дискримінує, якщо саме так написано. Пастка: формулювання «передає input незмінним» має бути toBe(input), а не просто toHaveBeenCalled().

ФАКТ T6 (singleton/cache): initContourWasm кешує `wasm` (bridge.ts:51 `if (wasm) return wasm`). `setContourWasmLoaderForTests` внутрішньо робить reset (bridge.ts:81) — виклик у тесті чистить кеш у момент set. АЛЕ потрібен afterEach `setContourWasmLoaderForTests(null)+resetContourWasmForTests()` (як wasmLoad.test.ts:10-13), інакше фейк протікає в наступний тест/файл. Також: фейк-loader мусить вертати обʼєкт, що задовольняє WasmContourModule (тепер 3 члени: default, computeOrgRowTreeLayout, computeStaffGeometry) — дати стаби або каст, інакше TS-помилка. => must-include; non-blocking (патерн уже є).

РІШЕННЯ / ВЕРДИКТ: 🟡 — блокерів немає, план здоровий і коректно дзеркалить row-tree. Уточнення перед кодом:
  1. T4: реекспортнути ПОВНЕ замикання типів (17), не «деякі вкладені».
  2. T5: assert toBe(input-референс) + toBe(canned result), не лише called/truthy.
  3. T6: afterEach reset+restore ОБОВʼЯЗКОВО; фейк задовольняє весь WasmContourModule (default + обидва compute-методи).
  Нюанси (non-blocking, == row-tree): помилки — кинутий JS-рядок без .message; метрика-помилка в snake_case.
