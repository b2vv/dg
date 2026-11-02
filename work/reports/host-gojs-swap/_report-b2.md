# Звіт Б2 — SDK-шов геометрії+fit ШПС під хост (Dg 13, 2026-11-02)

Гілка `feat/sdk-host-geometry-seam`. Коміти: `a560636` (SDK I1–I3), `5b6cd10` (N5 pad),
`4830cb2` (демо-міграція). Нічого не пушено/не опубліковано (споживання хостом через file:/link).

## 1. Що зроблено (дельта від плану)
Інваріант власника виконано: уся геометрія+fit ШПС-alpha — у SDK; хост подає розміри картки
входом і **читає** геометрію; малює під ОДНИМ camera-transform, нічого не множить поелементно,
не рахує AABB.

- **I1 `getStaffChromeGeometry(): StaffChromeGeometry | null`** — рамки відділів, рамка
  організації (AABB+pad), лінії звʼязків, бокси посад у world-координатах, з кешу останнього
  рендеру. `StaffChromePad` — set-once стан (`render.staffChromePad`), SDK застосовує до AABB.
  Pure `computeStaffFit` (axis/align/clamp). Перенос `buildStaffChromeGeometry` з демо в SDK
  (pad параметром, `foundId` прибрано як host-стан).
- **I2 `worldTransform` у `PromoteBackdropProps`** — один transform (CSS-div рамки, SVG-`<g>`
  non-scaling-stroke лінії) замість поелементного `worldPointToScreen`.
- **I3 `fitStaffChrome(opts?): {x,y,scale} | null`** — фітить padded org box, повертає target;
  `PixiHost.animateViewport`.
- **N5** — невалідний pad (негатив/NaN) клампиться до 0 (косметика, не крешить рендер).
- **Демо-міграція** (доказ «хост без математики», +283/−536): App.ts прибрав 2-й
  `computeStaffLiveGeometry` + власний `computeStaffChrome`, перейшов на getter + `fitStaffChrome`;
  `foundId` → окремий `staffFoundId`; `rerenderStaffAlpha` + лічильник поколінь (Б2.1 гонка);
  backdrop переписано на `worldTransform`.

## 2. Протестовані сценарії (test-first, червоні→зелені)
- `staffChromeBuild` (14): org AABB+pad, **мутація pad** зсуває box, порожні→null, nodeBoxes,
  fallback name/count, **кламп негатив/NaN→0**, `computeStaffFit` axis/align/clamp+defaults,
  clamp-страж ∈[0.15,4].
- `staffChromeCache` (4): null до рендеру; non-null після alpha; **ПЕРЕХІД** alpha→non-alpha→null
  (ловить stale); reactChrome-off→null.
- `fitStaffChrome` (4): no-chrome→null+камера нерухома; target==computeStaffFit застосовано;
  opts axis=both+maxScale; **страж** target==getViewport ∈[0.15,4].
- `createReactPromoteOverlay` (+1): worldTransform ↔ worldPointToScreen тотожність.
- Демо `StaffChromeBackdrop` (+3): **world-координати без множення** під одним transform,
  SVG-`<g>`-transform+non-scaling, far/no-geom→null; збережено hover/collapse/search.
- Гейти: SDK 1271/0, demo 135/0, typecheck ✓ (sdk+demo+e2e), oxlint чисто на зміненому,
  check:docs ✓.

## 3. Неочевидні знахідки
- **Кеш-reset мусить бути на ВЕРХУ `render()`**, не в `renderStaffCanvas`: org-view/grid туди не
  заходять (`DiagramRenderer.ts:456-460`), тож reset усередині лишав би stale org-box у org-view.
  Знайшов R6-критик плану; тест зроблено ПЕРЕХІДНИМ, а не assert-true.
- **`worldTransform` придатний у двох контекстах**: CSS-transform (div-рамки, шрифт/падінг
  масштабуються як `px(n)=n*s`) і SVG-`<g>`-transform (лінії + non-scaling-stroke тримає 2px).
  `non-scaling-stroke` протидіє SVG-трансформу `<g>`, НЕ ancestor CSS — тому лінії у `<g>`, не в
  CSS-div. Інакше штрих масштабувався б із зумом.
- **Композиція під пан**: catchUp∘worldTransform = (synced→live)∘(world→synced) = world→live,
  тотожно карткам — тому стала-props `worldTransform` коректна, якщо backdrop лишається під
  catch-up-шаром.
- **fit-кламп vs зум-кламп**: `fitStaffChrome` min/max додатково обмежені `Viewport` [0.15,4];
  дефолт 0.55–1 усередині. Поза межами повернений target розійдеться з камерою (тихий кламп) —
  задокументовано (JSDoc+USAGE) + страж-тест.

## 4. Скриншоти / візуал
Візуальна перевірка рендеру ШПС-alpha — **на стороні Cassiopeia через Storybook** (реальний
консумер, рішення власника). В dg візуал не знімався; демо = доказ логіки (unit+typecheck). Єдине,
чого unit не покриває, — реальна CSS/SVG-семантика `worldTransform` (інспектор I2 позначив як
e2e-територію) — закривається Storybook-ом хоста.

## 5. Прогін користувацького потоку (демо)
`staff-alpha` tab: setData → рендер (staffReactChrome=true кешує геометрію) → backdrop читає
`getStaffChromeGeometry()` ліниво під sync → малює рамки/лінії під `worldTransform`. Collapse-тогл
→ `rerenderStaffAlpha` (setData+sync, лічильник поколінь) → `refitStaffAlpha` (`fitStaffChrome`
повертає target, pre-build карток, ease). Search-focus → un-collapse шляху → `staffFoundId`=hit →
`revealPath` центрує (panToNode, не fit) → backdrop рингує знайдену картку.

## 6. Ризики / обмеження
- **Візуал не перевірено в dg** — перенесено на Cass/Storybook (свідомо). Якщо Storybook виявить
  розбіжність рендеру — найімовірніше демо-DOM/`vector-effect` або **адитивний** SDK-фікс, не злам
  форми контракту (worldTransform = 6 чисел).
- **Передіснуючий lint-борг** (не мій): `staffLiveGeometry.ts:146` no-array-callback-reference +
  `work/reports/staff-rust-geometry/*.mjs` sort-vars — були до Б2, lint --max-warnings 0 червоний
  через них. Не чіпав (поза скоупом).
- **pad-валідація** клампить, не кидає — свідомо (косметика). Хост валідує свій pad окремо.
- Нічого не пушено/не зібрано в пакет — хост на file:/link цього checkout; гілку не перемикати
  без попередження Cass.

## Post-deploy
Деплою/пушу немає (file:/link). Dist перезібрано на `5b6cd10` (фасад+worldTransform підтверджено
в dist). Пінг Cass надіслано (фасад у dist + ергоном-ноти). Контракт прийнятий обома сторонами.
Наступна інтеграційна перевірка — коли Cass переведе host-wiring з mock на реальний фасад
(окремий пізніший зріз їхнього TDD) + Storybook-візуал.
