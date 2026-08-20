# T09 — Staff report edges + demo drill

**Пріоритет:** P0  
**Статус:** in progress  
**Залежності:** T08 ✅

---

## TDD

### Success
- [ ] admin edge: segment from parent bottom-center → child top-center
- [ ] matrix/dotted edges use distinct stroke style (dashed)
- [ ] DiagramRenderer staff path draws `canvas.edges`
- [ ] Demo `staff-tree` tab: tree layout + Tier-3 drill via `focusStaffOrg`

### Failure
- [ ] edge with missing endpoint id → skipped (no throw)
- [ ] empty edges → empty graphics / no crash

---

## Scope

```
packages/sdk/src/render/StaffEdgesView.ts
packages/sdk/src/render/staffEdgeGeometry.ts
packages/demo/src/scenarios/staffTree.ts
```

Wire person `onNodeClick` in staff render path.
