# TD05 — WASM pkg у репозиторії

**Пріоритет:** низький  
**Статус:** прийнято (build-on-demand)  
**Дата:** 2026-08-20

## Опис

`wasm-pack` output живе в `packages/sdk/src/wasm/pkg/`, але **gitignored** (`pkg/.gitignore: *`).  
CI і локальна розробка: `npm run build:wasm` перед тестами SDK.

## Плюси

- Нема binary merge conflicts / repo bloat
- CI завжди збирає свіжий pkg з Rust

## Мінуси

- Consumers / agents потребують Rust + wasm-pack для `build:wasm`
- Без rebuild SDK contour тести не стартують

## Критерії

- [x] CI workflow містить `build:wasm`
- [x] Root README / work README документують rebuild
