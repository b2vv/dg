# T03 — Org matrix та row-tree layout

**Пріоритет:** P1  
**Статус:** done  
**Залежності:** T01 ✅, WASM layout ✅

---

## TDD

### Success tests
- [x] `detectOrgMode(all collapsed)` → `'matrix'`
- [x] `detectOrgMode(one expanded)` → `'row-tree'`
- [x] `computeOrgRowTreeLayout(10 org, rootId)` → nodes з monotonic depth по y
- [x] matrix D&D swap → `matrixOrder` оновлюється

### Failure tests
- [x] cycle у `parentOrgId` → throw
- [x] `expandedRootId` не існує → throw
- [x] empty organizations → empty layout
- [x] duplicate org ids → reject

---

## Реалізовано

```
packages/sdk/src/layout/
  types.ts, orgMode.ts, matrixLayout.ts, rowTreeLayout.ts, orgTree.ts
packages/sdk/src/render/OrgEdgesView.ts
```

### API

```ts
import {
  detectOrgMode,
  computeOrgLayout,
  computeOrgRowTreeLayout,
} from '@org-hierarchy/sdk';

const diagram = await OrgHierarchyDiagram.create(el, { data, callbacks: {
  onNodeClick: ({ id }) => diagram.expandOrg(id),
  onOrgModeChange: (mode) => console.log(mode),
}});

await diagram.expandOrg('org-1');      // matrix → row-tree
await diagram.collapseAllOrgs();       // row-tree → matrix
await diagram.reorderOrg('org-3', 0);  // matrix D&D
diagram.getOrgMode();                  // 'matrix' | 'row-tree'
```

### Demo
- **Flat orgs** tab: matrix grid + edges, click org → expand (row-tree), Collapse all

---

## Acceptance criteria

- [x] 24 org demo: collapsed → matrix view
- [x] Expand 1 org → row-tree з WASM layout
- [x] Collapse all → matrix
- [x] `reorderOrg` + `onLayoutChange`
- [x] Edges rendered (OrgEdgesView)
- [x] 37 SDK tests pass
