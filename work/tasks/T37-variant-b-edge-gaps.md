# T37 — Variant B readable report edges

**Пріоритет:** P0  
**Статус:** done  
**Контекст:** після T32/T36 gap=0 + card≈cell → border-to-border stubs ≈4px

## Проблема

На Variant B усі admin-ребра виглядають як короткі «тики»: між сусідніми картками лише inset 2+2 px при `horizontalGap/verticalGap = 0`.

## Рішення

- `VARIANT_B_HORIZONTAL_GAP = 24`, `VARIANT_B_VERTICAL_GAP = 28`
- Картки лишаються option A (136×156 у 140×160)
- Contour pitch = cell + gap через існуючий `contourWorldTransform`
- Demo tabs Variant B + Worker використовують ті самі константи

## Tests

- `variantBEdgeGaps.test.ts` — clearance + min polyline length; gap-0 documents stub bug
- `variantBContourAlign.test.ts` — IT centers still inside / CEO outside with pitch gaps

## Verify

```bash
npm test && npm run typecheck
```
