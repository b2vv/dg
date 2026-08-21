# T34 — P0: IT contour C-arms + staff/flat edges

**Пріоритет:** P0  
**Статус:** done  
**План:** [T33](./T33-demo-live-audit-plan.md) фази A1, A3, A4

## Delivered

### A1 — Variant B IT contour covers P5/P6
- `prefer_notch` opens on **foreign far-side** (prefer right of CEO) and prefers **non-bridge** cuts
- G6 clears far-side fill only when it does **not** split own connectivity through remaining fill
- Rust: IT centers P1–P3,P5,P6 inside; CEO outside; no wall right of P4
- TS: `variantBContourAlign.test.ts`

### A3 — Staff tree cross-tier edges
- Managing head → current head; current head → tier-3 org cards (`cross-tier`)
- Org cards included in edge box list for routing
- Default `tierGap` 56 → 36

### A4 — Flat orgs tree edges
- Matrix edges route with **obstacle avoidance** (other org cards)
- Flat demo: cleaner parent tree; drop duplicate `orgLinks`

## Verify

```bash
npm run test:rust
npm run build:wasm
npm test
npm run typecheck
```
