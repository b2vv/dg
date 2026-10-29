claude-opus-4-8

# R7 A3 bridge review (fresh reviewer, dg28)

ДАЛІ: прочитати 3 змінені файли (bridge.ts, layoutBridge.ts, staffGeometryBridge.test.ts) + generated/rust-types.ts (поля StaffLayoutInput/StaffGeometryResult) + взірець computeOrgRowTreeLayoutWasm. Далі — прогнати тест і typecheck.

## ФАКТИ

- C1 pass-through: layoutBridge.ts:85 `return wasm.computeStaffGeometry(input) as StaffGeometryResult;` — input передано напряму, без клону/обгортки; результат as-is. Каст такий самий, як у row-tree (layoutBridge.ts:70 `as OrgRowTreeLayoutResult`). ✓
- C2 error-mirror: compute кидає Rust JsValue as-is (lib.rs:83 `.map_err(... JsValue)`); лише loader → WasmLoadError (bridge.ts:67-72). Дзеркалить row-tree точно; свідомо (JSDoc layoutBridge.ts:78-79). ✓
- C3 closure: у generated 18 Staff-типів (rust-types.ts:33-168); у реекспорті layoutBridge.ts:13-34 всі 18 (9 input + 9 output). Вкладені рефи покриті: StaffLayoutInput→{Position,Edge,Org,Department,NodeSize,LayoutMetrics,DockHintInput}; DockHintInput→DockHint; GeometryResult→{NodeGeo,OrgCardGeo,Namespace,DepartmentFrameGeo,Edge,RouteSet}; RouteSet→EdgeRoute→RoutePoint. Жоден не лишився тільки в generated. ✓
- C4 тест: toBe — референсна рівність. received===input ловить клон/обгортку; result===canned ловить трансформацію; якби bridge не викликав wasm — received лишився б null. Прогнав: 1 pass (чесний). ✓
- C5 фейк: задовольняє весь інтерфейс (default, computeOrgRowTreeLayout, computeStaffGeometry). afterEach: setContourWasmLoaderForTests(null) вже викликає reset (bridge.ts:87), явний resetContourWasmForTests() надлишковий але нешкідливий; singleton очищено, витоку нема. ✓
- C6: інші вживання WasmContourModule — `as unknown as` касти (bridge.ts:47, worker/wasm-init.ts:11), не літерали. Єдиний літерал — тестовий фейк. Інші loader-тести (wasmLoad, variantBNotchPaint, ContourPainter) не ламаються. typecheck зелений. ✓
- Rust-контракт: lib.rs:75-85 `computeStaffGeometry(input: JsValue)->Result<JsValue,JsValue>`, один аргумент, валідація options у Rust — збігається з bridge. ✓

## РІШЕННЯ: 🟢 GREEN. Блокерів нема.

Non-blocking:
- afterEach: надлишковий resetContourWasmForTests() (setLoader(null) вже робить reset). Косметика.
- `as StaffGeometryResult` — неперевірена межа довіри, але ідентична усталеному row-tree-патерну.
- Тест одинарний: не покриває error-path самого bridge (loader-fail / compute-throw) — успадковано від initContourWasm, покрито в wasmLoad.test.ts. Для A3-скоупу достатньо.
