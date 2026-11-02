# Inspector I2+I3 — незалежна перевірка

Model ID: claude-opus-4-8

ДАЛІ: читаю контракт (_form-b2-geometry-getter.md), план (I2, I3), потім diff по createReactPromoteOverlay.ts, OrgHierarchyDiagram.ts, PixiHost.ts, USAGE §13, тести.

## ФАКТИ

### I2 (createReactPromoteOverlay.ts)
- q1 ✓ `worldTransform: string` у типі (:99). У sync() :468 рядок = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`, де `viewport` = той самий local, що пішов у картки (:435→:439 syncedViewport→:465 props). Не свіжий read. ✓
- q2 ЧАСТКОВО: тест (:101-129) має два чеки. (а) `wt === `translate(..)``  — порівняння того ж рядка з тим самим рядком = фіксує лише формат (tautology). (б) цикл порівнює `wx*scale+x` з `worldPointToScreen`, але `worldPointToScreen` (staffChromeGeometry.ts:22) САМЕ `x*v.scale+v.x` — тобто афін проти того ж афіна. Рядок worldTransform НІДЕ не застосовується (ні до DOM, ні парситься як матриця), тож семантика «translate/scale з origin 0,0 == worldPointToScreen» НЕ перевірена — лише стверджена в коментарі. Claim плану «дві незалежні формули — не assert-true» виконано слабко. Неблокувальне (CSS/SVG семантика стандартна).
- q3 ✓ Композиція без подвійного трансформу: backdrop — всередині layer (OverlayRoot :162-170), layer несе catch-up = viewportCatchUpTransform(synced, live) (:481-490). worldTransform(backdrop) мапить world→synced-screen, catch-up(layer) мапить synced→live. Композиція = world→live, тотожно як у карток. Стала-props worldTransform коректна під пан саме тому, що backdrop лишається під catch-up-шаром. ✓
- q4 ✓ back-compat: `worldTransform` обов'язкове, але конструює props лише SDK (:464). Споживачі (demo StaffChromeBackdrop.ts:336, тести :68/:105) його ПРИЙМАЮТЬ (контраваріантно — зайве поле від SDK ок). demo StaffChromeBackdrop.test.ts:245,273 будують props через `as unknown as PromoteBackdropProps` — каст обходить відсутнє поле, тому typecheck зелений. Жоден споживач не конструює літерал без касту. Demo-бекдроп ще НЕ мігрований на worldTransform — це окремий крок плану (міграція демо), не блокер I2.

### I3 (OrgHierarchyDiagram.fitStaffChrome, PixiHost.animateViewport)
- q1 ✓ `if (!box) return null;` ДО будь-якого виклику host (:1938-1940). Тест :40-54: org-only → getter null → null, viewport незмінний. ✓
- q2 ✓ animate:false → setViewport + onViewportTransform(target.scale) (:1941-1943). animate(деф) → animateViewport→viewport.animateTo (:1945). Нотифікація на animate-шляху НЕ загублена: host.setOnViewportChange (:461-465) кличе onViewportTransform щокадру анімації. Точно патерн fitView (:1918-1921 — явний виклик лише на non-animate, анімація йде через підписку). ✓
- q3 ✓ Метод лише computeStaffFit + рух камери, повертає target; жодного дотику до overlay (facade не має ref). Узгоджено з USAGE §13 («pre-build карток під target — хост»). ✓
- q4 ДІРА (неблок.): computeStaffFit кламп [minScale,maxScale] деф [0.55,1]; animateTo/Viewport кламп [0.15,4]. Якщо хост дасть maxScale>4 чи minScale<0.15 — target з computeStaffFit вийде за Viewport-межу, animateTo тихо підріже → повернений target ≠ фактична камера (контракт «повертає target, на яку перейшов» порушується). План I3 ⚠ обіцяв тест-страж (fit scale ∈ [0.15,4]) + ноту-каплінг — НІ тесту (fitStaffChrome.test.ts порівнює лише з чистою computeStaffFit, maxScale:2 ⊂ межі, не з фактичною камерою), НІ ноти в JSDoc fitStaffChrome/computeStaffFit. Неблокувальне (деф [0.55,1]⊂[0.15,4] безпечний), але обіцяна мітигація не поставлена; USAGE не попереджає.
- q5 ✓ USAGE §13 правдиве: padded org box (не content-bounds) ✓, кламп 0.55…1 ✓, центр по гориз. ✓, axis'width' деф ✓, align'top' притиск до padding 48 ✓, animate деф true ✓, повертає target|null ✓, pre-build — хост ✓. (Застереження q4 у доці не відображене.)

### Тести
Запущено createReactPromoteOverlay + fitStaffChrome: усі зелені, "No test failures reported". Backdrop-Б2 кейс і 3 fitStaffChrome-кейси виконались.

## ВЕРДИКТ: FIT (з неблокувальними)
Блокерів нема. I2: 4/4 поставлено (q2 — слабкий тест, неблок.). I3: 5/5 поставлено (q4 — обіцяна мітигація клампу відсутня, неблок.).
