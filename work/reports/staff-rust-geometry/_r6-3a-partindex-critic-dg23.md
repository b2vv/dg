# R6-3a — незалежний критик (Dg23)

Model: claude-opus-4-8

ДАЛІ: читаю рішення-ноту Dg23 + дизайн-ноту R6-dg22, потім звіряю ключові файли.

## ФАКТ (звірено з кодом, снапшот Dg23)

### Контракт part_index
- `StaffNodeGeo`: `id` (types.rs:424), `department_id: Option<String>` (439-442),
  `part_index: Option<u32>` (444-447). ВСІ з `derive(TS)` ts-export → вже в rust-types.ts.
- `StaffDepartmentFrameGeo`: `department_id` (477), `part_index: Option<u32>` (479-482),
  x/y/w/h. **БЕЗ memberIds.** Коментар 466-469: «одна рамка на частину зі спільним departmentId» (R5).
- `StaffOrgCardGeo`: лише `org_id` (458), x/y/w/h. **БЕЗ department_id, БЕЗ part_index** (457-464).
- `StaffEdge`: from_id/to_id/kind (518-524).

### Хто реально нарізає частини — staff_packing.rs (НЕ staffDeptGrouping.ts)
- `pack_departments` (staff_packing.rs:69-125) бере `Vec<DepartmentMembers>`, кожен несе
  `department_id`, `members`, `wrapped`, `part_index` (48-58).
- Pack **штампує** `dept.part_index` на КОЖЕН вузол (103: `part_index: dept.part_index`) **і** на
  рамку (108-114: `department_frame(... dept.part_index)`). Кластеризацію «які посади = частина»
  робить TS (коментар 52-56: «Pack лише штампує цей тег»).
- Кожен `DepartmentMembers` = окремий регіон, що зсуває `cursor_x` (119). Частини НЕ зобов'язані
  бути суміжними — порядок задає TS-вектор `departments`.
- `staffDeptGrouping.ts` (groupStaffByDepartment:44-105) групує по ОДНОМУ bucket на deptId
  (53-57), part_index тут НЕ існує — це v3-arrangement-пас, не продюсер частин.

### prod-TS foreign — per-DEPARTMENT (підтверджено)
- `edgeIntrudesForeignFrame` (staffEdgeGeometry.ts:244-255): `!memberIds.has(from.id) &&
  !memberIds.has(to.id) && polylineHitsBoxInterior(points, frame.rect)`, eps=0.75 (231).
- `staffRouterV2.ts:35-41`: одна рамка на deptId, `rect=unionBoxes(members,8)`,
  `memberIds=Set(positions)`. part_index не впливає.
- probe `throughThirdFrame` (clearance.ts:116-135): per-department через `deptOfNode`+`frame.id`,
  `segRectDistance(...) === 0`.
- probe `cardClearance` (97-113): self-exemption `node.id===edge.fromId||toId`, єдиний id-простір,
  MIN_CLEARANCE_PX=8.

### eps-конвенції РІЗНІ (пастка)
- crossingDetector-порт у Rust: EPS=1e-6 (staff_routes.rs:113).
- interior-hit: eps=0.75 (staffEdgeGeometry.ts:231).
- throughThirdFrame: точне `=== 0` (clearance.ts:127) — у f32 Rust крихке.
- clearance: 8px.

### label_band
- `BoundsOptions.label_band` — вхід (staff_bounds.rs:194); `enrich_namespaces` (135-153) зливає
  його у висоту ns, окремого band-rect на виході НЕМА → для band-як-перешкоди треба окремий вхід.

---

## ВЕРДИКТ

### Q1 — чи модель власника (per-part) узгоджена з Rust-конструктом
ТАК, і сильніше ніж «узгоджена» — вона **вже реалізована в геометрії**. Rust емітить одну рамку
НА ЧАСТИНУ (staff_packing.rs:107-116), і штампує той самий (department_id, part_index) на вузли
(103). Тобто членство «вузол ∈ рамка» = рівність пари (department_id, part_index) — це рівно
groupping-of-construction. per-department union-рамки в Rust НЕ існує взагалі.
Підводний камінь: пара унікальна лише якщо TS-кластеризатор не емітить ДВІ групи з однаковою
(department_id, part_index). Pack не перевіряє унікальність — дублікат дав би дві рамки, у які
один вузол «входить» обома. Це інваріант upstream (TS), не Rust.

### Q2 — A (per-part) проти B (per-department): ВЕРДИКТ A
A коректний. Два незалежні аргументи:
1. **Паритет з тим, що Rust МАЛЮЄ.** Рендер показує per-part рамки (окремі бокси). Test-only вимір
   мусить міряти інтрузію у фізичні бокси, які реально існують. B (членство по department_id,
   ігноруючи part) ПРОПУСТИВ би ребро, що протикає рамку part1, коли обидва кінці в part0 того ж
   department — бо обидва кінці «члени department d». Це рівно кейс власника (decision:36), і це
   недооблік реальної перешкоди.
2. **union-per-department ковтає сусідів.** Частини — окремі регіони в pack (staff_packing.rs:119),
   не зобов'язані бути суміжними (порядок — TS-вектор). Union AABB part0∪part1 покриває все між
   ними, включно з чужими депами-регіонами між частинами → гігантський rect, хибно-свій для ребер,
   що ними йдуть. Я **не можу довести беззастережно**, що частини завжди несуміжні (залежить від
   TS-порядку), тож формулюю умовно: magnetic-розріз МОЖЕ дати несуміжні частини, і тоді union B
   ковтає сусіда. Аргумент 1 не потребує цієї умови — його достатньо для A.

Чи A дає «хибні violations» проти prod-TS? Так, A і prod-TS міряють РІЗНУ геометрію (prod-TS —
одна union-рамка на deptId, part не існує). Але prod-v2 проміжний (видаляється R7, design-dg22:82,
O-41), а детектор має відповідати Rust-виходу, а не відмираючому v2. Тож розходження очікуване й
прийнятне — за умови, що це прямо записано як рішення (інакше хтось звірятиме з v2 і побачить
«регрес»). Членство (A) з парою (department_id, part_index) КОРЕКТНО звільняє рамку, що містить
кінець ребра (part1 звільнена для ребра part0→part1, бо to.part_index=1).

### Q3 — чи (department_id, part_index) достатньо для ідентичності; вузли без part_index; org-картки
- Достатньо, з інваріантом унікальності пари (Q1). Членство ВИВОДИТЬСЯ (memberIds нема), але вивід
  точний, бо pack штампує рамку й вузли з одного джерела (staff_packing.rs:103 vs 108-114).
- Вузли БЕЗ part_index: ТАК — цілий (нерозрізаний) відділ → part_index=None на вузлах і рамці
  (staff_packing default; тест single_member_frame:157). Також no-dept (wrapped=false) → рамки нема,
  department_id може бути None (439 Option). None==None має рахуватись збігом (ціла рамка d, part=None
  ↔ її вузли part=None) — реалізувати як рівність Option, а не «None≠None».
- Org-картки: `StaffOrgCardGeo` НЕ має ні department_id, ні part_index (457-464). Ребро person→org
  (to_id==org_id) — org-кінець НЕ член жодної рамки, тож усі рамки йому «чужі»; self-exemption
  мусить спрацювати з БОКУ person. У єдиному lookup org-вузол keyed by org_id — інший id-простір,
  ніж person.id (P-B). Треба підтвердити, що ребро справді цілить to_id==org_id (design-dg22:206).

### Q4 — «суфікс для React key»: контракт чи TS-деталь
part_index УЖЕ у вихідному контракті (StaffNodeGeo:444, StaffDepartmentFrameGeo:479, обидва
derive(TS)) — ще з R3/R5. R6-3a нічого не додає в ts-rs і НЕ тригерить regen. React-key-суфікс
(склеювання department_id+part_index у рядок-ключ) — TS-адаптерна деталь рендеру на R7, не
Rust-контракт. Детектори — #[cfg(test)] (design-dg22:214), членство з уже-експортованих полів.
**R6-3a не змінює публічний/межовий контракт.** (Застереження: якщо колись part_index знадобиться
НЕ-optional або з'явиться окреме поле членства — то вже зміна контракту; зараз ні.)

### Q5 — пастки детектора як test-only виміру (path:line)
- **P1 eps-зоопарк.** crossing 1e-6 (staff_routes.rs:113), interior 0.75 (staffEdgeGeometry.ts:231),
  throughThirdFrame `===0` (clearance.ts:127), clearance 8px. Порт `==0.0` у f32 бреше (дистанція
  рідко точно 0). Обрати свідомо: foreign-frame = interior-hit з eps-паритетом 0.75, НЕ `==0`.
- **P2 єдиний id-простір / self-exemption** (P-B дизайну). person.id vs org_id vs department_id —
  три простори в одному lookup; колізія ключів дала б хибне звільнення. Keyed-by-id має бути
  провалідований на унікальність.
- **P3 унікальність (department_id, part_index)** (Q1) — pack не гарантує, інваріант TS.
- **P4 None-членство.** Рівність Option (ціла рамка part=None ↔ вузли part=None), не «None≠None».
- **P5 перешкоди змішані за LOD** (P-C дизайну): persons/orgs shrink'аться per-LOD, рамки/band
  LOD-інваріантні — detector має брати бокси того ж LOD, що й маршрут, інакше вимір неспівставний.
- **P6 детермінований порядок** перешкод і violations (категоріальні асерти N, не плаваючі числа;
  фікстури ДАЛЕКО від 8px-порога — design-dg22:214).
- **P7 obstacle-розгортання figma-row** (design-dg22:214): rust-перешкода має розгорнути
  figma-row obstacle так само, як TS (інакше near-вимір розійдеться).
- **P8 дискримінація, не тавтологія** (critic-dg22 правка 1): детектор-тести на РУЧНИХ полілініях
  (інтрузія→N>0, чиста→0), ОКРЕМО від інтеграц-тестів. НЕ годувати вихід staff_routes у детектор з
  асертом ==0 (ще нема обходу — брехня) чи >0 (слабко). Інакше це «assert true without feature».

---

## НА ПІДТВЕРДЖЕННЯ ВЛАСНИКУ
1. Прийняти **A (per-part)** як модель членства foreign-frame детектора; членство = рівність пари
   (department_id, part_index), Option-aware. Зафіксувати, що детектор свідомо міряє Rust-per-part,
   НЕ prod-v2-per-department, і розходження з v2 — не регрес (v2 відмирає R7).
2. Підтвердити інваріант upstream: TS-кластеризатор емітить УНІКАЛЬНУ пару (department_id,
   part_index) на кожну групу/рамку (pack це не стереже).
3. Підтвердити, що person→org ребро цілить to_id==org_id і org-кінець коректно не-член усіх рамок.
4. Погодити eps-політику (foreign-frame = interior-hit 0.75, НЕ f32 `==0`).
5. Підтвердити, що R6-3a лишається test-only (#[cfg(test)]), контракт/regen не чіпає — part_index
   уже експортований, React-key-суфікс = TS-деталь R7.
