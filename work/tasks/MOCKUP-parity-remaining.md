# Mockup parity — remaining work (locked decisions)

**Status:** 🟢 shipped (2026-08-23)  
**Related:** [MOCKUP-styles-review.md](./MOCKUP-styles-review.md) · [MOCKUP-edge-map-discussion.md](./MOCKUP-edge-map-discussion.md) · [node-compare/](./node-compare/)

---

## Що було відсутнє (gap list)

| # | Gap | Fix |
|---|---|---|
| G1 | Staff diagram at **mid LOD** (fit zoom 0.55 < midMax 1.2) → thin name band, no avatar/title | Mockup tabs: `lodThresholds.midMax = 0.5` |
| G2 | **Dotted** deputy → unit manager missing in fixture | `reportLines`: `pos-1z → pos-u-h` kind `dotted` |
| G3 | Cross-org dotted not painted (edges filtered per org block) | `layoutStaffCanvas`: append visible matrix/dotted across orgs |
| G4 | Contract test contradicted style doc (`no dotted`) | Update `mockupFigma.test.ts` |
| G5 | Edge map doc unapproved | Lock decisions below; update after ship |
| G6 | E2e staff snapshots stale | Regenerate `mockup-staff-*.png` |
| G7 | Node compare shows LOD drift | Re-run `npm run compare:nodes` after G1 |

**Deferred (not in this pass):**

| # | Item | Reason |
|---|---|---|
| D1 | Tier-1 holding CEO position | Mockup focus = `region`; org tree context only |
| D2 | Riley Quinn reporting line change | Current admin child of head kept |
| D3 | Cross-tier routing geometry (line appears from Riley column) | Cosmetic routing; separate if still visible |
| D4 | Org counts badge Y drift | Minor; track in node-compare overlay |
| D5 | `testIdForRef` prefers person over position | Workaround via person.testId |

---

## Locked decisions (R1–R5)

| ID | Decision |
|---|---|
| R1 | **Yes** — decorative dotted `Jordan Blake (pos-1z) → Taylor Brooks (pos-u-h)` |
| R2 | **Both** — keep SDK `cross-tier` head → org card **and** dotted people link |
| R3 | **No** tier-1 holding CEO seat |
| R4 | **Keep** Riley Quinn as direct admin report of regional director |
| R5 | **Style doc wins** — fixture + tests require dotted cross-org |

---

## Done criteria

- [x] G1–G4 implemented
- [x] `npm test` green
- [x] `npm run test:e2e -- e2e/mockups.spec.ts` + snapshot update
- [x] `npm run compare:nodes` — person diagram crops ≈ isolated (near LOD)
- [ ] Push `main`

---

## Change log

| Date | Action |
|---|---|
| 2026-08-23 | Gap list + locked decisions; implementation started |
| 2026-08-23 | Shipped: LOD thresholds, dotted edge, cross-org paint, tests + snapshots |
