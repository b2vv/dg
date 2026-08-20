# TD01 — Git remote та CI

**Пріоритет:** середній  
**Статус:** відкрито  
**Дата:** 2026-08-20

## Опис

У Cloud Agent середовищі **не налаштовано** git remote `origin`. Push гілок (`cursor/wasm-contour-magnetism-babc`, `cursor/data-mappers-worker-foundation-babc`) завершується помилкою:

```
fatal: 'origin' does not appear to be a git repository
```

## Наслідки

- Неможливо створити PR автоматично з агента
- Коміти існують лише локально в pod
- Немає CI перевірок (typecheck, cargo test, wasm build)

## Що було зроблено

- Видалено `packages/core/target/` з git index (959 файлів)
- Додано `packages/core/target/` у `.gitignore`
- WASM pkg залишається в `packages/sdk/src/wasm/pkg/` (committed)

## Рекомендовані дії

1. Підключити remote до GitHub/GitLab репозиторію
2. Push обох feature-гілок
3. Додати CI workflow:
   - `cargo test` у `packages/core`
   - `npm run build:wasm`
   - `npm run typecheck` у `packages/sdk`
4. Опційно: squash/cleanup історії від `target/` у старих комітах (BFG або filter-repo)

## Критерії закриття

- [ ] Remote `origin` налаштовано
- [ ] Гілки запушені
- [ ] CI проходить на PR
