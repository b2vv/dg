# T05 — Export: SVG, PNG, PDF, print

**Пріоритет:** P2  
**Статус:** done  
**Залежності:** T01 (render must exist)

---

## TDD

### Success tests
- [x] `export({ format: 'png', scope: 'viewport' })` → Blob type `image/png`
- [x] `export({ format: 'svg' })` → string містить `<path d="M`
- [x] `export({ format: 'pdf' })` → Blob, valid PDF header `%PDF`

### Failure tests
- [x] export до mount diagram → throw
- [x] `format: 'invalid'` → throw
- [x] cross-origin photo taint → PNG з placeholder, не crash (`extractPngFromPixi` fallback)
- [x] `scope: 'subtree'` без `subtreeRootId` → throw

---

## API

```ts
diagram.export({ format: 'png' | 'svg' | 'pdf', scope?, subtreeRootId? })
diagram.print({ scope?, subtreeRootId? })
```

SVG будується з layout + contours (vector). PNG — Pixi extract (fallback placeholder). PDF — RGB page (no pdf-lib).
