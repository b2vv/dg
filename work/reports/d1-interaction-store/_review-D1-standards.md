claude-opus-4-8

NEXT: read .claude/standards.md, work/CODING_STANDARDS.md, then the full `git --no-pager diff main` for D1.

FACT: Read standards.md + CODING_STANDARDS.md. §0 hierarchy KISS>SOLID>DRY>CleanCode>CleanArch>GoF>Pocock. Library exports need explicit return types. No enum. import type. No `as`/`any` without justification.
FACT: InteractionStore.ts COMPOSES SelectionStore (private field `selection`), adds `hovered` + own listener Set. No modification to SelectionStore visible in store diff. Emit has try/catch + warn-once WeakSet. Listeners stored as `{callback}` entry objects (identity-stable unsubscribe). `.js` imports present. interactionState.ts interface readonly fields, import type NodeRef.
FACT: index.ts barrel adds `export type { InteractionState }` + `export { relatedStaffIds, staffDimmedIds }`. No `ForTests` export. 
FACT: Facade: selectionStore -> interactionStore (compose). subscribeInteraction + setHovered added with explicit return types. reconcile wired in data setter. setInteractionSource seam wired on create. unsubscribeInteractionPaint cleaned in destroy. USAGE.md § interaction added documenting subscribeInteraction/setHovered/InteractionState.
NEXT: read render diffs (DiagramRenderer, PersonNode, OrganizationNode, staffRelated) + SelectionStore unchanged + demo diffs.

FACT: Render diffs — DiagramRenderer adds InteractionSource interface + setInteractionSource/bindInteraction/paintInteraction/interactionViewKey; selected>hovered priority via selectedViewKeys; far-LOD excluded from positionIds; rollback paints null on source removal. PersonNode/OrganizationNode add onHover opt + setHoverHandler; setHovered made public; PersonNode.setHovered now reads this.styleRef (null-guarded) instead of style param — behavior preserved.
FACT: Demo — installStaffHoverHighlight (imperative DOM toggling) DELETED; relatedStaffIds relocated to SDK render/staffRelated.ts (DRY single source). Card/backdrop now React-state driven via useStaffHovered subscription. SelectionStore diff EMPTY (unchanged). No packages/core touched (pure TS, WASM boundary intact).
FACT: No eslint/oxlint-disable, no @ts-ignore, no `any` in changed files (grep exit 1). `npm run lint` exit 0. No *ForTests in barrel.
FACT: Tests run independently GREEN — SDK interaction suites (InteractionStore 13, DiagramRenderer.interaction, OrgHierarchyDiagram.interaction, staffRelated, Person/Org node interaction) all pass; demo ShpsStaffCard+StaffChromeBackdrop 15 pass.
FACT: Adversarial check — new tests are behavior-driven, delete-the-feature-turns-red:
  - null-rollback: asserts alpha returns 1 after setInteractionSource(null); deleting rollback branch → stays 0.45 → red.
  - selected>hovered: asserts hoverRing.visible=false on selected seat; deleting `&& !selectedViewKeys.has(key)` → red.
  - staffRelated purity: clears returned set, re-derives, asserts inputs intact.
  - D1-D pointer→setHovered: asserts setHovered calls AND explicit "Input alone cannot paint" (opacity unchanged until emit) — strong anti-false-green.
  - far-LOD guard: far/mid paint [1,1,1] alpha, no hoverRing.
  No fake/stub masking real behavior found. React tests drive real createRoot + act + real subscription.
FACT: NEW public barrel exports relatedStaffIds + staffDimmedIds are NOT in docs/USAGE.md (grep exit 1). check:docs gate only governs OrgHierarchyDiagram methods, so no gate failure; but Constitution "public API not changed silently" → minor doc gap. [non-blocking]
DECISION: No blocking findings. Standards (KISS compose, return types, import type, no enum/any, dead-code removed, DRY relocation, WASM untouched, isolation present+tested) all met. VERDICT GREEN with one non-blocking doc note.
