# Org Hierarchy SDK

Embeddable organizational and staff diagrams: org matrix / row-tree, staff 3-tier layout, department contours, Pixi camera.

## Language

**Organization**:
A node in the administrative hierarchy (ministry, department unit, etc.), shown in matrix or row-tree mode.
_Avoid_: Company, company unit, folder

**Staff position**:
A seat in an organization that may hold a person; layout uses grid cells or layoutCoords.
_Avoid_: Job, role slot, employee card (use Person for the human)

**Person**:
A human assigned to a staff position (ПІБ, photo, temporary flag).
_Avoid_: Employee, user, worker

**Department contour**:
The magnetism fill polygon for one department’s own cells (possibly multiple components).
_Avoid_: Blob hull, department outline, cluster shape

**Own cell / foreign cell**:
Grid cells belonging to the contour’s department vs other departments; foreign never fills the contour.
_Avoid_: Self/other tile

**Magnetism / magnet radius**:
Same-dept own cells merge into one contour component only when Manhattan distance ≤ `magnetRadius` (default **1.5** = orthogonal neighbors). A one-cell gap (Manhattan **2**) does **not** merge. Then G2–G8 notch/repel per component.
_Avoid_: Gravity, sticky layout; forcing one C-blob with inflated radius

**Notch (C-notch)**:
Rectangular cutout around foreign **inside one component’s bbox** when `preferNotch` is on (G5). Not the Variant B demo shape — Variant B is three IT groups, not one C around CEO.
_Avoid_: Indent, bite, pocket; “Variant B = C-sketch”

**Far-side wall (G6)**:
A contour edge on the open side of foreign with no own beyond — must not be drawn (applies per component).
_Avoid_: Back wall, outer flange

**Row-tree**:
Org display mode when at least one organization is expanded; depth maps to rows via tidy/Ploeg layout.
_Avoid_: Org tree view, hierarchy list

**Matrix mode**:
Org display when all organizations are collapsed; sparse grid adjacency.
_Avoid_: Tile board, org grid only

**Staff tier**:
One of three vertical bands (managing / current / subordinate orgs) on the staff canvas.
_Avoid_: Layer, strip, band (prefer tier in staff docs)

**LOD band**:
Viewport zoom class `far` | `mid` | `near` controlling node/contour detail.
_Avoid_: Zoom level (alone), detail mode

**Incremental contour computer**:
Caches per-department contour fingerprints so only dirty departments recompute after layout edits.
_Avoid_: Contour memo, blob cache (prefer this name in SDK docs)

**Contour morph**:
Point-ring lerp of department blobs while dragging a person across snap cells (G8 polish).
_Avoid_: Path-string tween, SVG morph

**Button-group contour**:
Paint polish that replaces a solid magnetic component with a rounded rect around member cards (card border-radius), instead of cell-flood stairs.
_Avoid_: Orthogonal “noise” wash; filling L/C holes with the member AABB

**Worker search index**:
Building `SearchIndex` off the main thread (single worker or WorkerPool chunks) for large diagrams.
_Avoid_: Main-thread-only index at 2M scale

**Camera tween**:
Animated pan/zoom of the Pixi viewport (`fitView` / `resetView` / `panTo` with `animate: true`).
_Avoid_: Instant jump (when motion is requested)

**Expand-in-place**:
Showing a tier-3 org’s staff under its card without changing staff focus (`toggleStaffOrgExpand`).
_Avoid_: Drill (that’s `focusStaffOrg`)

**Pooled array mapper**:
Facade that chunks an input array across a bounded WorkerPool (`createPooledArrayMapper` / `mapArrayItems` / `mapFlatRowsInPool`).
_Avoid_: One worker per chunk, unbounded concurrency

**Demo pooled mapper**:
Demo mapper upload + worker bench call `mapFlatRowsInPool` / `mapArrayItems` with `recommendWorkerPoolSize`.
_Avoid_: Single unbounded `mapInWorker` for large JSON

**Node media**:
Cached Pixi texture load for `photoUrl` (person near) and org `symbolUrl*` sprites; placeholder on failure.
_Avoid_: Blocking create() on network; React overlay for photos (TD07)

**Layout diagnostics**:
Soft layout warnings from the last render (`getLayoutDiagnostics` / `onLayoutDiagnostics`), e.g. anchor overlap.
_Avoid_: Auto-packing overlapping anchors (host/D&D fixes)

**Demo GitHub Pages**:
Static Rsbuild build of `packages/demo` deployed via Actions (`DEMO_BASE_PATH=/dg/`).
_Avoid_: Serving from `npm run dev` in CI

**Promote overlay**:
HTML/React cards for selected near-LOD nodes, camera-synced (`createReactPromoteOverlay`); Pixi views hidden while promoted.
_Avoid_: Mass HTML for every node; rasterizing promote into export (interactive-only)
