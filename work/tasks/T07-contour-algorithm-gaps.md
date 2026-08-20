# T07 — Contour algorithm gaps: M4, magnetRadius, G6 explicit

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** contour.rs ✅, TD03

---

## TDD

### Success tests
- [x] `disconnected_own_two_contours` — 2 paths для одного dept
- [x] `magnet_radius_limits_merge` — cells поза radius не зливаються
- [x] variant A/B tests — **залишаються green** (fixtures з `magnet_radius: 8`)

### Failure tests
- [x] `compute_dept_contour("IT", &[], cfg)` → `Err`
- [x] unknown departmentId (no own cells) → `Err`
- [x] negative `padding_cells` → clamp
- [x] `magnet_radius: 0` → кожна own cell окремий contour

---

## Delivered

- `ContourMagnetConfig.magnet_radius` (default **1.5**) + `prefer_notch`
- Own-cell union-find clustering → `compute_dept_contour` → `Vec<DeptContourResult>`
- TS: `computeDeptContour` → `Promise<DeptContourResult[]>`; `toRustConfig` + `RenderConfig.magnetRadius`
- G6: explicit far-side fill clear — see [T14](./T14-contour-g6.md); plus `g6_implicit_foreign_blocks_flood`
- WASM pkg rebuilt

Variant B demo uses `magnetRadius: 8` to keep classic single IT notch blob.
