# NODE interactions contract (mandatory)

**Status:** active · **Enforced by:** `nodeInteractions.contract.test.ts`, `e2e/node-interactions.spec.ts`  
**Scope:** Pixi node cards (org / person / position) — standard product behaviour, independent of mockup chrome.

Do **not** weaken or skip these tests without explicit product sign-off.

---

## Context menu (CTX)

| ID | Behaviour | Trigger |
|---|---|---|
| **CTX-1** | Org card opens host context menu | Right-click card body |
| **CTX-2** | Filled person card opens host context menu | Right-click card body |
| **CTX-3** | Vacant position opens host context menu (position ref, title in payload) | Right-click card body |
| **CTX-4** | ⋮ chrome opens same menu as right-click | `pointertap` on menu button (touch / no RMB) |
| **CTX-5** | Right-click must **not** select node or fire `onNodeClick` | Pixi emits `pointertap` after `rightclick` with `button === 2` — ignore it |

Host wiring: `callbacks.onContextMenu` receives `ContextMenuRequest` with resolved `node.person` / `node.organization` / `node.position`.

---

## Selection (SEL)

| ID | Behaviour | Trigger |
|---|---|---|
| **SEL-1** | Primary click selects org and fires `onNodeClick` | Left `pointertap` (`button !== 2`) |
| **SEL-2** | Primary click selects person and fires `onNodeClick` | Left `pointertap` |
| **SEL-3** | Ctrl/Cmd/Shift+click toggles multi-select without double-click | Modifier + `pointertap` |

---

## Double-click (DBL)

| ID | Behaviour | Trigger |
|---|---|---|
| **DBL-1** | Two primary taps → one `onNodeClick` + one `onNodeDoubleClick` | Body `pointertap` ×2 |
| **DBL-2** | Chrome tap (⋮, expand) must not count toward double-click | `activateChromePointer` first |

(Covered in `nodeDoubleClick.interactions.test.ts`; listed here for completeness.)

---

## Layers (LAY)

| ID | Behaviour |
|---|---|
| **LAY-1** | Edges, department strokes, staff zones: `eventMode: 'none'` — must not steal pointer hits from cards |

---

## Verify

```bash
npm run test:contract    # unit contract suite (SDK)
npm run test:e2e -- e2e/node-interactions.spec.ts
npm run test:verify      # full gate (includes contract + e2e)
```

---

## Changelog

| Date | Note |
|---|---|
| 2026-08-23 | Initial contract after right-click regression (pointertap closed menu via `onNodeClick`) |
