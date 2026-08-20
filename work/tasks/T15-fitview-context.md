# T15 — fitView / resetView + CONTEXT.md

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** T13 viewport/LOD ✅

---

## TDD

### Success
- [x] `Viewport.fitBounds` frames rect into screen with padding
- [x] `diagram.fitView()` → true after Variant B mount; `resetView()` → identity
- [x] Demo **Fit** button + auto-fit after tab load

### Failure
- [x] `fitBounds` empty/NaN bounds → false

---

## Delivered

- `fitView(padding?)` / `resetView()` on Viewport, PixiHost, OrgHierarchyDiagram
- `DiagramRenderer.getContentBounds()`
- Root `CONTEXT.md` (domain glossary for Matt Pocock skills)
- Demo Fit control

## Out of scope

- Animated camera tween
- TD07 promote overlay
