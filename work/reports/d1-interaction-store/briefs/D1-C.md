You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/d1-interaction-store. Another coder (D1-B) works IN PARALLEL on OrgHierarchyDiagram.ts/USAGE/index.ts — never touch files outside YOUR list. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, and ONLY your own tests. On `listen EPERM` rerun with the needed permission; busy port → wait+retry. No external store. Package-wide typecheck may show errors in D1-B's file (facade mid-flight calls your `setInteractionSource`) — report, don't fix.

WORKING FILE: /Users/strelia/projects/dg/work/reports/d1-interaction-store/_impl-D1-C.md — append after every step, first line `NEXT:`, labels FACT/DECISION/NEXT/QUESTION, full test output (no pipes). End with one STATUS line.

READ FIRST (D1-A LANDED, do not modify): packages/sdk/src/state/InteractionStore.ts, interaction/interactionState.ts (`InteractionState`, `NodeRef`). Plan: work/reports/d1-interaction-store/plan.md (§1, §4 D1-C, **§4.1 the interaction seam — your DiagramRenderer side**, §9 rows 7,7f,12,14,15; the accent-priority rule in the status line). Code: render/PersonNode.ts (pointerover :215, setHovered :336-340 far early-return, hoverRing), render/OrganizationNode.ts (:174), demo packages/demo/src/app/StaffChromeBackdrop.ts (relatedStaffIds :47 — the pure selector you RELOCATE into the SDK; do NOT edit demo, just copy the pure function into render/staffRelated.ts; D1-D rewires demo to import it).

YOUR FILES (exclusive): packages/sdk/src/render/DiagramRenderer.ts, render/PersonNode.ts, render/OrganizationNode.ts, render/staffRelated.ts (new) + their *.test.ts.

TASK D1-C — make the Pixi near/mid hover single-source through the store, and relocate the related selector into the SDK. TDD: failing success AND failure tests first, RED, implement, GREEN. When no interaction source is set, behavior stays byte-for-byte (safe rollback).

1. **DiagramRenderer interaction seam (plan §4.1):** add `setInteractionSource(src: InteractionSource | null): void` where
   `InteractionSource = { getHovered(): NodeRef | null; setHovered(ref: NodeRef | null): void }` (define/export the type).
   Hold it on the renderer. `null` = old path (local hover), byte-for-byte.
2. **Nodes write through the store:** PersonNode/OrganizationNode take an optional `onHover?: (ref: NodeRef | null) => void`
   (constructor or style). `pointerover` → `onHover(thisRef)`; `pointerout` → `onHover(null)`. When `onHover` is absent,
   keep today's local behavior. DiagramRenderer passes `onHover = ref => source.setHovered(ref)` when a source is set.
3. **Nodes render from state, not local toggle:** `hoverRing.visible` is driven by whether this node === the source's
   current hovered (DiagramRenderer reads `source.getHovered()` and tells each node, or the node receives a `hovered`
   flag on paint). Near/mid only — PersonNode.ts:336-340 FAR early-return stays (far-LOD hover is R1, NOT added here).
4. **Accent priority (plan status-line rule, row 15):** when a node is both selected and hovered, SELECTION wins for the
   node's own accent; hover-related dimming of OTHER nodes is still computed. Implement that precedence.
5. **Relocate `relatedStaffIds` into SDK** (N3): copy the pure selector from demo StaffChromeBackdrop.ts:47 into
   render/staffRelated.ts (+ a dim selector `f(hovered, …)`), exported for reuse. Do NOT author a parallel new one; do NOT
   edit the demo (D1-D imports your SDK version). related-dimming is a SELECTOR computed on the fly, NOT stored (Q5).

Tests: drive PersonNode/OrganizationNode with/without `onHover` (pointerover→onHover(ref); pointerout→onHover(null); far-LOD paints no hover ring — row 7f); DiagramRenderer.setInteractionSource wiring (node hover routes to source.setHovered; hoverRing reflects source.getHovered; source=null → old behavior); staffRelated selector purity + relatedStaffIds parity with the demo original; accent priority selected>hovered (row 15); related-dimming is derived not stored (row 14). Cover rows 7,7f,12,14,15. Run only your test files.

Done = your files only; tests GREEN; `npm run typecheck -w @org-hierarchy/sdk` (no NEW errors in your files; the facade's call to setInteractionSource resolves once your method exists), `npm run lint`. STATUS line last.
