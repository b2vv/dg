# T85 — Борг лінтера: правила, вимкнені щоб гейт став зеленим сьогодні

**Пріоритет:** P2 · **Статус:** ✅ закрито (2026-09-02)
**Підстава:** `chore/oxlint-oxfmt` — oxlint зайшов у CI; частину правил вимкнули, щоб не блокувати.

---

## Чому вимкнули, а не виправили

Перший прогін oxlint по репо дав **866** порушень. Виправляти їх усі в одному коміті означало б
непрочитаний диф на сотні місць. Тому гейт увімкнули **зеленим**: усе, що лишилось увімкненим,
перевіряється машиною вже зараз; усе, що вимкнено, перелічено тут із числом.

**Правило не можна вимкнути мовчки.** Кожен рядок нижче має або число (борг), або причину.

---

## Закриття (2026-09-02)

**Ввімкнено 14 правил.** Було вимкнено 41 (не 20, як казав цей файл і `.claude/standards.md` —
перша розбіжність, знайдена при закритті), лишилось **27**, і кожне з них має причину, не борг.

### Ввімкнено після виправлення

| Правило | Було | Що зроблено |
|---|---|---|
| `no-promise-executor-return` | 37 | `new Promise((r) => setTimeout(r, n))` → тіло у блоці. Форма, а не намір: правило існує, бо **повернутий з виконавця проміс тихо губиться** |
| `no-shadow` | 10 | `const it = […]` у п'яти тестах затіняв `it` фреймворку — усередині такої області тест написати не можна. Плюс `x`/`y` у `OrganizationNode`, де внутрішній прямокутник не той, що зовнішній |
| `unicorn/no-array-callback-reference` | 6 | `map(fn)` → `map((x) => fn(x))`: ітератор передає `(value, index, array)` — класична пастка `map(parseInt)` |
| `no-new-array` | 3 | `new Array(n)` → `Array.from({ length: n })` |
| `prefer-add-event-listener` | 3 | `self.onmessage =` замінює вже зареєстрований обробник |
| `unicorn/no-array-reverse` | 1 | `revealPath`: замість `path.reverse()` — читання з кінця. Масив локальний, тож мутація нешкідлива, але «чому це безпечно» не має бути питанням до читача |
| `max-depth` | 1 | `contourClearance`: внутрішній скан винесено в `pointIntrudes` — п'ять рівнів блоків не називали питання, яке ставили |
| `unicorn/no-lonely-if`, `no-immediate-mutation`, `prefer-single-call`, `prefer-math-trunc` | по 1 | механічні |

### Ввімкнено як уже чисті

`no-warning-comments`, `import/no-unassigned-import`, `unicorn/prefer-number-coercion` — нуль
порушень; вмикання закріплює наявну практику (задачі живуть у `work/tasks/`, не в `TODO`).

---

## Лишається вимкненим — правило нам шкідливе або хибно спрацьовує

🔴 **Знайдено при закритті: чотири правила, чий автофікс вніс би баг.**

| Правило | К-сть | Чому не вмикати |
|---|---|---|
| `no-useless-spread` | 4 | 🔴 **усі чотири в `src` — навмисна копія**: `for (const k of [...map.keys()])`, і тіло циклу **видаляє з тієї самої мапи** (`ContourPainter:195`, `incremental:103`, `nodeMedia:52`, `MediaService:103`). Автофікс прибрав би захист і дав мутацію під час ітерації |
| `require-post-message-target-origin` | 3 | 🔴 **хибне спрацювання**: `worker.postMessage` і `self.postMessage` у воркері **не мають** `targetOrigin` — це API `window`. Підказка правила («вставте `, worker.location.origin`») передала б другий аргумент як список transfer → TypeError |
| `no-unmodified-loop-condition` | 1 | 🔴 **хибне**: `stopped` у `renderCoalesce` присвоюється у `stop()` (рядок 20); правило не бачить мутації через замикання |
| `no-loop-func` | 2 | 🔴 **хибне**: обидва — синхронні колбеки `map` / `String.replace`, що виконуються в тій самій ітерації |
| `unicorn/prefer-code-point` | 1 | 🔴 автофікс міняє **результат**: `charCodeAt` → `codePointAt` у FNV-хеші для кольору аватара. Цикл іде по кодових **одиницях** навмисно; сурогатні пари дали б інші кольори |
| `unicorn/no-array-sort` | 56 | 🔴 автофікс `toSorted()` — сортування на місці стає копією |
| `unicorn/no-array-fill-with-reference-type` | 27 | 🔴 **хибні спрацювання** досі: усі 27 — `Graphics.fill({…})` з Pixi, не `Array#fill`. Перевірено на oxlint 1.74 |
| `require-await` | 184 (20 у `src`) | 🔴 б'ється з **навмисним промісним контрактом**. Доказ: `initContourWasm` має fast-path `if (wasm) return wasm` без await; колбек фолбеку воркера зобов'язаний повернути проміс; `handleComputeOrgRowTreeLayout` — обробник, чий реєстр типізований як `⇒ unknown \| Promise<unknown>`. Прибрати `async` — змінити семантику помилок (throw перестає бути rejection). **164 з 184 — у тестах**, де це нічого не ловить |
| `no-useless-return` | 2 | `return;` як термінатор `case` — усі сім гілок switch у `ContextMenuController` завершуються однаково; вимкнути два останні зробило б switch неоднорідним і додало неявний fall-through |
| `unicorn/no-object-as-default-parameter` | 6 | у JS немає пастки спільного мутабельного дефолта (об'єкт створюється на кожен виклик). `motion = { animate: true }` читається краще за `motion?: X` + `?? { animate: true }` |
| `prefer-top-level-await` | 1 | `main.ts` експортує `App`/`requireElement` для тестів; top-level await блокував би імпорт до кінця бутстрапа |
| `react/react-in-jsx-scope` | 0 | автоматичний JSX-рантайм не потребує імпорту React |

## Лишається вимкненим — стиль, який судить рев'ю

`max-lines` (38) · `max-lines-per-function` (202) · `no-inline-comments` (43) ·
`no-underscore-dangle` (42) · `import/max-dependencies` (8) — межі, які тут ставить
`work/CODING_STANDARDS.md`, а не машина.

`require-unicode-regexp` (106) · `unicorn/prefer-*` (`dom-node-append` 85, `dom-node-remove` 65,
`at` 25, `dom-node-dataset` 24, `string-replace-all` 12, `import-meta-properties` 12,
`query-selector` 11) · `unicorn/consistent-function-scoping` (58) · `unicorn/no-useless-undefined`
(24) — смак із нульовою ціною помилки. `require-unicode-regexp` окремо: прапорець `/u` міняє
строгість екранування, тож 106 механічних правок мали б ненульовий ризик заради нуля користі на
наших ASCII-регулярках.

## Готово, коли

- [x] кожне правило з таблиці «борг» або ввімкнене, або переїхало в таблицю «шкідливе» з причиною
- [x] `.claude/standards.md` більше не має рядка про правила, що лишились вимкненими

## Що це коштувало й що знайшло

`npm run lint` зелений; **846 + 108** unit-тестів зелені; `npm run typecheck` зелений.

Найцінніше — не ввімкнені правила, а **чотири місця, де сліпе виконання підказки лінтера внесло б
баг**: мутація під час ітерації в чотирьох мапах, `targetOrigin` у воркері, і зміна хешу кольорів.
Це і є аргумент проти `lint:fix --all` як способу закривати такий борг.
