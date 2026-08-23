# Узгодження: типи + алгоритми (P0 GoJS→dg)

**Статус:** agreed 2026-08-22  
**Джерела:** explore-агенти (types + layout/render) + parity 2.1  
**Індекс:** [T71](./T71-gojs-to-dg-migration-plan.md) · [PARITY](./PARITY-gojs-to-dg.md)

---

## Рішення по відкритих питаннях

| # | Питання | Рішення |
|---|---------|---------|
| Q4 | Default `position.expanded` | **Opt-in:** `staffLayout.collapseUnexpandedPositions` default `false` — існуючі демо не ламаються |
| Q5 | Які reportLines для expand | Лише `kind === 'admin'` |
| Q3 | Depth N | API `expandToDepth` після `setData`; без sticky options як SoT |
| Cap | `maxExpandedPositions` | Unlimited за замовч.; cap лише на **інтерактивний** toggle; `expandToDepth` обходить cap |
| E5 | `N [M]` | Тимчасово `filledCount` / `vacantCount` на org (уточнити з BE пізніше) |
| E2 / box | Зовнішній розмір картки | **Фіксований** AABB картки; режими знака — всередині (Phase1) |
| Zone bounds | Хто рахує | Layout збагачує `StaffTierBand` полями `x/width/label`; renderer лише малює |
| Dual paint | zone + blob | `departmentStyle: 'blob' \| 'card'`; staff demos → card або chrome+blob з шаром zone знизу |
| T68 | Edge click | **Ні** — період на org chrome |
| Period i18n | | `periodLabel` з host виграє; інакше SDK uk «по т.ч.» |

---

## Типи (additive, optional)

### Data (`DiagramOrganization`)
`fullName?`, `showShortName?`, `unitCode?`, `isTemporary?`, `filledCount?`, `vacantCount?`, `periodStart?`, `periodEnd?`, `periodLabel?`

### Data (`DiagramPosition`)
`expanded?`, `periodStart?`, `periodEnd?`, `periodLabel?`

### RenderConfig
`staffZoneChrome?` (default false), `departmentStyle?: 'blob'|'card'` (default blob), `dashedGridFrame?` (default false)

### StaffLayoutOptions
`expandedPositionIds?`, `maxExpandedPositions?`, `collapseUnexpandedPositions?` (default false)

### StaffTierBand
`x?`, `width?`, `label?` — для paint

### Callbacks
`onPositionExpandChange?`, `LayoutPatch` `position-expand`  
`onNodeDoubleClick?` (T69 ✅ wired)

### API
`togglePositionExpand`, `expandToDepth`, `collapsePositionSubtree`

**Не додаємо:** Group nesting, reportLine period/onEdgeClick, formMatrix, expandedKeys.

---

## Алгоритми

### A — T70 Phase0 `fitContain`
```
scale = min(maxW/texW, maxH/texH)
w,h = tex * scale; center in max box
```
Змінити лише `OrganizationNode.showSymbol`. Far edge ports лишають квадратний **max box**.

### B — T64 paint
`worldBoundsForTier` з `tier.y/height` + union `positionNodes`/`orgCards`.  
Малювати `staff-block` zones; dept `card` = AABB members. Layout engine **не** чіпати.

### C — T66 filter
`visiblePositions`: BFS від head по admin edges; якщо `!expanded` — не enqueue дітей.  
Фільтр **всередині** `layoutStaffOrgBlock` до tree/wasm.  
Окремо від `toggleStaffOrgExpand`.

### Порядок імплементації
**A → B → C** (окремі PR для B і C).

---

## Що вже закодовано в цьому коміті

- [x] Узгодження (цей файл)
- [x] Data / RenderConfig / Staff types / callbacks поля
- [x] `fitContain` + `showSymbol` contain (Phase0)
- [x] Paint zones (T64)
- [x] Position expand layout (T66)
