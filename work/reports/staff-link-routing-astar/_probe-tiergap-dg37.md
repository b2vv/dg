ДАЛІ: перерахувати mock3 для tierGap=120/240/360/480, виміряти зазор і повний detector; прибрати probe.

## Початок — 2026-10-31

READY, автор Codex; малий ізольований експеримент за прямим дорученням власника. HEAD 72008be. Production не змінюється; тимчасовий Rust example і цей append-only файл. Шість початкових untracked звітів недоторкані. Граф не потрібен: пряме читання compute_staff_geometry, staff_router, staff_geom та попередніх двох доказів. Незалежні plan/review gates та TDD реалізації N/A: це вимірювання без продуктового фіксу. Перевірка — точний baseline, усі маршрути, обидва параметри окремо/разом. Контракт і критерії — запит користувача.

## 1. Зроблено

Вісім незалежних викликів `compute_staff_geometry` із JSON-входом `/tmp/ta0-mock3.json`: tierGap=120/240/360/480 при verticalGap=120 та при verticalGap=tierGap. near, useAstar=true, treeBlockLayout=true, deptGrouping=true. Assert: немає dockHints/orgCards. Повні метрики взято безпосередньо з production diagnostics після production detector; жодної репліки детектора. На кожній сцені 50 маршрутів, 1225 unordered пар; діагональних сегментів немає.

## 2. Вимірювання

Зазор наведено двома числами: від останньої CEO-горизонталі **над рамками** (визначення попереднього S2-доказу) / від max Y **усіх** CEO-горизонталей. Другий варіант враховує локальні обходи біля карток і не дає назвати 14px глобально вільною смугою.

| tierGap | verticalGap | fan над рамками / frame.y | зазор, px (верхній / повний) | Повний production detector | lanes / потрібно | cross з low_traverse | canvas H |
|---:|---:|---:|---:|---|---:|---|---:|
| 120 | 120 | 266 / 280 | 14 / -38 | A*: cross=6 over=0 card=0 near8=0 dept=0 bends=120 turns=120 excess=16 marked=0 edges=50 | 0 / 2 | 6 (guard no-op) | 1500 |
| 240 | 120 | 266 / 280 | 14 / -38 | A*: cross=6 over=0 card=0 near8=0 dept=0 bends=120 turns=120 excess=16 marked=0 edges=50 | 0 / 2 | 6 (guard no-op) | 1620 |
| 360 | 120 | 266 / 280 | 14 / -38 | A*: cross=6 over=0 card=0 near8=0 dept=0 bends=120 turns=120 excess=16 marked=0 edges=50 | 0 / 2 | 6 (guard no-op) | 1740 |
| 480 | 120 | 266 / 280 | 14 / -38 | A*: cross=6 over=0 card=0 near8=0 dept=0 bends=120 turns=120 excess=16 marked=0 edges=50 | 0 / 2 | 6 (guard no-op) | 1860 |
| 120 | 120 | 266 / 280 | 14 / -38 | A*: cross=6 over=0 card=0 near8=0 dept=0 bends=120 turns=120 excess=16 marked=0 edges=50 | 0 / 2 | 6 (guard no-op) | 1500 |
| 240 | 240 | 386 / 400 | 14 / -38 | A*: cross=6 over=0 card=0 near8=0 dept=0 bends=128 turns=128 excess=22 marked=0 edges=50 | 0 / 2 | 6 (guard no-op) | 2220 |
| 360 | 360 | 506 / 520 | 14 / -38 | A*: cross=6 over=0 card=0 near8=0 dept=0 bends=126 turns=126 excess=20 marked=0 edges=50 | 0 / 2 | 6 (guard no-op) | 2940 |
| 480 | 480 | 626 / 640 | 14 / -38 | A*: cross=6 over=0 card=0 near8=0 dept=0 bends=126 turns=126 excess=20 marked=0 edges=50 | 0 / 2 | 6 (guard no-op) | 3660 |

## 3. Неочікуване та причина

У mock3 немає окремого namespace tier1: є лише staff-block tier2, усі картки включно з ceo мають tier=2. «Tier1 fan» у попередньому описі означав організаційний рівень, а не ярус compose_tiers. `staff_layout.rs:1422` передає tierGap у compose_tiers; `staff_compose.rs:64` додає його ПІСЛЯ цілого блоку. Тому зміна tierGap тут збільшує нижній canvas extent, а не проміжок ceo→департаменти. Для всіх чотирьох tierGap при verticalGap=120 перевірено структурну ідентичність nodes, departmentFrames, routes, namespaces та width з baseline.

`verticalGap` дійсно розсуває дерево, але основна горизонталь CEO лишається на frame.y−14: 266/386/506/626 при frame.y=280/400/520/640. Це зовнішня margin-лінія сітки (`staff_router.rs:410`, FRAME_MARGIN=14). Повний максимум CEO-горизонталей: 318/438/558/678. Висота карткового bbox: 1272/1872/2472/3072 (minY=84). Ширина канви завжди 8408.

## 4. Low_traverse і місткість

Для N=2 та стандартного admin lw=2.25 (`staffEdgeStrokes.ts`) вимога власника: 2·8+(2−1)·8+2.25=26.25 px. Фактичні 14 px не достатні навіть за цією слабшою умовою. Production margin робить інтервал центрів [fan+8, frame.y−14]=[fan+8,fan] порожнім; місткість 0 у всіх восьми випадках.

Смуга не відкрилася, тому умовний крок 3 (побудова маршрутів у НОВІЙ смузі) не застосовується. Перевірений capacity guard повертає оригінальні 50 маршрутів без змін: cross=6, усі інші метрики як у таблиці. Значення «6 (guard no-op)» НЕ є виміром примусово перебудованого кандидата. Такого кандидата не запускали, бо допустимих Y немає.

## 5. Перевірка й межі

`cargo run --offline --manifest-path packages/core/Cargo.toml --example tiergap_probe`: exit 0. Python assertions над усіма вісьмома серіалізованими сценами: PASS (ортогональність, 50 ребер, лише tier2, незмінність сцени для tierGap-only, capacity=0 та guard identity). Baseline точний: 6/0/0/0/0, turns120, excess16. Повна Rust-suite не запускалася: production не редагувався. Не доведено неможливість інших routing/layout підходів; доведено неефективність саме цих параметричних прогонів. Незалежного review немає.

SHA256 входу: `a433fc142a9a5db9c269197b37f53227038e1074aaebdf014c35b8a5e6ce023d`. SHA256 тимчасового example: `88b0ea0604f68ddbdf650a6ee15796a518b703e5f2aa763830790483dce20ba9`.

## 6. Вердикт

**tierGap не є потрібним важелем: жодне зі значень 120/240/360/480 не довело 6→0.** При tierGap-only сцена незмінна, а canvas H росте 1500→1860 (+360, +24%) порожнім нижнім простором. Разом із verticalGap canvas H росте до 3660 (+2160, +144%, 2.44×), картковий bbox 1272→3072 (+1800), cross лишається 6, turns/excess погіршуються. Зазор над рамками всюди 14 px; low_traverse не вміщується.

Post-deploy: N/A, probe не впроваджується.

### Сирий вивід

```text
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.44s
     Running `packages/core/target/debug/examples/tiergap_probe`
RESULT coupled=false gap=120 fan=318 top=280 band=-38 width=8408 height=1500 diagnostics=["A*: cross=6 over=0 card=0 near8=0 dept=0 bends=120 turns=120 excess=16 marked=0 edges=50"]
RESULT coupled=false gap=240 fan=318 top=280 band=-38 width=8408 height=1620 diagnostics=["A*: cross=6 over=0 card=0 near8=0 dept=0 bends=120 turns=120 excess=16 marked=0 edges=50"]
RESULT coupled=false gap=360 fan=318 top=280 band=-38 width=8408 height=1740 diagnostics=["A*: cross=6 over=0 card=0 near8=0 dept=0 bends=120 turns=120 excess=16 marked=0 edges=50"]
RESULT coupled=false gap=480 fan=318 top=280 band=-38 width=8408 height=1860 diagnostics=["A*: cross=6 over=0 card=0 near8=0 dept=0 bends=120 turns=120 excess=16 marked=0 edges=50"]
RESULT coupled=true gap=120 fan=318 top=280 band=-38 width=8408 height=1500 diagnostics=["A*: cross=6 over=0 card=0 near8=0 dept=0 bends=120 turns=120 excess=16 marked=0 edges=50"]
RESULT coupled=true gap=240 fan=438 top=400 band=-38 width=8408 height=2220 diagnostics=["A*: cross=6 over=0 card=0 near8=0 dept=0 bends=128 turns=128 excess=22 marked=0 edges=50"]
RESULT coupled=true gap=360 fan=558 top=520 band=-38 width=8408 height=2940 diagnostics=["A*: cross=6 over=0 card=0 near8=0 dept=0 bends=126 turns=126 excess=20 marked=0 edges=50"]
RESULT coupled=true gap=480 fan=678 top=640 band=-38 width=8408 height=3660 diagnostics=["A*: cross=6 over=0 card=0 near8=0 dept=0 bends=126 turns=126 excess=20 marked=0 edges=50"]
```

### Прибирання

Тимчасовий example, його іменовані build-artifacts та створені `/tmp/tiergap-probe-*` видалено. Вхід збережений. Production не редагувався. Початкові шість untracked звітів збережено.

ДАЛІ: доказ завершено; tierGap не відкриває смугу. Постійних змін layout/options немає.
