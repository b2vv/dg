# T29 — Visual polish: cards in cells + demo layouts

**Пріоритет:** P1  
**Статус:** done

## Changes

- Person card **128×148** inside cell pitch **148×168** (centered via AABB inset)
- Staff `refCell*` aligned with `render.cell*`; contour uses authored `gridCell` only (no tree remapping)
- Variant B: corridor gaps (T37); magnetism = adjacency (`VARIANT_B_MAGNET_RADIUS = 1.5`, T48) — not a forced C-blob
- Staff edges: orthogonal elbows instead of diagonals
- Staff-tree / flat-orgs / mapper: breathing room gaps; avatars on staff-tree
- Softer department fill; PersonNode label truncate; SVG export card size/centering
