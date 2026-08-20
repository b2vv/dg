# TD01 — Git remote та CI

**Пріоритет:** середній  
**Статус:** частково (CI ✅; remote ⏳)  
**Дата:** 2026-08-20

## Опис

У Cloud Agent середовищі **не налаштовано** git remote `origin`. Push гілок завершується помилкою:

```
fatal: 'origin' does not appear to be a git repository
```

## Що зроблено

- [x] `.github/workflows/ci.yml` — `cargo test`, `build:wasm`, `typecheck`, `npm test`
- [x] `packages/core/target/` у `.gitignore`
- [ ] Remote `origin` — потребує credentials / repo wiring поза агентом
- [ ] Push гілок на GitHub

## Критерії закриття

- [x] CI workflow додано (проходить локально через ті самі скрипти)
- [ ] Remote `origin` налаштовано
- [ ] Гілки запушені; CI зелений на PR
