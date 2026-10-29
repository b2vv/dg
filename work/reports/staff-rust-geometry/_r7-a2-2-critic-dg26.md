# R7 A2.2 критик (перед зрізом) — Dg26

Модель: claude-opus-4-8

ДАЛІ: читаю оракул `staffEdgeGeometry.ts` (classify :320-410, horizontalPolyline :181-209, verticalPolyline :129-175), план A2.2 (`_r7-a2-plan-dg26.md`), і весь `packages/core/src/staff_routes.rs` з A2.1. Пресую дизайн по 7 пунктах завдання.

ФАКТ: прочитано staff_routes.rs (1266 рядків, з A2.1 clean-path :460-486), staffEdgeGeometry.ts (оракул), план A2.2 (:24-30).

Ключова структура A2.1 (:460-486): ladder-а НЕМА. Для avoid-гілки — `if idx.clear_of(base) && !foreign_frame_blocks(base) → base else detour_edge`. Тобто А2.1 для БУДЬ-ЯКОГО ребра: base чистий → base; інакше → detour (вертикало-центричний). Жодної H-альтернативи перед detour. Це база, проти якої A2.2 додає candidate-ladder.

РІШЕННЯ по пунктах — нижче.

## П.1 — Інваріант admin (non-sameBand). ЗНАХІДКА B1 (blocking: невірне формулювання інваріанту)
- prefer_horizontal=false → порядок [V,H]. V=route_ortho=base. Якщо base чистий (`idx.clear_of && !foreign`) → повертається V=base, БАЙТ-ІДЕНТИЧНО A2.1. Це тримається (той самий предикат, V перший).
- АЛЕ: план :30 стверджує «admin-ребра … мусять лишитись БАЙТ-ІДЕНТИЧНИМИ A2.1». Це НЕПРАВДА для підкейсу **V блокований + H чистий**. У A2.1 таке ребро йшло в detour (вертикальний коридор). У A2.2 ladder [V,H]: V блокований → пробує H ПЕРЕД detour → якщо H чистий → повертає H. Маршрут ІНШИЙ (detour ≠ H).
- Це faithful до TS (TS non-prefer = [V,H], V blocked, H clean → direct H). Тобто A2.2 МЕНШ detour-happy, БІЛЬШ faithful. Але план цього не визнає: інваріант «admin байт-ідентичний» хибний у загальному; істинний лише вузький «V-clean admin лишається V».
- НАСЛІДОК: golden ТРЕБА регенерувати з очікуванням H для admin/lead-org non-sameBand де base блокований і H чистий; потрібен ПРИЦІЛЬНИЙ тест на цей кейс (V blocked → H clean → H, не detour). Якщо імплементер довіриться хибному інваріанту — зафіксує НЕПРАВИЛЬНИЙ golden (detour) і «виправить» faithful-поведінку як регресію.
- Перевірка на наявному golden: h6 P→A (P x0-100,y0-50; A x200-300,y300-350). route_horizontal існує (clearGap fromRight100 ≤ to.x200+0.5), H=[(100,25),(150,25),(150,325),(200,325)]. Вертикальний сегмент x=150  y25→325 РІЖЕ картку X (x120-180,y160-190) і рамку dh (x120-180,y200-230) → H блокований → падає в detour → golden P→A НЕ міняється. Тобто наявний h6 golden ВИЖИВАЄ — але це ВИПАДКОВІСТЬ геометрії, не гарантія інваріанту. Жоден наявний golden-edge не sameBand (усі Δcy=300 ≫ min(h)·0.35=17.5), тож sameBand-гілка їх теж не чіпає.

## П.2 — sameBand admin. ПІДТВЕРДЖЕНО (свідома зміна, faithful)
- Оракул :330 `preferHorizontal = kind==='matrix' || kind==='dotted' || sameBand`. sameBand НЕ залежить від kind. Тож admin-ребро, що sameBand → prefer_horizontal=true → H-перший → golden зміниться й для admin. План :26 `kind∈{matrix,dotted} || same_band` — дзеркалить оракул точно. FAITHFUL. Назвати явно: це зміна не лише для matrix/dotted, а й для будь-якого sameBand-ребра (admin/lead-org теж).

## П.3 — H без власного detour. РИЗИК N2 (non-blocking, власник прийняв detour≠ladder)
- Дизайн: H блок → V → V блок → `detour_edge` (вертикальний corridorY/side-X). TS на блоці обох для matrix/dotted/sameBand іде в aroundTop (preferTop :403-404), потім aroundLeft forced. Rust іде у ВЕРТИКАЛЬНИЙ detour. Розходження форми — прийнятне (власник).
- АЛЕ специфічний ризик: для **sameBand matrix/dotted** ребра (бокси пліч-о-пліч, близькі cy) route_ortho вироджений — corridorY=(from.bottom+to.top)/2 падає ВСЕРЕДИНУ обох боксів (бо to.top < from.bottom при схожих Y). detour_edge на такому майже завжди не знайде чисту Y-доріжку → поверне base (remnant) + §12-маркер. TS aroundTop дав би ЧИСТУ верхню доріжку. Тобто для sameBand-both-blocked Rust дасть БІЛЬШЕ marked-ребер, ніж TS. Clearance не гіршає (marked чесний), але візуально/семантично гірше. Назвати власнику: matrix/dotted sameBand з перекриттям у коридорі → remnant там, де TS огинав би зверху.

## П.4 — clearGap семантика. ЗНАХІДКА B2 (blocking-вимога на route_horizontal)
- КРИТИЧНО: Rust clean-path НЕ має явного `isClean` (перевірки не-перетину ВЛАСНИХ from/to боксів). `idx.clear_of` СКІПАЄ from/to по id (:303), `foreign_frame_blocks` — лише рамки. Тобто ніщо не ловить H-кандидата, що ріже власний бокс. У TS це ловить `isClean(c,from,to)` :398. У Rust ЄДИНИЙ запобіжник — щоб `route_horizontal` повертав None, коли нема чистого зазору. clearGap тут load-bearing сильніше, ніж у TS.
- Вимога (точний порт :189): `clear_gap = if go_right { from_right <= to.x + 0.5 } else { to_right <= from.x + 0.5 }`, `go_right = to_cx >= from_cx` (tie → right, НЕ строгий), None коли !clear_gap. Якщо імплементер послабить clearGap або поставить строгий `<` / перекине tie — H може різати власний бокс і clean-check це НЕ зловить (бо skip by id). Blocking-вимога.
- eps: усюди 0.5 (= STRAIGHT_EPS, :42), не 1e-9 — в оракулі НЕМА 1e-9 (і :189 clearGap, і :196 |Δy|<0.5, і :142 |Δx|<0.5 усі 0.5). Перевикористати STRAIGHT_EPS. f32 0.5 ок для фікстур.
- midX у зазорі: `go_right ? (from_right+to.x)/2 : (to_right+from.x)/2` (:202). Порти H — на ЦЕНТР-Y боку (fromCy=from.y+h/2), не top/bottom. Наявний `port()` :61 лише Top/Bottom → ПОТРІБЕН новий хелпер Left/Right на center-Y (N9).

## П.5 — sameBand поріг на per-LOD. ЗНАХІДКА N4 (non-blocking вимога)
- Оракул :329 рахує на StaffEdgeBox (вже per-LOD через mapStaffEdgeBoxesForLod), на `from.height`/`to.height` = ПОРТ-БОКС (не routerObstacle). У Rust same_band ТРЕБА рахувати на вже резолвнутих per-LOD `from`/`to` (EdgeRect, :456), на `EdgeRect.height` — НЕ на сирому StaffNodeGeo.height (layout-бокс) і НЕ на obstacle_rect height. cy теж per-LOD: from.y+from.height/2 на EdgeRect. Інакше поріг розійдеться на mid/far (менші edge-бокси). Faithful лише якщо з EdgeRect-порт-боксів.

## П.6 — детермінізм + той самий предикат. ПІДТВЕРДЖЕНО (не-проблема)
- H clean-check має йти через ТОЙ САМИЙ `idx.clear_of(cand, from_id, to_id)` + `foreign_frame_blocks`, що й V. idx індексує ПЕРЕШКОДИ (сорт по top перешкоди), не маршрут; bbox-запит у `clear_of` :288-293 рахується з ТОЧОК кандидата — тож для H-маршруту bbox просто інший (ширший по X, вертикаль midX покриває Δy), логіка partition_point/break коректна для будь-якої полілінії. Орієнтація маршруту НЕ впливає на idx. Підтверджено: пастки нема.
- Детермінізм ladder: фіксований порядок [H,V]/[V,H], route_horizontal детермінований → ок.

## П.7 — межові H. ЗНАХІДКА N6 (non-blocking, TDD-нотатка)
- Вирівняні Y (|Δy|<0.5): оракул :196-201 повертає [{x1,y1},{x2,y2}] з y1≠y2 ТОЧНО (нахил до 0.5px, НЕ снапиться). Порт має зберегти y1,y2 розбіжними (байт-faithful до TS). НАСЛІДОК: тест-хелпер `is_orthogonal` (:605, eps 1e-6) ВПАДЕ на такому H (сегмент не строго горизонтальний). НЕ асертити строгу ортогональність на H-маршрутах.
- Нульовий/негативний зазор, overlap AABB → clearGap false → None → H пропускається, ladder бере V. Порожній H-кандидат нешкідливий: V (route_ortho) ніколи не None (≥2 точки) → ladder ніколи не порожній.

## Додатково
- N7 (перф-інваріант A2.1): H+V clean-check МУСЯТЬ використовувати лише idx+foreign_frame_blocks (БЕЗ per-edge obs). obs будувати ЛІНИВО лише при падінні в detour_edge. Інакше ламається lazy-obs A2.1 (критик B2) — кожне чисте ребро знову алокуватиме.
- N8 (lead-org): A2.2 prefer_horizontal(sameBand) ловить і lead-org+avoid ребра ДО того, як A2.3 додасть vertical-drop-перший. Між A2.2 і A2.3 lead-org sameBand піде generic H-first. Наявний lead-org тест (:688) на card_pad=0 (else-гілка route_ortho) → не чіпається. Але avoid+sameBand lead-org — врахувати в golden або зафіксувати як відкладене до A2.3.
- N9: потрібен port(Left/Right) на center-Y (box.x / box.x+w, box.y+h/2).

## ВЕРДИКТ: 🔴 (гейт червоний, поки B1+B2 відкриті)
- B1: хибний інваріант «admin байт-ідентичний A2.1» → неправильний golden/тест, якщо довіритись. Переформулювати + додати прицільний тест (V blocked→H clean→H).
- B2: route_horizontal.clearGap=None — load-bearing заміна відсутнього isClean; точний порт :189 обовʼязковий.
- Решта (N1-N9) non-blocking, але N2/N4/N6/N7 — обовʼязкові до врахування в TDD.
