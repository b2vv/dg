# R6-критика плану B2 (host geometry seam)

Model ID: claude-opus-4-8

ДАЛІ: читаю _plan-b2-impl.md та _form-b2-geometry-getter.md повністю; потім звіряю з кодом по 6 лінзах.

## ФАКТ — звірка з кодом (b601cba)

- Виклик рендеру: `DiagramRenderer.render` диспетчеризує за наявністю даних
  (`DiagramRenderer.ts:455-460`): `hasStaff` → `renderStaff`; інакше `organizations>0` →
  `renderOrganizations`. `renderStaff:614` викликає `renderStaffCanvas` ЛИШЕ при `currentOrgId`
  (`:624-625`), інакше `renderPositionGrid` (`:629`).
- `renderStaffCanvas:633-692`: `live` рахується (`:642`), guard `isRenderCurrent(epoch):651`,
  reactChrome-гілка `:683-689` (Pixi fallback, коли off). `lastDiagnostics` скидається НА ВЕРХУ
  `render` (`:444`), не всередині renderStaffCanvas.
- `Viewport.animateTo:173-184` клампить scale до `this.minScale/this.maxScale`. Дефолти:
  `DEFAULT_MIN_SCALE=0.15`, `DEFAULT_MAX_SCALE=4` (`Viewport.ts:25-26`, застосовані `:65-66`).
  PixiHost будує Viewport з `options.minScale/maxScale` (`PixiHost.ts:318-320`); жоден виклик у
  SDK/демо не передає вужчі значення (demo `MOCKUP_FIT_MIN_SCALE` іде лише у `fitView`-floor
  `computeFitTransform`, не в конструктор). → реальний кламп animateTo = **[0.15, 4]**.
- `worldPointToScreen(x,y,v) = x*v.scale+v.x` (`staffChromeGeometry.ts:14-16`). CSS
  `translate(v.x,v.y) scale(v.scale)` + origin 0,0 дає те саме → I2-тотожність РЕАЛЬНА (дві
  незалежні формули, не assert-true).
- `buildStaffChromeGeometry` (демо `StaffChromeBackdrop.ts:75-139`): org = AABB(frames +
  positionNodes) + PAD=20/TOP=44 (`:103-131`); повертає `foundId:null` (`:138`). Чистий.
- Overlay sync: `backdropProps:{viewport,screen,lod}` (`createReactPromoteOverlay.ts:451`).
  Catch-up під час пану (`:461-473`) НЕ ререндерить props — ставить CSS-transform на ШАР.
  Backdrop рендериться ПЕРШИМ вузлом У ТОМУ Ж шарі (`:149-157,:171`), коментар прямо: «one DOM
  node in the same layer so the catch-up transform moves it with the cards». writeLayerTransform
  пише `layer.style.transform` (`:299-303`).

## РІШЕННЯ по лінзах

1. План↔контракт: загалом вірний; foundId прибрано (контракт+план збігаються); worldTransform
   generic; chrome не в props. ДРЕЙФ знайдено у лайфциклі кешу — див. лінзу 2 (блокер).
2. Кеш-лайфцикл: **БЛОКЕР**. План кладе `lastStaffChrome=…`/`=null` ВСЕРЕДИНІ renderStaffCanvas.
   Але non-staff шляхи (`renderOrganizations:459`, `renderPositionGrid:629`) туди НЕ заходять →
   кеш лишається stale (старий org-box після переходу у org-view / скидання currentOrgId).
   Контракт обіцяє «поза alpha → null». Фікс: null-reset на ВЕРХУ `render()` (біля `:444`,
   поряд з lastDiagnostics), а non-null ставити лише у reactChrome-ON гілці після isRenderCurrent.
   Це ж закриває reactChrome-off (лишиться null природно).
3. animateTo-кламп (ризик №2 плану): **НЕ блокер**. Реальні min/max = 0.15/4, ширші за [0.55,1];
   [0.55,1]⊂[0.15,4] → target не зсувається. План цього не договорював — додати в план назву
   чисел + тест-страж (fit scale ∈ [0.15,4]) і ноту-каплінг на випадок майбутнього вужчого Viewport.
4. pad set-once: **узгодити (неблок.)**. Консистентно з контрактом ЛИШЕ якщо pad джерелиться з
   options/стану діаграми (не з per-render render-опцій). План має назвати ЄДИНЕ джерело
   (конструктор/сеттер) і що зміна pad сеттером не інвалідує вже-кешований padded-box до
   наступного рендеру (getter віддає останній рендер — прийнятно, але має бути сказано).
5. Test-first: I2-тотожність і pad-мутація і box=null — ЧЕРВОНІ без фічі, добре. АЛЕ кеш-тест
   як сформульовано («рендер поза alpha → null») — **assert-true**: на свіжій діаграмі кеш і так
   null, тож пройде і з багнутим розміщенням (лінза 2). Тест МУСИТЬ бути переходом: alpha-рендер
   (кеш non-null) → ПОТІМ non-alpha рендер (org-view/без currentOrgId) → getter===null. Так само
   додати reactChrome-off ПІСЛЯ alpha → null.
6. Порядок I1→I2→I3: коректний. I2 незалежний; I3 залежить лише від I1-кешу (box=null no-op) +
   свого внутрішнього computeStaffFit (перенос staffFitTransform). Демо-міграція — зворотна (demo
   код, не контракт), race-лічильник винесено окремим опц. кроком. Претензій нема.

Під час пану стала-props worldTransform КОРЕКТНА, бо backdrop під catch-up шаром (:149-171) —
не діра; план хай зафіксує цю залежність (backdrop мусить лишатися у шарі writeLayerTransform).

ВЕРДИКТ: NEEDS CHANGES. Лінз запущено 6/покрито 6. Блокерів: 1 (кеш-лайфцикл + його тест).
