# Критик-ПЕРЕД LAYOUT-слайс (dg38) — пастки + звірка гіпотез + дизайн probe

ДАЛІ: читаю _emulation-mockup-vs-ours-dg37.md, _probe-ana-reorder-dg37.md, mock3Shps.ts (DEPTS/POS), pack_tree_block (staff_layout.rs ~733+) — звіряю суперечність Q1 (перший-оголошений root vs sec→dev).

## ФАКТИ (код + дані, path:line)

- `admin_parent_map` (staff_layout.rs:120) `parents.insert(to,from)` — **LAST-WINS**. reportLines mock3 (mock3Shps.ts:144-147) для `da`: спершу `ah→da` (p), потім `ceo→da` (p2) → **parents[da]=ceo**. Тому da трактується як root відділу ana (ceo поза ana).
- Member-порядок у bucket (staff_layout.rs:600-628) = `comparePositions`: (parent null-first, **за parent-id**, order, id). У mock3 positions мають order=None (mock3Shps.ts не ставить `order` на посади) → усе 0, тож домінує сорт за parent-id. Для ana: da(ceo) < ah(cfo) < bi(cto) → **перший member = da**.
- root-find (staff_layout.rs:781-789) бере ПЕРШИЙ member, чий parent поза member_ids → для ana це da → **head=da → ana чіпляється до ceo** (baseline cross=6). Для sec: sch(ceo) перший → head=sch → sec під ceo.
- `head_override` (staff_layout.rs:790-795) — читає geom.head_override[dept_id]; заповнюється лише parent-eval-кодом (flag тепер OFF → порожньо). ГОТОВИЙ ГАК для probe.

## Q1 — ОДНОЗНАЧНЕ ПРАВИЛО (суперечність ЗНЯТО)

Емуляція і probe НЕ суперечать — вони міряли РІЗНІ геометрії:
- **Емуляція** міряла geometrію МОКАПА (його координати + його det/ast-routing) → cross=0.
- **Probe** міряв НАШУ геометрію (ті самі дані, але наш all-A* routing) → ana→fin дає cross=**1** (не 0).
Розбіжність — від ROUTING (мокап резервує ієрархію det-елбоу першими), НЕ від layout. Шар layout у обох однаковий.

**Правило мокапа (для layout-слайсу):** head мульті-джерельного деп = член, що йде ПЕРШИМ у порядку оголошення POS,
чий ПЕРВИННИЙ (p, не p2-last-wins) admin-батько поза департаментом.
- ana: POS-порядок ah(76)→da(77)→bi(78); ah первинно під cfo(поза ana) → **head=ah → ana під fin (cfo-блок)**.
- sec: sch(98)→ib(99); sch під ceo → **head=sch → sec під ceo (БЕЗ ЗМІН від baseline)**.

**Еквівалентність «перший-оголошений root» ↔ «sec→dev»: НІ.** «sec→dev» (cross=0, turns=140) — це НЕ правило мокапа,
а опортуністичний brute-force хак (sec's ДРУГИЙ root ib→cto→dev), уже відхилений власником. Правило мокапа лишає sec під ceo.

**ОЧІКУВАНИЙ ЕФЕКТ layout-слайсу САМОГО ПО СОБІ: cross 6→~1, turns 126→~116, cfo→ah коротка.** НЕ 0.
Останній 1 перетин (acc→aud × ceo→da) + рівність ліній → routing-слайс (det/ast), крок 3. Це треба чесно донести —
layout-слайс сам НЕ дає cross=0; хто цього очікує (бо «мокап=0») помиляється щодо причини.

Дві зміни проти поточного коду:
1. **Порядок вибору root = POS-декларація** (оригінальний індекс у positions-слайсі), НЕ comparePositions (parent-id).
2. **Root-детект за ПЕРВИННИМ parent** (щоб da з p2=ceo не був фантом-root). У ana ah і так передує da в POS, тож
   пункт 1 вирішальний; пункт 2 — коректність на загальний випадок.

## Q2 — ПАСТКИ (path:line)

- **T1 last-wins parents:** `parents[da]=ceo` — якщо залишити, da лишається кандидатом-root. Root-детект має брати первинний p.
  Але оскільки POS-порядок ставить ah перед da, head=ah навіть із last-wins. РИЗИК НИЗЬКИЙ, але правило описати коректно.
- **T2 member-порядок ≠ POS:** bucket у comparePositions-порядку (600-628). «Перший-оголошений» вимагає ОРИГІНАЛЬНОГО
  positions-індексу (positions-слайс у POS-порядку; order=None не розрізняє). Імплементація мусить захопити declaration-index
  ДО сортування. ГОЛОВНА пастка.
- **T3 head_override:** лишити гак (790-795) як борг; нове правило = ДЕФОЛТНЕ обчислення root_id (781-789). Не видаляти override.
- **T4 attach_x (869-874):** з head=ah → parents[ah]=cfo, cfo у fin-блоці → attach_x=cfo.x (скінченний). OK. (Контраст: старий
  механічний probe тримав head=da, attach_x=∞ — тому його числа лише орієнтовні.)
- **T5 pack_tree_block unit-тести (5, слайс B):** синтетичні, навряд чіпають mock3-ana, але зміна root-вибору може зачепити
  head-залежні асерти — перевірити/оновити.
- **T6 cycle-guard (833-859):** ana під fin циклу не створює (ana лист). Гард лишається, no-op.
- **T7 stamp dept_id, T8 recenter/pin, T9 router-membership:** від зміни head НЕ залежать (емісія/uniform-shift/department_id).
- **T10 S1+T-S (committed c7aed85/72008be):** singleton asst-розміщення активне (flag OFF гасить лише parent-eval). Layout-слайс
  НЕ має регресувати asst — probe має це підтвердити (asst лишається біля ceo).
- **Golden/flag:** pack_tree_block працює лише під tree_block_layout (mock3-only); detour-golden mock3 виключає. НОВОГО прапора
  НЕ треба — це корекція коректності tree-block шляху (правило мокапа), не хак. Фінальне рішення по прапору — координатор/власник.

## Q3 — ДИЗАЙН PROBE (дискримінаційний, node/Rust, НЕ браузер)

**Мінімальний probe через ІСНУЮЧИЙ гак head_override (без реімплементації):**
1. /tmp-копія packages/core (як у _probe-ana-reorder). Вхід — той самий `/tmp/ta0-mock3.json` (або відтворити з mock3Shps).
2. Прогнати compute_staff_geometry з `geom.head_override = {"ana":"ah"}` (parent-eval OFF, tree_block ON, deptGrouping ON).
   sec НЕ чіпати (його head вже sch). Це ТОЧНО тестує правило «ana head=ah → ana під fin», причому head=ah ПРАВИЛЬНО
   (attach_x від cfo), не механічний reparent.
3. Міряти ПОВНИЙ production route_stats: cross/over/card/near/dept + turns/excess + координати ana (центр X, верх Y) + asst.
4. Витягти пари-перетини (як probe р.52-61) — підтвердити, що 6 {cfo→ah,cto→bi}×{ceo→hrd/lgl/sch} зникли.

**Критерій УСПІХУ (discriminator):** cross 6→~1 (НЕ 6→6), ana Y опускається під fin (≈976), cfo→ah коротшає,
asst лишається біля ceo (S1 не регресує), sec під ceo. 
**Критерій ПРОВАЛУ:** cross лишається ≥4, АБО з'являються over/card/near/dept, АБО asst зсувається — тоді правило або
інтеграція через head_override хибні.
**Контроль:** також зняти baseline (head_override порожній) у ТОМУ Ж прогоні — має дати cross=6 (звірка з 72008be).

## БЛОКЕР СТАРТУ: НЕМАЄ

Правило однозначне (Q1). Пастки керовані (T2 — головна, вирішується захопленням declaration-index). 
⚠️ КЛЮЧОВЕ ЗАСТЕРЕЖЕННЯ для власника/координатора: **layout-слайс сам дає cross≈1, НЕ 0.** cross=0 І рівні лінії —
лише РАЗОМ із routing-слайсом (det/ast, крок 3). Не очікувати 0 від самого layout; не піддатись спокусі «догнати 0»
хаком (sec→dev) — це відхилений шлях. Probe підтвердить ~1 перед інтеграцією.
