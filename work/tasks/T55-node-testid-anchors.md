# T55 — `testId` + DOM anchors для nodes (search / focus / e2e)

**Пріоритет:** P1  
**Статус:** planned  
**Залежить від:** T54 e2e  
**API surface:** data model + diagram + optional overlay

---

## Проблема

Pixi-ноди **не в DOM** — Playwright/Cypress не можуть стабільно `click()` по org/person без координат. Search/focus працюють по `id`, але e2e потребує стабільних селекторів.

## Пропозиція API

### 1. Data model (optional field)

```typescript
interface DiagramOrganization {
  id: string;
  testId?: string;  // stable e2e; default → id
  ...
}
interface DiagramPerson {
  id: string;
  testId?: string;
  ...
}
interface DiagramPosition {
  id: string;
  testId?: string;
  ...
}
```

**Convention:** DOM attribute `data-testid="node-${testId ?? id}"` (prefix уникає колізій з toolbar).

### 2. DOM anchor layer (recommended)

React-optional host, аналог promote overlay:

```
diagram-mount
  canvas (Pixi)
  [data-org-hierarchy-test-anchors]  ← position:absolute; pointer-events:none; inset:0
    div[data-testid="node-org-1"][data-node-kind="organization"]
    div[data-testid="node-person-alice"][data-node-kind="person"]
```

- Sync on `subscribePromoteSync` / viewport change / render
- Screen rect = `worldBoxToScreen(box, viewport)` (reuse `promoteMath`)
- `pointer-events: none` — кліки проходять у canvas; для e2e Playwright **`force: true`** або `dispatchEvent` на anchor **або** `pointer-events: auto` лише в `testMode`

### 3. Diagram API extensions

```typescript
// Resolve testId → NodeRef (first match)
diagram.resolveTestId('root-ministry'): NodeRef | null

// Focus by testId (expand path + pan) — wraps revealPath/focusNode
await diagram.focusByTestId('root-ministry')

// Search includes testId index (worker search index extension)
await diagram.search('root-ministry')  // hits testId + name + id
```

### 4. Demo wiring

- Flat orgs: `testId: 'root'` на org-1 для smoke e2e
- 100k: `testId` не обов’язковий — `id` = `org-N` достатньо
- Mount flag: `testAnchors: true` (default false in prod build, true in e2e)

## Альтернативи (відхилено / defer)

| Підхід | Мінус |
|--------|-------|
| Лише `id` в testId | Достатньо для demo, але не stable при mapper JSON |
| Canvas pixel click | Крихко при LOD/zoom/DPR |
| aria on canvas | Не дає per-node hit targets |

## Acceptance

- [ ] `testId?` на org/person/position types + mapper passthrough
- [ ] `createTestAnchorOverlay` або розширення promote host
- [ ] `resolveTestId` / `focusByTestId` on `OrgHierarchyDiagram`
- [ ] Search index включає `testId`
- [ ] Unit: resolve + screen rect sync
- [ ] E2E (T54): `getByTestId('node-root').click()`

## Verify

```bash
npm test
npm run test:e2e  # after T54
```
