# T08 — Staff 3-tier layout (matrix | tree | hybrid)

**Пріоритет:** P0  
**Статус:** done  
**Залежності:** T01, T03, SPEC §2.2

---

## TDD

### Success
- [x] `resolveStaffHead` — одна `isHead` → id
- [x] `resolveStaffHead` — один parentless → id
- [x] all positions з coords → matrix AABB з pitch + size
- [x] no coords → tree layout (positions мають y за depth)
- [x] hybrid: anchors нерухомі, floating отримує coords
- [x] `layoutStaffCanvas`: tier2 focus + tier3 cards; tier1 optional

### Failure
- [x] кілька `isHead` → throw
- [x] нуль parentless і без isHead → throw
- [x] `staffCoordMode: 'strict'` + мікс → throw
- [x] unknown `currentOrgId` → throw

---

## Scope v1

```
packages/sdk/src/layout/staff/
  types.ts
  resolveHead.ts
  coords.ts
  orgBlockLayout.ts
  canvasLayout.ts
  staffLayout.test.ts
```

Wire: DiagramRenderer staff path через `layoutStaffCanvas` коли `options.staff?.currentOrgId` або auto-detect.

Public API: `staffCurrentOrgId`, `setStaffFocus` / `getStaffFocus` / `focusStaffOrg`, re-exports staff layout helpers.

Demo: follow-up (matrix-all-coords path works without `isHead`).
