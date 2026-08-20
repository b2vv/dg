# TD03 — Drift конфігурації контуру (spec vs impl)

**Пріоритет:** середній  
**Статус:** closed (T07)  
**Дата:** 2026-08-20

## Опис

Уніфіковано `ContourMagnetConfig` між SPEC / Rust / TS:

| Field | Rust | TS |
|-------|------|-----|
| magnetRadius | `magnet_radius` default 1.5 | `magnetRadius` |
| padding | `padding_cells` | `paddingCells` |
| corridor | `corridor_cells` | `corridorCells` |
| cell size | `cell_width/height` | `cellWidth/Height` |
| smoothIterations | `smooth_iterations` | `smoothIterations` |
| preferNotch | `prefer_notch` (documented) | `preferNotch` |

`magnetRadius` реалізовано як Manhattan clustering own cells (M4).  
G6 — implicit via foreign flood block.

## Критерії закриття

- [x] Один canonical `ContourMagnetConfig` у docs + Rust + TS
- [x] magnetRadius імплементовано
- [x] Тести на config edge cases (T07)
