Model ID: claude-opus-4-8

NEXT: Read plan.md, spec.md, helpers H1/H2/H3, ROADMAP D3-деталь section, and .claude/standards.md to ground the AI-slop critique.

FACT: plan §3 types.ts, constants.ts all map to owner decisions (roadmap §162 frame shape; AC2/F7 AnimateOption union; AC3 scale 0.9; AC6 settle thresholds; AC7 cap 750) — each consumed by a numbered acceptance row. Not slop.
FACT: org-path generality (§1, §7 Q1) is owner-mandated (spec §7 Q1: "контролер проєктується незалежним від шляху"); plan writes NO org code, only kind:id key format — zero-cost. Not premature.
FACT: Animator interface has 2 impls (spring+tween), owner-mandated (roadmap :83-86); §9 constitution addresses KISS explicitly. Justified.
FACT: isTransitioning() appears only once in plan (§5 line 88 seam def); no scenario/task consumes it. nodeCenter/anchors/drop return final via registry target boxes (H3 AREA 5), drag→snapToTarget, export→settleNow. No named consumer. (plan.md:88)
FACT: FrameClock "shared type, двічі інлайн" (§2 line 37) — the two inline sites (Viewport.ts:17-23 CameraMotionOptions; contourMorph.ts:122-124) are NOT in any task's file list (T-A..T-E touch transition/*, DiagramRenderer, LayerManager, SceneRegistry, createReactPromoteOverlay, promoteMath, OrgHierarchyDiagram, USAGE). So FrameClock will not dedupe them; real consumers are all inside the new transition module. "Shared" framing is aspirational. (plan.md:37)
DECISION: 2 non-blocking slop findings; no blocking slop. From the AI-slop lens the gate is not held red.
