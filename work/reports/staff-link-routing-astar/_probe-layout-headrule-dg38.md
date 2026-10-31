ДАЛІ: запустити baseline та ana→ah у /tmp-копії, зіставити discriminator, перевірити SHA256 й прибрати копію.

## Метод + SHA256 (початок)

Одноразовий probe, без production-змін. HEAD `7b60154a4a8b7c95f7a81187c761c71058b38c81`, гілка `feat/t126-staff-rust-geometry`; `git diff c7aed85 HEAD -- packages/core` порожній. Наявні сторонні зміни не чіпаємо. Копіюємо core без build-cache target. Прямі виклики compute_once; parent-eval не викликається. Змінюється лише override ana→ah; sec не чіпаємо. Вхід /tmp/ta0-mock3.json SHA256 `a433fc142a9a5db9c269197b37f53227038e1074aaebdf014c35b8a5e6ce023d`.

Критерій: cross 6→~1, ana нижче fin, asst без зсуву, без нових over/card/near/dept; cross≥4 або будь-який із зазначених регресів = провал.

```text
278ab72caa16ec1d91bd942503de2592dc14ff32318ebe30c10f19f670a73b37  packages/core/src/staff_layout.rs
684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1  packages/sdk/src/wasm/pkg/.gitignore
659f09b49f967878621e800922547b68e08c757cd65bd9d7e71592d9192a9da8  packages/sdk/src/wasm/pkg/org_hierarchy_core.d.ts
46d22bff9ae46206534241a4d96d586bafe011306935d7df198f8122b6aeb11a  packages/sdk/src/wasm/pkg/org_hierarchy_core.js
44e5710e4e8771120d7a8ab2a830771bbadc7a2ea5d08cbc9821c194f0e0273e  packages/sdk/src/wasm/pkg/org_hierarchy_core_bg.wasm
e45e5b5abb7f6093626dcd1a61ed22c9b784a000c6088922544cd01fcad979ca  packages/sdk/src/wasm/pkg/org_hierarchy_core_bg.wasm.d.ts
dc6291b665da03c022a9ec273cb68c2d98d7e7d101a914c2ca9d028395996a99  packages/sdk/src/wasm/pkg/package.json
```

## Проміжний результат

Offline-компіляція /tmp-копії успішна; baseline відтворив очікувані 6: `A*: cross=6 over=0 card=0 near8=0 dept=0 bends=126 turns=126 excess=18 marked=0 edges=50`. Fix ще виконується. Видимість production-функцій не змінено: inline #[test] у копії бачить приватний compute_once.

## Результат: повний detector

| Метрика | Baseline | ana→ah |
|---|---:|---:|
| cross | 6 | 1 |
| over | 0 | 0 |
| card | 0 | 0 |
| near8 | 0 | 0 |
| dept | 0 | 0 |
| bends | 126 | 118 |
| turns | 126 | 118 |
| excess | 18 | 14 |
| marked | 0 | 0 |
| edges | 50 | 50 |

Дослівні власні diagnostic-рядки (не сторонній матеріал):

```text
A*: cross=6 over=0 card=0 near8=0 dept=0 bends=126 turns=126 excess=18 marked=0 edges=50
A*: cross=1 over=0 card=0 near8=0 dept=0 bends=118 turns=118 excess=14 marked=0 edges=50
```

## Координати

X — центр картки (`x + width/2`), Y — верх.

| Вузол | Baseline X | Baseline Y | ana→ah X | ana→ah Y |
|---|---:|---:|---:|---:|
| ah | 5586 | 548 | 1486 | 1012 |
| da | 5750 | 316 | 1322 | 1244 |
| bi | 5914 | 548 | 1650 | 1244 |
| asst | 4438 | 280 | 4438 | 280 |
| sch | 8046 | 316 | 7390 | 316 |
| ib | 7882 | 548 | 7226 | 548 |
| grd | 8210 | 548 | 7554 | 548 |
| ceo | 4192 | 84 | 3864 | 84 |
| cfo | 1322 | 316 | 1322 | 316 |

Рамка ana: `(x,y,w,h)=(5400,280,700,416) → (1136,976,700,416)`. Fin незмінний: `(-12,280,2668,648)`, низ Y=928. Отже ana починається на 48 px нижче низу fin; ah Y=1012. Поле `tier` вузлів залишається 2: це геометричне опускання, не зміна числового namespace tier.

asst: центр `(4438,280)` незмінний, S1 за критерієм «не зсунувся» збережено. CEO центр `(4192,84) → (3864,84)`, тому горизонтальна відстань asst–CEO збільшилася `246→574`, вертикальна різниця верхів лишилася 196. Не стверджуємо збереження відносного offset або візуального паритету: браузерний огляд не виконувався. Sec head лишився sch; його Y=316 і Y членів=548 незмінні, весь sec змістився на 656 px ліворуч через перепакування.

## Атрибуція пар

Використано той самий production detector `route_stats` на кожній неупорядкованій парі серіалізованих маршрутів (без повторного layout). Порожні boxes/frames впливають лише на card/dept, не на парний cross.

```text
baseline: cfo→ah × ceo→hrd: 1
baseline: cfo→ah × ceo→lgl: 1
baseline: cfo→ah × ceo→sch: 1
baseline: cto→bi × ceo→hrd: 1
baseline: cto→bi × ceo→lgl: 1
baseline: cto→bi × ceo→sch: 1
fix: acc→aud × ceo→da: 1
```

Усі 6 baseline-пар із декартового добутку `{cfo→ah, cto→bi} × {ceo→hrd, ceo→lgl, ceo→sch}` зникли. Новий єдиний перетин: `acc→aud × ceo→da`.

## Вердикт

**УСПІХ за заданим discriminator**: cross 6→1; ana під fin; asst не зсунувся; over/card/near8/dept залишилися 0. Це доказ ефекту конкретного override ana→ah на цьому mock3, не реалізація і не доказ універсальності правила першого оголошеного root. Вхід має ah перед da/bi; автоматичний вибір head не впроваджено. Відносна відстань до CEO змінилася, як зафіксовано вище.

## Перевірки та межі

`cargo test --offline --manifest-path /tmp/dg38-layout-probe/Cargo.toml dg38_head_probe::run_probe -- --nocapture` — exit 0; лише один inline probe, обидва compute_once успішні. `cargo run --offline --manifest-path /tmp/dg38-layout-probe/Cargo.toml --example probe_pairs` — exit 0. Production cargo test, WASM build і deploy не запускалися: production-фіксу немає.

## SHA256 (кінець)

Усі 7 SHA256 збігаються з початковими, включно staff_layout.rs та всіма файлами WASM pkg.

```text
278ab72caa16ec1d91bd942503de2592dc14ff32318ebe30c10f19f670a73b37  packages/core/src/staff_layout.rs
684888c0ebb17f374298b65ee2807526c066094c701bcc7ebbe1c1095f494fc1  packages/sdk/src/wasm/pkg/.gitignore
659f09b49f967878621e800922547b68e08c757cd65bd9d7e71592d9192a9da8  packages/sdk/src/wasm/pkg/org_hierarchy_core.d.ts
46d22bff9ae46206534241a4d96d586bafe011306935d7df198f8122b6aeb11a  packages/sdk/src/wasm/pkg/org_hierarchy_core.js
44e5710e4e8771120d7a8ab2a830771bbadc7a2ea5d08cbc9821c194f0e0273e  packages/sdk/src/wasm/pkg/org_hierarchy_core_bg.wasm
e45e5b5abb7f6093626dcd1a61ed22c9b784a000c6088922544cd01fcad979ca  packages/sdk/src/wasm/pkg/org_hierarchy_core_bg.wasm.d.ts
dc6291b665da03c022a9ec273cb68c2d98d7e7d101a914c2ca9d028395996a99  packages/sdk/src/wasm/pkg/package.json
```

## Прибирання /tmp

Власну /tmp/dg38-layout-probe повністю видалено після перенесення чисел і SHA256 у цей файл. Оригінальний /tmp/ta0-mock3.json збережено. ДАЛІ: probe завершено; production-реалізація потребує окремої задачі.

Службовий checkpoint AI Factory не створено: sandbox заборонив запис поза workspace, а auto-review відхилив escalation через неавторизоване зовнішнє збереження внутрішніх шляхів/стану. Обхід не виконувався. Це не впливає на завершені виміри й цей durable звіт.
