# T75 — Rebuild vs repaint + render queue + view destroy

**Пріоритет:** P0  
**Статус:** D2 ✅ · D1 selection + D3 ✅ · LOD/theme repaint — follow-up  
**Базис:** [REVIEW-dg-805efee-architecture.md](../tech-debt/REVIEW-dg-805efee-architecture.md) **D1 · D2 · D3**  
**Залежності:** немає (блокує масштаб і коректність; T74 M1 не повинен опиратись на full `render()`)

---

## Мета

1. **D2** ✅ — один активний `render` / черга (`createRenderCoalesce` + `renderEpoch`).
2. **D1** ✅ partial — selection → `repaintSelection()` (без rebuild). LOD/theme ще `render()` (геометрія/медіа).
3. **D3** ✅ — `LayerManager.clear` destroy children.

Порядок імплементації всередині T75: **D2 → D1+D3**.

---

## D2 — черга рендера ✅

- `packages/sdk/src/render/renderCoalesce.ts` — `schedule` / `stop`
- `OrgHierarchyDiagram.render()` → `renderCoalesce.schedule()` → `renderNow()`
- `DiagramRenderer.renderEpoch` — stale async pass bails after `await`
- Tests: `renderCoalesce.test.ts`

**Acceptance:** два швидкі `select` + LOD flip під час текстур → один узгоджений display-list.

---

## D1 — rebuild vs repaint

| API | Коли | Дія |
|-----|------|-----|
| `render()` / rebuild | `setData`, expand/collapse, LOD, theme, layout options | clear+destroy views, layout, create views |
| `repaintSelection()` ✅ | `select*` / `clearSelection` / click / `focusNode` | overlay only; `nodeViews` reused |

- LOD threshold → still full `render()` (card chrome geometry changes) — optional later: `applyLod` on views.
- Theme → still full `render()` (symbol URLs / palette).

**Acceptance:** клік / `select` не кличе `DiagramRenderer.render`.

---

## D3 — destroy views ✅

- `LayerManager.clear()` → `removeChildren` + `destroy({ children: true })` на кожній дитині.
- Tests: `layerManager.clear.test.ts`

---

## D1 — rebuild vs repaint

| API | Коли | Дія |
|-----|------|-----|
| `rebuild()` | `setData`, expand/collapse, layout-affecting options | clear+destroy views, layout, create views |
| `repaint()` | selection, LOD band, theme chrome (без зміни URL media) | reuse `nodeViews`; `applySelection` / `applyLod` / `applyTheme` |

- `select*` / `clearSelection` → **лише** `repaint` (або point update selection chrome).
- LOD threshold → `repaint` (media far/near — координація з T74 M6).
- Мапи `nodeViews` / `nodeBoxes` **не** очищати на `repaint`.

**Acceptance:** клік по вузлу при N≫1 не створює N нових `OrganizationNodeView`; selection chrome оновлюється.

---

## D3 — destroy views

- `LayerManager.clear({ destroy: true })` або еквівалент: `removeChildren` + `view.destroy({ children: true })`.
- Усі node views (org / person / position / dept blob) мають явний lifecycle.
- Після D1 `clear` рідкісний — але коректний уже в тому ж PR.

**Acceptance:** після N циклів rebuild GPU/текстові ресурси не ростуть лінійно з N (smoke / ручний профайлер ok).

---

## Не в T75

- Розбір god-object → [T76](./T76-diagram-facade-stores.md)
- Media invalidate / textures → [T74](./T74-node-media-lifecycle.md)
- Не чіпати `Viewport`, `spine-bus`, person LOD gate (brief §5)

---

## Verify

```bash
npm run typecheck
npm test
npm run test:verify
```
