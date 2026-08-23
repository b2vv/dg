# T75 — Rebuild vs repaint + render queue + view destroy

**Пріоритет:** P0  
**Статус:** planned  
**Базис:** [REVIEW-dg-805efee-architecture.md](../tech-debt/REVIEW-dg-805efee-architecture.md) **D1 · D2 · D3**  
**Залежності:** немає (блокує масштаб і коректність; T74 M1 не повинен опиратись на full `render()`)

---

## Мета

1. **D2** — один активний `render` / черга (без гонки `clear` + `await`).
2. **D1** — `rebuild()` (дані/layout) vs `repaint()` (selection / LOD / theme chrome).
3. **D3** — `LayerManager.clear` / зняття view → справжній Pixi `destroy`.

Порядок імплементації всередині T75: **D2 → D1+D3**.

---

## D2 — черга рендера

- Прапорці `rendering` + `renderQueued` (або generation token).
- Повторний вхід під час `await` → не `clear()` вдруге; позначити dirty і перезапустити після.
- `onOrgClick` / selection / LOD не стартують паралельний orphan-render.

**Acceptance:** два швидкі `select` + LOD flip під час текстур → один узгоджений display-list; `nodeViews` ≡ діти шарів.

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
