# T30 — UX: edges, contour padding, zoom

**Пріоритет:** P0  
**Статус:** done

## Fixes

1. **Edges** — adaptive orthogonal ports (child above/below, same-row sides, matrix peers); org matrix uses the same router; org cards sized to layout AABB
2. **Contour** — fill bbox uses `paddingCells` only (no mandatory +1 empty ring); slider grows the blob; contour translated into staff world (tier margin)
3. **Zoom** — pinch-to-zoom + `touch-action: none`; demo `+` / `−` buttons; `zoomBy` API
