# R7 A4.2b дебати — B1: adapter-parity unit-тест (BOTH?) — dg29

Model ID: claude-opus-4-8

ДАЛІ: читаю первинні джерела — golden-тест (normalizeLayout :44-58), терен, критику плану, і сам adaptStaffGeometry / staffLiveGeometry, щоб звірити, які поля golden реально бачить і що робить output-adapt.

## ФАКТ (звірено з кодом)

### Що golden РЕАЛЬНО бачить/гейтить (staffGeometry.golden.test.ts)
- Серіалізує (normalizeLayout :44-58 + capture :96-105): nodes{id,x,y,w,h} :46; bands{id,x,y,w,h} з canvas.tiers :49-53; orgCards{id,x,y,w,h} :54; edges{from,to,kind} :55; width/height :56; zones{id,rect} :96-99; routes per-LOD{from,to,kind,points} :100-105.
- НЕ серіалізує взагалі: `node.role`, `card.expanded`, `card.positionCount`, `route.marked`, `route.endsOnDeptTop`, `canvas.diagnostics`, `zone.cards`. (критик :22; terrain :11-12,16; rust-types.ts:63,92,111-116,139-141 — ці поля існують у Rust/TS-виході, але оракул їх відкидає.)
- ВСІ масиви pre-sorted у normalizeLayout: nodes byId :46, bands :53, orgCards byId :54, edges byLink :55, zones :99, routes byLink :104. `compare()` масиви звіряє ПО ІНДЕКСУ без ресорту :121, об'єктні ключі сортує :126-127. → **реальний z-order (порядок фарби) НЕ гейтиться**, бо вхід у compare вже відсортований.
- Усі ці «невидимі» поля РЕНДЕРЕР СПОЖИВАЄ: role→external alpha (critic :13, addStaffPersonCards :858), expanded/positionCount→addStaffOrgCards :881/:889, marked→markedKeys :793, endsOnDeptTop→entry-кружечок, diagnostics→lastDiagnostics :660. Тобто це НЕ косметика — це рендер-критичні поля, яких оракул не пінить.

### Здійсненність unit-тесту
- A3/A4.1 вже є: `computeStaffGeometryWasm` layoutBridge.ts:81, `buildStaffLayoutInput` render/buildStaffLayoutInput.ts. A4.2b доробляє output-adapt (Rust `StaffGeometryResult` rust-types.ts:92 → StaffCanvasResult-форма staffLiveGeometry.ts:132-140).
- Старий конвеєр ЩЕ живий у staffLiveGeometry.ts:82-140 (layoutStaffCanvas+enrichStaffTierBands+resolveStaffRouting+resolveDeptHeads), видаляється лише A4.4. → old-vs-new diff фізично можливий ТІЛЬКИ у вікні A4.2b..A4.4.

## АРГУМЕНТ (моя позиція: BOTH)

**(1) Unit-тест = негайна вичерпна впевненість ПЕРЕД мутацією оракула.** adapt(Rust) проти старого :132-140 на тих самих 11 табах по ВСІХ полях — включно з role/expanded/positionCount/marked/endsOnDeptTop/diagnostics/z-order, яких golden НЕ бачить (ФАКТ вище). Чистий: без Pixi/demo-харнесу, без baseline-файлу. Пітить НОВИЙ код проти ВІДОМО-ДОБРОГО старого напряму — не проти знятого зліпка.

**(2) Найцінніше — НЕ-мутація оракула.** Щоб golden ПОЧАВ гейтити нові поля, його треба РОЗШИРИТИ + РЕБЕЙСЛАЙНИТИ (`UPDATE_GOLDEN=1` :160-163 переписує ВЕСЬ файл, і нові, і наявні поля). Ребейслайн — це рівно та операція, проти якої застерігає U4 (terrain :29: diff=баг, НЕ rebaseline). Unit-тест baseline НЕ має взагалі → його НЕ можна обдурити кривим ребейслайном. Якщо хтось ребейслайнить ПІСЛЯ wiring (помилка послідовності) — golden тихо «усиновить» Rust-вихід і втратить паритет-оракул; unit-тест це спіймає, бо порівнює два ЖИВІ конвеєри.

**(3) Різні ВІКНА ЧАСУ — тому не дублюються.** Unit-тест фізично живе лише A4.2b..A4.4 (старий конвеєр зникає A4.4, terrain :29/critic :35) — deletable-артефакт, де-ризик ЗАРАЗ. Extend-golden дає DURABILITY: нові рендер-критичні поля (role/expanded/positionCount/marked/endsOnDeptTop/diagnostics) сьогодні НЕ гейтяться взагалі; після A4.4 unit-тест помирає → без розширеного golden ці поля лишаються без гейта НАЗАВЖДИ. Жоден з двох сам не покриває обидва вікна.

## ЧЕСНА ПОСТУПКА опоненту
Найсильніший контраргумент — вірний у своїй частині: якщо розширити normalizeLayout на невидимі поля (включно з ДРОПОМ .sort там, де важить порядок — z-order/diagnostics технічно серіалізовні, compare :121 гейтив би їх по індексу) і ребейслайнити зі СТАРОГО конвеєра ПЕРЕД wiring, то перший пост-wiring прогін golden = повна перевірка паритету по всіх полях. Тобто **одноразова PARITY-AT-CUT цінність unit-тесту СУБСУМУЄТЬСЯ правильно-послідовним extended-golden.** Golden capability-повний: немає поля, яке він у принципі не може серіалізувати.

Отже чесно відступаю від частини (2) у вихідній позиції: твердження «diagnostics-порядок/z-order golden не дістане ЛЕГКО» — слабке. Дістане: досить прибрати .sort. Унікального в unit-тесту ЛИШАЄТЬСЯ рівно це:
- **no-baseline / імунітет до ребейслайн-хазарду** (єдина перевірка, що не довіряє зліпку — пітить old vs new наживо);
- **throwaway де-ризик саме НА ЗРІЗІ** без дотику до спільного оракула;
- timing/ізоляція (чистий, швидкий) — дрібний бонус.

## РЕКОМЕНДАЦІЯ: BOTH (з умовою)
1. **Unit adapter-parity** (deletable @ A4.4): old :132-140 vs adapt(Rust) по ВСІХ полях на 11 табах × LOD. Пишеться дешево, не чіпає golden, імунний до U4-хазарду. Це найбезпечніший негайний гейт зрізу.
2. **Extend-golden** на рендер-критичні невидимі поля (role/expanded/positionCount/marked/endsOnDeptTop/diagnostics; z-order через дроп .sort де доречно), ребейслайн зі СТАРОГО конвеєра СТРОГО ПЕРЕД wiring. Це єдина DURABLE форма після A4.4.

Чому BOTH, а не extend-only (хоча воно capability-повне): extend-only покладається на бездоганну послідовність ребейслайну (ребейслайн-перед-wiring) — а U4 існує саме тому, що цей крок помилконебезпечний. Unit-тест коштує мало, не має baseline і страхує рівно цей ризик у найгарячіший момент. Якщо власник впевнений у дисципліні послідовності й хоче мінімум артефактів — extend-only захищуване; але я рекомендую BOTH, бо ціна throwaway-тесту обмежена A4.4, а виграш — незалежний від зліпка доказ паритету на зрізі.
