# T73 — Remaining agreements (post T69 / T70 Phase1)

**Status:** ✅ closed (2026-08-23) — T70p2, T67p1, T65 done; T61 deferred  
**Date:** 2026-08-22  
**Branch context:** after T64, T66, T70 Phase0, T63, T68; siblings implement T69 + T70 Phase1  
**SoT types:** [T72](./T72-types-algorithms-agreement.md) · `packages/sdk/src/data/types.ts`

---

## Implement order (after T69 + T70 Phase1 land)

| Order | Ticket | Why |
|------:|--------|-----|
| 1 | **T70 Phase 2** | Types mostly exist (T72); pure paint/prefetch; closes E4–E7 / E11 for cutover visuals |
| 2 | **T67 Phase 1** | Product “next tasks”; Set selection API only — no marquee |
| 3 | **T65** | Non-cutover UX polish (B9 placement); fake edges already ✅ |
| 4 | **T61** | **New feature, not migration cost** — wait for mockup |

---

## T70 Phase 2 — field → paint mapping

Additive optional fields already on types (T72). Proposed mapping for implementers:

| Parity | Field(s) | Where | Paint / behavior |
|--------|----------|-------|------------------|
| **E4** | `DiagramOrganization.isTemporary?: boolean` | Org card | Temp marker on **org** (clock or compact badge). Scale with symbol box (near/mid). PersonNode already uses corner **「T」** for `position.isTemporary` — org may reuse glyph style or a small clock icon; same corner convention (top-right). |
| **E5** | `filledCount?`, `vacantCount?` | Org card | Badge text `` `${filledCount} [${vacantCount}]` `` when either count is defined. Omit badge if both omitted. LOD: near/mid. |
| **E6** | `unitCode?: string` | Org card | Caption under name (or beside group line); truncate like other captions. Empty/omit → no row. |
| **E7** vacancy | `DiagramPosition.status === 'vacant'` (+ missing `personId`) | Position / PersonNode | Show vacancy copy on name slot (not bare `—`). Prefer host-overridable later; Phase 2 default uk **`(вакансія)`**. |
| **E7** period chip | `periodStart?` / `periodEnd?` / `periodLabel?` on **position** | Position card | Green chip / short line **above or on** the seat (reuse `formatOrgPeriodLabel` / shared formatter). **Separate from T68** org period line. |
| **E7** detached cue | (optional visual only) | Position | If T65 `detached` lands later, optional muted chrome; **not required** for T70p2 cutover. |
| **E11** | `symbolUrlLight` + `symbolUrlDark` | Org media | On mount / theme apply: `loadNodeTexture` for **active** URL (existing) **and** prefetch the **inactive** theme URL into the same URL cache so `setTheme` flips without wait. Opt-in or always-on when both URLs present — see open Q below. |

### Agreed (no product needed)

- Prefer **existing T72 fields**; do not invent parallel count/period shapes.
- T68 org period stays on org; E7 period chip is **position-only**.
- E2 fixed AABB: Phase 2 chrome must fit inside existing card box (no layout engine change).
- Promote (E9) near/selection only — out of Phase 2.

### Open questions (product) — ≤5 total for T73

See [§ Open questions](#open-questions-product--max-5) below. For T70p2 specifically: Q1–Q3.

---

## T65 — Multi-root / detached placement (B9)

| | |
|--|--|
| **Cutover blocker?** | **No** — confirm still non-cutover |
| **Already done** | No fake reportLine to invented parent (edges only from `reportLines`) |
| **Gap** | WASM path re-parents orphans **under head** for a unique root (`orgBlockLayout`) → seat sits in head column visually |
| **Proposal** | `position.detached?: true` **or** membership in an “unassigned” bucket; pack into a side column / zone; virtual root stays internal — **do not paint** edge to it |
| **Non-goals** | Host modal UI; full multi-root org forest; “fix” `hierarchy.rs` as migration work; conflating with T61 |

Detail + acceptance: [T65](./T65-multi-root-forest.md).

---

## T67 — Multi-select (D2)

| | |
|--|--|
| **Phase 1** | **Set selection API only** (programmatic + modifier click) — **done** |
| **Not in Phase 1** | Marquee / drag-select — **unless** product explicitly orders it later |
| **Current code** | Internal `selections: NodeRef[]`; `getSelection(): NodeRef \| null` = primary/first; `getSelections()`; `selectMany` / `toggleSelection` / `clearSelection`; `onSelectionChange?(nodes: NodeRef[])` |
| **API sketch** | See [T67](./T67-multi-select.md) — additive `getSelections()` + keep scalar `getSelection()` |

---

## T61 — Group recursion (B8c)

| | |
|--|--|
| **Classification** | **New feature, not migration cost** |
| **Why** | Legacy GoJS call path effectively dead; no mockup; `DiagramGroup` in `dg` is caption-only |
| **When** | After mockup; after T64 zone paint patterns are stable |
| **Cutover?** | **No** |

Detail: [T61](./T61-group-recursion-tier3.md).

---

## Open questions (product) — max 5

| # | Topic | Default if silent | Needs product? |
|---|--------|-------------------|----------------|
| **Q1** | E5: is badge always `N [M]` = filled \[vacant\], and show when only one side is set? | Yes: `filledCount ?? 0` / `vacantCount ?? 0` only if **at least one** field present; format `N [M]` | Soft — confirm BE semantics later (T72 already noted) |
| **Q2** | E4 org temp: clock icon vs letter **T** (match PersonNode)? | Match PersonNode **T** badge for consistency | Soft |
| **Q3** | E7 vacancy string: hardcode `(вакансія)` vs require `periodLabel`-style host override field? | Hardcode uk in Phase 2; host override = follow-up | Soft |
| **Q4** | E11: always prefetch opposite theme when both URLs exist, or RenderConfig flag? | **Always** when both light+dark URLs present (cheap cache fill) | Soft |
| **Q5** | T67: breaking `getSelection(): NodeRef[]` vs parallel `getSelections()`? | **Parallel** `getSelections()` + keep scalar `getSelection()` = primary/first | Soft — API sketch only until implement |

If product does not answer, implementers use the **Default** column — treat as **agreed**.

---

## Checklist for parent implementer

- [x] T70p2: paint E4–E7 from existing fields; E11 prefetch via `loadNodeTexture`
- [x] T67p1: Set API + ctrl/cmd toggle; **no** marquee copy in UI
- [x] T65: side-zone placement; still P2 / non-cutover
- [x] T61: defer; label as new feature in [T71](./T71-gojs-to-dg-migration-plan.md)
- [x] Do not reopen T72 type shapes unless BE forces rename of E5 counts
