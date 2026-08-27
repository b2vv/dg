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

## Still open (later) — ✅ нічого, усе закрито (звірено 2026-08-27)

Список нижче був актуальним на момент T39. Усі три пункти зроблені пізніше, тому лишати їх
як «open» означало б брехати наступному читачеві.

| Пункт | Де закрито |
|---|---|
| Real G7 px padding (T38 B4) | `packages/core/src/contour.rs` — Chebyshev pad (T50, PR #43) |
| Prune vacant tongues (T38 B2) | `contour.rs:391` — «drops only cells farther than `pad` in Chebyshev distance»; тест `g7_peels_far_vacant_tongue_keeps_chebyshev_pad` |
| Notch fillet vs card radius (T38 B3) | `packages/sdk/src/render/contour/contourFillet.ts:31` — «radius ≈ card borderRadius» |
| Contour stroke punch-out above persons (T38 C2) | `packages/sdk/src/render/LayerManager.ts:16,26` — окремий шар `departmentStrokes` **після** `persons` |

## Tests

- `staffEdgeArrows.test.ts`
- existing contour clearance + Variant B suites

## Verify

```bash
npm test && npm run typecheck
```
