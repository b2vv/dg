# T13 — LOD by viewport zoom (far / mid / near)

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** T01 viewport pan/zoom ✅, SPEC §5.1

---

## TDD

### Success
- [x] `resolveLodLevel(0.2)` → `far`; `0.8` → `mid`; `1.5` → `near`
- [x] PersonNode `far` — без імені / badge (dot)
- [x] OrganizationNode `far` — без name text
- [x] `diagram.setZoom(0.2)` → `getLodLevel() === 'far'` (band change re-render)

### Failure
- [x] non-finite scale → safe fallback (`NaN` → mid via scale=1)

---

## Delivered

- `packages/sdk/src/render/lod.ts` — thresholds + path simplify
- Person / Org / DepartmentBlob LOD variants
- Viewport `onChange` → re-render only when LOD **band** changes
- API: `getLodLevel()`

## Out of scope

- TD07 React promote overlay (v1.x)
- Contour morph animation during drag (G8 polish)
