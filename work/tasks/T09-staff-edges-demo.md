# T09 — Staff report edges + demo drill

**Пріоритет:** P0  
**Статус:** done  
**Залежності:** T08 ✅

---

## TDD

### Success
- [x] admin edge: segment from parent bottom-center → child top-center
- [x] matrix/dotted edges use distinct stroke style (dashed)
- [x] DiagramRenderer staff path draws `canvas.edges`
- [x] Demo `staff-tree` tab: tree layout + Tier-3 drill via `focusStaffOrg`

### Failure
- [x] edge with missing endpoint id → skipped (no throw)
- [x] empty edges → empty graphics / no crash

---

## Scope

```
packages/sdk/src/render/StaffEdgesView.ts
packages/sdk/src/render/staffEdgeGeometry.ts
packages/demo/src/scenarios/staffTree.ts
```

Wire person `onNodeClick` in staff render path.
