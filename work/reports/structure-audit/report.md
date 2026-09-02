# Structure and logic audit

**Date:** 2026-09-02  
**Scope:** `packages/core`, `packages/sdk`, `packages/demo`, public SDK interface, tests and CI  
**Mode:** read-only audit; no product-code changes

## 1. Executive summary

The repository has strong behavioural coverage and several deliberately documented seams, but the
green test suite hides one critical scale failure and several state-consistency hazards.

Priority order:

1. Make row-tree construction linear and iterative before treating the 50k-organisation target as
   supported.
2. Serialize/version `setData` and search-index rebuilds so the latest request wins atomically.
3. Define one mutation transaction for data → render → callback, including rollback.
4. Harden the runtime `DiagramData` discriminator and stop returning a mutable live snapshot.
5. Reduce the root public interface and either deepen or delete the shallow state wrappers.

## 2. Findings

### Critical — row-tree crashes far below the stated scale

The product contract states approximately 50,000 organisations (`docs/REQUIREMENTS.md:24-33`),
but the row-tree path contains several quadratic walks and recursive traversals:

- `visibleOrgsForRowTree` recursively scans the full organisation array for every visible node
  (`packages/sdk/src/layout/rowTreeLayout.ts:28-45`).
- Rust `extract_subtree` scans all organisations for every popped node
  (`packages/core/src/org_tree.rs:128-135`).
- Rust `build_from_flat` scans all items for every node and recursively builds the whole tree
  (`packages/core/src/hierarchy.rs:20-26`).
- `depth_of` walks back to the root for every laid-out node
  (`packages/core/src/ploeg_layout.rs:82-85,158-165`).

A direct run of the built `computeOrgRowTreeLayout` against a 20,000-deep valid chain failed with
`RangeError: Maximum call stack size exceeded` after about 342 ms, before layout completed. The
existing scale test measures only TypeScript validation (`orgTreeValidatePerf.test.ts:18-45`), not
the visible-tree or WASM layout path. The 100k browser scenario windows the data and does not prove
a 50k expanded row-tree.

**Recommended seam:** build one validated adjacency representation (`byId`, `childrenByParent`,
iterative order/depth) and pass it through one row-tree module. Do not independently rediscover the
tree in TypeScript and Rust.

### High — concurrent `setData` calls are not “latest request wins”

`setData` performs asynchronous mapping, normalization and search-index rebuild before rendering,
with no request epoch or queue (`OrgHierarchyDiagram.ts:931-950`). `applyConfig` writes shared data
after awaiting host mappers (`:567-578`), so an older slow mapper can overwrite a newer fast call.
For large direct `DiagramData`, concurrent search builds can leave the latest data paired with an
older index because `SearchIndexService.rebuildForScale` assigns whichever promise completes last
(`SearchIndexService.ts:44-53`).

This is on a documented hot path: the viewport example fires `void diagram.setData(...)`
(`docs/USAGE.md:313-325`). Render coalescing starts only after mapping and index building, so it does
not protect this state.

**Recommended seam:** one versioned data-ingestion module should produce `{data, searchIndex}` off
to the side, commit both only if its epoch is current, clear selection, then render. Apply the same
ordering rule to `appendData` for updates to identical ids.

### High — mutations, rendering and callbacks are not one transaction

Most editing methods mutate live data and notify the host before awaiting render. Their failure
semantics differ:

- `reparentPosition` rolls data back on render failure, but has already emitted
  `onLayoutChange`; no compensating callback tells the host the patch was reverted
  (`OrgHierarchyDiagram.ts:1535-1561`).
- `movePersonToCell` and `shiftBlock` emit the patch and do not roll data back at all
  (`:1564-1590`).
- expand/collapse, reorder and matrix placement similarly commit/notify before render
  (`:819-920`).
- renderer event handlers deliberately discard these promises with `void` (`:650-708`), so a
  render rejection can also become an unhandled promise rejection.

The code already implements correct rollback for `revealPath`, proving the requirement exists, but
it is local rather than a shared transaction.

**Recommended seam:** a single `commitSceneChange` module owns snapshot, mutation, render,
rollback and callback timing. Notify the host only after a successful frame, or define and emit an
explicit rejection/rollback event.

### High — `DiagramData` detection accepts malformed or ambiguous raw input

`isDiagramData` checks only that three property names exist (`data/mergeData.ts:3-11`). It does not
check arrays and ignores the other required collections. A raw host payload with
`organizations`/`persons`/`positions` keys bypasses an explicitly supplied mapper; values such as
`positions: null` pass the guard and fail later while seeding expansion (`OrgHierarchyDiagram.ts:
570-585`). Existing tests cover `{rows: []}` and `null`, but not false-positive shapes
(`data/mergeData.test.ts:37-41`).

**Recommended seam:** use an explicit input mode or a complete cheap structural guard for all
required arrays. Prefer `mappers.toDiagram` when the caller explicitly supplied it instead of
guessing from overlapping property names.

### High — `getData()` exposes mutable live state

`getData(): DiagramData` returns the internal snapshot by reference (`OrgHierarchyDiagram.ts:
923-924`). A consumer can mutate arrays, ids, coordinates or collapsed flags without rebuilding
search, reseeding view state, rendering or emitting callbacks. This bypasses every invariant the
facade otherwise attempts to own.

**Recommended seam:** return a deeply readonly view (and freeze in development) or an explicit
snapshot/clone. All changes should cross the data-ingestion or scene-mutation interface.

### Medium — a stale bare-grid render can append nodes after a newer render

`DiagramRenderer` uses render epochs after async work in staff and organisation paths, but
`renderPositionGrid` awaits asynchronous contour paint and then continues without an epoch check
(`DiagramRenderer.ts:831-899`). `ContourPainter` correctly drops an obsolete contour session, yet
the old renderer call resumes and mounts its person nodes into whatever layers the newer render now
owns. This is reachable because `DiagramRenderer` itself is exported from the root package.

**Recommended fix:** check `isRenderCurrent(ctx.epoch)` immediately after contour paint. The deeper
fix is to stop exporting this implementation class unless direct concurrent rendering is a
supported interface.

### Medium — the root package interface exposes implementation and test controls

`packages/sdk/src/index.ts` re-exports renderer classes, low-level geometry helpers, cache controls,
demo fixtures and `resetContourWasmForTests` / `setContourWasmLoaderForTests`. The latter mutate a
process-wide WASM loader and cache (`contour/bridge.ts:73-115`). This makes an otherwise internal
global switch part of the consumer interface and lets one consumer affect every diagram instance.
Root exports also duplicate the dedicated `/worker`, `/mappers` and `/react` subpaths.

**Recommended seam:** keep the root entry focused on `OrgHierarchyDiagram`, data/config types and
stable host helpers. Move advanced adapters to explicit subpaths and keep test hooks out of package
exports.

### Medium — large facades coexist with shallow state wrappers

`OrgHierarchyDiagram.ts` is about 1,647 lines and owns mapping, search, rendering, camera,
selection, media, export and editing. `DiagramRenderer.ts` is about 1,132 lines and owns scene
assembly, contours, interaction binding, drag targets, diagnostics and view registries. At the
same time, `DataStore` is a thin mutable holder and `ViewStateStore` is mostly public fields plus
setters. Deleting those wrappers would move almost no complexity; they do not create locality or a
meaningful test seam.

**Recommended seam:** deepen by behaviour, not by nouns: data ingestion/commit, scene mutation,
row-tree layout, and render-pass assembly. Keep `SelectionStore`, which does hide meaningful set
semantics. Remove wrappers that remain pass-through after the split.

### Medium — two contour engines double the permanent change surface

The product currently keeps `button-group` (TypeScript) and `cell-flood` (Rust) across canvas,
export and tests. The decision is already recorded in `work/AGENDA.md`: every contour feature must
be implemented and verified twice. Current parity tests reduce regressions but do not remove the
structural cost.

**Recommendation:** make the product decision to select one engine, or explicitly accept this as a
long-lived two-adapter seam with shared conformance tests and one canonical intermediate ring
contract.

### Medium — Rust quality gates are absent and already fail locally

CI runs only `cargo test` for Rust (`.github/workflows/ci.yml`). On this audit:

- `cargo test`: 38 passed, with one dead-code warning.
- `cargo fmt --check`: failed across multiple Rust files.
- `cargo clippy --all-targets -- -D warnings`: failed with six findings, including dead code,
  needless range indexing and over-wide functions.

This is not a TypeScript-style issue; it is evidence that the Rust half has no enforced baseline.
Add `cargo fmt --check` and a deliberately configured clippy policy after formatting the current
tree and deciding which complexity lints are project rules.

## 3. What is working well

- TypeScript lint and all checked TypeScript configurations pass.
- SDK unit/contract suite: 846/846 passed; demo suite: 108/108 passed; no skips or todos.
- Rust suite: 38/38 passed.
- Render coalescing, per-render epochs, search fallback diagnostics and selected rollback paths show
  good awareness of asynchronous failure modes; the main problem is inconsistent application.
- The WASM ↔ TypeScript type generation and committed package checks are documented and explicit.

## 4. Verification performed

- `npm run lint` — pass.
- `tsc --noEmit` for SDK, demo and e2e configurations — pass.
- `npm test` — 954 TypeScript tests passed.
- `cargo test` with a temporary target directory — 38 passed, one warning.
- `cargo fmt --check` — failed.
- `cargo clippy --all-targets -- -D warnings` — failed with six findings.
- Direct 20k deep row-tree run — reproducible stack overflow.
- `git diff --check` for documentation changes — pass.

Full Playwright e2e and production smoke were not run during this static audit.

## 5. Recommended implementation sequence

1. Add failing scale tests for a 20k deep chain and 50k shallow tree against the complete
   row-tree path, then replace repeated scans/recursion with adjacency maps and iterative walks.
2. Add overlapping async-mapper and large-index `setData` tests; implement epoch-based atomic
   commit of data plus index.
3. Add render-failure contract tests for every public mutator and centralize mutation rollback and
   callback timing.
4. Add false-positive `isDiagramData` tests and mutable-snapshot tests; harden both interfaces.
5. Add the missing bare-grid epoch check and a deterministic concurrent-render test.
6. Split the package surface into stable root versus advanced subpaths; remove production exports
   of test hooks.
7. Decide the contour-engine product direction, then add Rust formatting/clippy gates.

## 6. Limits and risks

The code-review graph was present but could not be opened through its MCP integration in this
session; its read-only database was used only for broad module/flow orientation and was behind the
current `HEAD`, so every reported finding was confirmed against source. No browser visual audit,
live production smoke or target-hardware performance run was performed.

---

## 7. Незалежна перевірка аудиту (2026-09-02, друга сесія)

Аудит перевірено тим самим способом, яким він сам перевіряв код: кожну заяву звірено з
джерелом, а головну — **відтворено**.

### 7.1 Якорі: 9 із 9 точні

`rowTreeLayout.ts:28` · `org_tree.rs:128` · `hierarchy.rs:20` · `ploeg_layout.rs:82` ·
`mergeData.ts:3` · `OrgHierarchyDiagram.ts:923` · `:931` · `DiagramRenderer.ts:831` ·
`SearchIndexService.ts:44` — усі вказують саме на те, що заявлено. Розміри теж:
`OrgHierarchyDiagram.ts` **1647**, `DiagramRenderer.ts` **1132**, тест-хуки
`resetContourWasmForTests` / `setContourWasmLoaderForTests` справді в кореневому барелі
(`index.ts:53-54`).

### 7.2 🔴 Критична заява **занижена приблизно всемеро**

Аудит каже «20 000 у глибину падає». Прогін `computeOrgRowTreeLayout` показав, що стіна значно
ближче:

| Форма | Результат |
|---|---|
| ланцюг 2 000 | ок, 129 мс |
| ланцюг **2 500** | **ок**, 163 мс |
| ланцюг **3 000** | **`RangeError: Maximum call stack size exceeded`**, 120 мс |
| ланцюг 4 000 | **`RuntimeError`** — інша межа, вже WASM |
| ланцюг 20 000 | `RangeError`, 292 мс (як у звіті) |

**Поріг — між 2 500 і 3 000**, а не 20 000.

### 7.3 Діагностика, якої в аудиті немає: це **глибина**, а не кількість

| Форма | Вузлів | Результат |
|---|---|---|
| ланцюг 3 000 (глибина 3 000) | 3 000 | **падає** |
| плоске дерево (глибина 1) | **20 001** | **ок**, 3 095 мс |

Двадцять тисяч вузлів розкладаються без проблем, якщо вони не вкладені. Отже обмеження —
**рекурсія**, а не обсяг, і формулювання «перш ніж вважати 50 000 організацій підтриманими»
неточне: 50 000 **плоских** організацій цій межі не суперечать; 3 000 **вкладених** — суперечать.

### 7.4 Наслідок для рекомендації аудиту

Аудит пропонує одну ітеративну adjacency-модель. Напрямок правильний, але **зміна типу помилки
на 4 000 (`RangeError` → `RuntimeError`) означає, що межі дві**: стек JS і стек WASM. Полагодивши
лише TS-рекурсію (`visibleOrgsForRowTree`), стіну **зсунеш, а не прибереш** — рекурсія в
`hierarchy.rs:20` і `depth_of` лишиться. Це варто записати в план, інакше перший захід дасть
зелений тест на 5 000 і червоний на 10 000.

**Ще одне число для плану:** плоскі 20 001 коштують **3,1 с**. При 50 000 це вже не крах, а
неприйнятна пауза — тобто в лінійності потрібна не лише коректність, а й константа.

### 7.5 Решта високих заяв — точні

- `getData()` повертає `this.data` **за посиланням** (`OrgHierarchyDiagram.ts:923-925`) ✅
- `isDiagramData` перевіряє **лише три імені властивостей**, без перевірки масивів
  (`mergeData.ts:4-12`) ✅
- `renderPositionGrid` (831–901) чекає `contours.paint` і **не має** перевірки епохи після
  await; найближчий `isRenderCurrent` — на 915, уже всередині `renderOrganizations` ✅

### 7.6 Rust-гейти — точні до числа

- `cargo fmt --check` — **падає** (перше розходження: `contour.rs:14`);
- `cargo clippy --all-targets -- -D warnings` — **рівно 6 помилок**: невикористана
  `count_true_corners`, індексація `own` через змінну циклу, дві функції з завеликою кількістю
  аргументів (10/7 і 8/7), два зайві замикання;
- у `ci.yml` джоба `rust` справді має єдиний крок `cargo test`.

### 7.7 Що це змінює в порядку робіт

Пункт 1 списку аудиту лишається першим, але його формулювання треба замінити:
**не «перед 50k організацій», а «глибина ≥ 3 000 падає вже зараз»** — і в приймальний тест
закласти обидві межі (JS і WASM), інакше зелений колір буде отриманий зсувом стіни.
