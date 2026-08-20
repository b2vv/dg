# T05 — Export: SVG, PNG, PDF, print

**Пріоритет:** P2  
**Статус:** todo  
**Оцінка складності:** середня  
**Залежності:** T01 (render must exist)

---

## TDD (обов'язково — перед кодом)

> Політика: [`work/TDD.md`](../TDD.md)

### Success tests
- [ ] `export({ format: 'png', scope: 'viewport' })` → Blob type `image/png`
- [ ] `export({ format: 'svg' })` → string містить `<path d="M`
- [ ] `export({ format: 'pdf' })` → Blob, valid PDF header `%PDF`

### Failure tests
- [ ] export до mount diagram → throw
- [ ] `format: 'invalid'` → throw
- [ ] cross-origin photo taint → PNG з placeholder, не crash
- [ ] `scope: 'subtree'` без `subtreeRootId` → throw

---

## Мета

Експорт поточного viewport або повного diagram у формати з REQUIREMENTS §0 п.7.

---

## Formats

| Format | Approach |
|--------|----------|
| **PNG** | `app.renderer.extract.canvas()` або `renderer.plugins.extract` |
| **SVG** | Custom serializer: contours (path) + nodes (foreignObject/text) + edges |
| **PDF** | SVG → pdf-lib / jsPDF, або canvas → PDF image page |
| **Print** | `window.print()` з print CSS @media |

---

## Scope

### 1. Public API

```ts
interface ExportOptions {
  format: 'png' | 'svg' | 'pdf';
  scope: 'viewport' | 'full' | 'subtree';
  subtreeRootId?: string;
  scale?: number;           // PNG DPI multiplier
  background?: string;      // default theme bg
  includeLabels?: boolean;
}

diagram.export(options: ExportOptions): Promise<Blob | string>
diagram.print(options?: Pick<ExportOptions, 'scope' | 'subtreeRootId'>): void
```

### 2. SVG export strategy

**Pros of custom SVG (vs Pixi extract):**

- Vector dept contours — crisp at any zoom
- Smaller file for staff diagrams
- Matches contour.path already in WASM output

**Structure:**

```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <g id="departments">
    <path d="M ... Z" fill="..." stroke="..."/>
  </g>
  <g id="edges">...</g>
  <g id="persons">
    <foreignObject>...</foreignObject>
  </g>
</svg>
```

### 3. PNG export

- Render offscreen RenderTexture at `scale * viewport`
- `toBlob('image/png')`
- HiDPI: scale 2 or 3

### 4. PDF export

- Single page: fit to A4/Letter
- Multi page: tile full diagram (50k org — warning + viewport only default)

### 5. Print

- Hidden iframe or new window with exported SVG
- `@media print { canvas hide; svg show }`

---

## Edge cases

| Case | Handling |
|------|----------|
| WebGL taint (cross-origin photos) | Fallback placeholder avatar |
| Huge diagram | Warn user, default scope=viewport |
| Dark theme export | `background: '#fff'` option for print |

---

## Acceptance criteria

- [ ] Export VARIANT_B demo as PNG ≥ 1920px width
- [ ] SVG contains IT contour path, 6 person groups
- [ ] PDF opens in viewer, single page demo
- [ ] Print dialog works from demo button
- [ ] `export({ scope: 'subtree' })` crops to org subtree

---

## Out of scope

- Server-side export
- Animated GIF/video

---

## Референси

- `docs/REQUIREMENTS.md` §0, §4.7 (context menu export subtree)
- Pixi Extract docs
