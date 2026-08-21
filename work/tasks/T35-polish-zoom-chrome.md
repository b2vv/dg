# T35 — P1 polish: contour defaults, Hi-DPI zoom, demo chrome

**Пріоритет:** P1  
**Статус:** done  
**План:** [T33](./T33-demo-live-audit-plan.md) A2, A5, B1–B7

## Delivered

### A2 — Contour breathing room
- Demo defaults: `paddingCells: 1`, `smoothIterations: 2`
- Live value labels on Padding / Smooth sliders

### A5 — Zoom sharpness
- Pixi `resolution` = DPR (cap 3) + `autoDensity`
- Resize updates resolution when DPR changes
- `resolvePixiResolution` + unit tests

### B chrome
- Toolbar: remove duplicate −/+/Fit (FAB only); export grouped
- Padding/Smooth disabled outside Variant B
- Search cleared on tab switch
- Friendlier status strings (100k, Variant B, Worker, Mapper)
- 100k starts near `org-1`
- Favicon.svg (fixes Pages 404)
- Richer mapper sample (3 people / 2 orgs)
- Worker result → status (no center toast overlay)
- Hint: right-click **a card**
- Staff demo `tierGap` 72 → 36

## Verify

```bash
npm test && npm run typecheck
```
