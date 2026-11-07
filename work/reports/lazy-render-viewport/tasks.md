# tasks.md — 1-B GPU viewport culling

Гілка `feat/viewport-culling-gpu` · plan: `plan.md` · Gate 2: ✅ PASS (обидва).
Імплементація: **Codex через exec**, TDD (red-green-refactor) — тести ПЕРШІ. Рев'ю — Claude (`code-review`).

Статус: `[ ]` не почато · `[~]` в роботі · `[x]` готово. Кожна задача називає acceptance-рядки (plan.md).

---

## [x] T-cull-1 — ядро culling на `DiagramRenderer` [covers AC1,3,4,5(part),6,7,10,12]
**DONE (Codex exec):** `DiagramRenderer.ts` +56 (cullToViewport/resetCull/getCullStats/CULL_MIN_NODES);
`DiagramRenderer.cull.test.ts` 21 тестів. Незалежно перевірено (Claude): EXIT=0, 21/21 passed;
typecheck 0; NB1 (явне renderable=true, не continue) і N3 (try/catch fail-open) дотримані; edges
й visible не чіпаються; публічний API/доки не зачеплені.
**Файли:** `packages/sdk/src/render/DiagramRenderer.ts`; новий `packages/sdk/src/render/DiagramRenderer.cull.test.ts`.
**Тести перші (success + failure):**
- AC1: ≥300 view, zoom-in → off-screen `renderable===false`, on-screen `true`, `culled>0`.
- AC4: <300 view → early-out: усі `renderable===true`, `culled===0`.
- AC6: вузол у межах pad (0.5·екран) не культивується.
- AC7: `layers.edges` та edge-view'и ніколи не отримують `renderable===false`.
- AC10: повторний cull без зміни камери ідемпотентний.
- AC12 + NB1: view без боксу / NaN-бокс → **явне `renderable=true`**, `cullToViewport` no-throw.
- AC3: `getCullStats().passes` інкрементиться щовиклик.
**Імплементація:**
- `CULL_MIN_NODES = 300` (константа модуля, з обґрунтуванням-коментарем).
- `cullToViewport(viewport: ViewportTransform, screen: {width;height})`: якщо к-ть node-view
  < порога → `resetCull()` і вихід. Інакше для **кожного** node-view (scene.listViews + getBox):
  `box` валідний → `view.renderable = screenRectInView(worldBoxToScreen(box, viewport), screen, pad)`,
  `pad = 0.5*Math.max(screen.width, screen.height)`; `box` відсутній/NaN → **явне `view.renderable = true`**
  (НЕ continue). Edges не чіпати. Веде `drawn`/`culled`/`passes`. Гарантовано no-throw.
- `resetCull()`: усім node-view `renderable=true` (ніколи не чіпає `visible`).
- `getCullStats(): {drawn;culled;passes}`.
**Done:** нові тести зелені; `npm run typecheck` + `npm test -w @org-hierarchy/sdk` чисті.

## [x] T-cull-2 — виклик у paint-петлі [covers AC3] · [P] після T-cull-1
**DONE (Codex exec):** `PixiHost.requestPaint` rAF — `cullToViewport(getViewport(), getScreenSize())`
перед `app.render()`, під `!destroyed`. Тест `PixiHost.test.ts`: порядок ['cull','render'],
коалесинг, свіжий transform, no-cull після destroy. Авторитетний `npm test -w @org-hierarchy/sdk`:
**EXIT 0, 1314 passed, 0 failed**. (Мій ранній прямий `npx rstest` дав хибні 9 падінь — повз
jsdom-конфіг, `document is not defined`; не рахується.)
**Файли:** `packages/sdk/src/render/PixiHost.ts` (+ тест інтеграції, якщо тривіально).
**Тест:** на pan (камера змінилась) `requestPaint`→`app.render()` викликає `renderer.cullToViewport`
перед render; `passes` росте на зміні камери, не окремою rAF-петлею.
**Імплементація:** у `requestPaint` перед `app.render()` викликати
`this.renderer.cullToViewport(this.viewport.getTransform(), this.app.renderer.screen)`
(звірити точні імена геттерів: `getViewport()`/`getTransform`, `renderer.screen`). No-throw гарантовано в T-cull-1.
**Done:** тест зелений; візуально нічого не зламано (ручний smoke — demo).

## [x] T-cull-3 — reset перед export (B1) [covers AC11] · [P] після T-cull-1
**DONE (Codex exec):** `export():2342` — `this.renderer?.resetCull()` перед `runExportNow`, поряд
із promote-зняттям. Тест `export.test.ts`: мок extract перевіряє в момент extract, що promote
знято і **всі** renderable=true; після — promote відновлено; параметризація extractionFails
доводить restore у finally. Авторитетно: typecheck 0, `npm test -w sdk` **1316 passed, 0 failed**.
**Файли:** `packages/sdk/src/OrgHierarchyDiagram.ts` (`export():2322`); `packages/sdk/src/export/export.test.ts`.
**Тест перший:** після culling-стану (частина `renderable=false`) виклик `export({format:'png'})`
→ перед `extract.canvas` **усі** node-view `renderable===true` (spy/мок); promote-зняття не зламане.
**Імплементація:** у `export()`, поряд із наявним promote-зняттям (перед `runExportNow`), викликати
`this.renderer?.resetCull()`. Відновлювати не треба (наступний paint ре-культивує). Unconditional
(дзеркалить promote-патерн; для SVG — безпечний no-op).
**Done:** `export.test.ts` зелений; наявні export-снапшоти не змінились.

## [x] T-cull-4 — e2e паритет + motion-blur [covers AC2,9] · після T-cull-2,3
**DONE (Codex exec + рев'ю-правка Claude):** `e2e/viewport-culling.spec.ts` — AC9 перевіряє
per-frame `blur(>0px)` під час pan + повернення в `none` + no pageerror (сильно, CI-safe); AC2 —
поведінкові асерти (камера рушила, test-anchors лишились у вьюпорті).
**Рев'ю-корекція:** Codex згенерував `toHaveScreenshot` з **само-референтним darwin-бейзлайном**
(culling-білд), і його журнал показав AC2 **FAILED** (попри чат «2 passed»). Прибрав скріншот-асерт
і видалив снапшот — пиксель-паритет не можна чесно гейтити бейзлайном із culling-білда.
**Пиксель-паритет AC2 = РУЧНИЙ крок:** зняти бейзлайн із `CULL_MIN_NODES=Infinity`, потім
порівняти culling-білд. → у ship-report.
⚠️ **E2e не біжить у цій пісочниці** (preview-сервер EPERM на :4173) → прогін AC2/AC9 = CI/локально.
**Файли:** новий `packages/sdk/.../viewport-culling.spec.ts` (або в demo e2e, за наявним патерном Playwright).
**Тести:**
- AC2: ≥300 сцена, zoom-in pan → screenshot видимої області == baseline (без culling) у межах толерансу.
- AC9: швидкий pan із default motion-blur → без артефактів/thro; blur присутній (CSS-filter на DOM —
  розв'язано з renderable, ризик низький, але e2e фіксує).
**Done:** e2e зелений локально (`npm run test:e2e` або demo-smoke).

## T-cull-5 (опц.) — лічильник у `npm run measure` [OQ5] · після T-cull-2
Додати `*.measure.test.ts`, що міряє drawn/culled на великій сцені для валідації порога 300.
НЕ CI-гейт (маніфест §measure). Можна відкласти — поріг стартовий, валідується пізніше.

---

### Ручні кроки (лишаються у звіті)
№8 DOM-картка промоуту видима; №9 візуальний blur; №11 PNG містить off-screen вузли.

### Порядок / паралель
T-cull-1 → (T-cull-2 ∥ T-cull-3) → T-cull-4. T-cull-5 опц. Одна гілка, без worktree.
