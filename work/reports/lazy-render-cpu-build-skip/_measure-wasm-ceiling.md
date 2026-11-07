# Вимір: стеля whole-tree WASM (F0 — розв'язує data-window vs draw-window)

> Жива нота. Мета: отримати АБСОЛЮТНЕ число — скільки вузлів WASM розкладає whole-tree в бюджет
> інтеракції. Це число вирішує модель §6 (data-window vs draw-window). НЕ CI-асерт (стенд шумить
> 28%, абсолюти флейкують у повному прогоні — `rowTreeLayoutCost.measure.test.ts`), тож standalone
> median-of-3, прогрів, ізольований прогін, числа → у звіт. Прецедент: one-off AC2 (handoff §3).

ДАЛІ: кидабельний `src/layout/_ceilingProbe.measure.test.ts` — `computeOrgRowTreeLayout(flatTree(n))`
на n ∈ {10k,50k,100k,250k,500k,1M}, median-of-3 + warmup, друкує таблицю. Запуск ізольовано:
`npm run measure -w @org-hierarchy/sdk`. Потім видалити файл.

## Межі цього виміру (чесно)
- Міряю ORG row-tree шлях (`computeOrgRowTreeLayout` → ploeg_layout.rs). Він топиться на 100k у demo
  (SCALE_ORG_TOTAL), але має те саме «whole-tree завжди».
- 🔴 Критичний випадок §6 — STAFF 1M (стіна), рахується `computeStaffGeometry` (інший движок).
  Його вимір — ОКРЕМИЙ лот (потрібен генератор StaffLayoutInput). Не змішувати числа.
- flatTree = зірка (depth-1): стрес на к-сть вузлів/ширину (Reingold-Tilford жене ширину до кореня —
  саме дорога вісь). Глибина окремо (depth_probe.rs). Для virtualization вісь = к-сть, ок.

## STAFF-шлях (лот 2, важчий) — оцінка здійсненності
- `buildStaffLayoutInput` (`render/buildStaffLayoutInput.ts`) — чиста мапа з `DiagramData`
  (organizations/positions/reportLines/departments) + render-значення (metrics, padding, nodeSizes, dockHints).
- 🔴 Генератора ЦІЛОГО 1M staff-ростера НЕ існує: demo (`scaleStaff.ts`) завжди будує ВІКНО, ніколи не
  годує WASM цілим 1M. Тобто для staff-стелі треба синтетичний 1M-генератор (orgs+positions+reportLines) →
  `computeStaffGeometryWasm`. Окремий лот; не змішувати з org-числами нижче.

## РЕЗУЛЬТАТИ — ORG row-tree (лот 1) ✅ 2026-11-04
Median-of-3, warmup, ізольований прогін (`npx rstest run _ceilingProbe` MEASURE=1, 59.6с усього).
flatTree (зірка, depth-1). Throwaway-проба видалена після запису.

| nodes | median | per-node slope vs попередній |
|---|---|---|
| 10 000 | 53.7 ms | — |
| 50 000 | 274.8 ms | ×1.02 |
| 100 000 | 588.7 ms | ×1.07 |
| 250 000 | 1 607 ms | ×1.09 |
| 500 000 | 3 555 ms | ×1.11 |
| 1 000 000 | 8 626 ms | ×1.21 |

**Читання:** вартість ≈ ЛІНІЙНА (slope 1.0–1.2; легкий super-linear creep угорі, НЕ квадрат). Але
АБСОЛЮТ — ось вирок:
- бюджет кадру ~50мс → стеля whole-tree ≈ **10k вузлів**;
- суб-секунда (~600мс) → ≈ **100k** (саме demo SCALE_ORG_TOTAL — whole-tree там на межі, 0.59с одноразово);
- 1M → **8.6с** — поза будь-яким інтерактивним бюджетом.

**Висновок для §6 (data-window vs draw-window):**
- draw-window (owner-канон «whole-tree ЗАВЖДИ» + малювати visible) **життєздатний до ~100k**: одноразова
  розкладка суб-секунда, далі лише cull/paint (= вже наявний `cullToViewport`, F2). Чисто й канонічно.
- На 1M whole-tree НЕ інтерактивний (8.6с org; staff — інший движок, ≥ цього порядку, НЕ виміряно). Тобто
  canon «whole-tree завжди» на 1M **фізично не тримається** → data-window (або chunked/progressive layout)
  вимушений саме там.
- 🔑 Отже «поріг T» — НЕ лише zoom-scale render-switch (DOM#2↔Pixi#3). Є ДРУГИЙ поріг — **розмір даних**
  (десятки тисяч вузлів), вище якого whole-tree compute перестає бути інтерактивним, НЕЗАЛЕЖНО від зуму.
  Модель §6 — не «або/або» на всьому діапазоні: є crossover ≈ 10k…100k.

**Застереження (не переоцінювати):** (1) flatTree — зірка; реальне дерево з глибиною навантажує contour/shift
інакше (але к-сть вузлів домінує; 8.6с/1M — headline у будь-якому разі). (2) Це ORG-движок; staff 1M — демо-
артефакт (власник: реальні дані обмежені), тож staff-1M-вимір знятий зі скоупу.

## BROWSER-ВИМІР — DOM-картки viewport-bounded (лот 3) ✅ 2026-11-04
Реальна brigade-фікстура (`?tab=staff-brigade&promote=near-visible`, dev :3004, Chrome) — **реальний
департаментний shape** (84 seats, tree з reportLines).

| зум | total DOM nodes | canvas | cardish | abs-layers |
|---|---|---|---|---|
| 0.36 (fit, far) | 96 | 1 | 1 | — |
| 4.00 (near LOD) | 105 (+9) | 1 | 1 | 3 |

**Висновок:** уся діаграма малюється на **ОДНОМУ Pixi-canvas**; DOM ~сталий (~100 вузлів) незалежно від
зуму. HTML-промоція (`near-visible`) на близькому зумі додала лише ~9 вузлів — **viewport-обмежений
жменьковий набір, НЕ per-node**. Тобто проблема «монтувати тисячі DOM-карток» у цьому SDK **не існує**:
к-сть DOM масштабується з viewport, не з датасетом. Brigade = 84 посади → реальні департаментні дані скромні
(підтверджує «тисячі, не мільйони»).

## BUILD-ВИМІР — render()-build (layoutStaffCanvas) на bounded department-view (лот 4) ✅ 2026-11-05
Власник слушно зауважив: DOM малий бо клампиться до viewport; справжня вісь — BUILD (scene будує всі N).
Виміряно `layoutStaffCanvas` (staff-геометрія, яку кличе render), синтетичний департаментний staff,
**повністю розгорнутий** (expanded:true на head+dept-heads, бо інакше always-on prune дає лише голову).
Throwaway-проба видалена.

| staff-посади (розгорнуто) | out-nodes | build ms |
|---|---|---|
| 508 | 508 | 4.0 |
| 1026 | 1026 | 6.3 |
| 2027 | 2027 | 12.3 |
| 5043 | 5043 | 29.4 |

~Лінійно (~6µs/вузол). **5k повністю розгорнутий = 29мс — у інтерактивному бюджеті.**
🔑 Два незалежні обмежувачі build-у: (1) вартість мала й лінійна; (2) **always-on prune** — staff-в'ю
за дефолтом будує лише розгорнуте (BFS від голови вздовж admin-ребер, `positionExpand.ts:49`), тож
render рідко отримує тисячі, а коли так — це явний expand користувача, і 29мс/5k тримає.
⚠️ Застереження: це layoutStaffCanvas (геометрія), не ВЕСЬ render() (ще Pixi-display-objects + paint);
але paint куллиться (1-B), а геометрія — важка алгоритмічна частина й вона 29мс@5k.
⚠️ Урок (двічі спіймано): перша проба читала `res.nodes` (нема, →-1) і неекспандований staff
(prune → out-nodes=2, 3мс «порожнечі»). Валідація виходу (out-nodes=in) — обов'язкова; зелене ≠ є робота.

## ЗВЕДЕНИЙ ВЕРДИКТ F0 → virtualization = YAGNI (measurement-driven)
- Layout швидкий на bounded-масштабі: org-RT 10k=54мс; staff-стіна=арифметика. ✅ (вимір)
- DOM/draw viewport-обмежені БЕЗ нової підсистеми: 1 canvas, DOM~сталий, cull (1-B) куллить GPU,
  promote capped+gated. ✅ (browser-вимір + код)
- Реальні дані обмежені (brigade=84; власник: тисячі). ✅
- Build на кількох тис. в одному view — ВИМІРЯНО: 5k розгорнутий = 29мс, ~лінійно; + always-on prune
  обмежує build expand-станом. ✅ (лот 4)
→ Підсистема viewport-virtualization **не потрібна** для реальних даних. Лишити shipped `cullToViewport`.
Усі чотири осі (layout, DOM/draw, дані, build) виміряні й у бюджеті — YAGNI доти, доки реальний
host-кейс не покаже інакше.
