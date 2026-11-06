claude-opus-4-8

NEXT: read ROADMAP §R4 (owner decision + UX risks), then grep for wheel/zoom callers (zoomBy, attachWheel, keydown, OrgHierarchyConfig) to ground the plan's claims.

FACT: ROADMAP §R4 (work/ROADMAP-extensibility.md:221-249) = owner design. Risk1 Mac ctrl↔accessibility → "на Mac пріоритет ⌘(meta)" (:233). Risk2 preventDefault-swallow → opt-out gesture map (:234). Risk6 zoomBy animate (:238). Default zoom-modifier + panHorizontal:false (:246-248).

FACT: Viewport.onWheel (Viewport.ts:263-276) unconditionally preventDefault at :264 BEFORE deciding. isZoomWheel (:445-446) = ctrlKey||metaKey. Comments :257 and :444 EXPLICITLY state "trackpad pinch arrives as ctrl+wheel too / this is also how a trackpad pinch reaches the page". => the ctrl+wheel branch IS the Mac trackpad pinch-zoom path.

FACT: zoomBy (Viewport.ts:361-364) is sync, calls zoomAt immediately. Public via OrgHierarchyDiagram.ts:2270 → PixiHost:212. Demo App.ts:812 zoomDiagram calls diagram.zoomBy(factor) then refreshZoom() → renderStatusState (App.ts:1570) reads getZoom() SYNCHRONOUSLY to print "zoom X.XX". If zoomBy becomes animated (280ms tween), getZoom() right after returns pre-tween scale → stale label. Host contract sync→async change.

FACT: No keydown/KeyboardEvent in sdk src (grep empty). No tabindex/canvas focus setup anywhere (only export/exportDiagram.ts:82 w.focus()). Plan says keyboard listener on "canvas (focusable)" but canvas isn't focusable today.

DECISION B1 [BLOCKING]: ctrl→meta REMAPPING (plan §1,§3; spec scenario4; AC3/table row5) breaks Mac trackpad pinch-zoom. Trackpad pinch delivers synthetic ctrlKey wheel (confirmed by Viewport.ts:257,444). If Mac zoom becomes meta-only, pinch (ctrlKey, metaKey=false) resolves to NOT-zoom → pans instead of zooms on the primary host platform. ROADMAP says "priority ⌘" (:233) — softer than "ctrl→meta remap"; plan hardened it into exclusivity. No acceptance row for "Mac trackpad pinch still zooms" → an implementer can pass all 12 ACs while shipping the regression. Must: resolve priority-vs-remap, preserve ctrl-as-pinch on Mac, add acceptance row.

DECISION N1 [non-blocking]: zoomBy sync→async not listed in plan §5 side-effects. Any caller reading getZoom() right after zoomBy (demo App.ts:813→1571) sees stale value. Demo-only today but zoomBy+getZoom are public API. Flag contract change + fix demo label.

DECISION N2 [non-blocking]: keyboard zoom needs canvas tabindex + focus; plan vague. Without focus keydown never fires; buttons must stay the a11y path. Specify in R4-A.

DECISION N3 [non-blocking]: resolveWheelConfig malformed/unknown-string + behavior↔gestures precedence (behavior:'pan' vs gestures.zoom:'ctrl') unspecified; no fallback-to-default acceptance row.

DECISION: preventDefault mechanics SOUND at plan level — plan correctly changes :264 unconditional preventDefault to per-event (table row 8 red-if-deleted). panHorizontal:false → decision 'none' → no preventDefault → event to host. Opt-out 'shift' restores. Rollback clear (§5).

=== RE-CHECK rev.2 (coordinator) ===
FACT: B1 RESOLVED. spec.md scenario 4 (:22-26) rev.2: Mac = PRIORITY not remap — "на Mac ctrl+wheel МУСИТЬ лишатись зумом (pinch)"; zoom fires on ctrlKey||metaKey on Mac; strict per-gesture only non-Mac; 'none' disables both. plan §1 (:7) matches. New acceptance row 5b (plan:54) "Mac trackpad pinch (ctrl+wheel) ЗУМИТЬ (НЕ пан)". Directly preserves Viewport.ts:257/444 trackpad path + adds the missing red-if-deleted row. => B1 CLOSED.
FACT: N3 → plan §4 + rows 13 (unknown→default, no throw) & 14 (behavior:'pan' ignores gestures.zoom for wheel). Closes defense Q1 malformed/precedence. CLOSED.
FACT: N2 → plan §4 + §5:43 — tabindex=0 on canvas/container, keydown there, buttons stay primary a11y, preventDefault own combos only. CLOSED.
FACT: N1 → plan §4 + §5:42 + row 15 — zoomBy commits target scale synchronously (getZoom returns final at once), animates only the visual; demo untouched. Resolves stale-label. CLOSED as a design intent.

DECISION [non-blocking] residuals (do not gate):
- Doc drift: plan §3:25 "Mac→meta" and spec AC3:34 "'ctrl' на Mac auto-меппиться в ⌘" still read as EXCLUSIVE remap — contradicts the rev.2 priority resolution (scenario 4 + row 5b). Fix this wording before R4-B writes USAGE so the regressive remap isn't re-encoded in the public doc.
- N1 impl constraint: under today's single-scale model getZoom reads this.scale and animateTo tweens this.scale, so "animate (row 10)" + "getZoom=final (row 15)" conflict unless getZoom returns the PENDING animateTo target during the tween (or a separate logical scale). R4-A must carry this explicitly; "reuse animateTo" alone does not give it.
- Q2 platform detection: resolveWheelConfig(cfg, platform) injects platform (good, testable); R4-A should still name the detection one-liner + SSR/undefined→non-Mac-strict default. Minor.

DEFENSE 5 Qs after rev.2:
Q1 malformed — CLOSED (N3 rows 13/14).
Q2 dependency/platform — CLOSED (injected platform param; animateTo already handles duration0/animate:false; non-Mac-strict safe default). Minor: name detection+SSR default in R4-A.
Q3 races/repeat — CLOSED (wheel zoom direct not animated; animateTo cancels prior; cancelAnimation on each wheel).
Q4 empty/boundary — CLOSED (zoomAt early-return at clamp; zoom:'none' row 6).
Q5 rollback — CLOSED (§5; opt-out 'shift'; revert R4-*).

GATE: GREEN
