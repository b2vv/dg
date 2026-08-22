# T52 — Node chrome + context menu

**Пріоритет:** P1  
**Статус:** done (branch `cursor/t52-node-chrome-context-menu-babc`)

## Delivered

- ⋮ menu on person (top-left) and org (top-right) cards — touch/mobile
- Tree orgs: `+` / `−` expand/collapse on flat-orgs / 100k
- Staff org cards: `▼` / `▲` expand-in-place toggle
- `DefaultReactContextMenu` backdrop + clamp; host enables `pointer-events` while open
- Delegated chrome hit-test (`activateChromePointer`) when Pixi child targeting misses small buttons
- Edges / contour strokes layers `eventMode: none` — no hit steal

## Verify

```bash
npm test && npm run typecheck
```

Demo: Flat orgs → ⋮ context menu, + expand; Variant B → ⋮ on person cards; Staff tree → org ▼/▲.
