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
Rules G1–G8 for merging own cells and notching around foreign; `magnetRadius` is Manhattan merge distance.
_Avoid_: Gravity, sticky layout

**Notch (C-notch)**:
Rectangular cutout around foreign instead of a hole when `preferNotch` is on (G5).
_Avoid_: Indent, bite, pocket

**Far-side wall (G6)**:
A contour edge on the open side of foreign with no own beyond — must not be drawn.
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

**Promote overlay**:
v1.x idea: HTML/React node chrome over Pixi (TD07) — not in v1.
_Avoid_: Hybrid node, React card on canvas (for v1)
