# Node compare — diagram crop vs isolated SDK

Generated PNG pairs for visual parity review. Regenerate:

```bash
npm run compare:nodes
```

Open gallery: [index.html](./index.html) (local file or attach to PR).

## What each file shows

| Suffix | Meaning |
|---|---|
| `-diagram.png` | Node clipped from live mockup tab (`?e2e=1`, `node-<testId>` anchor) |
| `-isolated.png` | Same fixture data/styles rendered alone at **near LOD** (`?node-compare=1`) |
| `-side-by-side.png` | Left = diagram, right = isolated |
| `-overlay.png` | Isolated base + 52% diagram on top — ghost/double edges = drift |

## Specimens (7)

| ID | Tab | testId |
|---|---|---|
| org-figma-root | Orgs · Figma | mockup-root |
| org-gojs-hq | Orgs · GoJS | mockup-hq |
| person-figma-head | Staff · Figma | staff-head |
| person-figma-temp | Staff · Figma | staff-temp |
| person-figma-vacant | Staff · Figma | staff-vacant |
| person-gojs-head | Staff · GoJS | staff-head |
| person-gojs-temp | Staff · GoJS | staff-temp |

## How to read overlays

- **Aligned, single image** → diagram matches isolated (good).
- **Double text / double avatar** → layout or LOD mismatch.
- **Different badge position** → chrome layout drift (padding, anchor).
- **Diagram = thin band, isolated = full card** → diagram at **mid LOD**, isolated at near (see below).

## Findings (2026-08-23)

### Staff person cards — LOD gap (main issue)

On **Staff · Figma / GoJS** mockup tabs, diagram crops often show **mid LOD** (compressed horizontal band: name only, no avatar/title), while isolated specimens always use **near LOD** (full Figma row / GoJS portrait).

Examples: `person-figma-temp-*`, `person-gojs-head-*`.

**Implication:** full-diagram screenshots can look “wrong” even when near-LOD template code is correct. Compare at zoom ≥ 0.55 and near LOD, or fix fitView / LOD thresholds on mockup tabs.

### Org Figma root — counts badge position

`org-figma-root-overlay.png`: `1 [6]` text aligns; badge pill sits lower-right on diagram vs higher on isolated — minor chrome Y drift.

### Isolated vs diagram — same data

Both sides use the same `mockupFigma.ts` fixture; isolated page imports `MOCKUP_*_STYLES` directly.

## Live isolated page

Demo URL: `/?node-compare=1` — grid of all specimens (no diagram chrome).
