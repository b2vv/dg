# TD01 — Git remote та CI

**Пріоритет:** середній  
**Статус:** частково (CI ✅; remote URL ✅; credentials ⏳)  
**Дата:** 2026-08-20

## Опис

Remote налаштовано локально:

```
origin  https://github.com/b2vv/dg.git
```

Fetch/push **не працюють** без GitHub credentials у Cloud Agent (`could not read Username for 'https://github.com'`). Репо без auth дає 404 (private або ще не створене).

## Що зроблено

- [x] `.github/workflows/ci.yml`
- [x] `git remote add origin https://github.com/b2vv/dg.git`
- [ ] Auth / link environment → repo
- [ ] Push `cursor/ci-td01-babc` (+ інші feature branches)

## Критерії закриття

- [x] CI workflow додано
- [x] Remote URL вказано
- [ ] Credentials / GH access
- [ ] Гілки запушені; CI зелений на PR
