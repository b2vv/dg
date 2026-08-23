# T55 — `testId` + DOM anchors для nodes (search / focus / e2e)

**Пріоритет:** P1  
**Статус:** done  
**API surface:** data model + diagram + optional overlay

---

## Проблема

Pixi-ноди **не в DOM** — Playwright/Cypress не можуть стабільно `click()` по org/person без координат.

## Реалізація

### Data model

`testId?: string` на `DiagramOrganization`, `DiagramPerson`, `DiagramPosition`.  
DOM: `data-testid="node-${testId ?? id}"`.

### SDK API

- `diagram.resolveTestId(raw)` → `NodeRef | null`
- `diagram.focusByTestId(raw)` → expand collapsed org + revealPath
- `diagram.listTestAnchors()` → bounds + testId для overlay
- `diagram.openContextMenu(ref, pointer?)` — e2e / programmatic
- Search haystack включає testId

### React overlay

`createTestAnchorOverlay({ diagram, mount, interactive? })` — sync on promote/viewport.  
`interactive: true` → click → `focusByTestId`, contextmenu → `openContextMenu`.

### Demo

- `?e2e=1` → overlay + `data-testid="diagram-ready"`
- Flat orgs: `testId: 'root'` на org-1
- Variant B: `testId: 'ceo'` на CEO person

## Acceptance

- [x] `testId?` на org/person/position types
- [x] `createTestAnchorOverlay`
- [x] `resolveTestId` / `focusByTestId` / `listTestAnchors` / `openContextMenu`
- [x] Search index включає `testId`
- [x] Unit: `nodeTestId.test.ts`, `createTestAnchorOverlay.test.ts`
- [x] E2E (T54): `getByTestId('node-root').click()`

## Verify

```bash
npm test
npm run test:e2e
```
