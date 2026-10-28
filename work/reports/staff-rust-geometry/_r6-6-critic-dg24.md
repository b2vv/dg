claude-opus-4-8

# R6-6 критик (варіант B-narrow) — DG24

ДАЛІ: читаю svgExport.ts (buildDiagramSvg 166-340), staffLiveGeometry.ts, staffRouterV2.ts, visualEdgeBox.ts, staffLayoutInputs.ts, staffEdgeGeometry.ts, наявні svgExport-тести, recon-ноту. Перевіряю 7 пунктів вердикту.

## Q1 — паритет через reuse-canvas (БАЙТ-рівність)
ФАКТ. SVG v2: svgExport.ts:282-292 викликає `resolveStaffRouting({positionNodes:canvas.positionNodes, edges:canvas.edges, positionById, personTheme, lod:'near', orgCards:orgCardBoxes})`. Legacy: :294-301 `buildStaffEdgeSegments(canvas.edges, mapStaffEdgeBoxesForLod(mapPositionNodesToStaffEdgeBoxes(canvas.positionNodes, positionById, personTheme), orgCardBoxes, 'near'))`.
ФАКТ. LIVE v2: staffLiveGeometry.ts:122-129 — ті самі аргументи, `personTheme: theme.person`, `lod` параметр. Legacy: :133-138 — ідентична форма.
ФАКТ. `resolveStaffRouting` (staffRouterV2.ts:33-48): deptFrames з `contourSceneInputs(positionNodes, positionById)`, `framePadding ?? 8` — не передається у жодному сайті → 8 обидва. `buildStaffEdgeSegments` default `frames=[]` (staffEdgeGeometry.ts:436) в обох legacy-гілках.
ВИСНОВОК Q1: при reuse того САМОГО canvas (B передає svgExport-ів canvas у `input.canvas`, staffLiveGeometry.ts:83-84) єдині входи routing — canvas, positionById, personTheme, lod. Усі ідентичні, якщо B будує `theme.person = {...defaultNodeTheme.person, ...input.personTheme}` (= :268-271) і lod='near'. routes БАЙТ-рівні, ОБИДВІ гілки. → ПАРИТЕТ ПІДТВЕРДЖЕНО.

## Q2 — theme поза `.person`
ФАКТ. routing → `theme.person` (:126/:134); `departmentWrapperPadding` :99 → theme.departmentCard/department.strokeWidth → contentPadding; `buildStaffLayoutOptions` :77 → theme.person + theme.staffZone → staffOptions/zoneLabelBand. contentPadding+staffOptions ідуть ТІЛЬКИ в zones/canvas-build; B бере лише routes+markedCrossings → решту відкинуто.
ВИСНОВОК Q2: на routes впливає ТІЛЬКИ theme.person. ✔

## Q3 — undefined/resolvedTheme
ФАКТ. staff=undefined безпечний (optional chaining staffLayoutInputs.ts:91-93). resolvedTheme → лише zoneLabelBand → canvas-build(skip)+zones(discard), НЕ routes. ✔

## Q4 — регрес
ФАКТ. export.test.ts:283 FROZEN byte snapshot дефолту (legacy/blob/zonechrome-off, types.ts:469-471). deptGrouping.test.ts:32-39 v2≠legacy, обидві мають edges. B дає байт-ідентичний output → проходять без оновлення. Frozen-snapshot — найсильніший gate; якщо він ЗМІНИВСЯ після B — паритет НЕ by construction, не оновлювати наосліп. Width/height/zones/departments не чіпає. БЕЗПЕЧНО.

## Q5 — не залазить у R7
ФАКТ. B/C замінює лише routing-блок (:280-303); :213-243 enrich+zones, width/height, bounds лишаються. ✔

## Q6 — пастки тесту
BLOCKING (дизайн тесту). shortenPolylineForArrow (svgExport.ts:307, staffEdgeArrows.ts:28-44) мутує ОСТАННЮ точку admin/cross-tier → `d` ≠ routes.points для arrow-ребер. deptGrouping-фікстура — усі admin → усі зсунуті. Тест: не-arrow порівнювати напряму; arrow — застосувати той самий shorten в очікуванні; фільтрувати `<polygon>` стрілки з `<g id="edges">`.
NON-BLOCKING. markedCrossings → лише колір stroke (:310), не points. «байт» коректний (ті самі float, детермінізм golden tol=0), eps не треба. card vs blob ОРТОГОНАЛЬНЕ до routes (card → лише contentPadding/zones=R7); осі покриття = v2/legacy × arrow/plain; inline-фікстура достатня.

---

# ДОПОВНЕННЯ: архітектурний вердикт по варіанту C (routing-seam для всіх трьох)

ДАЛІ: перевіряю cache@staffEdgeGeometry.ts:273, локацію unionBoxes/contourSceneInputs (блокує move у layout/?), наявну зв'язність svgExport→render/.

ФАКТ (зв'язність уже є). svgExport.ts:17-27 ВЖЕ імпортує `resolveStaffRouting` з render/staffRouterV2 (:17) + 10 інших з render/ (types, visualEdgeBox, contour/*, staffZoneBounds, staffEdgeArrows). Тобто «svgExport залежить від render/» — вже факт сьогодні.
ФАКТ (deps seam). resolveStaffRouting залежить від `contourSceneInputs` (render/contour/contourInputs.ts:29) і `unionBoxes` (render/staffZoneBounds.ts:153) — ОБИДВА в render/. Перенос seam у layout/ інвертує залежність (layout→render), що гірше за поточне.
ФАКТ (cache). Box-index кешується per-array-identity через WeakMap (staffEdgeGeometry.ts:271-275); `mapStaffEdgeBoxesForLod` повертає свіжий масив per render → кеш ніколи не застаріває і GC-иться з боксами.
ФАКТ (цикл B). staffLiveGeometry.ts:24 `import type DiagramRenderer` — type-only, стерто; але computeStaffLiveGeometry експортується в index.ts:123 і вживається DiagramRenderer.ts:645. B змусив би svgExport тягнути ЦІЛИЙ staffLiveGeometry (layout+zones+routing) і відкидати 4/6 виходів.

## 1. C vs B
ВЕРДИКТ: C ЧИСТІШЕ. svgExport вже спарений з render/staffRouterV2 (svgExport.ts:17) → routing-seam у render/ додає НУЛЬ нової зв'язності. B натомість робить svgExport споживачем «LiveGeometry», з якого він викидає 4/6 полів (staffOptions/zoneLabelBand/contentPadding/zones) і повторно рахує zones (staffLiveGeometry.ts:102 дублює svgExport.ts:214) — семантичний борг, не байтовий. C дає кожному з трьох рівно `{routes, markedCrossings}`.
ПРИХОВАНА ВАДА C (одна, керована): «у layout/» НЕ виходить без перетягування contourSceneInputs+unionBoxes (обидва render/) у layout/ → інверсія залежності. Тому seam тримати в **render/**, а не layout/. Якщо власник наполягає на layout/ — це окремий більший рефактор (спершу перенести обидва хелпери), поза R6-6.

## 2. Strategy/provider — НЕ зараз (YAGNI)
ВЕРДИКТ: проста функція з внутрішнім `if (router==='v2')`. 3 номінальні варіанти (v2/legacy/Rust), але Rust — R7 (ще нема), а вибір сьогодні = один config-флаг у одному if (staffLiveGeometry.ts:121, svgExport.ts:282). Plan §7: патерн лише за ≥2-3 реальні повторення — тут 1 розгалуження. Межа функції ВЖЕ локалізує R7-зміну в той самий if. Strategy/DI-provider наперед = спекулятивно. Повернутись, коли Rust РЕАЛЬНО приземлиться І розгалуження вийде за межі seam.

## 3. Singleton — ВІДХИЛИТИ (твоє заперечення ПІДТВЕРДЖЕНО)
routing stateless/pure (resolveStaffRouting без стану; box-кеш — WeakMap на вхідний масив, не глобал). Singleton нічого не дає й відтворює саме той клас process-wide-стану, який AGENTS.md документує як витік (ForTests WASM-loader дотягнувся до кожної діаграми в хост-застосунку). Детермінізм-гейт R6-5 (golden 2-прогони tol=0) вимагає відсутності крос-виклик-стану. Singleton — ні.

## 4. Стан/кеш — НЕ потрібен
Box-index уже кешований per-array через WeakMap (staffEdgeGeometry.ts:271-275). Нема доказів, що routing достатньо гарячий для крос-виклик-memo; інстанс-стан був би передчасним до R10-виміру і повернув би ризик застарілості/детермінізму, якого WeakMap свідомо уникає. Seam лишити чистим (stateless function), без інстансу.

## 5. Локація + мінімальна сигнатура
ЛОКАЦІЯ: **render/staffRouterV2.ts** (не layout/ — deps там). РОЗШИРИТИ наявний `resolveStaffRouting` (:33), не писати нову обгортку — він уже бере рівно потрібні входи; додати дискримінатор гілки й вкласти legacy (buildStaffEdgeSegments без deptFrames, markedCrossings=[]).
МІНІМАЛЬНА СИГНАТУРА (передавати РОЗВ'ЯЗАНИЙ прапор роутера, НЕ весь RenderConfig — тримає чистоту):
```
resolveStaffRoutes(input: {
  router: 'v2' | 'legacy';
  positionNodes; edges; positionById;
  personTheme: PersonNodeStyle;   // theme.person ONLY (Q2)
  orgCards; lod;
  framePadding?;                  // default 8
}): { routes: StaffEdgeSegment[]; markedCrossings: Array<{fromId;toId}> }
```
КРИТИЧНО для паритету: legacy-гілка МУСИТЬ повертати `markedCrossings=[]` (сьогодні svgExport.ts:302, staffLiveGeometry.ts:120). Три виклики: computeStaffLiveGeometry (:119-139 → один виклик), svgExport (:280-303 → один виклик), golden успадковує через computeStaffLiveGeometry.

## ПІДСУМКОВИЙ ВЕРДИКТ
- C > B: чистіше, нульова нова зв'язність (svgExport уже в render/staffRouterV2), жодного викидання 4/6 виходів і подвійного zone-compute.
- Provider/Strategy: НЕ окупається зараз (YAGNI, §7); проста функція з одним if локалізує R7.
- Singleton: ВІДХИЛИТИ — stateless, ризик process-wide-витоку (AGENTS.md), ламає детермінізм R6-5.
- Кеш/стан: не потрібен — WeakMap box-index уже покриває (staffEdgeGeometry.ts:273); інстанс-стан передчасний до R10.
- Локація: render/staffRouterV2.ts; РОЗШИРИТИ resolveStaffRouting на legacy, НЕ нова обгортка, НЕ переносити в layout/ (інверсія deps).
- B-narrow (fallback, якщо C відкинуть): безпечний, паритет байт-рівний; єдиний BLOCKING — дизайн parity-тесту (arrow-shortening).
