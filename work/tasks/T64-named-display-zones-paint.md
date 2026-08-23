# T64 — Іменовані зони відображення (paint) — B8 / B8a

**Пріоритет:** P0  
**Статус:** done (SDK + staff-tree demo)  
**Parity:** B8, B8a  
**Узгодження:** [T72](./T72-types-algorithms-agreement.md)

---

## Вимога

Іменована **зона відображення** посад (фон / radius / рамка / підпис) — не членство і не layout.  
Layout (`StaffTierBand`) уже був; бракувало paint.

## Зроблено

| Файл | Роль |
|------|------|
| `render/staffZoneBounds.ts` | bounds + enrich + union |
| `render/StaffZonesView.ts` | Pixi zones |
| `render/DepartmentCardView.ts` | dept card + dashed frame |
| `DiagramRenderer` | `layers.zones`, flags |
| Demo staff-tree | `staffZoneChrome` + `departmentStyle: 'card'` |
| SVG export | zones group when flag on |

## Config

```ts
render: {
  staffZoneChrome: true,      // default false
  departmentStyle: 'card',    // default 'blob'
  dashedGridFrame: true,      // optional B8a
}
```

## Verify

```bash
npm test && npm run typecheck
# Demo → Staff tree: named zone bands + dept cards
```
