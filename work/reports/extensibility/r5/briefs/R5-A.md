You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/extensibility. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, ONLY your own tests: `npm test -w @org-hierarchy/sdk -- marquee`. On `listen EPERM` rerun with the needed permission; busy port → wait+retry. No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/extensibility/r5/_impl-R5-A.md — append after every step, first line `NEXT:`, labels FACT/DECISION/NEXT/QUESTION, full test output (no pipes). End with one STATUS line.

READ FIRST: work/reports/extensibility/r5/plan.md (§1, §3, §4 R5-A, §6 rows 3,7,13) + spec.md. For the box type, match what `scene.listBoxes()` returns in packages/sdk/src/render/DiagramRenderer.ts (~:660) — read it to get the exact box shape (id, kind, x/y/width/height in world coords); your hit-test consumes that shape.

YOUR FILE (exclusive, NEW): packages/sdk/src/render/marquee.ts + render/marquee.test.ts.

TASK R5-A — a PURE marquee geometry module (no Pixi, no DOM, no store). TDD: failing success AND failure tests first, RED, implement, GREEN.

Export:
- `rectFromDrag(start: {x:number;y:number}, current: {x:number;y:number}): MarqueeRect` — normalized world rect (positive width/height regardless of drag direction). `MarqueeRect = {x,y,width,height}`.
- `boxesIntersectRect(boxes: readonly Box[], rect: MarqueeRect): string[]` — ids of boxes whose world box INTERSECTS rect (overlap, NOT containment). Standard AABB overlap: `!(b.x+b.w < r.x || b.x > r.x+r.w || b.y+b.h < r.y || b.y > r.y+r.h)`. Box shape = what scene.listBoxes() yields.
- `isDrag(start, current, thresholdPx = <pick a small default, e.g. 4>): boolean` — true when the pointer moved beyond the click-vs-drag threshold (so caller distinguishes a marquee drag from a bare click). Document the default.

Rules: pure functions, no side effects; handle zero-area / 1px / negative-direction rects (normalize); empty boxes → []; rect covering all → all ids; a box exactly touching an edge counts as intersecting (inclusive) — state your edge convention in a comment and test it. Do NOT clamp/validate NaN beyond what's natural (caller supplies finite world coords); if you add a NaN guard, test it.

Tests (marquee.test.ts): rectFromDrag normalizes all 4 drag directions; boxesIntersectRect — intersect (partial overlap) selected, fully-inside selected, fully-outside excluded, edge-touch included, 0 boxes → [], rect-covers-all → all; isDrag below/above threshold. Each assertion red-if-deleted.

Done = your 2 files only; tests GREEN (paste full output); `npm run typecheck -w @org-hierarchy/sdk` + `npm run lint` pass. STATUS line last.
