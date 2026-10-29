claude-opus-4-8

ДАЛІ: читаю терен §2/§4/§6, rust-types.ts (StaffLayoutInput+усі Input-типи), canvasLayout.ts (деривація positions/reports/orgs/depts), staffLayoutInputs.ts (buildStaffLayoutOptions), layoutBridge.ts (міст). Потім звіряю поля й шукаю пастки.

## ФАКТ — деривація вхідних колекцій (сьогодні, path:line)
- positions: `canvasLayout.ts` бере `data.positions` напряму; членство в tier — фільтром `p.organizationId===X` (:70,:179). isHead: `p.isHead===true` (:71,:143) — optional boolean, undefined⟹false.
- reports: `data.reportLines` напряму (kind ∈ admin|matrix|dotted, `data/types.ts:178`). admin → leadership/tree; matrix|dotted → декоративні крос-блок (`:255-260`). **lead-org НЕ в DiagramData** — синтезується в canvasLayout (:245,:249, head→head/head→card). Rust віддає lead-org у `edges` сам.
- organizations: `data.organizations` напряму — current lookup (:49), managing parent `current.parentOrgId` (:68), children `o.parentOrgId===currentOrgId` (:158). name/role НЕ потрібні геометрії (StaffOrgInput без них).
- departments: `data.departments` передаються НЕфільтровано (:76,:112,:189); `groupStaffByDepartment` бакетить по `contourDepartmentId(p)=p.departmentId||NO_DEPARTMENT_ID` (`staffDeptGrouping.ts:53`), сортує `compareDepartments: (order??0) далі id` (:37-41). DiagramDepartment.order ІСНУЄ (`data/types.ts:100`).
- parentOrgId (StaffOrgInput): ← DiagramOrganization.parentOrgId (`data/types.ts:54`).
- kind: StaffEdgeInput.kind ← DiagramReportLine.kind дослівно (3 види). «lead-org» Rust-only.

## ФАКТ — comparePositions / order
- `comparePositions` (`validateRouteInput.ts:28-37`): parentId(admin) → `order??0` → id. Викликається з `inOrg.map(p=>({id, parentId:adminParents.get(p.id)??null, deptId:p.departmentId}))` (`orgBlockLayout.ts:234-237`) — **`order` НЕ передається ніколи** → завжди undefined⟹0.
- **DiagramPosition НЕ має поля `order`** (`data/types.ts:116-173`). Отже StaffPositionInput.order сьогодні джерела НЕ має — адаптер мусить ОМИНАТИ його (None⟺0), що й зберігає паритет. parentId Rust деривує з reports сам (у StaffPositionInput його нема).

## ФАКТ — nodeSizes
- Per-card розмір: `positionSize(p,geom)= {width:p.width??geom.nodeWidth, height:p.height??geom.nodeHeight}` (`coords.ts:38-43`). Застосовано у layoutConnectedTree (:66, overrides WASM розміри :112-113), matrix (`resolvePositionAABB`:281).
- Єдине джерело per-card розміру сьогодні — `DiagramPosition.width/height` (`data/types.ts:141-143`), host-set. **DOM-виміряний механізм (O-16/R2) ще НЕ існує** — терен §4 підтверджує «хто будує nodeSizes — gap для A4».
- Отже nodeSizes ← derive з positions, що несуть explicit width/height; фолбек Rust = metrics.nodeWidth/Height (дзеркалить `p.width ?? geom.nodeWidth`). Default-метрики nodeWidth/Height ← theme.person.width/height (`staffLayoutInputs.ts:86-87`).

## ФАКТ — dockHints
- Рахує render-шар: `staffEdgeBoxForPosition` (`visualEdgeBox.ts:52-93`) → `resolvePersonLayout(style)`; figma-row ⟹ hints{tileX:avatar.cx-size/2, tileY:avatar.cy-size/2, tileSize} (:70-80, через `figmaRowAvatar`); gojs-row ⟹ hints{cardY,cardH,countBarH} через `resolveGojsRowLayoutMetrics(position,style)` (:83-91). edgePort==='center' ⟹ без hints (:69, колапсує в center-бокс).
- Потребує `PersonNodeStyle` (theme.person) + per-card node.width/height. **DiagramData одна цього НЕ дає** → dockHints мусять приходити ззовні (caller). Default порожній ⟹ порти на повний бокс (rust-types.ts:100-102). Застосовуються лише при lod==='near' (`visualEdgeBox.ts:27,36`); mid/far → personVisualWorldRect.

## ФАКТ — StaffLayoutMetrics (13 полів) проти StaffLayoutOptions
Усі camelCase з обох боків (ts-rs rename) — конвертації імен нема. Через `{...DEFAULT_STAFF_LAYOUT_OPTIONS, ...options}`:
- nodeWidth ← opts.nodeWidth (default 136 / theme.person.width) ✓
- nodeHeight ← opts.nodeHeight (default 156 / theme.person.height) ✓
- refCellWidth ← opts.refCellWidth (default 140 / config.cellWidth) ✓
- refCellHeight ← opts.refCellHeight (default 160 / config.cellHeight) ✓
- horizontalGap ← opts (default 20) ✓
- verticalGap ← opts (default 28) ✓
- margin ← opts (default 32) ✓
- tierGap ← opts.tierGap (default 36; buildStaffLayoutOptions НЕ ставить явно → з DEFAULT через spread у canvasLayout:48) ✓
- orgCardWidth ← opts (default 200) ✓
- orgCardHeight ← opts (default 64) ✓
- zoneLabelBand ← opts.zoneLabelBand (обчислює buildStaffLayoutOptions:78-83 з theme+config.staffZoneChrome; поле В StaffLayoutOptions є) ✓
- deptGrouping ← opts.deptGrouping (= config.staffEdgeRouter==='v2', `staffLayoutInputs.ts:92`) ✓
- **contentPadding ← НЕМАЄ в StaffLayoutOptions.** Рахує `departmentWrapperPadding(theme,config)` (`staffLiveGeometry.ts:61-69,98`) з theme.departmentCard/department.strokeWidth + config.departmentStyle/paddingCells. Адаптер із data+options сам НЕ виведе → мусить прийти аргументом.

## ФАКТ — lod
- Один lod на виклик (`staffLiveGeometry.ts:8-10`); `options.lod ?? 'near'` (`DiagramRenderer.ts:454`). Golden ганяє near/mid/far окремими викликами. StaffLayoutInput.lod: string ("near"|"mid"|"far"). Модель та сама — адаптер приймає lod аргументом.

## ФАКТ — поля StaffLayoutOptions БЕЗ таргета в Rust-контракті (scope-діри)
Споживаються TS staff-лейаутом, але ВІДСУТНІ в StaffLayoutInput/StaffLayoutMetrics:
- `staffCoordMode` (hybrid|tree|matrix|strict) — гілкує orgBlockLayout (`:363`). Rust-контракт режиму НЕ несе → matrix/strict-сцени не покриються (default 'hybrid' ок).
- `collapseUnexpandedPositions` + `expandedPositionIds` + `maxExpandedPositions` (T66) — приховують піддерева (`orgBlockLayout.ts:379-382`; renderer читає `:813`). Жодного поля в Rust-вході. collapse-сцени не покриються (default off ок).
- `maxExpandedOrgCards` (cap, default 1) — canvasLayout:160-162 кап+діагностика. Rust-вхід має expandedOrgIds:string[], але cap НЕ несе. При запиті >1 expand розклад розійдеться (default 1 ок).
- `memberOrder` — reorder hint (`orgBlockLayout.ts:256-261`); у Rust-вході нема (сьогодні не виставляється в render-шляху).

## РІШЕННЯ — мапінг-таблиця + сигнатура + вердикт (нижче у handback)

## РІШЕННЯ — контракт buildStaffLayoutInput

Сигнатура (аргументи, бо theme/config-похідні не виводяться з DiagramData):
  buildStaffLayoutInput(args: {
    data: Pick<DiagramData,'organizations'|'positions'|'reportLines'|'departments'>,
    currentOrgId: string,            // валідований (не null) — інакше Rust throw
    options: StaffLayoutOptions,     // той самий, що й layoutStaffCanvas
    lod: LodLevel,
    contentPadding: number,          // caller: departmentWrapperPadding(theme,config)
    nodeSizes?: StaffNodeSize[],     // default: derive з position.width/height
    dockHints?: StaffDockHintInput[],// default []
  }): StaffLayoutInput

Мапінг StaffLayoutInput ← джерело:
| поле | джерело |
| currentOrgId | аргумент (resolveStaffCurrentOrgId, non-null) |
| positions[] | data.positions → {id, organizationId, isHead:p.isHead===true, departmentId:p.departmentId, order:OMIT} |
| reports[] | data.reportLines дослівно {fromId,toId,kind} (3 види; lead-org НЕ синтезувати) |
| organizations[] | data.organizations → {id, parentOrgId} |
| departments[] | data.departments → {id, order:d.order} (ВСІ, нефільтровані) |
| nodeSizes[] | NEW-derive: positions з p.width/p.height → {id, width:p.width??m.nodeWidth, height:p.height??m.nodeHeight}; або аргумент |
| options (Metrics) | {...DEFAULT_STAFF_LAYOUT_OPTIONS,...options} → 12 полів 1:1; contentPadding ← аргумент |
| dockHints[] | аргумент (render-обчислені personEdgeHints), default [] |
| expandedOrgIds[] | options.expandedOrgIds ?? [] |
| lod | аргумент |

## ВЕРДИКТ: 🟡 (design-ready з двома обов'язковими правками контракту)

A4.1 golden-нейтральний: ✅ ТАК, ЯКЩО це суто нова pure-функція + unit-тести, і НЕ імпортується жодним render-шляхом (DiagramRenderer/staffLiveGeometry/svgExport незмінні). computeStaffGeometryWasm теж без консюмерів — ланцюг не чіпається. Golden не зрушить.

BLOCKING (контракт, не код):
- B1. contentPadding не має джерела в StaffLayoutOptions — сигнатура МУСИТЬ його приймати окремим аргументом (або theme+config). Інакше 13-те поле Metrics недовизначене. Не можна «вгадати» з options.
- B2. order для positions НЕ мапиться (DiagramPosition без поля order; TS ніколи не передає). Адаптер мусить ОМИНАТИ order (None). Будь-яка спроба підставити інше поле → розходження з TS.

NON-BLOCKING (знати при A5-rewire, для A4.1-golden байдуже бо дефолти):
- N1. isHead: undefined⟹false — коерсити `p.isHead===true` (не передавати undefined у required boolean).
- N2. lead-org НЕ синтезувати в адаптері — Rust робить сам; передати лише admin/matrix/dotted.
- N3. departmentId undefined лишати undefined (NO_DEPARTMENT_ID — робота Rust).
- N4. nodeSizes: рішення «derive для всіх vs лише explicit» — еквівалентні поки metrics.nodeWidth/Height == geom-дефолт; derive лише для explicit = чистіше.
- N5. dockHints порожні для A4.1 ок; при rewire near-lod розійдеться без них (visualPersonEdgeBox) — render мусить подати.
- N6. Scope-діри Rust-контракту (НЕ адаптер): staffCoordMode, collapse*/expandedPositionIds/maxExpandedPositions, maxExpandedOrgCards cap, memberOrder — відсутні у вході. Паритет лише для default-сцен (hybrid, no-collapse, cap=1). A4.1 має ЯВНО задокументувати ці режими як поза-scope R7, інакше matrix/strict/collapse-golden мовчки розійдуться на A5.

ПИТАННЯ до власника/плану (вирішити до A5, не блокує A4.1):
- Чи Rust compute_staff_geometry узагалі покриває matrix/strict/collapse, чи R7 свідомо лише hybrid+dept-grouping? Якщо лише hybrid — зафіксувати в acceptance, щоб golden-набір не містив matrix/strict.
- Де житиме maxExpandedOrgCards cap: Rust хардкодить 1, чи адаптер пре-капить expandedOrgIds (втрата canvasLayout-діагностик)?

## ГОТОВО.
