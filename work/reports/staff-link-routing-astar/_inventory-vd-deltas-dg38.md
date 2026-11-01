# Інвентар V+D дельт: наше `staff-mock3` vs мокап-еталон (dg38)

Мета: вирівняти «чесну базу» ПЕРЕД геометрією. Для кожної дельти: НАШЕ (+ path:line) | ЕТАЛОН (+ мокап-файл) | тип | нотатка.
no-verbatim: мокап-файли чужі — значення (hex/px/радіус) цитуємо як факти; код/селектори переказуємо.

ДАЛІ: читаю наші джерела стилів — mockupStyles.ts (card/dept/line), потім SDK render (dept-рамка, лінії, lead-org, org-обгортка), потім дані mock3Shps.ts vs shpsStaff.ts, потім мокап-еталони з ~/Downloads/mock3/.

---
## КРОК 1 — наші стилі + дані (прочитано)

ФАКТ (стилі): `MOCKUP_FIGMA_STYLES` у mockupStyles.ts вже виведені з Figma-токенів «Casiopeya dark».
Ключові значення (path: packages/demo/src/scenarios/mockupStyles.ts):
- edge (лінії): color #a6a6a6, width 1, cornerRadius **8** (заокруглення!), terminator 'dot', dotRadius 2.67 — mockupStyles.ts:13-19
- organization card: 234×110, bg #121212, border #303030 1px, radius 12 — :20-27
- person seat (figma-row): 248×44 (у FIGMA-стилях) — :54-56
- staffZone (зона орг/тір): fill #191f26, dashed stroke #3d5067 1px, radius 12, label right #a6a6a6 14px, pad 16 — :83-94
- staffZone.currentAccent (поточна орг solid): stroke #5a5a62, fill #0f0f11, chip border #e5491d / text #ff8d68 / fill #e5491d@0.1 — :97-106
- departmentCard: fill #242f3d, dashed stroke #3d5067 1px, radius 8, label #a6a6a6 14px, padding 16, badge «N поз.» #9a9aa0 12px — :108-123

ФАКТ (дані mock3 vs ШПС-набір):
- Обидва набори використовують SHPS_SEAT = **300×112** (shpsStaff.ts:9). Тобто розмір seat-box ОДНАКОВИЙ. mock3 успадковує той самий seat (mock3Shps.ts:2,110-115).
- mock3 layout: verticalGap 120, tierGap 120 (глибший drop) — mock3Shps.ts:20-24; базовий ШПС: verticalGap 60, tierGap 64, horizontalGap 28 — shpsStaff.ts:12-24.
- mock3 дані (mock3Shps.ts:50-101): 10 департаментів, ~51 позиція, титули — ОДИН рядок, БЕЗ periodStart/End, БЕЗ childrenCount/allDescendantCount (окрім isHead на ceo), person = лише fullName (БЕЗ avatar url). Vacant коли w=null.
- ШПС-набір (shpsStaff.ts:84-194): має periodStart/periodEnd (дати), childrenCount/allDescendantCount (→ футер `N [M]`), статуси acting/vacant, титули що ПЕРЕНОСЯТЬСЯ на 3 рядки (напр. :132,:142-143,:171).
- Коментар SHPS_SEAT (shpsStaff.ts:4-8): near-card несе аватар + 3-рядковий титул + ім'я + рядок дат + футер `N [M]`.
=> D-наслідок: РОЗМІР картки той самий (300×112), але mock3 НЕ заповнює дати/лічильники/аватар → карта виглядає порожнішою, хоча бокс однаковий.

ДАЛІ: SDK render — dept-рамка (DepartmentCardView / StaffZonesView), лінії (StaffEdgesView/staffEdgeStrokes), lead-org plink, org-контейнер. Шукаю фактичні значення кольору/товщини/радіусу в рендері vs токени.

---
## КРОК 2 — рендер ліній/dept + мокап-еталон «ШПС лінії зв'язку.html»

ФАКТ (наш рендер ліній): StaffEdgesView застосовує staffEdgeStrokes(theme='dark', edge=MOCKUP_FIGMA_STYLES.edge).
- edge.color/width ВИЗНАЧЕНІ → override admin → color #a6a6a6, width 1 (staffEdgeStrokes.ts:36-47; StaffEdgesView.ts:70-73).
- radius = edge.cornerRadius ?? 0 = **8** (StaffEdgesView.ts:74), traceRoundedPolyline → заокруглені кути.
- dotted = terminator==='dot' → true → БЕЗ стрілок, крапки на портах dotRadius 2.67 (StaffEdgesView.ts:72-73,87).
- admin dark базовий (без override) = #e2e8f0 width 2.25 (staffEdgeStrokes.ts:19) — але override бере гору.

ФАКТ (еталон лінії, ~/Downloads/mock3/ШПС лінії зв'язку.html):
- `.ln`: stroke var(--line) = **#c2502a** (теракота/оранж), stroke-width **2** (рядок 10,28).
- default routing tweak: pad 16, lane 14, **radius 10** (слайдер 0–10) (рядок 64-71,79). Тобто кути ЗАОКРУГЛЕНІ за замовч. (radius 10), НЕ 90° sharp.
- `.ent` вхідна крапка: fill #c2502a + обведення кольором фону #0d0d0e 2px (halo) (рядок 29).
- highlight `.ln.on`: #ff8d68 width 2.5 (рядок 34).
- міждеп лінії default = «Як внутрішні» (той самий колір/стиль) (рядок 68,81).

=> ДЕЛЬТА ЛІНІЙ (V, style):
- КОЛІР: наше #a6a6a6 (сірий) | еталон #c2502a (теракота). ВЕЛИКА дельта.
- ТОВЩИНА: наше 1 | еталон 2.
- РАДІУС: наше 8 | еталон default 10 (обидва заокруглені!). УВАГА: припущення власника «еталон 90° sharp» НЕ підтверджується — мокап default radius=10; sharp лише якщо слайдер=0. Треба звірити зі скріншотами.
- КРАПКА входу: наше dot radius 2.67 колір лінії | еталон dot колір #c2502a + halo фоном #0d0d0e.

ФАКТ (наш dept card рендер): DepartmentCardView + departmentCard токени.
- fill #242f3d, stroke #3d5067 1px, radius 8, **dashed:true** (paintDashedFrame), label right-align над seats (labelRow=fontSize+6), badge «N поз.» #9a9aa0 12px (DepartmentCardView.ts:48,59-71,83-104; mockupStyles.ts:108-123).

ФАКТ (еталон dept, ШПС лінії.html рядок 24-26):
- `.dept`: border **1px SOLID #3a3a40**, radius **12**, background **#111113**.
- `.dn` (title bar): height **34px**, bg **#202023**, bottom-border #3a3a40, radius top 11px, font 14px 600, pad 0 14px, gap 8 — тобто ЗАПОВНЕНА шапка-рядок з роздільником.
- `.dn em` (badge): mono 12px #9a9aa0.

=> ДЕЛЬТА DEPT (V, style):
- FILL: наше #242f3d (синьо-сірий) | еталон #111113 (майже чорний).
- STROKE: наше #3d5067 (синій) | еталон #3a3a40 (нейтр. сірий).
- DASHED: наше dashed | еталон SOLID. (ключова)
- RADIUS: наше 8 | еталон 12.
- TITLE: наше — плаваючий right-align лейбл у тонкому рядку (без заливки) | еталон — заповнена шапка 34px (#202023) з нижнім роздільником, лейбл зліва. (ключова)
- BADGE: збіг #9a9aa0 12px.

ФАКТ (еталон org frame `.orgf`, рядок 21-23):
- border 1px #5a5a62, radius **14**, bg #0f0f11. Name `.on` 15px 600 top16/left20 gap10. chip `.on i` 11.5px 600 pad3/8 radius5 border #e5491d color #ff8d68 bg rgba(229,73,29,.1).
=> наш staffZone.currentAccent: stroke #5a5a62 ✓, fill #0f0f11 ✓, chip border/text/fill ✓ — ЗБІГ. Дельта: radius наше 12 | еталон 14; label font наше 14 | еталон 15 (дрібні).

ДАЛІ: картка (card dims у shps-links.js, ShpsStaffCard наш near-card), lead-org (mock3 має 1 орг — plink N/A?), inter-dept gap (Rust horizontal_gap + shps-links.js).

---
## КРОК 3 — картка (near + box), gaps, lead-org

ФАКТ (наш near-card ShpsStaffCard.ts): майже дослівна копія мокап `.card` — ті самі кольори
(#2c2c31 bg, #4c4c54 border, #e5491d head, #ff8d68, avatar #3e3e45 38px radius9, footer #26262a) (ShpsStaffCard.ts:13-29,75-80).
- ДЕЛЬТА: title clamp наше **3 рядки** (ShpsStaffCard.ts:116 WebkitLineClamp:3) | еталон `.pos` clamp **2** (ШПС лінії.html:41).
- date-рядок рендериться лише якщо є periodStart (ShpsStaffCard.ts:64,174); footer `N [M]`+toggle лише якщо hasCounts (childrenCount/allDescendantCount) (ShpsStaffCard.ts:63,214).

ФАКТ (розмір картки / seat-box):
- НАШЕ seat = **300×112** (shpsStaff.ts:9), near-card малюється на screenRect = node box = 300×112.
- ЕТАЛОН card = **CW=236 × CH=118**, dept title bar HD=34 (shps-links.js:63).
- ДЕЛЬТА розміру: наше ширше (300 vs 236, +64px), трохи нижче (112 vs 118, −6px).

ФАКТ (gaps):
- НАШЕ within-dept card gap = horizontalGap **28** (shpsStaff.ts:13, mock3 успадковує); vertical verticalGap/tierGap **120** (mock3Shps.ts:21-23).
- НАШЕ inter-dept frame edge-gap (Rust): region_gap = horizontal_gap + 2*content_padding (staff_packing.rs:67-80) = 28 + 32 = **~60px** горизонт.
- ЕТАЛОН (shps-links.js:63-64, HTML tweaks pad16/lane14):
  - SG (sibling card gap) = max(24, 2pad+2lane+8) = **~68px** (JS-default pad8/lane8 → 40).
  - LV (рівень↓ в межах dept) = max(56, 2pad+4lane) = **~88px** (JS → 56).
  - DP (dept внутр. padding) = max(28, pad+2lane+14) = **~58px** (JS → 38).
  - DPt (відступ зверху під title bar) = HD+24 = **58px**.
  - BG (між dept-блоками, горизонт) = max(44, 2pad+3lane) = **~74px** (JS → 44).
  - BV (між dept-блоками, вертикаль) = max(96, 2pad+8lane) = **~144px** (JS → 96).
- ДЕЛЬТА gaps: within-dept card gap наше **28** | еталон SG **~68** (еталон просторіший); inter-dept горизонт наше ~60 | еталон BG ~44-74 (близько); вертикаль наше 120 | еталон BV ~96-144 (близько).

ФАКТ (lead-org): mock3 має ЄДИНУ орг (mock3-org, role current) — mock3Shps.ts:120-122. Лід-орг (leading) немає →
plink НЕ рендериться у mock3. Наш plink стиль (для довідки): lead-org #6b6b73 width2 dash[6,4] (staffEdgeStrokes.ts:13,20;
збіг із мокап `.plink` за коментарем). => Для mock3 V-дельта #2 (лід-орг) НЕ застосовна; актуальна лише для 2-орг сцени (staff-shps).

ФАКТ (routing tweak defaults, для контексту): S={pad8,lane8,radius4} у shps-links.js:56, але HTML EDITMODE override → pad16/lane14/radius10 (ШПС лінії.html:64-71). cross default «Як внутрішні».

ДАЛІ: зводжу 5 таблиць + підсумок «що змінити» (style/layout/data).

---
## ПІДСУМОК — 5 таблиць дельт

### Таблиця 1 — Департаменти: рамка + відступи (V: style+layout)
| Параметр | НАШЕ (path:line) | ЕТАЛОН (мокап) | тип | нотатка |
|---|---|---|---|---|
| fill | #242f3d (mockupStyles.ts:110) | #111113 (ШПС лінії.html:24) | style | синьо-сірий → майже чорний |
| stroke | #3d5067 (mockupStyles.ts:111) | #3a3a40 (ШПС лінії.html:24) | style | синій → нейтр. сірий |
| dashed? | dashed:true (mockupStyles.ts:119; DepartmentCardView.ts:65) | SOLID 1px (ШПС лінії.html:24) | style | **ключова: рамка суцільна, не пунктир** |
| radius | 8 (mockupStyles.ts:114) | 12 (ШПС лінії.html:24) | style | |
| title | плаваючий right-align лейбл, без заливки (DepartmentCardView.ts:73-98; mockupStyles.ts:116 labelRow) | заповнена шапка `.dn` h34 bg#202023 + нижній роздільник, лейбл зліва (ШПС лінії.html:25) | style | **ключова: title-bar з фоном** |
| badge «N поз.» | #9a9aa0 12px mono (mockupStyles.ts:121-122) | #9a9aa0 12px mono (ШПС лінії.html:26) | — | ЗБІГ |
| inter-dept gap (гориз.) | ~60px = hGap28+2·pad16 (staff_packing.rs:67-80) | BG ~44–74 (shps-links.js:64) | layout | близько |
| inter-dept gap (верт.) | 120 tierGap (mock3Shps.ts:23) | BV ~96–144 (shps-links.js:64) | layout | близько |

### Таблиця 2 — Лід-орг: дизайн вузла (V)
| Параметр | НАШЕ | ЕТАЛОН | тип | нотатка |
|---|---|---|---|---|
| наявність у mock3 | немає (1 орг, role current — mock3Shps.ts:120-122) | немає (`.orgf` одна — ШПС лінії.html:21) | — | **V-дельта #2 НЕ застосовна до mock3** |
| plink стиль (довідка) | #6b6b73 w2 dash[6,4] (staffEdgeStrokes.ts:13,20) | мокап `.plink` (збіг за коментарем) | style | лише для 2-орг сцени staff-shps |

### Таблиця 3 — Лінії зв'язку (V: style) — найбільша дельта
| Параметр | НАШЕ (path:line) | ЕТАЛОН (ШПС лінії.html) | тип | нотатка |
|---|---|---|---|---|
| колір admin | #a6a6a6 сірий (mockupStyles.ts:14 → override staffEdgeStrokes.ts:36-47) | #c2502a теракота `.ln`/--line (:10,28) | style | **ВЕЛИКА: сірий → теракота** |
| товщина | 1 (mockupStyles.ts:15) | 2 (:28) | style | |
| радіус кутів | 8 (mockupStyles.ts:16; StaffEdgesView.ts:74) | default 10 (0–10 слайдер) (:79) | style | обидва ЗАОКРУГЛЕНІ; припущення «90° sharp» НЕ підтверджено — тільки якщо radius=0 |
| термінатор | dot r2.67 колір лінії (mockupStyles.ts:17-18) | `.ent` dot #c2502a + halo фоном #0d0d0e 2px (:29) | style | |
| стрілки | немає (dotted→withArrow=false, StaffEdgesView.ts:87) | немає (крапка входу) | — | збіг |
| highlight | accent #e5491d w2 (StaffEdgesView.ts:83) | #ff8d68 w2.5 (:34) | style | дрібна |
| cross-dept | marked #dc2626 (StaffEdgesView.ts:20) | default «як внутрішні» (:68,81) | style | еталон за замовч. не виділяє |

### Таблиця 4 — Обгортка організацій / org-контейнер (V: style)
| Параметр | НАШЕ (currentAccent) | ЕТАЛОН `.orgf` | тип | нотатка |
|---|---|---|---|---|
| border | #5a5a62 (mockupStyles.ts:98) | #5a5a62 1px (ШПС лінії.html:21) | — | ЗБІГ |
| fill | #0f0f11 (mockupStyles.ts:99) | #0f0f11 (:21) | — | ЗБІГ |
| radius | 12 (staffZone.borderRadius mockupStyles.ts:89) | 14 (:21) | style | дрібна |
| label | 14px #a6a6a6 right (mockupStyles.ts:90-92) | `.on` 15px 600 (:22) | style | дрібна |
| chip поточної | border#e5491d/text#ff8d68/fill#e5491d@0.1 (mockupStyles.ts:102-105) | `.on i` те саме (:23) | — | ЗБІГ |

### Таблиця 5 — Дані карток (D) + наслідок розміру
| Поле | mock3 (mock3Shps.ts) | ШПС-набір (shpsStaff.ts) / мокап | тип | наслідок |
|---|---|---|---|---|
| seat-box | 300×112 (через SHPS_SEAT:9) | 300×112 | — | розмір ОДНАКОВИЙ в обох наших наборах |
| vs мокап card | 300×112 | CW236×CH118 (shps-links.js:63) | layout | **наші картки ширші (+64px), нижчі (−6px)** |
| avatar | лише ініціали (persons без url, :130) | ініціали | — | збіг (обидва ініціали) |
| title рядків | 1-рядкові рядки даних; near-card clamp 3 (ShpsStaffCard.ts:116) | мокап clamp 2 (:41) | data/style | mock3 титули короткі → переносів мало |
| дати | НЕМАЄ periodStart/End (:131-142) | є (shpsStaff.ts:116 тощо); мокап показує | data | mock3 cards БЕЗ date-рядка |
| head counts `N [M]` | НЕМАЄ childrenCount/allDescendantCount (лише isHead на ceo, :141) | є → footer+toggle; мокап `.cf`/`.cnt` (:43-44) | data | **mock3 cards БЕЗ футера; у мокапі голови мають `N [M]`+⌄** |
| head-стиль | лише ceo isHead (orange border); dept-heads derive лише в layout, near-card не знає | мокап `.card.head` на всіх головах | data | mock3 near-cards переважно не-head |

---
## ЩО ЗМІНИТИ ДЛЯ V+D-ПАРИТЕТУ (конкретні значення)

### STYLE (кольори/товщина/радіус)
1. **Лінії**: color #a6a6a6 → **#c2502a**; width 1 → **2**; (radius лишити 8-10 — еталон теж заокруглений, НЕ 90°); термінатор-dot додати halo кольором фону #0d0d0e. (mockupStyles.ts edge)
2. **Dept рамка**: dashed → **solid 1px**; fill #242f3d → **#111113**; stroke #3d5067 → **#3a3a40**; radius 8 → **12**. (mockupStyles.ts departmentCard)
3. **Dept title**: додати заповнену шапку-рядок h34 bg **#202023** з нижнім роздільником #3a3a40, лейбл **зліва** (зараз right-align плаваючий). (DepartmentCardView + departmentCard.labelRow/labelAlign)
4. **Org frame**: radius 12 → **14**; label 14 → **15px**. (staffZone/currentAccent)
5. **Near-card title**: clamp 3 → **2 рядки** (ShpsStaffCard.ts:116) для точного паритету.

### LAYOUT (px/gap)
6. **Card width**: 300 → **236** (SHPS_SEAT.width) щоб щільність дерева збіглася з мокапом; height 112 → **118**. ⚠ впливає на весь routing-паритет.
7. **Within-dept sibling gap**: horizontalGap 28 → **~68** (SG = 2·pad+2·lane+8 при pad16/lane14), щоб картки-сестри дихали як у мокапі.
8. **Dept top-padding під title**: DPt=58 (HD34+24); dept внутр. padding ~58 (DP). Звірити з нашим padding 16.
9. inter-dept BG ~44-74 / BV ~96-144 — наші ~60/120 близькі, лишити або підлаштувати.

### DATA (поля — для «чесної бази» mock3)
10. Додати **childrenCount/allDescendantCount** головам у mock3 (зараз немає) → щоб near-card показував футер `N [M]`+⌄ як мокап. Інакше порівняння нечесне: у мокапі голови мають футер, у нас — ні.
11. (Опц.) додати **periodStart/End** хоча б головам → date-рядок як у мокапі.
12. (Опц.) позначити dept-heads isHead у даних mock3 (зараз derive лише в layout) → near-card head-border.

### ⚠ КЛЮЧОВЕ ЗАСТЕРЕЖЕННЯ (honest base перед геометрією)
- Найбільші дельти, що спотворюють порівняння routing: (а) card width 300 vs 236, (б) sibling gap 28 vs ~68, (в) колір/товщина ліній. Поки card-box і gaps різні — порівнювати маршрути ліній «нечесно».
- Припущення власника «еталон 90° sharp» СПРОСТОВАНО: мокап default radius=10 (заокруглено). Sharp лише при слайдері=0.
