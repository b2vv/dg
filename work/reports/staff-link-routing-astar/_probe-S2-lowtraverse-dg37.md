ДАЛІ: відтворити baseline, перебудувати повні кандидати й перевірити всі ребра; прибрати probe.

## Початок ізольованого доказу — 2026-10-31

HEAD `72008bed56f5162564a0de719c38b65fc80a058e`. Автор — Codex. Scope: лише тимчасовий example та цей append-only звіт; production-код не змінюється. Вхід `/tmp/ta0-mock3.json`, near/useAstar/treeBlockLayout/deptGrouping. П’ять наявних untracked аналітичних файлів залишаються недоторканими. Додаткові продуктові рішення, npm, commit/push/worktree не потрібні. Читання staff_router/staff_routes — пряме, без графа.

## 1. Зроблено та вердикт

**Ні: low_traverse НЕ доводить 6→0. Допустимий результат — 6→6, без нових порушень, оскільки кандидат відхилено (no-op). Напрям S2 у запропонованій формі для цього snapshot не підтверджений для вплітання.** Це не доказ неможливості всіх інших маршрутів/інших підходів до смуги.

Ізольований Rust example викликав `compute_staff_geometry`, серіалізував реальну сцену й перевірив усі **50 ребер / 1225 unordered пар**, не лише шість відомих перетинів. Другий прохід читав цю незмінену серіалізацію. Продакшн не редагувався. Детектор — точна текстова репліка `staff_router.rs` від `MIN_CLEARANCE_PX` до кінця `route_stats_detailed`, із прямим підключенням незміненого `staff_geom.rs`. `proper_cross` має eps=0.5 та strict interior; overlap звільняє лише same-manager; card/near/dept — ті самі production-примітиви. Для near без dockHints і без orgCards бокси точно дорівнюють вузлам (обидві передумови перевірені assert). Додатково скопійовані `dept_ok`/`edge_hits` перевіряли margin, заголовок і ролі source/target: звичайний detector не контролює власну рамку.

Вибір ребер програмний: admin, обидва кінці мають різні `(department, part)`, найвища горизонталь вище `target_frame.y−14`, є proper-cross з іншим ребром. Вибрано рівно `cfo→ah`, `cto→bi`. Немає селектора за цими ID. `cto→ib` має високий traverse, але не має baseline proper-cross, тому не перебудовується; повний detector враховує його, включно з новими перетинами.

## 2. Протестовані сценарії та повна detector-таблиця

| Сценарій (Y cfo / cto) | cross | over | card | near8 | dept | true_turns | excess | diagonal | edges |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline | 6 | 0 | 0 | 0 | 0 | 120 | 16 | 0 | 50 |
| Low-traverse + capacity guard (no-op) | 6 | 0 | 0 | 0 | 0 | 120 | 16 | 0 | 50 |
| Зайнята/порожня смуга (no-op) | 6 | 0 | 0 | 0 | 0 | 120 | 16 | 0 | 50 |
| Low-traverse + перевірка перешкод (no-op) | 6 | 0 | 0 | 0 | 0 | 120 | 16 | 0 | 50 |
| Примусово 274 / 282, **відхилений** | 12 | 0 | 0 | 0 | 3 | 120 | 16 | 0 | 50 |
| Примусово 282 / 274, **відхилений** | 12 | 0 | 0 | 0 | 2 | 120 | 16 | 0 | 50 |
| Смуга зі старого припущення 294 / 302, **відхилений** | 9 | 0 | 0 | 0 | 5 | 120 | 16 | 0 | 50 |
| Контроль над віялом 250 / 258, **регресія** | 15 | 0 | 0 | 0 | 0 | 120 | 16 | 0 | 50 |

Скан Y=274..302 з кроком 0.5 px для обох ребер, відстань lanes ≥8: **1722 комбінації, 0 допустимих, min raw cross=9**. Це скан сімейства кандидатів зі збереженими підходами, не глобальний перебір усіх ортогональних шляхів. Перестановка двох доріжок не рятує.

Окремий негативний тест: додаткова чужа рамка `probe-blocker=(5500,230,500,40)` блокує контрольний traverse y=250. Для обох ребер validator повертає оригінал; **2/2 byte-identical** за серіалізацією, ребра не губляться. Capacity guard так само повертає всі 50 маршрутів byte-identical при недостатній ширині. Це перевірка fallback probe, не нова здатність production-роутера.

## 3. Неочікуване: початкова діагностика переплутала bbox карток і рамку

На точному дозволеному вході `/tmp/ta0-mock3.json`, HEAD `72008be`, `contentPadding=36`:

- fin: фактична рамка **x=−12..2656, y=280..928**; bbox її карток x=24..2620, y=316..892;
- ana: фактична рамка **x=5400..6100, y=280..696**; bbox карток x=5436..6064, y=316..660;
- sal/dev/hr/leg/sec також починаються на **280**, не 316.

`department_frames_from_nodes` розширює bbox карток на contentPadding. Саме ці розширені рамки отримує роутер. Тому наведена в `_diag-detour-dg37.md` «вільна смуга над рамками 316» — не вільна смуга над production-рамками цього входу. Попередні аналітичні файли не редагував; цей доказ перекриває їхнє припущення для зазначеного snapshot.

Нижня границя потрібної смуги: **266+8=274** (нижче fan, 8 px відступ). Верхня дозволена: **280−14=266** (FRAME_MARGIN). Інтервал **[274,266] порожній**: місткість **0 доріжок при N=2**, навіть одна не вміщується. Для двох центрів із кроком 8 потрібно щонайменше 8 px доступного діапазону. Навіть заміна margin14 на 8 дала б верх 272, нижче необхідних 274. Товщина штриха могла б лише звузити цей інтервал; вона не змодельована окремо.

Це не питання підбору k: якщо записати band як `[target.y−k,target.y−14]`, жоден k не створить точок, що водночас нижче fan+8. Для старого уявного frame.top=316 lanes294/302 здавалися припустимими; реально вони вже всередині рамок/заголовків.

## 4. Повна форма кандидата й застереження

Чиста функція копіює весь маршрут, знаходить найвищу горизонталь, міняє Y обох її кінців і тим самим перебудовує обидві суміжні вертикалі. Зберігаються перевірені source-exit prefix, target-entry column та справжній кінцевий порт. **Кожен повний кандидат заново перевіряється**, а не лише горизонталь; недопустимі кандидати вище — негативний контроль, не прийняті маршрути.

```rust
fn candidate(route: &StaffEdgeRoute, y: f32) -> StaffEdgeRoute {
    let mut next = route.clone();
    let i = highest_horizontal_segment(route);
    next.points[i].y = y;
    next.points[i + 1].y = y;
    next
}
```

Буквальна форма «низ картки → вертикаль униз до нижньої смуги» тут неможлива: обидва source-bottom мають **y=428**, а смуга мусила б бути над y=280. Потрібен збережений deptBottom-вихід, зовнішній підйом і traverse. Прямий підйом з source-column перетнув би власну картку/заголовок і порушив фазу виходу. Не підмінював це нелегальним коротким шляхом.

`cfo→ah`: start=(1322,428), зовнішній підйом x=−26, old traverse y=76, target=(5586,280), endsOnDeptTop=true.
`cto→bi`: start=(5012,428), зовнішній підйом x=8410, old traverse **y=243**, не 76, target=(5914,548). bi не голова: маршрут проходить deptTop, але закінчується на cardTop. Завершувати його на рамці означало б обрізати реальне ребро.

Чужі рамки при примусовому old-band294/302: `cfo→ah` прорізає **sal/dev**, `cto→bi` — **hr/leg/sec**. Додатковий role-aware validator знаходить по 4 недопустимі segment×frame перевірки в кожному маршруті, включно з margin/header. Навіть y274, де detector ще не бачить проникнення в interior, порушує 14px margin. `dept=0` саме по собі недостатнє для прийняття.

Безпечний результат залишає рівно шість старих пар (по одному перетину):

| Ребро 1 | Ребро 2 | До | Після guard |
|---|---|---:|---:|
| cfo→ah | ceo→hrd | 1 | 1 |
| cfo→ah | ceo→lgl | 1 | 1 |
| cfo→ah | ceo→sch | 1 | 1 |
| cto→bi | ceo→hrd | 1 | 1 |
| cto→bi | ceo→lgl | 1 | 1 |
| cto→bi | ceo→sch | 1 | 1 |

Між самими cfo→ah та cto→bi нових proper-cross у виміряних варіантах немає. Але опущений cfo-traverse перетинає ceo-стовбур/відгалуження до asst/cfo/cco/cto/da, а cto-traverse — гілки sec та, залежно від Y, незмінене cto→ib. У raw old-band294/302 лишаються/виникають: ceo→asst × cfo→ah (1), ceo→cto × cfo→ah (2), ceo→da × cfo→ah (3), ceo→sch × cto→bi (3) = **9**. Повний перелік для всіх прогонів нижче.

## 5. Верифікація та межі доказу

- `cargo run --offline --example s2_low_probe` із `packages/core`: exit 0, отримано реальні compute_staff_geometry routes, baseline точний.
- Фінальний `cargo run --offline --manifest-path packages/core/Cargo.toml --example s2_low_probe`: exit 0; усі asserts та скан 1722 комбінацій пройшли.
- Початковий запуск cargo з кореня без manifest-path: exit101 (немає Cargo.toml). Проміжний селектор «найдовша горизонталь» дав assert1≠2: для cto він вибирав нижній y942. Виправлений селектор «найвища горизонталь» програмно знайшов обидва ребра. Ці невдалі запуски не є PASS.
- Вхід SHA256: `a433fc142a9a5db9c269197b37f53227038e1074aaebdf014c35b8a5e6ce023d`.
- Серіалізована реальна геометрія SHA256: `98a1e10eca9a01eb537b6b177f09df7a6e5845b194fabc7046d6c08fe9b79046`.
- Фінальний тимчасовий probe SHA256 перед видаленням: `ca19c53a216158065b5dce2af697bb18afeac8525e59ad4137ac19005f936f50`.
- Не перевірялися інші mock/LOD, інший contentPadding, змінений layout, глобальне перепланування підходів або перестановка департаментів. Незалежного reviewer немає. Повна Rust-suite не запускалась: production-код не змінювався.

## 6. Наступний крок

**Не вплітати S2 на підставі попередньої «вільної смуги».** Спочатку потрібен новий дизайн доступного коридору/підходів або зміна геометрії з окремим доказом. Цей probe не санкціонує послаблення margin, обрізання bi на deptTop, вихід через source-header чи layout-реордер.

Post-deploy: N/A — це ізольований доказ; нічого не впроваджено й не задеплоєно.

## Сирий фінальний вивід (durable evidence)

```text
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.48s
     Running `packages/core/target/debug/examples/s2_low_probe`
TABLE baseline: cross=6 over=0 card=0 near=0 dept=0 turns=120 excess=16 diagonal=0 edges=50
CROSS baseline cfo->ah / ceo->hrd n=1
CROSS baseline cfo->ah / ceo->lgl n=1
CROSS baseline cfo->ah / ceo->sch n=1
CROSS baseline cto->bi / ceo->hrd n=1
CROSS baseline cto->bi / ceo->lgl n=1
CROSS baseline cto->bi / ceo->sch n=1
SELECT cfo->ah frame_top=280 start=Some(StaffRoutePoint { x: 1322.0, y: 428.0 }) end=Some(StaffRoutePoint { x: 5586.0, y: 280.0 }) traverse=[StaffRoutePoint { x: -26.0, y: 76.0 }, StaffRoutePoint { x: 5586.0, y: 76.0 }]
SELECT cto->bi frame_top=280 start=Some(StaffRoutePoint { x: 5012.0, y: 428.0 }) end=Some(StaffRoutePoint { x: 5914.0, y: 548.0 }) traverse=[StaffRoutePoint { x: 8410.0, y: 243.0 }, StaffRoutePoint { x: 5914.0, y: 243.0 }]
BAND lower=274 upper=266 lanes=0 N=2
TABLE guarded_low: cross=6 over=0 card=0 near=0 dept=0 turns=120 excess=16 diagonal=0 edges=50
CROSS guarded_low cfo->ah / ceo->hrd n=1
CROSS guarded_low cfo->ah / ceo->lgl n=1
CROSS guarded_low cfo->ah / ceo->sch n=1
CROSS guarded_low cto->bi / ceo->hrd n=1
CROSS guarded_low cto->bi / ceo->lgl n=1
CROSS guarded_low cto->bi / ceo->sch n=1
TABLE occupied_noop: cross=6 over=0 card=0 near=0 dept=0 turns=120 excess=16 diagonal=0 edges=50
CROSS occupied_noop cfo->ah / ceo->hrd n=1
CROSS occupied_noop cfo->ah / ceo->lgl n=1
CROSS occupied_noop cfo->ah / ceo->sch n=1
CROSS occupied_noop cto->bi / ceo->hrd n=1
CROSS occupied_noop cto->bi / ceo->lgl n=1
CROSS occupied_noop cto->bi / ceo->sch n=1
TABLE obstacle_guard: cross=6 over=0 card=0 near=0 dept=0 turns=120 excess=16 diagonal=0 edges=50
CROSS obstacle_guard cfo->ah / ceo->hrd n=1
CROSS obstacle_guard cfo->ah / ceo->lgl n=1
CROSS obstacle_guard cfo->ah / ceo->sch n=1
CROSS obstacle_guard cto->bi / ceo->hrd n=1
CROSS obstacle_guard cto->bi / ceo->lgl n=1
CROSS obstacle_guard cto->bi / ceo->sch n=1
SYNTHETIC third-frame blocked: 2/2 unchanged, no drops
TABLE forced_274_282: cross=12 over=0 card=0 near=0 dept=3 turns=120 excess=16 diagonal=0 edges=50
CROSS forced_274_282 ceo->asst / cfo->ah n=1
CROSS forced_274_282 ceo->cfo / cfo->ah n=1
CROSS forced_274_282 ceo->cco / cfo->ah n=1
CROSS forced_274_282 ceo->cto / cfo->ah n=3
CROSS forced_274_282 cfo->ah / ceo->da n=3
CROSS forced_274_282 cto->bi / ceo->sch n=3
FOREIGN forced_274_282 cto->bi hr
FOREIGN forced_274_282 cto->bi leg
FOREIGN forced_274_282 cto->bi sec
ROLE_BAD forced_274_282 cfo->ah 4
ROLE_BAD forced_274_282 cto->bi 4
TABLE forced_282_274: cross=12 over=0 card=0 near=0 dept=2 turns=120 excess=16 diagonal=0 edges=50
CROSS forced_282_274 ceo->asst / cfo->ah n=1
CROSS forced_282_274 ceo->cto / cfo->ah n=2
CROSS forced_282_274 cfo->ah / ceo->da n=3
CROSS forced_282_274 cto->bi / ceo->hrd n=1
CROSS forced_282_274 cto->bi / ceo->lgl n=1
CROSS forced_282_274 cto->bi / ceo->sch n=3
CROSS forced_282_274 cto->bi / cto->ib n=1
FOREIGN forced_282_274 cfo->ah sal
FOREIGN forced_282_274 cfo->ah dev
ROLE_BAD forced_282_274 cfo->ah 4
ROLE_BAD forced_282_274 cto->bi 4
TABLE old_claim_294_302: cross=9 over=0 card=0 near=0 dept=5 turns=120 excess=16 diagonal=0 edges=50
CROSS old_claim_294_302 ceo->asst / cfo->ah n=1
CROSS old_claim_294_302 ceo->cto / cfo->ah n=2
CROSS old_claim_294_302 cfo->ah / ceo->da n=3
CROSS old_claim_294_302 cto->bi / ceo->sch n=3
FOREIGN old_claim_294_302 cfo->ah sal
FOREIGN old_claim_294_302 cfo->ah dev
FOREIGN old_claim_294_302 cto->bi hr
FOREIGN old_claim_294_302 cto->bi leg
FOREIGN old_claim_294_302 cto->bi sec
ROLE_BAD old_claim_294_302 cfo->ah 4
ROLE_BAD old_claim_294_302 cto->bi 4
TABLE above_fan_250_258: cross=15 over=0 card=0 near=0 dept=0 turns=120 excess=16 diagonal=0 edges=50
CROSS above_fan_250_258 ceo->asst / cfo->ah n=1
CROSS above_fan_250_258 ceo->cfo / cfo->ah n=1
CROSS above_fan_250_258 ceo->cco / cfo->ah n=1
CROSS above_fan_250_258 ceo->cto / cfo->ah n=1
CROSS above_fan_250_258 cfo->ah / ceo->da n=1
CROSS above_fan_250_258 cfo->ah / ceo->hrd n=2
CROSS above_fan_250_258 cfo->ah / ceo->lgl n=2
CROSS above_fan_250_258 cfo->ah / ceo->sch n=2
CROSS above_fan_250_258 cto->bi / ceo->hrd n=1
CROSS above_fan_250_258 cto->bi / ceo->lgl n=1
CROSS above_fan_250_258 cto->bi / ceo->sch n=1
CROSS above_fan_250_258 cto->bi / cto->ib n=1
ROLE_BAD above_fan_250_258 cfo->ah 0
ROLE_BAD above_fan_250_258 cto->bi 0
SWEEP y274..302 step0.5 spacing>=8: total=1722 legal=0 min_raw_cross=9
```

### Реальна геометрія початкового виклику

```text
   Compiling org-hierarchy-core v0.1.0 (/Users/strelia/projects/dg/packages/core)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 1.55s
     Running `target/debug/examples/s2_low_probe`
DIAG ["A*: cross=6 over=0 card=0 near8=0 dept=0 bends=120 turns=120 excess=16 marked=0 edges=50"]
ROUTE cfo acc [StaffRoutePoint { x: 1322.0, y: 428.0 }, StaffRoutePoint { x: 1322.0, y: 488.0 }, StaffRoutePoint { x: 502.0, y: 488.0 }, StaffRoutePoint { x: 502.0, y: 548.0 }]
ROUTE cfo fan [StaffRoutePoint { x: 1322.0, y: 428.0 }, StaffRoutePoint { x: 1322.0, y: 488.0 }, StaffRoutePoint { x: 1650.0, y: 488.0 }, StaffRoutePoint { x: 1650.0, y: 548.0 }]
ROUTE cfo trs [StaffRoutePoint { x: 1322.0, y: 428.0 }, StaffRoutePoint { x: 1322.0, y: 488.0 }, StaffRoutePoint { x: 2306.0, y: 488.0 }, StaffRoutePoint { x: 2306.0, y: 548.0 }]
ROUTE cfo eco [StaffRoutePoint { x: 1322.0, y: 428.0 }, StaffRoutePoint { x: 1322.0, y: 488.0 }, StaffRoutePoint { x: 1158.0, y: 488.0 }, StaffRoutePoint { x: 1158.0, y: 548.0 }]
ROUTE cfo ctl [StaffRoutePoint { x: 1322.0, y: 428.0 }, StaffRoutePoint { x: 1322.0, y: 488.0 }, StaffRoutePoint { x: 830.0, y: 488.0 }, StaffRoutePoint { x: 830.0, y: 548.0 }]
ROUTE cto tlb [StaffRoutePoint { x: 5012.0, y: 428.0 }, StaffRoutePoint { x: 5012.0, y: 488.0 }, StaffRoutePoint { x: 4930.0, y: 488.0 }, StaffRoutePoint { x: 4930.0, y: 548.0 }]
ROUTE cto tlf [StaffRoutePoint { x: 5012.0, y: 428.0 }, StaffRoutePoint { x: 5012.0, y: 488.0 }, StaffRoutePoint { x: 5258.0, y: 488.0 }, StaffRoutePoint { x: 5258.0, y: 548.0 }]
ROUTE cfo ah [StaffRoutePoint { x: 1322.0, y: 428.0 }, StaffRoutePoint { x: 1322.0, y: 488.0 }, StaffRoutePoint { x: 8.0, y: 488.0 }, StaffRoutePoint { x: 8.0, y: 942.0 }, StaffRoutePoint { x: -26.0, y: 942.0 }, StaffRoutePoint { x: -26.0, y: 76.0 }, StaffRoutePoint { x: 5586.0, y: 76.0 }, StaffRoutePoint { x: 5586.0, y: 280.0 }]
ROUTE cto bi [StaffRoutePoint { x: 5012.0, y: 428.0 }, StaffRoutePoint { x: 5012.0, y: 488.0 }, StaffRoutePoint { x: 5100.0, y: 488.0 }, StaffRoutePoint { x: 5100.0, y: 772.0 }, StaffRoutePoint { x: 5428.0, y: 772.0 }, StaffRoutePoint { x: 5428.0, y: 942.0 }, StaffRoutePoint { x: 8410.0, y: 942.0 }, StaffRoutePoint { x: 8410.0, y: 243.0 }, StaffRoutePoint { x: 5914.0, y: 243.0 }, StaffRoutePoint { x: 5914.0, y: 548.0 }]
ROUTE cto ib [StaffRoutePoint { x: 5012.0, y: 428.0 }, StaffRoutePoint { x: 5012.0, y: 488.0 }, StaffRoutePoint { x: 5100.0, y: 488.0 }, StaffRoutePoint { x: 5100.0, y: 772.0 }, StaffRoutePoint { x: 5428.0, y: 772.0 }, StaffRoutePoint { x: 5428.0, y: 942.0 }, StaffRoutePoint { x: 8410.0, y: 942.0 }, StaffRoutePoint { x: 8410.0, y: 243.0 }, StaffRoutePoint { x: 7882.0, y: 243.0 }, StaffRoutePoint { x: 7882.0, y: 280.0 }]
FRAME StaffDepartmentFrameGeo { department_id: "fin", part_index: None, x: -12.0, y: 280.0, width: 2668.0, height: 648.0 }
FRAME StaffDepartmentFrameGeo { department_id: "sal", part_index: None, x: 3104.0, y: 280.0, width: 700.0, height: 416.0 }
FRAME StaffDepartmentFrameGeo { department_id: "dev", part_index: None, x: 4580.0, y: 280.0, width: 864.0, height: 648.0 }
FRAME StaffDepartmentFrameGeo { department_id: "ana", part_index: None, x: 5400.0, y: 280.0, width: 700.0, height: 416.0 }
FRAME StaffDepartmentFrameGeo { department_id: "qa", part_index: None, x: 4662.0, y: 976.0, width: 700.0, height: 416.0 }
FRAME StaffDepartmentFrameGeo { department_id: "hr", part_index: None, x: 6056.0, y: 280.0, width: 1028.0, height: 648.0 }
FRAME StaffDepartmentFrameGeo { department_id: "leg", part_index: None, x: 7040.0, y: 280.0, width: 700.0, height: 416.0 }
FRAME StaffDepartmentFrameGeo { department_id: "mkt", part_index: None, x: 2612.0, y: 744.0, width: 1028.0, height: 416.0 }
FRAME StaffDepartmentFrameGeo { department_id: "lgs", part_index: None, x: 3596.0, y: 744.0, width: 700.0, height: 648.0 }
FRAME StaffDepartmentFrameGeo { department_id: "sec", part_index: None, x: 7696.0, y: 280.0, width: 700.0, height: 416.0 }
```

## Завершення / прибирання

Тимчасовий example, його власні build-artifacts і створені цією сесією `/tmp/s2-low-*` видалені. Вхід `/tmp/ta0-mock3.json` збережений. `git diff --exit-code` = 0; фінальний status містить лише п’ять початкових untracked файлів та цей новий звіт. Єдина додана зміна сесії — робочий файл. Commit/push/worktree/npm не виконувались.

ДАЛІ: доказ завершений; S2 у запропонованій формі НЕ підтверджено. Результат допустимого low_traverse: **cross 6→6**, over/card/near/dept **0/0/0/0**. Смуга **0 lanes / потрібно 2**. Для наступного експерименту потрібна нова геометрична гіпотеза.
