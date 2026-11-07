# Ship-report — D3 transition-шар, зріз 1 (staff-шлях)

**Фіча:** бібліотека сама анімує переходи staff-розкладки (рух, поява, зникнення) однаково для Pixi і
React-оверлея; хост лише вмикає `animate` (opt-in, DEFAULT OFF). **Гілка:** `feat/d3-transitions`.
**Коміти:** `bc9a827` (контракт T-A0) · `d6a62e3` (хвиля 1 T-A/T-B) · `77aef53` (T-A1 tick) · `4cc6b55`
(T-A2 контрактний фікс) · `1c8356c` (хвиля 2 T-C/T-D/T-E + барель + e2e). **Дата:** 2026-11-05.
Формат — шість секцій + post-deploy (`_Report Template`).

## 1. Зроблено (дельта від плану)

Реалізовано `plan.md` рев.6 повністю для staff-шляху:
- **TransitionController** (хвиля 1) — чистий модуль: diff enter/update/exit за `kind:id`, канали x/y/scale=spring,
  opacity=tween, fixed-timestep акумулятор із клампом, settle+cap 750мс, re-entry absorb, нуль-змін=нуль-кадрів.
- **Рендерер** (T-C) — володіє контролером; `render(reason)`; snapshot+detach виглядів до `clear()` → ghosts;
  ghost-контейнер ліній; `startTransition`/`abortTransition` (abort відновлює підтверджений кадр); стадування
  ліній; хром як бокси на обох шляхах (React `lines:[]`+`linesOpacity` / Pixi-перемальовування); culling з
  ghost-боксами; `settleNow`; `onDragStart→snapToTarget`; `lastConfirmedLod` (LOD сильніший за причину);
  `getTransitionFrame()`→null поза переходом.
- **Оверлеї** (T-D) — `PromoteSyncReason += 'transition'`; картки рухаються CSS-трансформом без React-ререндеру;
  тест-якорі ігнорують сигнал (кінцеві позиції); монтаж/демонтаж посеред руху = один спрайт на ключ.
- **Фасад** (T-E) — `animate` у конфігу, `resolveAnimate` при `create`; `pendingReason` (OR-накопичувач);
  lifecycle start/abort; `export→settleNow`; `destroy` вимикає контролер; T131 без `prepare-camera` під animate;
  ізоляція покадрового `'transition'` (throw підписника → 1 warn, цикл живе); нові методи `getTransitionFrame`,
  `setStaffReactChromeMounted`; USAGE оновлено.
- **Барель** — `AnimateOption`, `AnimatePreset`, `TransitionFrame`, `FrameBox`.
- **Наскрізний e2e** (T-F) — реальний стек (facade+renderer+controller+overlay), лише clock інжектований.

**Відхилення від плану:** жодного функційного. Контрактний фікс T-A2 (нижче §3) — не в плані, а наслідок знахідки.

## 2. Протестовані сценарії

- **Приймання:** усі 40 рядків `plan.md §10` (основний шлях 11, межі 17, відмови 11, ручний 1 — #26 лишається
  ручним на стенді). Spec-рев'юер змапив кожен рядок на тест із «red-if-deleted».
- **Рівні:** unit (чисті модулі, інжектований FrameClock) · integ (DiagramRenderer/overlay/facade з реальним
  engine і мок-годинником) · **e2e** (весь стек разом).
- **Прогони:** повний SDK-сьют **171 файл / 1450 тестів / 0 падінь**; demo **18 / 132 / 0**; `typecheck -w`,
  root typecheck (sdk+demo+e2e), `lint`, `check:docs` — усі зелені.
- **Мутації (таргетовані, 3/3 KILLED):** LOD-wins (DiagramRenderer:421); getTransitionFrame null-at-settle
  (:360); ізоляція сигналу #34 (OrgHierarchyDiagram:666). In-tree mutate→test→revert; дерево чисте.

## 3. Неочевидні знахідки

- **Хибно-зелений хвилі 1 (критично).** Тест #11 проходив лише на фейку `LinearAnimator` (`settled=value===target`);
  реальний `TweenAnimator.retarget` скидав `elapsedMs=0`, тож незмінні дані з `animate:true` робили контролер
  активним (порушення «0 кадрів»). Знайшов T-C при інтеграції, зупинився з QUESTION. Фікс T-A2: idempotent
  `retarget` при `target===current`. Незалежне рев'ю GREEN. Урок: тест на фейку з іншою семантикою settle ≠ покриття.
- **Ambient Pixi EventTicker.** e2e довів, що перехід коректно досягає спокою, АЛЕ повністю змонтований Pixi
  планує rAF у спокої через `EventSystem`/`EventTicker` незалежно від D3 — `PixiHost` «0 idle» неповний (зупиняє
  лише render-ticker). Прееснуюче, поза D3 → issue **#99**. #16 на рівні хоста треба міряти D3-специфічно (нема
  нових `'transition'` + `getTransitionFrame()===null`), не сирий global rAF.
- **Q7 камера.** Під animate камера refit стрибає в ціль на settle, не їде паралельно з нодами. Рядок #23
  виконано (кінцевий стан + без `prepare-camera`), відповідає плану; спільний рух камери — ширша візія → issue **#98**.
- **Операційний (інструмент):** фоновий `codex exec` без `< /dev/null` висне на «Reading additional input from
  stdin...» (nohup-stdin не EOF-иться) — вкусило раз (~70 хв). У пам'ять.

## 4. Скріншоти

Нема — зріз 1 перевірявся на рівні бібліотеки (unit/integ/e2e в rstest), не рендер-зображенням. Візуальна
перевірка — рядок #26 (ручний, на стенді хоста після того, як хост увімкне `animate`).

## 5. User-flow (для хоста)

1. Хост створює діаграму з `animate: true` (або пресет/об'єкт `AnimateOption`). Reduced-motion читається ОДИН раз
   при створенні.
2. Структурна зміна (`togglePositionExpand`/`setData`/`revealPath`/…) → прохід `'animate'`; підтверджений кадр
   стартує контролер; ноди/лінії/хром анімуються; HTML-картки їдуть CSS-трансформом синхронно з Pixi.
3. `subscribePromoteSync` отримує `'transition'` щокадру (хост має ІГНОРУВАТИ або обробляти дешево), на settle —
   `'structural'`. `getStaffChromeGeometry()` під час руху дає `lines:[]`+`linesOpacity`, на settle — справжні лінії.
4. `export()`/drag/LOD-cross/`destroy` — коректно доводять/скасовують перехід. `nodeCenter`/якорі під час руху
   віддають КІНЦЕВІ позиції.
5. Без `animate` — байт-у-байт стара поведінка (контролер не створюється).

## 6. Ризики й обмеження

- **Спільний dist / живий хост:** збірка = деплой у стенд. Протокол: «ок» cass-сесії + власник перед кожним build.
- **Мутації лише таргетовані** (3 інваріанти), не повний sweep інтеграційного коду — ключовий false-green ризик
  закрито T-A2 + e2e + red-if-deleted мапінгом 40 рядків.
- **Невалідна геометрія** (NaN/Inf) — поза валідацією контролера (паритет зі старим шляхом + cap).
- **Reduced-motion** не відстежується після створення (як `motionBlur`).
- **Org-діаграма** НЕ покрита — зріз 2, коли хост мігрує (той самий контролер, вхід `TargetBox` за `kind:id`).
- Відкриті беклог-issues: **#98** (Q7), **#99** (Pixi idle).

## Post-deploy

- Dist перезібрано з `1c8356c` (root typecheck+build+повний root test зелені); cass-13 повідомлено SHA+зміни,
  переміряє baseline меню на новому dist.
- Гілка запушена (`origin/feat/d3-transitions`). Мерж у main — за рішенням власника (цю сесію — так).
- Пост-деплой на стенді хоста (рядок #26, вигляд переходу ШПС) — коли хост увімкне `animate`; лишається ручним.
