# T20 — Staff tier-3 expand-in-place

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** T08 staff 3-tier ✅

---

## TDD

### Success
- [x] default: tier-3 cards only (no child positions)
- [x] `expandedOrgIds: ['sub']` → child staff under that card; focus unchanged
- [x] empty child expand → no throw, no extra nodes
- [x] sibling card `x` clears expanded column width

### Failure
- [x] expand id not a direct child → ignored + diagnostic
- [x] unknown `currentOrgId` → still throws

---

## Delivered

- `StaffLayoutOptions.expandedOrgIds` / `maxExpandedOrgCards` (default 1)
- `StaffOrgCard.expanded`
- Diagram: `toggleStaffOrgExpand`, `getStaffExpandedOrgIds`; card click toggles expand
- `focusStaffOrg` clears expands (drill path)
- SVG export threads `expandedOrgIds`
- Demo staff-tree status shows expanded ids

## Out of scope

- Nested grandchild cards under expand
- Multi-expand reflow beyond column stride
- TD07 promote overlay
