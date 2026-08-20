# Contributing

## Setup

```bash
npm install
npm run build:wasm   # Rust + wasm-pack required
npm test
npm run typecheck
```

## Workflow

1. Branch from `main` as `cursor/<short-name>-babc` (Cloud Agent convention) or your team prefix.
2. TDD: success + failure tests before production code ([`work/TDD.md`](./work/TDD.md)).
3. After Rust contour/layout changes: `npm run build:wasm`.
4. Open a PR; CI runs Rust tests, WASM build, typecheck, and Vitest.

## Coding standards

See [`work/CODING_STANDARDS.md`](./work/CODING_STANDARDS.md) and SPEC §13 (Matt Pocock / Clean Architecture notes).
