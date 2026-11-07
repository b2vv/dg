claude-opus-4-8

# R6-критика форми Б2 (контракт SDK↔хост) — геометрія-getter

ДАЛІ: читаю повністю _form-b2-geometry-getter.md, далі звіряю заяви форми з кодом (StaffChromeBackdrop, App.ts, staffLiveGeometry, createReactPromoteOverlay, OrgHierarchyDiagram, PixiHost).

---

ФАКТ (звірка з кодом, HEAD b601cba):
- `StaffChromeGeometry` сьогодні має `foundId: string|null` (StaffChromeBackdrop.ts:66-68) + `nodeBoxes` keyed by pos-id (:65, :133-136). Форма прибирає foundId — узгоджено, nodeBoxes лишається → хост має чим малювати ring.
- `ChromeLine.points` ТИП = `ScreenPoint` з коментарем «world coords» (:49) — хибна назва; форма перейменовує на `WorldPoint` (форма :28,31). Правильно.
- `buildStaffChromeGeometry` рахує org = AABB(frames+positionNodes) + PAD 20/TOP 44 (:103-131); boxes.length===0 → org=null, depts/lines порожні (:113-114). Перенос у SDK коректний.
- `computeStaffChrome` (App.ts:702-717) викликає `computeStaffLiveGeometry` ПОВТОРНО (другий прохід, :707) і будує chrome ПЕРЕД `setData` (:736 перед :740). Форма видаляє цей дубль через кеш — але час кешу не визначено (див. B1).
- `PromoteBackdropProps` = {viewport,screen,lod} (createReactPromoteOverlay.ts:85-89), ГЕНЕРИК. Форма додає `worldTransform` + `chrome: StaffChromeGeometry`. chrome — staff-специфічний тип у generic-props (B3).
- Catch-up під час пану: `viewportCatchUpTransform(syncedViewport, getViewport())` (:461-473) — ДЕЛЬТА synced↔поточний, застосовується як CSS на шар overlay. props.viewport = synced-кадр (:451, :81-83). worldTransform форми (= translate/scale для synced-кадру) множиться з catch-up — узгоджено для пану.
- fitView (facade :1899) фітить host.fitView(content-bounds); окремий метод для padded-org виправданий. АЛЕ facade НЕ тримає посилання на promote-overlay — лише notifyPromoteSync listeners (:552-597); overlay створює ХОСТ і підписується. → fitStaffChrome не може pre-build overlay (B4 підтверджено).
- refitStaffAlpha (App.ts:761-793): твін + pre-build через setViewport(to)→flushSync(promote.sync())→setViewport(from) — потрібні І diagram, І this.promote. SDK-метод має лише diagram.

РІШЕННЯ: ВЕРДИКТ = NEEDS CHANGES. 5 лінз запущено / 5 покрито. 5 блокерів, 6 неблокувальних.

БЛОКЕРИ (недоговорено в контракті — Cass не напише тест):
B1. Лайфцикл кешу getter'а не визначено: коли кеш «останнього рендеру» заповнюється? До першого рендеру → null? Оновлюється синхронно по завершенню `await setData`/sync чи ні? Без цього тест getter'а = здогадка.
B2. Єдине джерело PAD порушено. `pad` — арг getter'а ПЕР-ВИКЛИК, але props.chrome (кеш) і fitStaffChrome (`padding` = ЕКРАННИЙ відступ, інше число) його не бачать → ТРИ значення pad, і «box що хост обрамляє = box що SDK фітить» (форма :37) не тримається. Зроби StaffChromePad станом діаграми (set-once), а не арг getter'а; кеш має зберігати ВЖЕ padded box.
B3. props.chrome: (а) staff-тип протікає в generic PromoteBackdropProps; (б) джерело props.chrome не назване — overlay з внутр. кешу (coupling) чи хост-closure (знову 2 джерела). F1 «з одного кешу» структурно не гарантований. Визначи шар + хто заповнює.
B4. Анімований fitStaffChrome ↔ pop карток не покритий контрактом. Facade не має доступу до promote-overlay (підтверджено :552-597), тож pre-build target-кадру (flushSync-танець) неможливий з боку SDK. Це НЕ «implement risk» — це дірка: визнач координацію (сигнал target overlay'ю / fit повертає target і хост сам pre-build'ить / fit без анімації).
B5. Лінії під ОДНИМ world-transform div: non-scaling-stroke проти ancestor CSS scale — відкрите питання. Або хост лишає SVG у screen-space з per-point map (ламає інваріант «нічого поелементно»), або штрих масштабується. Контракт мусить обрати, де живуть лінії і як тримається 2px — зараз це розвилка, схована як implement.

НЕБЛОКУВАЛЬНІ:
N1. fitStaffChrome при org===null / порожніх depts: поведінка (повертає false / no-op) не вказана.
N2. Пошук-фокус центрує камеру pan-to-hit (focusStaffCard, App.ts:798), НЕ fit. Форма лічить пошук «хосту», але не каже, який SDK-метод центрує (є focusNode/panToNode :1741). Уточнити, щоб Cass не чекав fit.
N3. hover-highlight не названий у «лишається хосту» (форма :107 лічить foundId/collapse, не hover). Обчислюється з chrome.lines (fromId/toId) — підтвердити й записати.
N4. border `Math.max(1,s)` (screen-min) не переживе чистого world-scale (при s=0.55 → 0.55px). Той самий клас, що B5; мінорна fidelity.
N5. pad негатив/нуль: хост відсікає розміри КАРТОК, не pad; вказати pad≥0.
N6. F1b (name/count лишити) — ок, це read із data (:80-94), не обчислення.
