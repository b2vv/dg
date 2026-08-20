# T06 — Demo app на Rsbuild

**Пріоритет:** P1  
**Статус:** todo  
**Оцінка складності:** низька–середня  
**Залежності:** T01 (мінімальний render), TD02

---

## TDD (обов'язково — перед кодом)

> Політика: [`work/TDD.md`](../TDD.md)

### Success tests
- [ ] smoke: demo module імпортується без throw
- [ ] Variant B tab: `computeDeptContour('IT', ...)` path length > 0
- [ ] theme toggle змінює CSS class / data-theme

### Failure tests
- [ ] missing container element → graceful error message
- [ ] WASM load fail (mock) → user-visible error, не blank page
- [ ] invalid JSON upload у mapper tab → error toast, не crash

---

## Мета

Створити **офіційне demo** для manual QA та embed documentation, замінивши legacy `packages/web` (Rspack).

---

## Scope

### 1. Package structure

**Option A (recommended):** окремий пакет

```
packages/demo/
  package.json
  rsbuild.config.ts
  src/
    main.ts
    App.ts
    scenarios/
      variant-b-contour.ts
      flat-orgs.ts
    index.html
  public/
```

**Option B:** `packages/sdk` dev entry — простіше, але змішує lib + app

### 2. Demo scenarios

| Tab / Route | Purpose |
|-------------|---------|
| **Variant B** | IT contour + CEO notch — magnetism QA |
| **Flat orgs** | 20–50 org, matrix ↔ row-tree toggle |
| **Mapper** | Load JSON file → flatRowsToDiagram |
| **Worker bench** | Chunk mapping timing display |

### 3. UI controls

- Theme toggle (light/dark)
- Padding / smoothIterations sliders → live contour update
- Expand/collapse org buttons
- Export buttons (after T05)

### 4. Root scripts

```json
{
  "scripts": {
    "dev": "npm run dev -w @org-hierarchy/demo",
    "build:demo": "npm run build -w @org-hierarchy/demo"
  }
}
```

### 5. Migration from packages/web

- Перенести `public/styles.css` якщо корисно
- Видалити або archive `packages/web` (TD02)

---

## Rsbuild config sketch

```ts
// packages/demo/rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  source: {
    entry: { index: './src/main.ts' },
  },
  server: { port: 3000 },
  output: {
    distPath: { root: 'dist' },
  },
  tools: {
    rspack: {
      experiments: { asyncWebAssembly: true },
    },
  },
});
```

WASM: copy або import from `@org-hierarchy/sdk/wasm/pkg`

---

## Acceptance criteria

- [ ] `npm run dev` opens demo at localhost
- [ ] Variant B tab shows contour + labels
- [ ] Theme toggle works
- [ ] README in work/ + root points to demo
- [ ] `packages/web` archived or removed

---

## Референси

- `packages/sdk/rsbuild.config.ts`
- `work/tech-debt/TD02-legacy-web-rspack.md`
