# WIP — Architecture recon for @org-hierarchy/sdk → 4 libs split

ДАЛІ: перевіряю структуру тек packages/sdk/src/{layout,contour,wasm,render,state,worker,mappers,export,data,react,interaction,media} + Rust packages/core; читаю index.ts і exports у package.json; будую карту модуль→ліб.

## ФАКТ (крок 0 — структура)
- packages/: core (Rust), demo, sdk.
- sdk/src теки: contour, data, export, interaction, layout, mappers, media, react, render (106 entries!), state, wasm, worker.
- Файли в корені sdk/src: index.ts, OrgHierarchyDiagram.ts (85KB!), callbacks.ts, *.contract.test.ts.
- core/src — Rust (lib.rs etc), bindings/, examples/.

## ФАКТ (крок 1 — публічний контракт)
- package.json exports: `.` → dist/index.js; `./react` → dist/react/index.js; `./worker` → dist/worker/index.js; `./mappers` → dist/mappers/index.js. peerDeps react/react-dom (optional). dep: pixi.js. (packages/sdk/package.json)
- index.ts re-експортує з: OrgHierarchyDiagram.ts, data/types, mappers, worker, contour/bridge, render (ОГРОМНИЙ блок ~70 symbols), media, callbacks, data/initialExpand, interaction, interaction/searchWorker, export, layout. (index.ts:1-273)
- ⚠️ render/contour/* реекспортується через корінь (VARIANT_B_POSITIONS, ContourPoint) — contour розмазаний між contour/ і render/contour/. (index.ts:49-55)

## ФАКТ (крок 6 — Ф1-WIP слід, РЕАЛЬНИЙ git status, відрізняється від снапшота в завданні)
Незакомічене (все = #1 LAYOUT):
- Rust core: hierarchy.rs, lib.rs, org_layout.rs, org_tree.rs, ploeg_layout.rs, types.rs, examples/depth_probe.rs (M)
- sdk layout/staff: orgBlockLayout.ts (M), orgBlockLayout.deptGrouping.test.ts, staffDeptGrouping.test.ts (M); _recenterProbe.test.ts (новий)
- wasm: generated/rust-types.ts (M), pkg/org_hierarchy_core_bg.wasm (M); reingoldTilford.invariants.test.ts (новий)
- docs/diagrams/reingold-tilford-layout.md (новий); AGENTS.md, .gitignore (M); scratchpad/, work/reports (untracked)
РИЗИК: весь Ф1-WIP локалізований у #1 (layout+wasm+core). Спліт #1 треба секвенсувати ПІСЛЯ коміту Ф1, бо торкається тих самих файлів (org_layout.rs, orgBlockLayout.ts, rust-types.ts, *.wasm).

## ФАКТ (крок 2 — граф імпортів МІЖ модулями, cross-dir count)
layout → data×36, wasm×2, interaction×2, contour×1
contour → (нічого крос-дір)
wasm → contour×1
render → data×40, layout×32, interaction×27, media×6, contour×6, callbacks×5
state → render×3, interaction×3, data×2, layout×1
worker → mappers×4, data×4, layout×2, interaction×2, contour×2
mappers → data×3
export → render×15, layout×6, data×5, contour×1
data → (leaf; лише типи)
react → interaction×11, render×7
interaction → data×21, worker×5, layout×1
media → data×5, render×4, interaction×3

### Карта модуль → ліб (чернетка)
| модуль | ліб |
| layout | #1 LAYOUT |
| contour | #1 LAYOUT (але розмазаний у render/contour) |
| wasm | #1 LAYOUT |
| core (Rust) | #1 LAYOUT |
| render | #3 CANVAS/WEBGL |
| react | #2 REACT |
| OrgHierarchyDiagram (facade) | #4 ОРКЕСТРАТОР |
| state | #4 |
| worker | #4 |
| mappers | #4 |
| export | #4 |
| interaction | #4 |
| media | #4 |
| data | ⚠️ SHARED foundation (усі 4 залежать) — НЕ вкладається в 4, потрібна 5-та базова або в #1 |

### Топ-зчеплень, які спліт мусить розрізати (попередньо)
1. render → interaction ×27: #3 залежить від #4 (ЗВОРОТНЯ залежність, оркестратор не має бути під рендером).
2. data імпортується ВСІМА (36+40+21+...): спільний фундамент, 4 ліби не передбачають його.
3. render → layout ×32: #3 → #1 — це і є шов LAYOUT→RENDER (очікувано, але треба тип-контракт).
4. react → render ×7 + interaction ×11: #2 тягне #3 і #4.
5. layout → interaction ×2 / layout → contour: #1 тягне #4.

## ФАКТ (крок 4 — шов LAYOUT→RENDER)
- Типи-контракт: `OrgLayoutResult{mode,nodes:OrgLayoutNode[],edges:OrgLayoutEdge[],width,height}` (layout/types.ts:48-54); `StaffCanvasResult`/`StaffNodeBox` (layout/staff/types.ts); `StaffLayoutOptions`, `DEFAULT_STAFF_LAYOUT_OPTIONS`.
- ⚠️ ШОВ НЕЧИСТИЙ: render НЕ лише споживає тип — DiagramRenderer **сам викликає layout-compute**: `import {layoutStaffCanvas} from '../layout/staff/canvasLayout.js'` (DiagramRenderer.ts:16) і `import {computeOrgLayout} from '../layout/rowTreeLayout.js'` (DiagramRenderer.ts:25). Тобто розрахунок розкладки ВБУДОВАНИЙ у Pixi-рендер, не викликається оркестратором окремо.
- render→layout найгустіше: staffEdgeGeometry.js ×13 (геометрія ребер), staff/types ×6, staff/coords ×5. Це геометрія+типи+compute разом.
- Наслідок для спліту: щоб #1 LAYOUT став як dagre/elk (чистий compute), треба ВИЛУЧИТИ виклики layout з #3 render і підняти їх в оркестратор #4 (layout→result→render), інакше #3 тягне весь #1 всередину.

## ФАКТ (крок 5 — абстракція рендера; #3 НЕ за інтерфейсом)
- `RendererKindPreference='auto'|'webgl'|'canvas'` (PixiHost.ts:25), `getRendererKind():'webgl'|'canvas'|null` (PixiHost.ts:268) — це ВНУТРІШНІЙ Pixi webgl→canvas2d fallback (app.init preference + detectSoftwareRenderer), НЕ шов #2(DOM)↔#3(WebGL).
- `DiagramRenderer` — КОНКРЕТНИЙ Pixi-клас (import {Container,Graphics} from 'pixi.js' на DiagramRenderer.ts:3), не interface. Жодного renderer-interface, у який #2 React міг би вкластися, НЕМА.
- Наслідок: #2 REACT — фактично greenfield; оркестратору #4 треба ЗАВЕСТИ новий renderer-interface (сьогодні фасад кличе `host.renderer.render(drawing,...)` напряму, OrgHierarchyDiagram.ts:761), під який стануть і #3 Pixi, і новий #2 DOM.

## ФАКТ (крок 3 — фасад/рендер напрям)
- Фасад тримає PixiHost + DiagramRenderer (OrgHierarchyDiagram.ts:12,16,237,502); малює через renderNow→`host.renderer.render(...)` (737,761). Layout-compute у фасаді НЕ викликається — його робить DiagramRenderer. react/index.ts = лише оверлеї (contextMenu host, promote overlay, test-anchor) — підтверджує «#2 майже нема».
- data/types.ts — чистий leaf (0 import) = SSOT типів (DiagramData, DiagramPosition…). Його тягнуть усі 4 → потрібна 5-та SHARED база (або в #1).

## ФАКТ (крок 7 — T119 «рознесення фасаду»)
Файл: work/tasks/T119-split-the-facade-into-sub-apis.md; аналіз work/reports/facade-split/analysis.md; статус work/ROADMAP.md:43 «ламає публічний API — без замовника не брати», AGENDA.md Р6.
- Аргумент «ламає публічний API»: 65 плоских публічних методів на одному класі → рольові інтерфейси (CameraApi/ViewStateApi/SearchApi). Вимір: 22 різні сигнатури стану; 2 кластери — `host`×11, `viewState`×8 (analysis.md §1-2).
- ЦІНА / контр-аргумент (чому не почато): (а) 21 метод взагалі без стану — вже делегати, винесення лишає «обгортки-пустушки» (T106, CTO-RESEARCH:470); (б) справжній порушник SRP — `renderNow` (138 рядків, 25 членів this, кличе назад публічні методи) — «переїзд, а не поглиблення», НЕ виноситься; (в) вимір НЕ спростовує альтернативу «плоскі 64 методи — свідома простота» → потрібне ЛЮДСЬКЕ рішення про форму API (CTO-RESEARCH:850).
- Крок 0 (віднімання) зроблено: видалено `getLastContextMenu`/`computeOrgRowTreeLayoutInWorker` (реліз 0.5.1); саме рознесення НЕ почато.
- Зв'язок зі сплітом: спліт на 4 ліби ПЕРЕРОЗКЛАДАЄ той самий публічний бар'єр, що й T119 → ламає публічний API тим самим способом; потребує ADR + рішення власника.

## ФАКТ (крок 8 — гейти меж)
- `npm run check:docs` (scripts/check-docs.mjs) — 6 перевірок; релевантні межам: (2) публічний метод OrgHierarchyDiagram поза docs/USAGE.md → фейл (facadeSurface.mjs читає фасад; UNDOCUMENTED_BASELINE=8, лише спадає); (3) barrelSurface.mjs — index.ts не сміє експортити `*ForTests`. Спліт фасаду ЗЛАМАЄ facadeSurface-скан.
- `npm run typecheck` — tsc по всіх workspace + build:types + e2e tsconfig. Ловить type-level розриви імпортів, НЕ напрям залежностей.
- `npm run lint` = `oxlint --max-warnings 0` з плагіном `import`, але БЕЗ no-restricted-imports / layer-boundary / dependency-cruiser. ⚠️ ЖОДЕН активний гейт НЕ ловить порушення НОВИХ внутрішніх меж між 4 лібами — треба завести (напр. import/no-restricted-paths або dependency-cruiser) разом зі сплітом.
- Rust CI: cargo fmt --check + clippy -D warnings + cargo test (CTO-RESEARCH:827).
