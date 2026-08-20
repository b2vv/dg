# T10 — React context menu host

**Пріоритет:** P1  
**Статус:** done  
**Залежності:** T04

---

## TDD

### Success
- [x] `resolveContextMenuNodeData` — person → person/position/org/dept
- [x] `createReactContextMenuHost` mounts React component with `request.node`
- [x] menu action closes host and can call `runContextMenuAction`

### Failure
- [x] unknown node ids → sparse payload, ref preserved

---

## API

```ts
import { createReactContextMenuHost, DefaultReactContextMenu } from '@org-hierarchy/sdk/react';

const menu = createReactContextMenuHost({
  component: DefaultReactContextMenu, // or host React component
  onAction: (item, request) => diagram.runContextMenuAction(item.id, request),
});

OrgHierarchyDiagram.create(el, {
  callbacks: {
    onContextMenu: (request) => menu.handleContextMenu(request),
  },
});
```

`request.node` includes `ref`, `person`, `position`, `organization`, `department`.
`request.pointer` has `clientX` / `clientY` for placement.
