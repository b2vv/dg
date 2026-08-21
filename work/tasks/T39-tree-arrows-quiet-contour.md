# T39 — Tree arrows + quieter contour (T38 remaining)

**Пріоритет:** P0/P1  
**Статус:** done  
**База:** T38 A1 clearance already on main (#31)

## Already done (not this PR)

| Item | Where |
|------|--------|
| Contour stroke clear of cards + round joins | T38 / #31 |
| Variant B edge corridor gaps | T37 |
| Stronger admin stroke (partial) | T38 |

## Delivered here

1. **Admin / cross-tier arrowheads** — filled triangles at child ports (`staffEdgeArrows.ts`); polyline shortened so tip sits on the card border.
2. **Quieter department chrome** — fill α 0.28 / 0.32, stroke 0.9 (was 0.42/0.45 + 1.25) so the tree reads over the blob.
3. **Demo Smooth default 1** — fewer empty U-tongues than Smooth=2; slider still 0–4.
4. Caption updated to name arrows vs blue wash.

## Still open (later)

- Real G7 px padding / morphological prune of vacant tongues (T38 B2/B4)
- Notch fillet vs card radius (T38 B3)
- Contour stroke punch-out above persons (T38 C2)

## Tests

- `staffEdgeArrows.test.ts`
- existing contour clearance + Variant B suites

## Verify

```bash
npm test && npm run typecheck
```
