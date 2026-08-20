# TD03 — Drift конфігурації контуру (spec vs impl)

**Пріоритет:** середній  
**Статус:** відкрито  
**Дата:** 2026-08-20

## Опис

У `docs/REQUIREMENTS.md` §4.6.1 описано `ContourMagnetConfig` з полями:

```ts
magnetRadius, padding, corridorMin, preferNotch, smooth, smoothIterations
```

У Rust impl (`packages/core/src/types.rs`, `contour.rs`) використовується інший набір:

```rust
padding_cells, corridor_cells, cell_width, cell_height, smooth_iterations
```

SDK bridge (`packages/sdk/src/contour/bridge.ts`) мапить camelCase → snake_case для Rust.

## Наслідки

- `magnetRadius` (G1) **не імплементовано** — злиття відбувається через flood-fill без радіусного обмеження
- `preferNotch` — implicit через алгоритм, без окремого flag
- `smooth: 'none'|'chaikin'|'bezier'` — лише Chaikin (iterations=0 → no smooth)
- Документація може вводити в оману integratorів

## Рекомендовані дії

1. Уніфікувати API: або оновити REQUIREMENTS під impl, або доповнити Rust
2. Додати `magnetRadius` для M4/G1 (union-find з distance limit)
3. Документувати mapping у `work/SPEC.md` §3.2 (частково зроблено)
4. Версіонувати breaking changes у public API

## Критерії закриття

- [ ] Один canonical `ContourMagnetConfig` у docs + Rust + TS
- [ ] magnetRadius або явно deprecated з поясненням flood-fill поведінки
- [ ] Тести на config edge cases
