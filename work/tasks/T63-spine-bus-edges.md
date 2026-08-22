# T63 — Spine / шина / райзери для org-matrix (B3)

**Пріоритет:** P1  
**Статус:** planned  
**Parity:** B3  
**Зв’язок:** T03 matrix, T34/T37 edges, легасі `matrix-group.layout.ts`

---

## Вимога

У GoJS org-matrix підлеглі в сітці з’єднані зі батьком через **спільний візуальний стиль**:

- вертикальний **стовбур (spine)**;
- горизонтальна **шина (bus)** на рядок сітки;
- **райзери** від шини до карток.

Це **стиль ребер / декор**, не окремий layout-прохід. Координати карток дає BE (`matrixRow`/`matrixCol`) — у `dg` вже рідне (B2 ✅).

## Чому gap

`dg` малює ортогональні шляхи **по-ребру** (часто з обходом перешкод). Спільної шини на рядок немає → візуально «інший» matrix vs легасі.

На скрінах **штатки (посади)** spine може не бути — T63 стосується **org-matrix / flat orgs**, не staff tree.

## Аргументація

1. Без spine matrix виглядає як набір незалежних ліній — паритет з легасі для org-модуля.
2. Не потребує ELK повністю: можна згенерувати bus geometry з `matrixGrid` + parent anchor.
3. P1, не P0: cutover staff/4245 блокують T64/T66; org-matrix можна підтягнути паралельно або після.

## Пропозиція

```ts
// render / orgEdges
type OrgEdgeStyle = 'per-link' | 'spine-bus';

function buildSpineBusPaths(
  parentBox: WorldBox,
  childBoxes: WorldBox[],
  opts: { busY?: 'below-parent' | 'row-mid' }
): Polyline[];
```

- Режим `spine-bus` для `orgMode === 'matrix'` або коли всі видимі діти — сітка.
- Unit: N дітей в одному рядку → 1 horizontal bus + N risers + 1 spine segment.
- LOD: far — спрощений spine (одна лінія) або hide.

## Acceptance

- [ ] Flat orgs / matrix: візуально шина + райзери
- [ ] Не ламає row-tree edges
- [ ] Unit на геометрію bus
- [ ] Опція вимкнути (`per-link`) для A/B

## Не входить

- Переписування `matrixGrid` / BE coords
- Staff report-line routing

## Verify

```bash
npm test
# Demo: Flat orgs collapsed matrix — шина під root row
```
