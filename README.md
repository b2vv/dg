# Org Hierarchy SDK (`dg`)

Embeddable org / staff diagram library: **Rust WASM** (contours + tidy tree) + **Pixi.js** render + **Web Worker** pipelines.

## Packages

| Package | Role |
|---------|------|
| `@org-hierarchy/sdk` | Public embed API, layout, Pixi, export, React context-menu host |
| `@org-hierarchy/demo` | Rsbuild demo (`npm run dev`) |
| `packages/core` | Rust → WASM (`contour`, Ploeg tidy layout) |

## Quick start

```bash
npm install
npm run build:wasm   # requires rustup + wasm-pack
npm run dev          # http://localhost:3000
```

**Online demo (GitHub Pages):** after the repo is public (or Pages is enabled on a paid plan), open  
**https://b2vv.github.io/dg/**  
Deploy runs on every push to `main` (`.github/workflows/pages.yml`).

```ts
import { OrgHierarchyDiagram } from '@org-hierarchy/sdk';

const diagram = await OrgHierarchyDiagram.create(container, {
  data: diagramData,
  staffCurrentOrgId: 'org1',
  callbacks: {
    onNodeClick: (node) => console.log(node),
    onContextMenu: (request) => menu.handleContextMenu(request),
  },
});

await diagram.setData(nextData);
await diagram.export({ format: 'png' });
```

React context menu (optional peer):

```ts
import { createReactContextMenuHost, DefaultReactContextMenu } from '@org-hierarchy/sdk/react';
```

Promote overlay (optional peer) — HTML card over a selected near-LOD node:

```ts
import { createReactPromoteOverlay, DefaultPromoteCard } from '@org-hierarchy/sdk/react';

const promote = createReactPromoteOverlay({
  diagram,
  mount: container,
  mode: 'near-selection',
  component: DefaultPromoteCard,
});
```

## Scripts

| Command | What |
|---------|------|
| `npm test` | SDK + demo Vitest |
| `npm run test:rust` | `cargo test` in `packages/core` |
| `npm run typecheck` | SDK + emit `.d.ts` + demo |
| `npm run build:wasm` | Rebuild WASM pkg under `packages/sdk/src/wasm/pkg` |

## Agent skills (Matt Pocock)

Engineering / productivity skills from [mattpocock/skills](https://github.com/mattpocock/skills) live in `.agents/skills/` (Cursor-linked via `skills-lock.json`).

```bash
npx skills@latest add mattpocock/skills --skill '*' --agent cursor -y --copy
npx skills update   # later: pull upstream skill updates
```

Run **`/setup-matt-pocock-skills`** once in Cursor to configure issue tracker, triage labels, and domain docs (`CONTEXT.md` / ADRs).

## Docs


- [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) — product requirements
- [`docs/TECH_STACK.md`](./docs/TECH_STACK.md) — architecture
- [`work/SPEC.md`](./work/SPEC.md) — algorithms + API status
- [`work/TDD.md`](./work/TDD.md) — test-first policy
- [`work/README.md`](./work/README.md) — task / tech-debt index

## License

Private / TBD.
