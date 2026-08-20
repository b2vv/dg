# T04 — Взаємодія: D&D, search, context menu, block shift

**Пріоритет:** P2  
**Статус:** todo  
**Оцінка складності:** висока  
**Залежності:** T01, T03, contour G8

---

## Мета

Реалізувати user interactions з `docs/REQUIREMENTS.md` §4.7.

---

## Sub-tasks

### 4.1 Click / select / focus

| Event | Behavior |
|-------|----------|
| Click node | select, emit `onNodeClick` |
| Click canvas | deselect |
| Focus from API | `diagram.focusNode(id)` — pan viewport |

**Implementation:**

- Pixi eventMode + hitArea per node
- Selection overlay (stroke highlight)
- `NodeRef` type: `{ kind, id, organizationId?, departmentId? }`

### 4.2 Context menu

**Open question (REQUIREMENTS §8):** SDK fixed actions vs host-only?

**Proposed hybrid:**

```ts
onContextMenu?(node: NodeRef, defaultItems: MenuItem[]): MenuItem[] | void
```

Default SDK items:

- Expand / Collapse (org)
- Focus subtree
- Export subtree (links to T05)
- Copy node id

Host може filter/replace через return value.

**UI:** native `contextmenu` preventDefault + floating HTML menu або Pixi-based

### 4.3 Search + path expand

```
Input: query string
1. Index: org names, person fullName (worker-built trie/hash)
2. Match → NodeRef[]
3. On select:
   a. Expand org path to root (mutate collapsed flags)
   b. Re-layout row-tree if needed
   c. Pan/zoom to node
   d. Highlight path edges
```

**Scale note:** index 2M persons — build in worker, lazy load chunks

```ts
diagram.search(query: string): Promise<SearchResult[]>
diagram.revealPath(nodeId: string): Promise<void>
```

### 4.4 D&D person (staff)

```
On drag PersonNode:
1. Snap to grid (col, row)
2. Update position.layoutCoords or col/row
3. Debounce 16ms → computeAllContours (worker)
4. Animate DepartmentBlob morph (G8 stable)
5. Emit onLayoutChange({ type: 'position-move', positionId, col, row })
```

**Constraints:**

- Не drop на foreign-only cell без dept change (business rule TBD)
- Vacant position — drag slot only

### 4.5 D&D org (matrix)

Див. T03 — matrix reorder

### 4.6 Block shift ↑↓

```
Input: selected position block (same hierarchyLevel + department)
Action: shift level ±1

1. Identify block by hierarchyLevel + departmentId
2. Increment/decrement hierarchyLevel for all block positions
3. Re-run dept tetris pack (future WASM) OR simple row shift
4. Recompute contours
5. onLayoutChange({ type: 'block-shift', ids, delta })
```

**Note:** повний tetris pack — може бути sub-task; v1 = row coordinate shift

### 4.7 Incremental build

```ts
diagram.appendData(chunk, mappers?)
  → mergePartial
  → diff affected depts/orgs
  → partial re-layout + partial contour recompute
```

---

## Callbacks (public API)

```ts
interface OrgHierarchyCallbacks {
  onNodeClick?(node: NodeRef): void;
  onContextMenu?(node: NodeRef, items: MenuItem[]): MenuItem[] | void;
  onLayoutChange?(patch: LayoutPatch): void;
  onSelectionChange?(nodes: NodeRef[]): void;
}
```

```ts
type LayoutPatch =
  | { type: 'position-move'; positionId: string; col: number; row: number }
  | { type: 'matrix-reorder'; orgId: string; newIndex: number }
  | { type: 'block-shift'; positionIds: string[]; deltaLevel: number };
```

---

## Acceptance criteria

- [ ] Click selects person/org, callback fires
- [ ] Search "CEO" → expand path → focus node
- [ ] Drag person in VARIANT_B → contour IT updates без правої лінії CEO
- [ ] Context menu shows defaults, host can override
- [ ] Block shift moves 3+ positions together
- [ ] appendData adds nodes without full reload flash

---

## Референси

- `docs/REQUIREMENTS.md` §4.7, §4.10
- `work/SPEC.md` §7
