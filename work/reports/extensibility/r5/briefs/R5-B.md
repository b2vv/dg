You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/extensibility. Another coder (R5-C) works IN PARALLEL on OrgHierarchyDiagram.ts/USAGE/index.ts — never touch files outside YOUR list. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, ONLY your own tests: `npm test -w @org-hierarchy/sdk -- DiagramRenderer`. On `listen EPERM` rerun with needed permission; busy port → wait+retry. No external store. Package typecheck may error in R5-C's file (facade mid-flight) — report, don't fix.

WORKING FILE: /Users/strelia/projects/dg/work/reports/extensibility/r5/_impl-R5-B.md — append after every step, first line `NEXT:`, labels, full test output (no pipes). End with one STATUS line.

READ FIRST (R5-A LANDED, do not modify): packages/sdk/src/render/marquee.ts (`rectFromDrag`, `boxesIntersectRect`, `isDrag`, `MarqueeRect`). Plan: work/reports/extensibility/r5/plan.md (§1 rev.2, §3, §4 R5-B, §4.1 seam, §6 rows 1,3,4,5,7,8,10,12,13,14) + spec.md. Code: packages/sdk/src/render/PixiHost.ts (bindPan :369-388 — the existing empty-drag pan you must NOT break), DiagramRenderer.ts (layers.root pointer handlers ~:917-921, scene.listBoxes ~:660 world boxes, onCanvasClick path, world↔screen transform for capturing drag-start in WORLD coords, onNeedsPaint), personInteractions.ts:124-159 (tapAfterDrag precedent, T91).

YOUR FILES (exclusive): packages/sdk/src/render/DiagramRenderer.ts, packages/sdk/src/render/DiagramRenderer.marquee.test.ts (new).

TASK R5-B — marquee gesture in the renderer. TDD: failing tests first (RED), implement, GREEN. When no sink is set, behavior is byte-for-byte (plain + Shift drag both pan as today).

1. `setMarqueeSink(sink: { onRect(rect: MarqueeRect | null): void; onSelect(ids: string[]): void } | null): void` — hold it. `null` = marquee OFF (default).
2. Gesture: on **Shift + pointerdown on empty background** AND sink≠null → begin marquee: capture drag-start in **WORLD** coords (§4.1/F5, so mid-drag pan/zoom doesn't corrupt the rect); `stopPropagation` BEFORE PixiHost's beginPan so the camera does NOT pan (only in this Shift+sink case — plain drag and Shift-drag-without-sink must still pan). pointermove → `rectFromDrag(startWorld, currentWorld)` → `sink.onRect(rect)` each frame. pointerup → `boxesIntersectRect(scene.listBoxes(), rect)` → `sink.onSelect(ids)`; `sink.onRect(null)`. pointercancel → `sink.onRect(null)`, no select.
3. `isDrag` threshold (marquee.ts) is authoritative (F4): below threshold = treat as a click (no marquee, no onSelect), let normal empty-click/deselect proceed.
4. **tapAfterDrag (F3):** after a genuine marquee drag, suppress the subsequent `pointertap`→onCanvasClick so it does not wipe the just-made selection (mirror personInteractions.ts:124-159).
5. Marquee only when sink≠null; otherwise do nothing new (byte-for-byte pan). Do NOT call the store or know about selection — only the sink.

Tests (DiagramRenderer.marquee.test.ts): Shift+drag with sink → onRect per move (normalized world rect), onSelect(ids of intersecting boxes) on up, onRect(null) on up; plain drag (no Shift) → pans, no marquee (sink untouched); Shift+drag WITHOUT sink → pans, no marquee (byte-for-byte); below-threshold Shift+click → no onSelect, deselect proceeds; tapAfterDrag → onCanvasClick suppressed after a real drag (selection kept); mid-drag camera move → rect stays world-stable; pointercancel → onRect(null), no onSelect; far-LOD → listBoxes world hit-test works. Each red-if-deleted.

Done = your 2 files only; tests GREEN (full output); `npm run typecheck -w @org-hierarchy/sdk` (no NEW errors in your files) + `npm run lint` pass. STATUS line last.
