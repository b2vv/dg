# T75 — Rebuild vs repaint + render queue + view destroy

**Пріоритет:** P0  
**Статус:** ✅ done  
**Базис:** [REVIEW-dg-805efee-architecture.md](../tech-debt/REVIEW-dg-805efee-architecture.md) **D1 · D2 · D3**

---

## Результат

| ID | Статус | Що зроблено |
|----|--------|-------------|
| **D2** | ✅ | `createRenderCoalesce` + `renderEpoch` bail після `await` |
| **D3** | ✅ | `LayerManager.clear` → `destroy({ children: true })` |
| **D1 selection** | ✅ | `repaintSelection()` — клік/select без `DiagramRenderer.render` |
| **D1 LOD/theme** | ✅ intentional | повний `render()` **лише** для LOD/theme (змінюються edge ports / палітра). Hot path (selection) — repaint. |

**Чому LOD/theme лишають rebuild:** mid/far змінюють visual AABBs для edge ports (T45); theme міняє всі fills + symbol URLs. Point-`applyLod` без перерахунку ребер дав би розсинхрон hit-test/edges. Окремий follow-up лише якщо профайлер покаже LOD-zoom як bottleneck після selection fix.

---

## Файли

- `packages/sdk/src/render/renderCoalesce.ts`
- `packages/sdk/src/render/DiagramRenderer.ts` (`repaintSelection`, epoch, clear destroy)
- `packages/sdk/src/index.ts` (`render` coalesce, `repaintSelection` на select*)
- Tests: `renderCoalesce.test.ts`, `layerManager.clear.test.ts`, interaction D1 test

---

## Не в T75

- God-object → [T76](./T76-diagram-facade-stores.md) ✅
- Media → [T74](./T74-node-media-lifecycle.md)

## Verify

```bash
npm run typecheck && npm test && npm run test:verify
```
