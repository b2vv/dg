claude-opus-4-8

# Дебати T126 R7 A4.2b (R6) — позиція «B1 закривається РОЗШИРЕННЯМ golden; окремий adapter-parity unit-тест редундантний»

ДАЛІ: читаю первинні джерела — golden-тест (normalizeLayout :44-58), staffLiveGeometry.ts, terrain, critic. Звіряю твердження критика B1 проти коду.

## ФАКТ (звірено з кодом)

### B1 підтверджено
`staffGeometry.golden.test.ts` normalizeLayout :44-58 серіалізує nodes `{id,...rect}` :46, bands :49-53, orgCards `{id:orgId,...rect}` :54, edges `{from,to,kind}` :40,:55, width/height :56; zones `{id,...rect}` :96-99; routes `{from,to,kind,points}` :100-105. НЕ серіалізує: node.role, orgCard.expanded, orgCard.positionCount, route.marked, route.endsOnDeptTop, diagnostics, zone.cards. Усе sort → порядок НЕ гейтиться. Критик коректний.

### Джерела «втрачених» полів = шкала ризику A4.2b
- role (Rust StaffNodeGeo :29; external→alpha :858) — RUST → ВИСОКИЙ ризик.
- endsOnDeptTop (TS :77 / Rust :87) — RUST routing → ВИСОКИЙ.
- marked (Rust :81 → markedCrossings :793) — RUST → ВИСОКИЙ.
- expanded/positionCount — TS-адаптовані з data в ОБОХ шляхах (:28, §4) → НИЗЬКИЙ.

### Оракул (§2 :29, U4): Seam B live == бейслайн старого конвеєра; diff=баг. A4.4 видаляє старий конвеєр (§2 :35).

## РІШЕННЯ — аргументація позиції

### (1) Механіка rebaseline-ПЕРЕД-wiring → SUBSUMES parity-unit
Послідовність:
1. Розширити normalizeLayout: nodes `+role`; orgCards `+expanded,+positionCount`; routes `+endsOnDeptTop`; серіалізувати `markedCrossings` як відсортований набір `{from,to}`.
2. `UPDATE_GOLDEN=1` ДОКИ computeStaffLiveGeometry ще на СТАРОМУ TS-конвеєрі → бейслайн фіксує ПРАВИЛЬНІ еталонні значення всіх цих полів від авторитетного старого конвеєра.
3. Wiring Rust-міст+output-adapt (A4.2b).
4. Прогін golden БЕЗ прапора → Rust-адаптований вихід порівнюється поле-за-полем проти старого-конвеєрного еталона × 11 реальних сцен × near/mid/far.
Будь-який mismatch по role/expanded/positionCount/endsOnDeptTop/marked = червоний golden = РІВНО той баг, якого боїться B1. Adapter-parity unit-тест робив би те саме (adapter(rust)==old для кожного поля), але на синтетичних фікстурах і меншому покритті. Розширений golden його ПОГЛИНАЄ.

### (2) Durability: переживає A4.4
Parity-unit, якщо порівнює adapter(rust) vs LIVE старого конвеєра, втрачає оракул на A4.4 (старий конвеєр видалено, §2 :35) → або видаляється (гард зник), або переписується на заморожені expected (= golden під іншим іменем, гірший: синтетика, окремий супровід). Розширений golden ЗАМОРОЖУЄ еталон у `staff-geometry.json` на кроці rebaseline — JSON не рекомпутиться, тож бейслайн переживає A4.4 недоторканим. Сталий гард для ВСІХ консюмерів (рендерер: role→alpha, expanded/positionCount→org-card, marked→highlight, endsOnDeptTop→entry-circle), не одноразовий.

### (3) Чесний залишок — чого НЕ дістане НАВІТЬ розширений golden
- **diagnostics (вміст/порядок)**: live.canvas.diagnostics → lastDiagnostics — viewport/діагностика, НЕ фарба (§1 :14). Паритетний промах тут не має візуального/поведінкового наслідку на сцені → НЕ проблема. Якщо колись знадобиться — гардиться там, де споживається, не тут.
- **порядок масивів (z-order)**: golden СОРТУЄ все (:39,:41-42,:99) → порядок не гейтиться. Staff-лейаут неперекривний за побудовою (grid), person-cards не накладаються; endsOnDeptTop/marked — per-segment з ключем from/to, стабільно матчаться після sort. Єдиний реальний z-ризик (сиблінг-картки, що перекриваються) у staff відсутній. КЛЮЧОВЕ: parity-unit теж НЕ закрив би порядок, якби спеціально не асертив його — а якщо порядок колись важитиме, фікс — зробити golden порядок-чутливим (прибрати sort), НЕ unit-тест. Тож цей залишок НЕ грає за опонента.
- **zone.cards**: zones серіалізують id+rect; угруповання карток у зону будує StaffZonesView.fromCanvas з live.zones + canvas.positionNodes + canvas.orgCards (§1 :15) — усі ВЖЕ гейтяться (rect нодів/orgCards/зон). Членство похідне від уже-гейтнутої геометрії. Unit тут теж нічого не додає.
Висновок: весь залишок — або не-фарба (diagnostics), або не закривається unit-тестом у принципі (порядок), або похідний від уже-гейтнутого (zone.cards). Жоден не є підставою віддати перевагу parity-unit.

### (4) Найсильніший контраргумент опонента — визнаю
Parity-unit дає harness-light / НЕГАЙНУ ЛОКАЛЬНУ впевненість ДО мутації спільного оракула. Rebaseline (`UPDATE_GOLDEN=1`) перезаписує спільний `staff-geometry.json`, від якого залежать 11 сцен; поганий момент rebaseline заморозить ХИБНІ значення й оракул тихо згниє (U4: баг стає бейслайном). Unit із рукописними expected не чіпає спільний оракул, швидкий, і фіксує мапінг адаптера як виконуваний специфікат для рев'ювера.

**Чому розширення все одно переважає:**
- Небезпека, якої уникає unit (поганий rebaseline), ПРОЦЕДУРНА й знімається самою послідовністю: rebaseline зі СТАРОГО конвеєра, ПЕРЕД wiring, і БІЛЬШЕ не rebaseline у межах A4.2b — пост-wiring прогін лише compare. Якщо golden червоніє після wiring — це й є сигнал (за дизайном). Мутація оракула — одноразовий послідовний крок, рев'юбельний у дифі: JSON-дельта показує рівно які нові поля з якими значеннями з'явились, усі з авторитетного старого конвеєра.
- «Негайна впевненість» unit — це впевненість у РУКОПИСНОМУ expected, найслабший її різновид: людина може закодувати ВЛАСНУ помилку адаптера як очікування (MEMORY «Асерт, істинний і без фічі»: зелений з першого разу — відсутність інформації). Еталон розширеного golden МАШИННО знятий зі старого конвеєра → не може закодувати хибний здогад людини. Для role/endsOnDeptTop/marked (Rust-sourced) unit мусив би МОКАТИ Rust-вихід — крихко; golden робить це проти РЕАЛЬНОГО Rust-виходу на 11 сценах.
- Супровід: один артефакт (golden) vs два (golden+unit), причому unit вмирає на A4.4.

## РЕКОМЕНДАЦІЯ
Закрити B1 РОЗШИРЕННЯМ golden; parity-unit НЕ писати.
Конкретно:
- normalizeLayout: nodes `+role`; orgCards `+expanded,+positionCount`; routes `+endsOnDeptTop`; додати серіалізацію `markedCrossings` (sort by from/to).
- Rebaseline `UPDATE_GOLDEN=1` ОКРЕМИМ комітом ПЕРЕД wiring A4.2b (фіксує еталон старого конвеєра); у дифі JSON перевірити, що нові поля несуть осмислені значення.
- Wiring A4.2b; прогін golden compare-only — будь-який diff = блокер (U4).
- Залишок задокументувати в задачі: diagnostics (не-фарба, не гейтимо); порядок масивів (якщо колись важитиме — робити golden порядок-чутливим, НЕ unit); zone.cards (похідне від гейтнутого).
