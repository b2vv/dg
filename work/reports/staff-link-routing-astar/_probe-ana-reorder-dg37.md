ДАЛІ: виміряти baseline, ana→fin, ana між fin/dev, sec; прибрати тимчасову копію.

## Початок — 2026-10-31

READY, Codex, small probe за прямим дорученням. HEAD 72008be; production не редагується, snapshot packages/core із S1 скопійовано в /tmp. Початкові змінені staff_layout.rs, WASM та всі untracked звіти зберігаються. Критерій: cross 6→~2 без нових over/card/near/dept; повний production detector після compute_staff_geometry. Незалежні implementation/TDD gates N/A: постійного фіксу немає. Пряме читання pack_tree_block та routing seam достатнє, граф не потрібен.

Початкові SHA256: {"packages/core/src/staff_layout.rs": "83dd7fd374c1dcf14cf3123b6c63d8f50d1354201b611d9a9ad1c73d3e55f2c6", "packages/sdk/src/wasm/pkg/org_hierarchy_core_bg.wasm": "1476c6f1d414dfa4a919df9681af7402043d483f3e5722d1127aa19f2450bcdb"}

## Проміжний доказ

`admin_parent_map` бере останній admin-запис для дитини: ah→da потім ceo→da, тому parent(da)=ceo. Сортування членів за parent ID дає ceo < cfo < cto, отже перший зовнішній корінь ana — da. pack_tree_block крок 2 чіпляє ana до CEO, НЕ dev. sec має head=sch і теж parent=CEO.

baseline: ['A*: cross=6 over=0 card=0 near8=0 dept=0 bends=126 turns=126 excess=18 marked=0 edges=50']

fin: ['A*: cross=1 over=0 card=0 near8=0 dept=0 bends=116 turns=116 excess=14 marked=0 edges=50']

mid: ['A*: cross=4 over=1 card=0 near8=2 dept=2 bends=110 turns=110 excess=8 marked=2 edges=50']

sec_mid: ['A*: cross=4 over=3 card=6 near8=5 dept=9 bends=98 turns=98 excess=0 marked=7 edges=50']

both_mid: ['A*: cross=6 over=1 card=0 near8=2 dept=2 bends=110 turns=110 excess=8 marked=2 edges=50']

fin_sec: ['A*: cross=3 over=2 card=0 near8=9 dept=7 bends=102 turns=102 excess=6 marked=8 edges=50']

## 1. Метод і відтворення

Повний compute_staff_geometry на `/tmp/ta0-mock3.json`, near, useAstar=true, treeBlockLayout=true, deptGrouping=true, без dockHints/orgCards. Копія пакета включає початковий S1. Production route_stats НЕ змінювався: всі сім метрик — штатний diagnostic після маршрутизації усіх 50 ребер (1225 unordered пар).

Probe вставляв після побудови parent_of (перед розривом циклів) `parent_of[ana]=index(fin)` та/або `parent_of[sec]=index(dev)`. Дані reports, head_id та внутрішня розкладка блоків не змінювалися. Це перепакування всього дерева, включно з Y та позиціями сусідів, а не лише зміна X. Оскільки голова ana лишається da, її фактичний parent ceo відсутній у fin: attach_x повертає infinity; це свідомий механічний probe, не готова політика вибору attachment.

Прямі X-проби вставляли перед емісією вузлів `block_x[i]=target_x-blocks[i].bw/2`; Y і сусіди не змінювалися. Усі рамки й маршрути далі перебудовував production pipeline. sec x=5800 обрано між CEO та початковою sec біля dev; колізії показують, що такий прямий зсув без перепакування непридатний.

Координати в таблиці — справжній центр рамки X і верх рамки Y. Початкові 5600/1172/4862 зі study відрізняються від центрів цього прогону на +150 px (півширини картки); baseline detector ТОЧНО збігається з вимогою 6/0/0/0/0,126,18. Виміряні центри fin/dev=1322/5012; B тестує прямо запитаний x=3000, не точний середній 3167.

## 2. Таблиця: позиція ana × повний detector

| Варіант | ana X / Y | sec X / Y | cross | over | card | near8 | dept | turns | excess | marked |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| C: baseline | 5750 / 280 | 8046 / 280 | 6 | 0 | 0 | 0 | 0 | 126 | 18 | 0 |
| A: ana→fin | 1486 / 976 | 7390 / 280 | 1 | 0 | 0 | 0 | 0 | 116 | 14 | 0 |
| B: ana x=3000 | 3000 / 280 | 8046 / 280 | 4 | 1 | 0 | 2 | 2 | 110 | 8 | 2 |
| ana baseline; sec x=5800 | 5750 / 280 | 5800 / 280 | 4 | 3 | 6 | 5 | 9 | 98 | 0 | 7 |
| ana x=3000; sec x=5800 | 3000 / 280 | 5800 / 280 | 6 | 1 | 0 | 2 | 2 | 110 | 8 | 2 |
| ana→fin; sec x=5800 | 1486 / 976 | 5800 / 280 | 3 | 2 | 0 | 9 | 7 | 102 | 6 | 8 |
| ana baseline-parent; sec→dev | 6242 / 280 | 5586 / 976 | 0 | 0 | 0 | 0 | 0 | 140 | 32 | 0 |
| ana→fin; sec→dev | 1486 / 976 | 5586 / 976 | 1 | 0 | 0 | 0 | 0 | 106 | 10 | 0 |

## 3. Які перетини зникли, які нові

Незмінений production route_stats додатково викликано для кожної пари вже отриманих маршрутів (порожні cards/frames ТІЛЬКИ для атрибуції cross; повний detector вище має всі перешкоди):

```text
baseline: cfo→ah × ceo→hrd = 1
baseline: cfo→ah × ceo→lgl = 1
baseline: cfo→ah × ceo→sch = 1
baseline: cto→bi × ceo→hrd = 1
baseline: cto→bi × ceo→lgl = 1
baseline: cto→bi × ceo→sch = 1
fin: acc→aud × ceo→da = 1
fin_sec_dev: acc→aud × ceo→da = 1
```

A прибирає УСІ шість початкових перетинів, але створює ОДИН новий acc→aud × ceo→da біля fin; чисте зменшення — 5. Отже «жодного нового перетину» для A неправда, хоча over/card/near/dept залишаються нульовими. Додаткова перевірка AABB карток: baseline/A/sec→dev/A+sec→dev — жодних перекриттів карток; B має s1×bi. Розмір сцени baseline 8408×1500, A 7752×1500, sec→dev 8244×1500, A+sec→dev 7588×1500.

## 4. Перевірки й межі причинного висновку

`cargo run --offline --manifest-path /tmp/dg37-ana-probe/Cargo.toml --example ana_probe`: exit 0; після додавання SEC_PARENT `cargo build --offline ... --example ana_probe`: exit 0. Вісім повних прогонів executable — exit 0. `cargo run --offline ... --example pairs`: exit 0. Перевірено 50 ребер, однаковий набір nodes/edges, ортогональність кожного маршруту. Немає production-фіксу, тому повна Rust-suite, npm, WASM build та deployment N/A. Незалежного review немає.

Це доказ ефекту перепакування, НЕ доказ формули «обидва джерела ближчі → усі ребра коротші». У A ah стає прямо під cfo (X=1322), але bi віддаляється від cto (bi X=1650 проти cto X=5012). sec→dev дає cross=0, хоча ana зсувається ПРАВІШЕ до 6242. Результат залежить від Y/порядку/перешкод і нового routing усієї сцени. Зміни не адитивні: A+sec→dev зберігає новий fin-перетин.

## 5. Вердикт

Найкраща з A/B/C — **A: ana під fin**, cross **6→1 (−5)**, turns **126→116**, excess **18→14**, без нових over/card/near/dept. Для цілі ~2 перетини sec не потрібний. Строгіша умова «без жодного нового cross» для A НЕ виконана: один новий перетин замість шести старих.

Для абсолютного cross=0 найкращий виміряний варіант — **лише sec→dev** (ana лишається дочірнім CEO): усі п’ять detector-лічильників нульові, але turns/excess **140/32**. Обидва перепідпорядкування разом дають **1/0/0/0/0,106,10** — менше поворотів, але не нуль перетинів.

Гіпотеза про користь перестановки блоків **підтверджена на mock3**. Початкова причина «ana прив’язаний до dev» спростована; достатність простого горизонтального наближення спростована пробою B. Постійне правило автоматичного вибору parent цим експериментом не визначене.

## 6. Збереження й прибирання

SHA256 входу: `a433fc142a9a5db9c269197b37f53227038e1074aaebdf014c35b8a5e6ce023d`.

SHA256 початкових S1 та WASM збігаються. Production-файли взагалі не редагувались. Post-deploy: N/A.

Тимчасову копію `/tmp/dg37-ana-probe` разом із probe-кодом, JSON-виходами й build-artifacts видалено. Початковий вхід не видалявся. git status не змінився від зафіксованого стану після створення цього звіту; єдиний доданий артефакт задачі — цей файл. S1 лишився незакоміченим байт-у-байт.

ДАЛІ: probe завершено; вирішити окремо компроміс cross=0 (sec→dev, 140/32) проти cross=1 (ana→fin, 116/14; обидва — 106/10).
