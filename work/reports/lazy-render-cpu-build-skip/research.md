# Briefing — SDK viewport-virtualization + spliceData (feature-scoped)

Дата: 2026-11-04 · base: HEAD `425cb80`+ (гілка feat/sdk-viewport-virtualization) · feature-scoped
(не репо-брифінг; репо `work/CTO-RESEARCH.md` відстає 8 комітів, у межах 25, цей напрям там відсутній).
Джерела: `_grounding.md` (demo-механізми), `_research-sources.md` (спеки/Rust/seam, усі path:line).

## 1. Вердикт (одним екраном)

Напрям: перенести viewport-вікнування з demo у SDK (host дає повні дані, SDK вікнує) + delta-API
для динаміки. **Архітектурний факт №1 (найбільша пастка):** передумова, на якій стоять рішення
сесії — що «ШПС add/edit/delete вже в спеці» — **первинними джерелами НЕ підтверджена**. Edit-mode
для staff **відкладено** (`T128:14`, Бар-2/Q5); інкрементальна Rust-геометрія з кешем незмінних нод
**не існує й не специфікована**; поточна `work/SPEC.md:532-535` прямо каже «вікно — патерн хоста,
не функція SDK; culling T89 закрито без імплементації». Тобто це **нова спека + зміна наявної**,
а не імплементація затвердженого.

## 2. Продукт / вимога (стан премиси)
| Питання | Відповідь | Джерело |
|---|---|---|
| ШПС edit add/edit/delete — затверджена вимога? | **Ні.** Staff edit-mode відкладено; шов x/y лише декларується | `work/tasks/T128-...:14,:106` |
| Edit-mode специфіковано деінде? | Лише **ORG/reparent** (GoJS-хост), і теж не збудовано | `T117:7-8`, `T116:53` |
| Incremental data у спеці? | Лише **псевдокод-намір** §5.2, не вимога | `work/SPEC.md:477-483` |
| Вікнування — чия функція за чинною спекою? | **Хоста**, не SDK; culling T89 закрито без імпл. | `work/SPEC.md:532-535` |

## 3. Кодова база / seam'и
| Факт | Джерело |
|---|---|
| `appendData` — публічний delta ADD/UPDATE (mergePartial patch-wins, index merge без rebuild), **без DELETE**, усе одно повний `render()` | `OrgHierarchyDiagram.ts:1352-1377`, `mergeData.ts:25`, `docs/USAGE.md §818` |
| `setData` — повна заміна, rebuild index, render, **гасить selection** | `OrgHierarchyDiagram.ts:1290-1330`, `USAGE §812` |
| `spliceData` — **не існує** | grep (лише цієї сесії doc) |
| Staff-вікнувальник (generic) — камера-driven, in-place, reserve/maxSeats/rebase/scheduler | `viewportWindow.ts` (`_grounding.md §1`) |
| Org-вікнувальник — простий, через повний `reload()`, клік/пошук | `scaleOrgs.ts` (`_grounding.md §2`) |
| WASM-seam — **повний pass-through** `StaffLayoutInput` щоразу, без змінені/незмінні | `layoutBridge.ts:84-97`, `rust-types.ts:98` |
| Staff-геометрія вже рахується в Rust на render-шляху (T126 R7 A4.2b) | `staffLiveGeometry.ts:8-14` |

## 4. Інфраструктура / доставка
CI 4 джоби (rust/docs/sdk/e2e). Вікнування — суто TS (`_grounding §5`); **delete-delta + уникнення
re-render + incremental geometry** — нове, і incremental geometry зачепить **межу WASM↔TS**
(нова концепція «змінені ноди», якої в seam нема).

## 5. Залежності / блокери
- T126 (геометрія→Rust) — парасолька, render-шлях уже на Rust; T128 (A*) 🟢 почато (edit-mode Бар-2
  відкладено саме там); T129 🟡 L2 BLOCKED на опис власника. T124 (валідація org-ієрархії на
  create/setData — не кличеться) релевантна для delta-валідації при edit.
- Перф WASM-межі на 1M-вікнах **не виміряно**, бюджет не заданий (орієнтир ≤50мс/500 посад) — `T126:61 Q-2`.
- setData на slide вікна = **~1.5с** (вартість WASM-розкладки, не рендера) — `work/reports/viewport-window/report.md:436,510`.

## 6. Ризики
- 🔴 **Премиса вимоги не підтверджена** (див. §1-2) — головний ризик: будувати підсистему під
  неоформлену вимогу = Speculative Generality + ризик розійтися з майбутньою реальною спекою.
- DELETE-дельта не підтримується `appendData`; incremental geometry не існує — обидва нові, значні.
- Чинна SPEC суперечить напряму (вікно=хост) — її треба **свідомо переписати**, не обійти.
- D5 orphan-position борг; T126 «дві правди» padding; CRITIQUE-dg staff контури.

## 7. Звірка з ВОЛЬТОМ (owner-spec, 2026-11-04) — авторитетне джерело

Прочитано 6 нот вольту `diagram-hierarchy` (`_vault-spec.md`, усі цитати там).

| Питання | Вольт каже | Нота |
|---|---|---|
| Вікнування в SDK? | **ТАК, owner-confirmed.** DOM #2 малює viewport+¼-буфер×4, re-window на pan/zoom, ребра теж; LOD по zoom-scale, поріг **T виміряти** | «спліт на 4 міні-бібліотеки» §17-18 |
| Інкрементальний ре-лейаут? | **ХИБНО.** Layout = один WASM на все дерево завжди (RT жене ширину до кореня). Віконність — лише про малюнок | нота 1 |
| Incremental geometry / кеш незмінних? | **Відкинуто.** patchNodeSize кешує розміри, не геометрію; recompute whole-tree (debounced) | нота 1 |
| spliceData / DELETE-дельта? | **не згадано ніде** | — |
| ШПС edit CRUD add/edit/delete? | **«вільного редактора не буде»**; лише toggle expand/collapse (#96) + майбутній cell-drag reparent | нота 1 §9, нота 6 |
| Архітектура | 4 міні-ліби: #1 dg-tidy(layout/WASM) · **#2 DOM-рендер — тут віртуалізація** · #3 Pixi · #4 оркестратор(камера,LOD,store-commit=єдина мутація) + core(domain/ports/logic: culling, drop-pipeline) | нота 1 КАНОН |
| Інваріант SDK-шва | уся геометрія/layout/логіка — в ядрі; назовні лише презентація+стилі; host дає розміри карток, читає геометрію; API простіший за GoJS | ноти 2,3 |

**Виправлення §1-2 цього briefing:** моє репо-обмежене «вимога не підтверджена» уточнено — вікнування
В SDK **підтверджено вольтом**; а от spliceData/incremental-geometry/edit-CRUD — **спростовані** й
вольтом теж (не лише відсутні в репо). Канон геометрії = **always whole-tree WASM**.

**⚠️ Модельна напруга:** demo вікнує ДАНІ (1M не whole-tree), вольт вікнує МАЛЮНОК (рахувати все).
Поріг T — точка розв'язки; нерозв'язано.

## Рекомендація (станом на паузу)
**Фіча звужена до owner-confirmed: draw-windowing у SDK (рендер #2).** spliceData/incremental/edit-CRUD
зняті. Наступний крок (нова сесія): розв'язати модельну напругу (data-window vs draw-window + поріг T),
бажано свіжим cto-research проти вольт-канону «4 міні-ліби», ПОТІМ spec-flow на draw-windowing.
