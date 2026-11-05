You are a Coder in repo /Users/strelia/projects/dg (TypeScript SDK, packages/sdk). Branch feat/extensibility. Do NOT switch branches, worktrees, commit, push, or write outside the repo except your working file. English only.

🔴 PROHIBITIONS: no build / root typecheck / build:types / emitting tsc (dist shared LIVE). Allowed: `npm run typecheck -w @org-hierarchy/sdk` (noEmit), `npm run lint`, ONLY your own tests: `npm test -w @org-hierarchy/sdk -- DiagramRenderer.interaction`. On `listen EPERM` rerun with the needed permission; busy port → wait+retry. No external store.

WORKING FILE: /Users/strelia/projects/dg/work/reports/extensibility/r1/_impl-R1-A.md — append after every step, first line `NEXT:`, labels FACT/DECISION/NEXT/QUESTION, full test output (no pipes). End with one STATUS line.

READ FIRST: work/reports/extensibility/r1/plan.md (rev.2, DIM-ONLY) + spec.md. Code: packages/sdk/src/render/DiagramRenderer.ts — `paintInteraction` (~:249-265), the exclusion `view.lod !== 'far'` (~:254), the `interactionLines` far-fallback (~:257, set every render ~:900; `lastStaffChrome` is null at far ~:914 so do NOT rely on it at far), the opt-in gate `if (this.interactionSource)` (~:228/830/1000/1086). Existing test DiagramRenderer.interaction.test.ts:186-206 (asserts far persons alpha [1,1,1]) and :48 (hoverRing.visible === lod!=='far').

YOUR FILES (exclusive): packages/sdk/src/render/DiagramRenderer.ts, packages/sdk/src/render/DiagramRenderer.interaction.test.ts. Do NOT touch PersonNode/OrganizationNode or setHovered.

TASK R1-A — DIM-ONLY far-LOD hover accent. TDD: adjust/add failing tests first (RED), implement, GREEN.

1. Remove ONLY the `view.lod !== 'far'` exclusion in `paintInteraction` (~:254) so the related-dim set (`staffDimmedIds`) is computed and applied at far too. Nothing else in paintInteraction changes — the hovered node stays bright by contrast; unrelated get the existing dim alpha (0.45). Do NOT edit setHovered or add a far hoverRing (that would leak into the non-opt-in legacy pointerover path and break byte-for-byte — forbidden).
2. The related lines at far come from `interactionLines` (already set every render ~:900), NOT `lastStaffChrome` (null at far). Confirm paintInteraction's dim computation uses the fallback that works at far (~:257).
3. Update the flipped test DiagramRenderer.interaction.test.ts:186-206: after the change, far hover (hovered=a, lines [a→b]) yields related {a,b}, dimmed {c} → persons alpha **[1, 1, 0.45]** (was [1,1,1]). This is the INTENDED AC4 contract at far, not a regression — rewrite the expected values with a comment saying so.
4. Add tests: (a) null-source far-hover → paintInteraction NOT invoked, persons alpha [1,1,1], 0 dim (real AC3 byte-for-byte); (b) 0-related far node → related={hovered}, all other visible dimmed; (c) unselected hovered surviving near→far keeps its far dim; (d) selection>hover at far (selected+hovered node not dimmed, selection priority); (e) emphasis found/highlight unchanged under far hover. Keep the success test :48 (hoverRing at near/mid only) passing — setHovered untouched so it must stay green.

Done = your 2 files only; tests GREEN (paste full output); `npm run typecheck -w @org-hierarchy/sdk` + `npm run lint` pass. STATUS line last.
