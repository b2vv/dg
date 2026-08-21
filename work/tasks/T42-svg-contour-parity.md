# T42 — SVG contour parity with live canvas

**Пріоритет:** P1  
**Статус:** done  

## Problem

SVG export used raw WASM paths (no fillet/nudge), thick blue stroke under cards, and no admin arrows — drifted from T38–T41 canvas polish.

## Delivered

- Shared `polishContourRing` (fillet → AABB clearance) used by `DiagramRenderer` + `svgExport`
- SVG: quiet fill α, stroke in `department-strokes` **after** persons
- SVG admin/cross-tier arrowheads
- `preferNotch: true` on export contour compute

## Tests

- `contourPolish.test.ts`
- `export.test.ts` — stroke group order

## Verify

```bash
npm test && npm run typecheck
```
