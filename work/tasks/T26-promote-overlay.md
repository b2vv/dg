# T26 — Pixi + React promote overlay (TD07)

**Пріоритет:** P2 (v1.x)  
**Статус:** done (first slice)  
**Залежності:** v1 ✅, T10 React host ✅, T13 LOD ✅

---

## Goal

Optional HTML/React layer over Pixi: selected nodes (near LOD) are **promoted** to React cards synced to the camera; Pixi views for those ids are hidden.

---

## TDD

### Success
- [x] `worldBoxToScreen` applies scale then pan
- [x] `near-selection` promotes only at near LOD
- [x] React overlay mounts DefaultPromoteCard / custom component with screenRect
- [x] `setPromotedNodeIds` hides Pixi counterparts

### Failure
- [x] mid/far + near-selection → demote (empty)
- [x] off / no selection → empty
- [x] off-screen rect filtered via `screenRectInView`

---

## API

```ts
import {
  createReactPromoteOverlay,
  DefaultPromoteCard,
} from '@org-hierarchy/sdk/react';

const promote = createReactPromoteOverlay({
  diagram,
  mount: container,
  mode: 'near-selection', // | 'selection' | 'off'
  component: DefaultPromoteCard, // or custom with Chart.js children
});
promote.dispose();
```

Core helpers (React-free): `worldBoxToScreen`, `resolvePromoteIds`,  
`diagram.listPromoteCandidates`, `diagram.setPromotedNodeIds`, `subscribePromoteSync`.

## Export strategy

**Interactive-only:** SVG/PNG/PDF export stays Pixi/canvas; promote HTML is not rasterized. Demote before export if you need pixel-perfect parity with on-screen chrome (host responsibility).

## Out of scope (later)

- Promoting every near-viewport node (mass HTML)
- Hit-test forwarding from HTML → Pixi drag
- Automatic Chart.js dependency
