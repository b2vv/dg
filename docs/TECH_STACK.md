# Технологічний стек — Org Hierarchy (v1)

> Embed SDK: org matrix/tree + staff. ~50k org, ~2M persons.  
> **Дані in-memory + мапери** (API — опційно зовні host).

**Звірено з кодом 2026-09-02.** Приклади нижче використовують експорти, які справді є в
`packages/sdk/src/index.ts`.

---

## Архітектура

```
┌─────────────────────────────────────────────────────────────┐
│  Host: fetch/load → raw data → custom DataMapper            │
├─────────────────────────────────────────────────────────────┤
│  @org-hierarchy/sdk — DiagramData, mappers, worker helpers  │
├─────────────────────────────────────────────────────────────┤
│  Web Worker — mapInWorker, WorkerPool, chunked map           │
├─────────────────────────────────────────────────────────────┤
│  Rust WASM — Ploeg row-tree; dept flood (opt-in engine)      │
├─────────────────────────────────────────────────────────────┤
│  Pixi.js — WebGL **або Canvas2D** (вибір і фолбек, T83)      │
│            OrganizationNode / PersonNode / DepartmentBlob   │
└─────────────────────────────────────────────────────────────┘
```

**Полотно не малює себе саме.** Ticker вимкнено (`autoStart: false`); усе, що рухає пікселі,
просить `requestPaint`. Нерухома вкладка не коштує нічого (T84).

---

## Дані (не обов'язковий API)

```ts
import { OrgHierarchyDiagram, flatRowsToDiagram, mapInWorker } from '@org-hierarchy/sdk';

// Варіант 1: готові DiagramData
await OrgHierarchyDiagram.create(el, { data: diagramData });

// Варіант 2: сирі дані + mapper
await OrgHierarchyDiagram.create(el, {
  data: myRawRows,
  mappers: { toDiagram: myMapper, normalize: normalizeDiagram },
});

// Варіант 3: worker для 2M rows
const pool = new WorkerPool(() => new Worker(new URL('./transform.worker.js', import.meta.url)));
const chunks = await pool.mapChunks('flatRowsToDiagram', rawRows, 50_000);
```

---

## Компоненти

| Шар | Технологія |
|-----|------------|
| Data | `DiagramData` + `DataMapper<TRaw>` |
| Worker helpers | `mapInWorker`, `WorkerPool`, `mapFlatRowsInPool` |
| Core | Rust WASM у worker |
| Render | Pixi.js |
| Bundler | **Rsbuild** — лише demo. SDK збирається `tsc` + копія wasm + перевірка пакета |
| Contours | **Два рушії за прапорцем** `RenderConfig.contourEngine`: `button-group` (default, TS-фарба) і `cell-flood` (Rust flood → Chaikin). SVG-експорт бере **той самий**, що канвас |
| Tests | **rstest** + jsdom (unit), Playwright (e2e) |
| Lint | **oxlint** (гейт у CI) + oxfmt |
| Компілятор | TypeScript 7 |

**Не v1:** Service Worker, Three.js, вбудований HTTP client.

**Вікно за камерою — патерн хоста, не SDK.** «1M посад» у демо — це зріз ≤ 4000 посад, який
хост перерахує на `onViewportChange` і віддає через `setData`. SDK не тримає мільйон
(`packages/demo/src/app/viewportWindow.ts`, T88).

---

## Пакети

```
packages/
  core/   # Rust WASM (Ploeg row-tree, dept flood)
  sdk/    # @org-hierarchy/sdk 0.2.0 — дані, мапери, worker, Pixi-рендер, експорт
  demo/   # приватний Rsbuild-стенд, 14 табів (не публікується)
```

WASM `pkg` **закомічений** (`packages/sdk/src/wasm/pkg/`): бібліотеку віддають як git-залежність,
а в споживача немає ні Rust, ні wasm-pack. Свіжий clone працює без `npm run build:wasm`.
