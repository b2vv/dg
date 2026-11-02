# Форма Б2-getter'а — контракт SDK↔хост (чернетка на лок)

HEAD `b601cba`, гілка `feat/sdk-host-geometry-seam`. Мета: хост не рахує жодної геометрії
alpha. Інваріант власника: геометрія+fit → SDK; стиль (кольори/підпис/шрифт/PAD-як-оформлення) → хост;
хост малює під ОДНИМ camera-transform, нічого не множить поелементно, не рахує AABB.

Статус: **чернетка**. Три блоки форми + 4 розвилки. Після локу власником → Cass (його `/tdd`
заблокований саме на цій формі).

---

## Блок 1 — getter геометрії (facade)

```ts
// OrgHierarchyDiagram, USAGE §14 (host seam)
getStaffChromeGeometry(): StaffChromeGeometry | null
```

- Повертає геометрію **ОСТАННЬОГО завершеного рендеру** (кеш), **НЕ** другий виклик
  `computeStaffLiveGeometry`. Прибирає дубль `App.ts:707`.
- **Лайфцикл кешу (закриває B1):** кеш заповнюється в кінці кожного render/sync (той самий
  момент, коли рендер намалював сцену). До першого рендеру та поза alpha-шляхом → `null`.
  Після `await setData(...)` + осідання рендеру → non-null. Синхронний read зі свіжого кешу;
  getter нічого не обчислює, лише віддає збережене.
- **Pad — НЕ арг getter'а** (закриває B2): див. нижче, `StaffChromePad` = стан діаграми.

```ts
interface StaffChromeGeometry {
  org: { x: number; y: number; width: number; height: number; name: string } | null;
  depts: Array<{ departmentId: string; x: number; y: number; width: number; height: number;
                 name: string; count: number }>;
  lines: Array<{ fromId: string; toId: string; points: WorldPoint[]; endsOnDeptTop: boolean }>;
  nodeBoxes: Record<string, { x: number; y: number; width: number; height: number }>; // world
}
// WorldPoint = { x: number; y: number }
```

- `foundId` (search-hit маркер) **прибрано** з SDK-типу — це хост-стан пошуку, не геометрія.
- **`StaffChromePad` — стан діаграми, set-once (закриває B2):**
  `StaffChromePad = { x: number; top: number; bottom?: number }`, дефолт `{x:20, top:44}`, `x≥0`,
  `top≥0` (N5). Подається раз через options діаграми (або сеттером), **не** пер-виклик. SDK
  застосовує його до org-AABB і зберігає **вже-padded** box у кеш. Отже org-box у `getter`, у
  props і у `fitStaffChrome` — **фізично один і той самий** збережений box, не три обчислення.
  Числа (20/44) лишаються оформленням хоста — хост їх задає; саме застосування — у SDK.

Перенос: `buildStaffChromeGeometry` з `StaffChromeBackdrop.ts:75-139` (демо) → SDK, стає тілом
getter'а. `StaffChromeGeometry`/`ChromeDeptFrame`/`ChromeLine`/`NodeBox` → публічні типи SDK.

## Блок 2 — world→screen у props (прибирає поелементне множення)

```ts
interface PromoteBackdropProps {
  viewport: ViewportTransform;
  screen: { width: number; height: number };
  lod: LodLevel;
  worldTransform: string; // world→screen для ЦЬОГО sync-кадру; generic (будь-який backdrop)
}
```

- **`chrome` НЕ в props (закриває B3):** generic `PromoteBackdropProps` не несе staff-специфічний
  тип. Backdrop бере геометрію через `diagram.getStaffChromeGeometry()` (хост-closure =
  accessor, не обчислення). **Єдине джерело правди — кеш SDK**; getter і (неявно) props читають
  той самий кеш. `worldTransform` лишається — він справді generic (камера, не staff).
- **`worldTransform` придатний у ДВОХ контекстах (закриває B5):** синтаксис `translate(..)
  scale(..)` валідний і як CSS `transform`, і як SVG `transform`-атрибут.
  - **Рамки/бокси (HTML):** один `<div style={{transform: worldTransform, transformOrigin:'0 0'}}>`,
    діти — у world-координатах. Шрифти/падінг/бордер масштабуються з zoom — поточна поведінка
    (`px(n)=n*s`), 1:1. (Border `Math.max(1,s)` → просто world-товщина, N4, прийнятно.)
  - **Лінії (SVG):** `<svg><g transform={worldTransform}><path vectorEffect="non-scaling-stroke"/></g></svg>`.
    `non-scaling-stroke` протидіє **SVG**-трансформу `<g>` (не ancestor CSS), тож штрих лишається
    2px на будь-якому zoom. Лінії живуть у SVG-`<g>`, рамки — у CSS-div. Хост жодного разу не
    множить точку — усе під одним `worldTransform`. Інваріант «нічого поелементно» тримається.

## Блок 3 — fit у SDK (F4)

```ts
fitStaffChrome(opts?: {
  padding?: number;   // дефолт 48
  minScale?: number;  // дефолт 0.55
  maxScale?: number;  // дефолт 1
  axis?: 'both' | 'width';   // дефолт 'width' (v3: по ширині)
  align?: 'center' | 'top';  // дефолт 'top'
  animate?: boolean;  // дефолт true
}): { x: number; y: number; scale: number } | null
```

- Фітить **padded org box** (той самий збережений box, що getter/props — не content-bounds,
  тому окремий метод, а не розширення `fitView`, що фітить `getContentBounds`). Кламп/axis/
  align/анімація камери — у SDK.
- **Повертає target `{x,y,scale}` (закриває B4):** `null`, якщо org-box нема (поза alpha /
  порожні depts — тоді no-op, N1). Інакше — цільовий transform. Якщо `animate:true`, SDK сам
  твінить камеру. **Pre-build карток під target — хостова overlay-механіка** (overlay створює
  хост; facade не має ref на нього — лише `notifyPromoteSync`, `:552-597`): хост читає target,
  pre-syncʼить overlay (flushSync-танець, як `refitStaffAlpha:769-776`), і це лишається у хості
  **свідомо** — межа: камера-математика SDK, overlay-механіка хоста. Для простих випадків хост
  може `animate:false` і твінити сам по target.
- Замінює `staffFitTransform` (демо `:209`) і камерну математику `refitStaffAlpha` (`App.ts:761`).

---

## Розвилки (рекомендація → лок власника)

**F1 — доставка геометрії.** Лок після B3: **єдине джерело — `getStaffChromeGeometry()` (кеш SDK)**.
Backdrop читає його через хост-closure (accessor). `chrome` у props **прибрано** — не плодити
staff-тип у generic props і не створювати друге джерело. getter покриває і backdrop, і потреби
поза ним (search nodeBoxes).

**F1b — name/count у виході.** Рек.: **лишити** в SDK-виході (org.name, dept.name/count). Це
read із data, не геометрія й не обчислення; хост інакше робив би ті самі join'и (N6 підтверджує).

**F3 — PAD/extent.** Лок після B2: **pad — стан діаграми (set-once), не арг пер-виклик**. SDK
застосовує до AABB і кешує вже-padded box → один box для getter/props/fit. Виконує «PAD впливає
на fit → у SDK», лишаючи числа оформленням хоста.

**F4 — fit: окремий метод vs розширити fitView.** Рек.: **окремий `fitStaffChrome`**, що ПОВЕРТАЄ
target (B4). `fitView` фітить content-bounds; staff фітить padded-org-box (інший extent).

---

## Що лишається ХОСТУ (межа)
- Стиль: кольори/підпис/шрифт/chip/border-товщина, числа pad (задає раз).
- Search: `foundId`-стан, ring навколо found-картки (бере box із `nodeBoxes`); **центрування
  камери на хіт — `focusNode`/`panTo`, вже SDK, не `fitStaffChrome`** (N2).
- Hover-highlight: обчислюється з `chrome.lines` (`fromId`/`toId`) — хостова логіка (N3).
- Collapse-тогл; overlay pre-build під fit-target (по поверненому target, B4).

## Що це дає хосту (доказ «без математики»)
- `App.ts:707` другий `computeStaffLiveGeometry` — ВИДАЛИТИ (getter).
- `StaffChromeBackdrop.ts:103-131` AABB/PAD, `:343` worldPointToScreen-на-елемент — ВИДАЛИТИ (worldTransform).
- `staffFitTransform` + камерна математика `refitStaffAlpha` — ВИДАЛИТИ (fitStaffChrome).

---

## Лог резолюцій R6-критика (NEEDS CHANGES → закрито в контракті)
- **B1** лайфцикл кешу → Блок 1 (кеш = останній рендер; null до 1-го/поза alpha).
- **B2** джерело pad → Блок 1 (StaffChromePad = стан, кеш тримає padded box).
- **B3** props.chrome → Блок 2 (прибрано з props; getter — єдине джерело).
- **B4** fit↔pop → Блок 3 (fit повертає target; pre-build — хост).
- **B5** лінії/stroke → Блок 2 (worldTransform як SVG-`<g>` + non-scaling-stroke).
- N1→Блок3(null/no-op); N2→«лишається хосту»(focusNode); N3→«лишається хосту»(hover); N4→Блок2(border); N5→Блок1(pad≥0); N6→F1b.
