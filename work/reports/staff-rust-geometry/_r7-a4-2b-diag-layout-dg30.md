# R7 A4.2b — діагностика NODE-LAYOUT (dg30)

READ-ONLY. Зріз: координати/розміри вузлів, orgCards, zones, canvas width/height.
Routing — інший агент, не чіпаю.

ДАЛІ: прочитати finding-звіт `_r7-a4-2b-PARITY-FAILURE-dg30.md`, перевірити наявність
`/tmp/dg29-golden-old.json` та `/tmp/dg29-golden-new.json`, оглянути скрипти-зразки.

## ФАКТ (крок 1): артефакти на місці
- `/tmp/dg29-golden-old.json` (1600049 B, TS baseline) та `/tmp/dg29-golden-new.json`
  (1662482 B, Rust) існують. Скрипти `dg29-real.mjs`/`dg29-perscene.mjs` читають `old[s].live`
  vs `neu[s].live`, tolerance 1px, виключають `bands`.
- Finding прочитано: node-diff Є в variant-b/worker(18), magnetic(36), gojs(9), staff-1m(1899).
  staff-1m canvas 7064→135608 (~19× вшир) за ТІЄЇ Ж к-сті вузлів (633 — у finding, 1899 — у diff-таблиці nodes; звірити).

## 🔴 ФАКТ (крок 2) — КОРІНЬ: Rust НЕ продукує `role:"matrix"` (grid-режим)
live-схема: `{nodes[], bands[], orgCards[], edges[], width, height, zones[], routes}`.
node = `{id,x,y,w,h,role}`. role ∈ {tree, matrix, detached}.

node[0] staff-1m: OLD `{x:288,role:"matrix"}` → NEW `{x:67632,role:"tree"}`. h впала 3630→2158,
width зросла 7064→135608. Це matrix(grid-wrap, компактно+високо) → tree(широкий ряд, низько).

**Розподіл role (roles.mjs) — node-diff мапиться 1:1 на matrix→tree:**
```
variant-b     OLD{matrix:6}  NEW{tree:6}  m->t:6    w466->536  h570->560
worker        OLD{matrix:6}  NEW{tree:6}  m->t:6    (==variant-b)
magnetic      OLD{matrix:12} NEW{tree:12} m->t:12   w1188->1600 h1256->1144
staff-1m      OLD{matrix:633}NEW{tree:633}m->t:633  w7064->135608 h3630->2158
gojs          OLD{tree:7,detached:2} NEW{tree:9} other:2 (detached->tree)  w1020->756 h903->1179
--- ЧИСТІ (0 matrix у OLD, 0 переходів): staff-shps, staff-tree, staff-dept-legacy/v2, figma, brigade
```
ВИСНОВОК: кожна сцена з node-diff має matrix-вузли в TS, яких Rust не відтворює — усі стають tree.
staff-1m: 633 matrix grid-packed у w=7064 проти spread у w=135608 як tree (~19×). Це НЕ f32-шум.
gojs — окремий суб-баг: `detached`-роль теж втрачена (2 detached→tree, portrait).

## 🔴 КОРІНЬ #1 (домінантний, node-layout) — ВИКИНУТІ matrix-координати
**Де прорахунок:** `buildStaffLayoutInput.ts:226-231` — input-адаптер мапить КОЖНУ позицію
лише в `{id, organizationId, isHead, departmentId}`. ВИКИНУТО: `gridCell`, `layoutX/layoutY`,
`layoutCoords`, `width`, `height`.

**Що Rust НЕ враховує:** per-position координати членів. У TS саме вони вмикають matrix-режим:
- `coords.ts:31` `positionHasCoords` = true якщо є `gridCell` | `layoutX+layoutY` | `layoutCoords`.
- `orgBlockLayout.ts:385-386` ділить на `withCoords`/`without`; :415 `mode==='matrix' || without.length===0`
  → `layoutMatrixBlock` (:274-300) кладе кожен вузол at explicit coords (`resolvePositionAABB`
  `coords.ts:45-67`: grid pitch `col*pitchX`, компактна сітка), role='matrix' (:286).
- Rust за КОНТРАКТОМ робить ЛИШЕ tree (`staff_layout.rs:4-6`, :971) — координат у `StaffLayoutInput`
  нема, matrix «структурно недосяжний». Коментар стверджує «TS-адаптер гейтить їх до виклику»,
  але **гейта/фолбеку НЕМА**: ні в `buildStaffLayoutInput.ts`, ні в `staffLiveGeometry.ts`
  (grep: жодного coord/matrix/mode/fallback). A4.2b дротує ВСІ сцени, включно з matrix, у Rust tree.

**Наслідок:** кожна matrix-позиція розкладається як горизонтальне дерево замість компактної сітки.
staff-1m: 633 grid-pack позицій → ряд дерева w=7064→135608 (~19×), h 3630→2158.
Мапінг node-diff 1:1 на matrix→tree (variant-b/worker 6×3=18, magnetic 12×3=36, staff-1m 633×3=1899).
**Заземлення сцен:** demo `scaleStaff.ts`(staff-1m), `variantB.ts`(variant-b/worker),
`mockupStaff.ts`(magnetic) реально несуть `gridCell/layoutCoords/layoutX` (grep).
Golden OLD role="matrix" — прямий доказ, що positionHasCoords=true для цих сцен.

- (а) **БАГ Rust-стеку** (wiring), НЕ свідомо інша логіка: дизайн передбачав гейт matrix-сцен,
  гейт не реалізовано. Rust-tree сам по собі коректний; проблема — що matrix-сцени туди взагалі потрапляють.
- (б) **Впевненість: висока.** Докази: `buildStaffLayoutInput.ts:226-231` (дроп полів),
  `coords.ts:31-67`+`orgBlockLayout.ts:385-434` (TS-гілка matrix), `staff_layout.rs:4-6,971`
  (Rust tree-only), відсутність гейта (grep), demo-дані з gridCell, рахунок diff зійшовся.
- «role: matrix→tree» з finding-категорії `role` — це НЕ f32-шум, а прямий симптом цього бага.

## 🟠 КОРІНЬ #2 (вторинний, лише gojs) — розбіжність detached-inference
gojs — НЕ matrix (OLD {tree:7, detached:2}). 2 вузли `pos-sup`,`pos-vac` у OLD = `detached`
(права side-column x=764 — `orgBlockLayout.ts:121`/`pack_side_column` `staff_layout.rs:419`).
У NEW обидва стали `tree` і вставлені в дерево ліворуч (x=28, y=358/496), а приєднаний підлісок
pos-u-* з'їхав вниз на +276. 9 node-diff = 2 перекладені (x,y,role) + 3 зсунуті по y.
- Визначення detached однакове словами: TS `resolveHead.ts:26` і Rust `staff_layout.rs:168`
  («не голова й без admin-батька»). Розбіжність — у ВХІДНИХ даних inference: ймовірно різний
  admin-parent map / resolveHead, або report-фільтр `buildStaffLayoutInput.ts:218-222` змінив
  видимі лінії. Точний механізм **не визначено** без глибшого порівняння resolveHead vs is_detached.
- (а) схоже на **БАГ** (втрата detached), але не доведено до рядка-причини.
- (б) **Впевненість: середня** (симптом точний і заземлений; корінь — гіпотеза).
- portrait w/h gojs 1020→756, 903→1179 — наслідок перекладання, не окрема причина.

## ПІДСУМОК node-layout
Увесь РЕАЛЬНИЙ (>1px) node-diff пояснюється двома причинами:
1. matrix-координати викинуті в input-адаптері → matrix-сцени падають у Rust tree (variant-b,
   worker, magnetic, staff-1m) — ДОМІНАНТ, висока впевненість, баг wiring.
2. detached-inference розходиться (лише gojs, 2 вузли) — вторинне, середня впевненість.
Чисті сцени (staff-shps, staff-tree, dept-legacy/v2, figma, brigade) не мають ні matrix, ні
detached-переходів → 0 node-diff (їхні ✗ у finding — це routing, інший зріз).
canvas w/h зсуви — наслідок тих самих причин, не окремий баг.

