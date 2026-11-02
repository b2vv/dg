# План Б2 — SDK-імплементація залокованого контракту

HEAD `b601cba`, гілка `feat/sdk-host-geometry-seam`. Контракт прийнятий обома сторонами
(`_form-b2-geometry-getter.md`). Процес: план → R6-критик до коду → test-first → implement →
інспектор. Три одиниці I1–I3 + міграція демо.

## Заземлення (звірено з кодом b601cba)
- `renderStaffCanvas` (`DiagramRenderer.ts:633-692`) рахує `live` і **відкидає** — кеш можна
  покласти тут, поряд із наявними `lastZoneLabelBand:655`, `lastDiagnostics:656`; guard
  `isRenderCurrent(epoch):651` вже захищає від застарілого рендеру (= лічильник поколінь «задарма»).
- `buildStaffChromeGeometry` — зараз у демо `StaffChromeBackdrop.ts:75-139`. Чистий (live+data+orgId).
- `backdropProps` будується у `createReactPromoteOverlay.ts:451` з `{viewport, screen, lod}`;
  `viewport` = synced-кадр; catch-up під час пану `:461-473` (`translate(x,y) scale(s)`).
- `worldPointToScreen(x,y,v) = {x*v.scale+v.x, y*v.scale+v.y}` → worldTransform =
  `translate(${v.x}px,${v.y}px) scale(${v.scale})` + `transformOrigin:0 0`. Тотожно.
- Камера: `Viewport.animateTo(target, motion)` `:172-176` вже є (кламп до viewport min/max;
  durationMs/animate/now/requestFrame інжектяться — тестопридатно). `staffFitTransform` (демо
  `:209-223`) — чиста математика, переноситься в SDK.
- Фасад форвардить рендерер: патерн `this.renderer?.X()` (напр. `:1841 listNodeBoxes`).

---

## I1 — getter геометрії + pad-стан + кеш

**Нові публічні типи** (перенести з демо в SDK, напр. `render/staffChromeGeometry.ts`):
`StaffChromeGeometry`, `ChromeDeptFrame`, `ChromeLine` (points→`WorldPoint`), `NodeBox`,
`StaffChromePad`. `foundId` НЕ переносити. `buildStaffChromeGeometry(live,data,orgId,pad)` →
в SDK, приймає `pad` (було хардкод PAD=20/TOP=44 → тепер з `pad`).

**Pad-стан (set-once) — УТОЧНЕНО (R6 неблок.2):** єдине стабільне джерело — **стан/options
діаграми** (конструктор або сеттер на `OrgHierarchyDiagram`), НЕ per-render опції рендеру.
`RenderConfig.staffChromePad` лише ПЕРЕНОСИТЬ значення зі стану в рендер щорендеру (дзеркало
стабільного джерела), тому це справді set-once, а не випадково per-render. Дефолт `{x:20,top:44}`.
Валідація `x≥0/top≥0` при прийомі (дефолт при невалідному — узгодити з власником у фіналі).
Зафіксувати: зміна pad сеттером НЕ інвалідує вже-кешований padded-box до наступного рендеру
(getter віддає останній рендер — прийнятно).

**Кеш (ВИПРАВЛЕНО після R6-критики — блокер B-plan):** `DiagramRenderer`:
`private lastStaffChrome: StaffChromeGeometry | null = null`.
- **null-reset — на ВЕРХ `render()`**, поряд із `this.lastDiagnostics = []` (`DiagramRenderer.ts:444`).
  Критично: диспетч (`:456-460`) заходить у `renderStaffCanvas` лише коли `hasStaff && currentOrgId`;
  шляхи `renderOrganizations` (`:459`) і grid (currentOrgId скинуто) у renderStaffCanvas НЕ заходять.
  Якби reset був усередині renderStaffCanvas, getter віддавав би stale org-box у org-view / після
  скидання org — контракт («поза alpha → null») це забороняє. Reset на верху render() закриває
  і non-staff шляхи, і reactChrome-off (лишається null природно).
- **non-null — ЛИШЕ в reactChrome-ON гілці** `renderStaffCanvas`, після `isRenderCurrent(epoch)`
  (`:683-689` — там, де вже вирішено, що React малює хром):
  `this.lastStaffChrome = buildStaffChromeGeometry(live, data, currentOrgId, config.staffChromePad ?? DEFAULT)`.
- Getter `getStaffChromeGeometry(): StaffChromeGeometry | null => this.lastStaffChrome`.

**Фасад:** `OrgHierarchyDiagram.getStaffChromeGeometry()` → `this.renderer?.getStaffChromeGeometry() ?? null`.
USAGE §14. Публічний барель.

**Tests-first:**
- Rust/SDK unit: `buildStaffChromeGeometry` з заданим pad → org box = AABB(frames+nodes)+pad;
  depts/lines/nodeBoxes відповідають live; pad {x,top} зсуває x/y/width/height точно (мутація
  pad червонить). Порожні frames+nodes → org=null.
- Кеш-лайфцикл — **ПЕРЕХІДНИЙ тест (не assert-true)**: до рендеру getter=null; alpha-рендер →
  non-null; ПОТІМ non-alpha рендер (org-view / без currentOrgId) → getter===null (ловить stale);
  плюс reactChrome-OFF ПІСЛЯ alpha → null. На свіжій діаграмі кеш і так null, тож «поза alpha →
  null» без попереднього alpha-рендеру — пройшло б і з багнутим розміщенням. Тест = перехід
  alpha→non-alpha, щоб упав саме на відсутності reset-на-верху.

## I2 — worldTransform у PromoteBackdropProps

`createReactPromoteOverlay.ts`: у типі `PromoteBackdropProps:85` додати `worldTransform: string`.
У `sync():451` додати `worldTransform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})``.
`chrome` НЕ додавати (контракт: backdrop читає getter). Публічний тип — через барель `react`.

**Залежність (R6 неблок.3):** backdrop МУСИТЬ лишатися першим вузлом у ШАРІ, на який пишеться
catch-up transform (`createReactPromoteOverlay.ts:149-171, :461-473, :299-303`) — тоді стала-props
`worldTransform` під пан коректна (шар несе catch-up, backdrop їде з картками). Міграція демо не
має виносити backdrop з-під writeLayerTransform.

**Tests-first:** given viewport {x,y,scale} → backdropProps.worldTransform рядок точний; точка
world (wx,wy) під цим transform (transformOrigin 0 0) === `worldPointToScreen(wx,wy,viewport)`
(`staffChromeGeometry.ts:14-16`; дві незалежні формули — не assert-true).

## I3 — fitStaffChrome

`OrgHierarchyDiagram.fitStaffChrome(opts?): {x,y,scale}|null`:
1. `box = this.getStaffChromeGeometry()?.org`; якщо null → return null (no-op, N1).
2. `screen = this.getScreenSize()`.
3. `target = computeStaffFit(box, screen, {padding=48,minScale=0.55,maxScale=1,axis='width',align='top'})`
   — чиста функція в SDK (узагальнений `staffFitTransform`: axis 'width'|'both', align 'center'|'top').
4. `animate !== false` → `host.animateTo(target, {animate:true, ...})`; інакше `setViewport(target)`.
5. return target (хост pre-buildʼить overlay під нього — B4).

⚠️ `Viewport.animateTo` клампить scale до **viewport.min/max** — РОЗВ'ЯЗАНО (R6): реальні
min/max = **0.15/4** (`Viewport.ts:25-26,65-66`); PixiHost бере з options (`PixiHost.ts:318-320`),
жоден виклик у SDK/демо не передає вужчі (demo `MOCKUP_FIT_MIN_SCALE` іде лише у fitView-floor,
не в конструктор). Отже [0.55,1] ⊂ [0.15,4] → target НЕ зсувається. Додати **тест-страж**
(fit scale ∈ [0.15,4]) + ноту-каплінг на випадок майбутнього вужчого Viewport.

**Tests-first:** чиста `computeStaffFit`: axis'width' → scale=clamp(avail/box.w, min,max); align'top'
→ y=padding − box.y*scale; center-x. Кламп на край (вузька/широка org). box=null → null.
animate:false → setViewport викликано з target; повертає target.

## Міграція демо (доказ «без математики»)
- `App.ts:707` 2-й `computeStaffLiveGeometry` → `diagram.getStaffChromeGeometry()`.
- `StaffChromeBackdrop.ts`: `buildStaffChromeGeometry` + AABB/PAD `:103-131` → видалити (беруться з SDK);
  `worldPointToScreen`-на-елемент `:343` → один `worldTransform`-контейнер (div рамки, SVG-`<g>` лінії).
- `staffFitTransform` + камерна математика `refitStaffAlpha` → `fitStaffChrome` (pre-build лишити).
- Гонка `rerenderStaffAlpha:725-745` — лічильник поколінь на демо-боці (Б2.1). (Опц., окремим кроком.)

## Ризики / відкрите для критика
1. Pad-валідація: дефолт vs throw на негатив.
2. animateTo viewport-кламп vs [0.55,1] (див. I3 ⚠️).
3. Кеш=null поза alpha: чи є шлях, де reactChrome off, але хост чекає geom (fallback Pixi — тоді null коректно).
4. non-scaling-stroke під SVG-`<g>` — підтвердити на реальному рендері (demo-міграція = доказ).
5. Порядок одиниць: I1→I2→I3 (I3 залежить від I1-кешу; I2 незалежний).
