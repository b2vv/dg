# GATE 2 (plan-critique) — flood-purge plan.md

Роль: критика плану (НЕ автор). Читаю план opus-агента чотирма незалежними лінзами.

ДАЛІ: прочитати plan.md, spec.md, .claude/standards.md, work/CTO-RESEARCH.md §8 повністю (координатор).

ФАКТ: усі чотири вхідні файли прочитано повністю (plan.md 175р, spec.md 207р, standards.md,
CTO-RESEARCH §8 п.1-35). Помічено: в теці вже лежить _agent-gate2-defense.md (808 байт, лише
2 записи, схоже незавершений/паралельний запуск GATE plan-defense) — не мій артефакт, ігнорую,
але зазначаю розбіжність нумерації гейтів у фінальному звіті.

РІШЕННЯ: запускаю 4 лінзи паралельно як свіжі general-purpose агенти (НЕ fork — план писав opus,
я не автор, але протокол скіла вимагає свіжого сабагента для кожної лінзи незалежно).
Кожній лінзі даю: шляхи до plan.md/spec.md/standards.md/CTO-RESEARCH§8 + конкретні пункти
обов'язкової перевірки коду з мого завдання.

ДАЛІ: запустити 4 агенти (AI-slop, логічні діри, надлишкова складність, edge cases) одним повідомленням.

---

ПОПРАВКА: попередній запис планував запуск 4 паралельних сабагентів — це порушує явну заборону
координатора («НЕ запускай сабагентів»), яка прийшла в цьому промпті. Скасовую цей план. Проходжу
4 лінзи сам, послідовно, дописуючи після кожної. Вхідні файли (plan.md 175р, spec.md 207р,
standards.md, CTO-RESEARCH §8) уже прочитані повністю в цьому прогоні.

ДАЛІ: звірити таблицю §1 плану грепом (button-group залежності, лоадер, барель) — база для всіх
чотирьох лінз.

---

## Лінза 1+2+3+4 (пройдено самостійно, послідовно) — знахідки

ФАКТ (звірка §1 плану): усі рядки таблиці «що лишається» підтверджені грепом —
`magnetRadius.ts` кличуть `paintMagneticGroups.ts:7,124` і `ContourPainter.ts:13,160,274`;
`wasm/layoutBridge.ts:1,30` кличе `initContourWasm` з `contour/bridge.js`; `worker/wasm-init.ts:1-2`
теж. `cargo test -- --list` у `packages/core` = **40 тестів** — база A7 підтверджена.

### 🔴 BLOCKING-1 (лінза «логічні діри») — крок 1 у §2 не лишає дерево зеленим без кроків 3–4

Доказ:
```
packages/sdk/src/render/contour/floodContourEngine.ts:1: import { computeAllContours, type ContourMagnetConfig, type ContourPositionInput } from '../../contour/bridge.js';
packages/sdk/src/contour/incremental.ts:1:              import type { ContourMagnetConfig, ContourPositionInput, DeptContourResult } from './bridge.js';
packages/sdk/src/contour/config.ts:2:                   import type { ContourMagnetConfig } from './bridge.js';
```
Ці три файли (плюс `worker-bridge.ts`, що теж імпортує з `./bridge.js`) прибираються лише в
кроках 3–4, **не** в кроці 1. Крок 1 у плані описаний як «6 споживачів button-group перестають
залежати від `contour/`» (plan.md:53) — тобто торкається лише button-group файлів. Якщо переїзд
типів у кроці 1 означає, що `bridge.ts` **перестає** оголошувати `ContourPositionInput` /
`ContourMagnetConfig` (а не тимчасово ре-експортує їх), то саме цей комміт ламає typecheck на
трьох flood-файлах, які план чіпає лише двома кроками пізніше. Це прямо суперечить власному
твердженню плану «крок 1 ізольований і суто механічний; revert одного коміту» (plan.md:109) і
факту «кожен [комміт] лишає дерево зеленим» (plan.md:95).

**Що змінити в плані:** явно сказати, як крок 1 лишається зеленим — або (а) `bridge.ts` тимчасово
ре-експортує чотири типи з нового дому до кроку 4 («переїзд» = спершу дублювання, потім конвергенція,
не атомарне вирізання), або (б) крок 1 також оновлює імпорти в `worker-bridge.ts`, `incremental.ts`,
`config.ts`, `floodContourEngine.ts` (тобто торкається не «шести», а щонайменше десяти файлів, і
робить це до їх видалення двома кроками пізніше). Обране рішення вплине і на формулювання
«ізольований, суто механічний revert» у §5.

### 🔴 BLOCKING-2 (лінза «логічні діри») — інвентар втрат барелю занижений; б'є по Конституції

Доказ (`packages/sdk/src/index.ts`):
```
59:   configureContourWorker,          } from './contour/worker-bridge.js';
72-74: ContourComputerFn, DeptContourComputerFn, IncrementalContourComputer } from './contour/incremental.js';
76:   export type { ContourWorkerOptions } from './contour/worker-bridge.js';
167:  ContourComputer  (з ./render/index.js ← DiagramRenderer.ts:67-70, сам залежить від
                        ContourPositionInput/ContourMagnetConfig/DeptContourResult)
```
План (§3, plan.md:80) і крок 5 (plan.md:57, «барель: 4(+incremental) імені геть») називають
**5** імен, що йдуть з кореневого барелю: `computeDeptContour`, `computeAllContours`, обидва
`*InWorker`, `createIncrementalContourComputer`. Насправді зі зникненням `worker-bridge.ts` і
`incremental.ts` (обидва — файли, що видаляються цілком, крок 4) з барелю зникають ще:
`configureContourWorker` (значення) і три типи — `ContourComputerFn`, `DeptContourComputerFn`,
`IncrementalContourComputer`, `ContourWorkerOptions` (усі оголошені **лише** в цих двох файлах,
заміни нема). Окремо: `DiagramRenderer.ts` — **сьомий**, не порахований у Г4/A14 виробничий
споживач переїзних типів (`ContourMagnetConfig`, `ContourPositionInput`, `DeptContourResult` на
`DiagramRenderer.ts:14-16,68-70`), і сам експортує в барель тип `ContourComputer`
(`index.ts:167`), який ніде в репо більше не використовується (греп по `packages/sdk/src` і
`packages/demo/src` — нуль інших входжень) — публічний, але мертвий тип, про який план мовчить.

Це не просто рахунок: A5 і CHANGELOG (крок 11) прямо залежать від цього списку, а конституційний
пункт «Публічний API SDK не змінюється мовчки» — це саме той рядок, який `check:docs` **не**
ловить текстово (тільки наявність/відсутність методів `docs/USAGE.md`, а не повноту CHANGELOG).
Помилковий (короткий) список у CHANGELOG пройде всі гейти мовчки.

**Що змінити в плані:** переписати таблицю §3 і крок 5 — барель втрачає щонайменше **6 значень**
(`computeDeptContour`, `computeAllContours`, `computeDeptContourInWorker`,
`computeAllContoursInWorker`, `createIncrementalContourComputer`, `configureContourWorker`) і
**4+ типи** (`ContourComputerFn`, `DeptContourComputerFn`, `IncrementalContourComputer`,
`ContourWorkerOptions`), плюс явне рішення щодо `ContourComputer` (лишити мертвим публічним типом
чи прибрати разом з рештою — його існування саме через ці типи й спливло).

### 🔴 BLOCKING-3 (лінза «непокриті edge cases» + «AI-slop») — межа видалення в `export.test.ts` описана невірним діапазоном

Доказ:
```
$ sed -n '201,660p' packages/sdk/src/export/export.test.ts | grep -c '^\s*it('
25
$ grep -n '^describe(' packages/sdk/src/export/export.test.ts
193  SVG paints with the engine the canvas uses (T3 / H1)
246  SVG never paints with an engine the canvas did not use (T4 / F2, F3)
280  SVG degrades honestly when the flood cannot run (T5 / F1, F4)
324  partial flood keeps what worked (T6 / F5)
396  boundaries of the export contour layer (T6 / B1–B5)
473  buildDiagramSvg — default engine is frozen (T1 / H2)      ← НЕ flood
496  buildDiagramSvg                                            ← НЕ flood
599  rgbImageToPdf / 606 printDiagram                            ← НЕ flood
618  SVG export vs contourEngine (T80 follow-up)                 ← мішаний (2 з 3 `it` — button-group)
```
Плановий рядок «`export.test.ts` мінус ~15 flood-кейсів (`:201-660`)» (plan.md:156, регресія
№8) дає **невірне число** (реально 25 `it(...)` у цьому діапазоні, не ~15 — число без джерела,
AI-slop) і **невірну межу**: діапазон `201-660` охоплює `describe` на `:473` — «buildDiagramSvg —
default engine is frozen (T1 / H2)» — тест саме на **той рушій, що лишається**
(`'success: byte-for-byte stable output for the button-group engine'`,
`expect(svg).toMatchSnapshot('default-engine-svg')`), а також `:496` (`buildDiagramSvg`, загальний)
і `:618` (`SVG export vs contourEngine`, де `'success: the default engine exports without a
warning'` і `'PNG/PDF come from the live canvas...'` теж не про flood). Якщо імплементатор прочитає
«мінус діапазон 201-660» буквально (а не «мінус ~15 підібраних кейсів усередині нього»), знімається
регресійний тест саме на A3/A4 («SVG-експорт малює той самий контур») — те, що ці критерії мають
довести.

**Що змінити в плані:** замінити рядок на явний перелік `describe`-блоків, що йдуть (`:246, :280,
:324` — і, з розбором, частина `:396` і `:618`), і блоків, що лишаються обов'язково (`:473-495`
цілком, `:496-598`, `:599-617`, і несфлудна частина `:618-656`). Прибрати непідтверджене число
«~15» або дати йому реальне джерело (25, звірене грепом).

### Лінза «надлишкова складність» — без знахідок

`render/contour/types.ts` — рішення користувача, ухвалене на GATE 1 (plan.md:14: «рішення
користувача на GATE 1»), поза зоною критики цього гейту. 11 кроків не виглядають роздутими для
задачі, що чіпає межу Rust↔TS, барель, воркер, демо і чотири доки одночасно — кожен крок окремо
тестований і окремо ревертований (§5), дроблення відповідає власним правилам розміщення.
Знахідок немає.

ДАЛІ: фінальна відповідь координатору — 3 BLOCKING, 0 NON-BLOCKING.
