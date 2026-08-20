# T16 — Incremental contours + search index scale

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** T02 contour pipeline ✅, T04 search ✅, T07 magnet config ✅

---

## TDD

### Success
- [x] identical contour inputs → second call recomputes nothing (`lastDirtyDepartmentIds` empty)
- [x] move one dept → only that dept via `computeDept`
- [x] `search('lice')` still finds `Alice` (byChar seed + substring)
- [x] `buildSearchIndexAsync` matches sync hit labels

### Failure
- [x] magnet / contour config change → full recompute (cache wipe)
- [x] empty / missing search index → `[]`

---

## Delivered

- `createIncrementalContourComputer` — per-dept fingerprint cache; wired into `OrgHierarchyDiagram.render`
- `setData` invalidates contour cache; `destroy` clears it
- `SearchIndex.byChar` candidate narrowing
- `buildSearchIndexAsync` chunked build; `setData` / `appendData` use async above 10k orgs+positions
- Public exports: `createIncrementalContourComputer`, `buildSearchIndexAsync`

## Out of scope

- TD07 promote overlay
