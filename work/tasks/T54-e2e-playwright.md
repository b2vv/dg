# T54 — E2E tests (Playwright) для demo

**Пріоритет:** P1  
**Статус:** done  
**Залежить від:** T55 (testId anchors)

---

## Мета

Автоматично ловити регресії типу T53 (viewport після expand), T52 (chrome clicks), tab navigation — без manual QA на Pages.

## Стек

| Шар | Інструмент |
|-----|------------|
| Runner | `@playwright/test` (root) |
| CI | GitHub Actions job `e2e` |
| Base URL | `rsbuild preview` port 4173 |
| Entry | `/?e2e=1` → interactive DOM anchors |

```bash
npm run test:e2e          # headless
npm run test:e2e:ui       # debug
```

## Сценарії v1 (P0 smoke)

1. **flat-orgs-root-expand** — tab Flat orgs → `node-root` → click → `node-org-2` visible
2. **variant-b-context-menu** — right-click `node-ceo` → `org-context-menu`
3. **scale-100k-focus** — tab 100k → search `org-50000` → `node-org-50000`
4. **collapse-all-matrix** — 100k Collapse all → anchors still present

## Deliverables

- [x] `playwright.config.ts`
- [x] `e2e/*.spec.ts`
- [x] CI workflow job `e2e`
- [x] root scripts `test:e2e`, `test:e2e:ui`

## Verify

```bash
npm run build:demo
npm run test:e2e
```
