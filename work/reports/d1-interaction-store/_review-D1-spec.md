Model: claude-opus-4-8

NEXT: read full diff (InteractionStore.ts, .test.ts, facade, renderer, nodes, staffRelated, demo) and map each of the 17 acceptance rows to a test; verify adversarially.

FACT: Store (D1-A) InteractionStore.ts composes SelectionStore (unchanged), adds hovered + subscribe/emit with listener isolation (warn-once, line 76-82), snapshot iteration ([...listeners]), 0-change=0-emit, reconcile(predicate). Store NEVER stores related/found. OK vs Q1-Q5.
FACT: reconcile signature is reconcile(isPresent: (ref)=>boolean), not plan's literal reconcile(data). Keeps store data-agnostic → MORE faithful to Q1 "no data coupling". Facade data setter supplies predicate over organizations/positions/persons by kind+id (OrgHierarchyDiagram.ts:400-406). Non-blocking deviation.
FACT: far-LOD paints no hover. PersonNode.setHovered + OrganizationNode.setHovered early-return at lod==='far' (hoverRing.visible=false). paintInteraction excludes far PersonNodeViews from positionIds (dimming) and view.setHovered false for far. Node tests assert setHovered(true)@far → ring invisible; renderer for-loop asserts hoverRing.visible===(lod!=='far'). #7f protected — accidental far paint turns red.
FACT: #15 selection wins: paintInteraction sets view.setHovered(key===hoveredKey && !selectedViewKeys.has(key)). Renderer test rows14/15 assert ring hidden when selected+hovered; deleting the `&& !selectedViewKeys` clause → red.
FACT: #14 dimming derived: staffDimmedIds computed each paint; staffRelated.test asserts store.state keys === [hovered,primary,selected] (no related field).
FACT: #8 demo rewired: installStaffHoverHighlight DELETED (grep NONE across packages/). Demo now onPointerEnter→setHovered + useStaffHovered(subscribeInteraction). Test asserts input alone doesn't paint (opacity 0.38 until emit), then subscription drives related opacity.
FACT: #11 reconcile: facade tests "disappearance clears stale hover" + "unknown ref reconciled by kind" + store reconcile test. Covered.
FACT: AC1 parity: facade test asserts onSelectionChange calls [[[a]],[[a,b]],[[b,a]]], getSelection/getSelections; existing OrgHierarchyDiagram.interactions.test still green. onSelectionChange unchanged.
FACT: #12 emphasis untouched: setFoundFocus/highlightPath not in diff; store has no found/highlight; renderer test "found focus survive hover and selection" asserts found set unchanged + combined alpha foundDimAlpha*0.45.
FACT: paintInteraction re-applies found-focus emphasisAlpha (same formula as repaintHighlight:992, found-only). Path(reportPath) dims EDGES only, not node cards — no clobber. Mild coupling: emphasis node-alpha now also computed in interaction paint path; tested correct (row12). Non-blocking.
FACT: Seam §4.1: facade setInteractionSource({getHovered,setHovered}) + subscribe→onNeedsPaint (not render). Test asserts requestPaint called, render NOT called, 0-change→no paint. Matches.
FACT: Targeted run: 83/83 pass across the 6 interaction test files, 0 failures.
DECISION: All 17 rows mapped to tests; #16 manual (expected, no automated test). No row true-without-feature; each adversarial deletion reasoned red. No owner-decision contradiction. Public surface additions documented (USAGE §Interaction, barrel).
VERDICT: GREEN
