# Report — 1-B GPU viewport culling

Topic: `lazy-render-viewport` · гілка `feat/viewport-culling-gpu` · 2026-11-04
Дельта від `plan.md` (план не переписую — лише що сталося й де відрізняється).

## 1. Зроблено

GPU viewport culling для осі 1-B: off-screen Pixi-node-view'и не йдуть у GPU-сабміт на кожен paint.
- `DiagramRenderer.cullToViewport(viewport, screen)` — перед кожним paint виставляє `renderable`
  кожному node-view за перетином world-box(×камера) з екраном+margin (`pad=0.5·max(екран)`);
  early-out `<CULL_MIN_NODES=300` → `resetCull()`. No-throw (fail-open на битій геометрії).
- `resetCull()` — усім node-view `renderable=true` (ніколи не чіпає `visible`).
- `getCullStats(): CullStats` — `{drawn,culled,passes}`, seam для тестів (не публічний).
- `PixiHost.requestPaint` — cull перед `app.render()` у rAF (ре-cull «на viewport-dirty», бо paint
  on-demand).
- `OrgHierarchyDiagram.export()` — `resetCull()` перед extract (B1: PNG/PDF містять усе дерево).

**Код написав Codex (`codex exec`), TDD.** Рев'ю — Claude (незалежно).
**Публічного API / `docs/USAGE.md` не змінено** (OQ1 = авто-поріг без тумблера).

## 2. Протестовані сценарії

Unit/integration (зелені, `npm test -w @org-hierarchy/sdk`: **1316 passed, 0 failed, 2 skipped**;
typecheck 0):
- `DiagramRenderer.cull.test.ts` (21): AC1 cull off-screen, AC3 passes, AC4 early-out<300 (spy: getBox
  не викликається), AC6 margin-boundary 599/601, AC7 edges не чіпати, AC10 ідемпотентність+незалежний
  snapshot, AC12/NB1 (битий/відсутній box × NaN/±Inf → **явне renderable=true**), N3 (getBox throw → no-throw).
- `PixiHost.test.ts`: порядок ['cull','render'], коалесинг, свіжий transform, no-cull після destroy (AC3-інтеграція).
- `export.test.ts`: extract-time spy — promote знято, усі renderable=true (B1/AC11); restore у finally (×extractionFails).
- `e2e/viewport-culling.spec.ts`: AC9 motion-blur `blur(>0px)` під час pan + `none` після + no pageerror;
  AC2 поведінкові (камера рушила, test-anchors у вьюпорті).

## 3. Неочевидні знахідки

- **Передумова «react layout» не мала цілі:** React-layout-шару діаграми не існує (все TS/Pixi);
  зняли на старті (research §0).
- **Два центри вартості** (research §5): CullerPlugin культивує лише GPU-сабміт, а не CPU-rebuild;
  для осі 1-B це саме GPU-paint на pan → DIY `renderable` перед paint.
- **B1 (знайшов Gate 2):** raster-export `extract.canvas(stage)` респектує `renderable` і не
  ре-рендерить → після culling PNG/PDF втратили б off-screen вузли. Фікс — `resetCull()` перед
  extract, тим самим прецедентом, що вже знімає promote.
- **NB1 (Gate 2 ре-вердикт):** гілка битого боксу мусить писати `renderable=true` ЯВНО, не `continue`
  (інакше stale false ховає вузол). Закрито + дискримінуючий тест.

## 4. Скріншоти / візуальне

E2e `viewport-culling.spec.ts` існує, але **в цій пісочниці не біжить** (preview-сервер EPERM на
:4173) — прогін AC2/AC9 лишається на CI/локально.

## 5. User-flow

Хост нічого не змінює: culling вмикається автоматично на сценах ≥300 node-view. Zoom-in + pan
великою сценою → дешевший кадр, той самий вигляд. fit-to-whole / мала сцена → без змін. Export →
повне дерево як раніше.

## 6. Ризики й обмеження

- **AC2 пиксель-паритет — РУЧНИЙ крок (не CI-гейт):** зняти бейзлайн із `CULL_MIN_NODES=Infinity`
  (culling off), потім порівняти culling-білд. Само-референтний бейзлайн із culling-білда — не доказ.
- **Поріг 300 — стартовий**, валідувати `npm run measure` (OQ5); змінюється однією константою.
- **N5:** при сильному zoom-out margin у world стає величезним → `culled≈0` (очікувано, не баг).
- **Overview/minimap ⟂ culling** (урок GoJS) — на майбутнє, поза скоупом.
- Ось 1-A (CPU build-skip на initial render) і spatial index для дуже великого дерева — **окремі
  майбутні фічі** (свідомо відкладено).

## 7. Відкриті рішення власника

1. **Аномальний git worktree** `.claude/worktrees/dg-archive-factory-api-e359fb` (detached 8e97ff1)
   існує в репо — суперечить «без worktree». Не чіпав (можливо AI Factory). Видалити?
2. **Commit / PR** ще не роблено (чекає слова).

## Post-deploy
(заповнити після деплою — `post-deploy-check`)
