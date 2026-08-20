# TD05 — WASM pkg committed у репозиторій

**Пріоритет:** низький  
**Статус:** прийнято (свідоме рішення)  
**Дата:** 2026-08-20

## Опис

Збірка WASM (`wasm-pack`) output зберігається в:

```
packages/sdk/src/wasm/pkg/
  org_hierarchy_core.js
  org_hierarchy_core_bg.wasm
  org_hierarchy_core.d.ts
  ...
```

Root script: `npm run build:wasm`

## Плюси

- SDK consumers не потребують Rust toolchain
- npm install → одразу працює contour bridge
- Cloud Agent може typecheck без локального wasm-pack

## Мінуси

- Binary drift: забули `build:wasm` після змін Rust → stale pkg
- Repo size зростає (~сотні KB wasm)
- Merge conflicts у generated JS/d.ts

## Рекомендовані дії

1. CI крок: `build:wasm` + перевірка `git diff --exit-code` на pkg
2. Pre-commit hook (optional): rebuild wasm якщо `packages/core/src/` змінився
3. Документувати в README: «після змін Rust — `npm run build:wasm`»

## Критерії моніторингу

- [ ] CI fails якщо pkg не синхронізований з Rust source
- [ ] CONTRIBUTING.md з інструкцією rebuild
