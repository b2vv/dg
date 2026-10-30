# ДІАГНОСТИКА D1 — routing-розходження Rust vs TS (A4.2b, dg30)

Робочий файл агента D1. Append-протокол: ФАКТ / РІШЕННЯ / ДАЛІ / ПИТАННЯ після кожного кроку.

---
## Сесія dg30 — routing root-cause (READ-ONLY)
ДАЛІ: прочитати finding-звіт `_r7-a4-2b-PARITY-FAILURE-dg30.md` + приклад; перевірити наявність /tmp golden-файлів; зіставити Rust routing (staff_routes.rs та ін.) з TS (staffRouterV2.ts, staffEdgeGeometry.ts, visualEdgeBox.ts).

### ФАКТ 1 — декодування staff-tree прикладу (lead-org, near)
from = pos-coo (24,344,136,156): cx=92, top=344, bottom=500. to = org-card cx≈364, top=768.
- TS(old) `[{92,344},{92,328},{364,328},{364,768}]` = **aroundTopPolyline** (staffEdgeGeometry.ts:116-127):
  `{fromCx,from.y}=(92,344)`, `{fromCx,laneY}` laneY=min(344,768)-pad16=**328**, `{toCx,328}=(364,328)`, `{toCx,to.y}=(364,768)`. Тобто TS пішов по ОБХІДНІЙ доріжці зверху (via around/forced).
- Rust(new) `[{92,500},{92,634},{364,634},{364,768}]` = **route_ortho** (staff_routes.rs:71-76):
  port bottom=(92,500), corridor=(500+768)/2=**634**, port top=(364,768). Пряма вертикальна «краплина» вниз БЕЗ обходу.
РІШЕННЯ: обидві мови порахували ОДНАКОВИЙ вертикальний кандидат, але TS його ВІДКИНУВ як заблокований і пішов aroundTop, а Rust лишив вертикаль. Вертикаль x=92, y∈[500,634] РІЖЕ pos-lead (24,552,136,156 → x∈[24,160]∋92, y∈[552,708]∩[500,634]=[552,634]). TS це ловить (polylineHitsBoxInterior / blocked), Rust — ні.

### ФАКТ 2 — Rust-вихід тотожний route_ortho (avoid=false гілка staff_routes.rs:610-611)
route_ortho для from pos-coo→org-card дає РІВНО `[{92,500},{92,634},{364,634},{364,768}]`.
Дві гілки staff_routes можуть дати цей самий вихід:
  (a) avoid=false (card_pad<=0) → `else { route_ortho }` (:610-611) — обходу НЕМАЄ зовсім;
  (b) avoid=true, але route_vertical визнано CLEAN (pos-lead не в obstacle-set або distance-check пройшов).
Якби avoid=true І вертикаль різала pos-lead → is_clean=false (seg_rect_distance<pad, :573-582) → detour. Rust НЕ зробив detour ⇒ АБО card_pad<=0, АБО pos-lead відсутній у наборі перешкод.
ДАЛІ: прочитати wiring (buildStaffLayoutInput.ts, adaptStaffGeometry.ts, staffLiveGeometry.ts, ts-bridge) — яке card_pad і який набір persons передаються у staff_routes. Це вирішує (a) vs (b).

### ФАКТ 3 — card_pad задається в staff_layout.rs:1246-1250 (НЕ в адаптері)
```rust
let card_pad = if input.options.content_padding >= MIN_CARD_PAD { input.options.content_padding } else { 0.0 };
```
MIN_CARD_PAD=8 (staff_layout.rs:40). card_pad передається у staff_routes (RouteInputs, :1253-1260).
buildStaffLayoutInput.ts:65 кладе `contentPadding` у metrics.contentPadding (resolveMetrics), а той прокидається з render-шару (departmentWrapperPadding).
НАСЛІДОК: якщо content_padding < 8 для сцени → card_pad=0 → avoid=false → staff_routes бере гілку `else { route_ortho }` (:610-611) для КОЖНОГО ребра — обходу карток/рамок НЕМА взагалі. Саме це пояснює ФАКТ 1/2: вертикаль через pos-lead лишилась сирою.
ДАЛІ: звірити з TS-еталоном — чи СТАРИЙ TS-конвеєр вимикав обхід при малому padding (staffRouterV2.ts / staffLiveGeometry.ts: чи obstacles передаються БЕЗУМОВНО). І який content_padding у staff-tree сцені.

### ФАКТ 4 — TS-еталон обходить картки БЕЗУМОВНО (staffRouterV2.ts + staffEdgeGeometry.ts)
`resolveStaffRouting` (staffRouterV2.ts:60-80) ЗАВЖДИ передає `edgeBoxes` як obstacles у `buildStaffEdgeSegments` — і в 'legacy' (:61), і в 'v2' (:80). `buildStaffEdgeSegments`→`staffEdgePolyline(from,to,kind,boxes,frames)` (staffEdgeGeometry.ts:461) → `classifyStaffEdgeRoute` із `blocked()` проти ВСІХ боксів (:344-367).
⇒ У TS обхід КАРТОК не залежить від content_padding/framePadding. `framePadding?? 8` (:68) інфлейтить ЛИШЕ union рамок відділів, НЕ впливає на card-avoidance. Legacy vs v2 відрізняються тільки обходом РАМОК + marked.
Критерій «чисто» в TS = `polylineHitsBoxInterior` (interior-перетин, eps 0.75, інфляція 1px) — staffEdgeGeometry.ts:211-247, 344-366. Обхідні примітиви: `aroundTopPolyline`/`aroundLeftPolyline` з ФІКСОВАНИМ pad=16 (:103,:117).

### ФАКТ 5 — емпіричне підтвердження з golden (scratchpad, /tmp/dg29-golden-old|new.json)
Класифікація форм маршрутів (vert-elbow: corr<min→aroundTop, |corr-mid|<0.6→ortho-mid; H-elbow→horizontal):
- staff-tree near: OLD {straight2:2, aroundTop:1, horizontal:1} → NEW {straight2:2, ortho-mid:2}. Обидва TS-обходи зникли.
- ПО ВСІХ сценах/LOD: OLD {ortho-mid:584, straight2:534, **aroundTop:951, horizontal:178**} → NEW {ortho-mid:1915, straight2:276, **aroundTop:0**, elbow-shift:46, horizontal:10}.
  ⇒ ~1129 обхідних маршрутів TS у Rust стали сирим ortho-mid; aroundTop у Rust НЕ З'ЯВЛЯЄТЬСЯ ЖОДНОГО РАЗУ.
- staff-dept-legacy: OLD==NEW {straight2:9, ortho-mid:9} — ЄДИНА чиста, бо в OLD теж не було обходу (нема що розходитись).
- staff-dept-v2 (card-style, content_padding>=8): NEW має 1 elbow-shift де OLD ortho-mid — Rust-обхід СПРАЦЮВАВ, але власною геометрією (не aroundTop).

## КОРІНЬ (routing) — три незалежні розбіжності
**D1 (домінантна причина staff-tree і більшості сцен): обхід карток ВИМКНЕНО, коли content_padding < 8.**
staff_layout.rs:1246-1250: `card_pad = content_padding>=MIN_CARD_PAD(8) ? content_padding : 0`. При card_pad=0 staff_routes бере `else { route_ortho }` (staff_routes.rs:491,610-611) — ЖОДНОГО обходу. content_padding = departmentWrapperPadding (staffLiveGeometry.ts:89): для blob-стилю = contourButtonGroupMargin(paddingCells, strokeWidth) — у staff-tree/figma/magnetic/gojs < 8 → card_pad=0. TS же обходить картки БЕЗУМОВНО (ФАКТ 4). Приклад: вертикаль x=92,y∈[500,634] ріже pos-lead → TS aroundTop(328), Rust лишив сире (ortho-mid 634).
→ БАГ Rust (мав відтворити TS, premise = byte-parity; гейт на content_padding не має TS-аналога). Впевненість: ВИСОКА (код staff_layout.rs:1246 + staffRouterV2.ts:61,80 + emp. aroundTop 951→0).

**D2: інший критерій «чисто» навіть коли card_pad>0.**
Rust is_clean = `seg_rect_distance < card_pad` (clearance-кільце content_padding px) — staff_routes.rs:573-583. TS = `polylineHitsBoxInterior` (лише фактичний interior-перетин, eps 0.75) — staffEdgeGeometry.ts:245-247,364. Rust детурить на near-miss, TS — ні. Множина «коли обходити» різна.
→ СВІДОМО інша логіка, несумісна з byte-parity. Впевненість: ВИСОКА (код обох).

**D3: інша геометрія обходу.**
Rust detour = corridorY-доріжки (ry±pad) + side_detour H-V-H (rx±pad) — staff_routes.rs:417-482. TS = aroundTopPolyline/aroundLeftPolyline, ФІКСОВАНИЙ pad=16, доріжка на min(from.y,to.y)-16 / збоку — staffEdgeGeometry.ts:102-127,404-409. Точки РІЗНІ by construction; Rust НЕ має aroundTop-примітиву (emp. NEW aroundTop=0).
Додатково: A2.2-ладдер (route_vertical/route_horizontal/prefer_horizontal, staff_routes.rs:562-609) — власна ре-деривація вибору кандидата; коментарі самі визнають «behavior change проти A2.1».
→ СВІДОМО інша логіка. Впевненість: ВИСОКА (код + emp.).

## ЩО Rust НЕ ВРАХОВУЄ (пряма відповідь власнику)
1. Що TS обходить картки ЗАВЖДИ (obstacle-set = всі edge-boxes, безумовно). Rust вмикає обхід лише при content_padding>=8 — гейт, якого в TS НЕМАЄ. Це головний прорахунок.
2. Що TS-критерій блокування — interior-перетин (фіксований eps), а НЕ clearance-відстань, прив'язана до content_padding.
3. Що в TS існує ціла родина обходів «lane above/left обох карток на pad=16» (aroundTop/aroundLeft) — у Rust її немає зовсім; замість неї corridorY-зсув + side_detour.

НЕ ВИЗНАЧЕНО (поза routing-зрізом): точне числове content_padding кожної сцени (видно лише ефект card_pad=0 емпірично); far-LOD elbow-shift у staff-tree (NEW) — мінорна додаткова розбіжність, не докопував; nodes-layout (інший агент).
