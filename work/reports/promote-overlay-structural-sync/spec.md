# spec — promote-overlay: розділити camera-sync і structural-sync

**Статус:** spec · **Гілка:** `fix/promote-overlay-structural-sync` · **Дата:** 2026-11-04

## Problem

HTML-promote-overlay (`createReactPromoteOverlay`) має **єдиний** вхід ресинку —
`subscribePromoteSync(onCameraChange)`. `onCameraChange` **ніколи** не синкає одразу: пише CSS
catch-up transform на шар і відкладає реальний `sync()` на `settleMs` (дефолт 150 мс). Для руху
камери (пан) це правильно — catch-up ховає лаг між Pixi і HTML, а повний rebuild чекає, доки
камера стане.

Але той самий `notifyPromoteSync()` викликається з `afterRender` (`OrgHierarchyDiagram.ts:999`)
після **кожного** рендеру — зокрема після **структурних** змін, де Pixi-сцена оновлюється
**миттєво**, а не їде плавно: LOD-перехід і зміна layout (expand/collapse, setData). Тоді 150 мс
затримки дають видимий дефект, бо Pixi вже переїхав/сховав ноди, а HTML-оверлей висить на старому
стані:

- **Баг A (zoom у far).** На перетині в `far` `onViewportTransform` перемальовує сіти як Pixi
  far-крапки, але `registerView` ховає їх застарілим `promoted`-set (стан near), а HTML тим часом
  стиснутий catch-up у sub-pixel. 150 мс видно **лише конектори** без карток/крапок, доки settle
  не викличе `sync()` → `setPromotedNodeIds([])`.
- **Баг B (expand/collapse).** `togglePositionExpand` → `render` → `afterRender` → той самий
  150 мс-шлях. Камера не рухалась (catch-up ≈ identity), тож HTML-картки лишаються на **старих**
  `screenRect`, а Pixi-ноди вже на нових позиціях (і сховані як promoted) → **ghost-стаби** на
  старих місцях, доки settle не перебудує.

Обидва — **один корінь**: структурна зміна йде camera-settle-шляхом, якому там не місце.

**Контекст (брифінг / рішення власника):**
- **T129 (власник, 2026-11-01):** React покриває mid+near; Pixi = far-only mass renderer. Межа
  far↔detail одна (`nearVisibleGateOpen = lod !== 'far'`, `farMax = 0.45`). Фікс **не чіпає** цього
  рішення — far-крапки лишаються Pixi-овими; лагодимо лише **коли** оверлей ресинкається.
- Маніфест, §«Окремий випадок» (T101): тест `createReactPromoteOverlay` падав, бо перевіряв
  **тимчасовий** transform; правильна відповідь — прибрати дедлайн (`settleMs: 10_000`), бо
  предмет перевірки — що запис **не** відкладений. Це прямо стосується red-тесту тут.

Підтверджено **читанням коду** (host `cassiopeia-admin-ui` card-split + SDK promote-overlay);
відео власника (зум + expand) дали симптоми, вимір Cass-1 через host test-api — незалежне
підтвердження «лише конектори на floor at-rest». Browser-repro заблокований auth, для діагнозу
не потрібен.

## User scenarios

1. **Overview-зум (A).** Користувач ШПС віддаляє діаграму до far, щоб побачити всю структуру.
   *Очікує:* картки плавно переходять у компактні Pixi far-марки **без вікна, де нод немає**.
   *Зараз:* ~150 мс порожнє полотно з самими конекторами.
2. **Розгортання/згортання (B).** Користувач у edit-mode згортає й знову розгортає вузол.
   *Очікує:* дочірні картки з'являються одразу на правильних позиціях.
   *Зараз:* ~150 мс ghost-стаби (гола галочка+ім'я) на старих позиціях.
3. **Пан (регрес-контроль).** Користувач тягне полотно вбік.
   *Очікує:* плавний рух без ривків і без дорогого rebuild на кожен кадр (поточна поведінка).
   *Фікс НЕ сміє це зламати* — camera-шлях (catch-up + settle) лишається.

## Acceptance criteria

- **AC1 (A).** Після LOD-переходу в `far` (структурна зміна) оверлей ресинкається **без очікування
  `settleMs`** — тобто `promoted`-set очищується й Pixi far-марки стають видимі в тому ж кадрі
  (детерміновано, без залежності від стінного годинника).
- **AC2 (B).** Після `afterRender`, спричиненого зміною layout (expand/collapse, setData) **без руху
  камери**, HTML-картки перебудовуються на **нові** `screenRect` без очікування `settleMs`.
- **AC3 (пан, без регресу).** Чистий рух камери (однаковий LOD, та сама структура) і далі йде
  catch-up + `settleMs`-settle — rebuild не частішає й не стається на кожен кадр пану.
- **AC4 (контракт).** Зміна публічної поверхні SDK↔host (якщо є) описана в `docs/USAGE.md`
  (Конституція: публічний API не змінюється мовчки). Якщо фікс внутрішній — у плані сказано явно,
  що поверхня не змінилась.

## Out of scope

- Pixi far-view сітів ШПС як такий (існує й працює — far-крапка `PersonNode`); не чіпаємо T129.
- Розмір/видимість far-крапки на самому floor (~2–4px) — косметика, окремо.
- Zoom-floor 0.36 і вроджений prune (#96) — вже змержено, не в цьому фіксі.
- Host-код `cassiopeia-admin-ui` — фікс у бібліотеку; host лишається no-op (Cass-1 стоїть).
- Export (SVG/PNG/PDF) — Pixi-only, оверлея не торкається.

## Рішення GATE 1 (grilling, власник, 2026-11-04)

1. **Де розділяти → (a).** Додати `reason: 'camera' | 'structural'` у внутрішній
   `notifyPromoteSync`/`subscribePromoteSync`. Викликач знає природу: `onViewportTransform` і пан →
   `'camera'` (settle); `afterRender` → `'structural'` (негайний `sync()`). Один тегований канал,
   не два підписки (KISS). **(c) знято:** LOD-перехід змінює `scale`, тож self-detect «viewport не
   змінився» не відрізнить вхід у far від пану → AC1 провалено. **(b) відкинуто:** зайва друга
   підписка.
2. **Публічний API — без змін.** Внутрішній сигнал не host-facing (host лише кличе
   `createReactPromoteOverlay`; `subscribePromoteSync` імплементує `OrgHierarchyDiagram`, споживає
   сам overlay — підтверджено grep по host). `settleMs` і host-опції лишаються. У `docs/USAGE.md`
   додати **одне речення**: structural-ресинк (layout/LOD) — негайний, `settleMs` стосується лише
   руху камери (щоб контракт `settleMs` не читався як «expand теж чекає 150 мс»).
3. **Один structural-шлях** покриває обидва баги — обидва йдуть `afterRender`. Розрізняти
   LOD vs layout не треба. Крайній кейс (expand під час пану) — у plan-defense.

## Open questions (лишилось для плану, не для власника)

- Чи `'structural'`-sync має скасовувати вже заплановане `settleMs`-settle від camera-виклику того
  самого кадру (far-перекидання кличе `notifyPromoteSync` двічі: camera з onChange, потім structural
  з afterRender). Гіпотеза: так — `sync()` і так робить `cancelSettle()` на вході. Перевірити в плані.
