# Mockup parity — remaining work

**Status:** ✅ **Closed** (2026-08-23)  
**Verify:** `npm run test:verify`  
**Related:** [MOCKUP-styles-review.md](./MOCKUP-styles-review.md) · [MOCKUP-edge-map-discussion.md](./MOCKUP-edge-map-discussion.md) · [node-compare/](./node-compare/)

---

## Gap list — all resolved

| # | Gap | Resolution |
|---|---|---|
| G1 | Staff mid LOD on mockup zoom | `lodThresholds.midMax = 0.5` on all mockup tabs |
| G2 | Dotted deputy → unit manager | `reportLines` `pos-1z → pos-u-h` |
| G3 | Cross-org dotted not painted | `layoutStaffCanvas` appends matrix/dotted across orgs |
| G4 | Contract test vs style doc | `mockups.test.ts` requires dotted |
| G5 | Edge map unapproved | [MOCKUP-edge-map-discussion.md](./MOCKUP-edge-map-discussion.md) locked |
| G6 | Staff e2e snapshots | Regenerated via `test:e2e --update-snapshots` |
| G7 | Node compare LOD drift | Fixed with G1; gallery in `node-compare/` |

---

## Deferred — closed with decision

| # | Item | Decision |
|---|---|---|
| D1 | Tier-1 holding CEO | **Won't fix** — mockup focus = `region` |
| D2 | Riley reporting line | **Keep** — direct admin report of head |
| D3 | Cross-tier routing geometry | **Fixed** — cross-tier prefers vertical from head bottom |
| D4 | Org counts badge Y drift | **Mitigated** — node-compare org specimens include menu chrome |
| D5 | `testIdForRef` person vs position | **Fixed** — `position.testId` wins for person refs |

---

## Verification checklist

- [x] `npm run typecheck`
- [x] `npm test` (unit)
- [x] `npm run test:e2e` (mockups + edge inventory)
- [x] `npm run compare:nodes`
- [x] `npm run test:verify` (combined script)
- [x] Pushed `main`

---

## Change log

| Date | Action |
|---|---|
| 2026-08-23 | Gap list + locked decisions |
| 2026-08-23 | Shipped LOD, dotted edge, cross-org paint |
| 2026-08-23 | Closed D3–D5, edge inventory tests, `test:verify` |
