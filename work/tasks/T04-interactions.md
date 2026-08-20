# T04 — Взаємодія: D&D, search, context menu, block shift

**Пріоритет:** P2  
**Статус:** done (v1 core)  
**Залежності:** T01, T03, contour G8

---

## TDD

### Success tests
- [x] click PersonNode → `onNodeClick` з правильним `NodeRef` (staff path + selection)
- [x] `search('Alice')` → non-empty `SearchResult[]`
- [x] `revealPath(nodeId)` → expanded orgs на шляху до root
- [x] drag person → `onLayoutChange({ type: 'position-move', ... })` (API + pointer drag end)

### Failure tests
- [x] `search('')` → `[]`
- [x] `search` без index → `[]`
- [x] drag на invalid cell → snap back / reject (`movePersonToCell` + drag)
- [x] `appendData` з invalid mapper → throw
- [x] `focusNode('unknown')` → no-op (`false`)

---

## Delivered

```
packages/sdk/src/interaction/
  types.ts, searchIndex.ts, revealPath.ts, positionMove.ts,
  selection.ts, contextMenu.ts
```

Public API: `search`, `revealPath`, `focusNode`, `select`, `movePersonToCell`, `shiftBlock`,
`onSelectionChange`, `onContextMenu` (hook; HTML menu UI follow-up).

Demo: toolbar search → revealPath + focus.

### Follow-up
- Floating HTML context menu UI
- Full worker-built search index for 2M (T16 delivered chunked async + byChar; worker path still backlog)
