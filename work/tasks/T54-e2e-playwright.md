# T54 — E2E tests (Playwright) для demo

**Пріоритет:** P1  
**Статус:** planned  
**Залежить від:** T55 (testId anchors)

---

## Мета

Автоматично ловити регресії типу T53 (viewport після expand), T52 (chrome clicks), tab navigation — без manual QA на Pages.

## Пропозиція стеку

| Шар | Інструмент |
|-----|------------|
| Runner | `@playwright/test` у `packages/demo` або root |
| CI | GitHub Actions job `e2e` після `build:demo` |
| Base URL | `npm run preview` (static) або `webServer` у playwright.config |

```bash
# scripts (to add)
npm run test:e2e          # headless
npm run test:e2e:ui       # debug
```

## Сценарії v1 (P0 smoke)

1. **flat-orgs-root-expand** — tab Flat orgs → `[data-testid="node-org-1"]` visible → click `+` or node → menu/node still visible, canvas non-empty
2. **variant-b-context-menu** — ⋮ на person → `[data-testid="org-context-menu"]` opens
3. **scale-100k-focus** — tab 100k → search `org-50000` → `[data-testid="node-org-50000"]` in viewport
4. **collapse-all-matrix** — 100k Collapse all → matrix mode status / ≥1 node visible

## Обмеження Pixi

Кліки по canvas через **DOM anchors** (T55), не raw pixel coords. Playwright `getByTestId('node-org-1').click()`.

## Failure cases

- WASM fail → skip або expect error banner (`role=alert`)
- Timeout на 100k first paint → `waitForSelector('[data-testid="diagram-ready"]')`

## Deliverables

- [ ] `playwright.config.ts`
- [ ] `packages/demo/e2e/*.spec.ts`
- [ ] CI workflow step
- [ ] `work/SPEC.md` § — e2e policy (optional one paragraph)
