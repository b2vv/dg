# R7 A2.3 lead-org drop — критик ПЕРЕД зрізом (Dg26)

Модель: claude-opus-4-8

ДАЛІ: читаю `packages/core/src/staff_routes.rs` (увесь), TS-оракул
`packages/sdk/src/layout/staffEdgeGeometry.ts` (:129-175 verticalPolyline, :370-382 lead-org),
план `_r7-a2-plan-dg26.md` секцію A2.3. Пресую дизайн route_vertical + lead-org precedence.

## ФАКТ: оракул (перечитано)
- TS lead-org precedence `staffEdgeGeometry.ts:373-382`: `verticalPolyline` → беремо лише якщо
  `isClean(vert,from,to)` (:245-247, НЕ ріже ВЛАСНІ from/to interiors) **І** `!blocked(vert)`
  (:344-366 — картки skip from/to by id, ПЛЮС `edgeIntrudesForeignFrame` :366). Отже TS = дві умови.
- Rust ладдер `is_clean` closure `staff_routes.rs:516-525` = `idx.clear_of` (картки, skip by id,
  `seg_rect_distance<pad`) `&& !foreign_frame_blocks` (чужі рамки, `<pad`). Це = TS `!blocked`
  ЗА СКЛАДОМ множин, але критерій `dist<pad` (не interior-penetration). Власної-interior умови
  (TS `isClean`) в Rust-closure НЕМА.
- `route_ortho :71-76`: ЗАВЖДИ from.bottom→to.top, corr=(from.bottom+to.top)/2. НЕ гейтить gap.
- `elbow_or_straight :79-91`: straight при |ax-bx|<STRAIGHT_EPS(0.5), інакше midY-елбоу — готовий
  будівельний блок, тотожний TS-елбоу.

## ДОВЕДЕННЯ (точки 1,2,3,6)
1. **route_vertical = порт.** Рекомендований вигляд: childBelow=`to_cy>=from_cy`; childBelow →
   `elbow_or_straight(fromCx, from.y+h, toCx, to.y, (y1+y2)/2)`, None якщо `y1 > y2 - STRAIGHT_EPS`;
   childAbove → `elbow_or_straight(fromCx, from.y, toCx, to.y+to.h, (y1+y2)/2)`, None якщо
   `y2 > y1 - STRAIGHT_EPS`. Обидві гілки дослівно = TS :136-174. ✔ (STRAIGHT_EPS=0.5 == TS 0.5;
   прецедент повторного вжитку — route_horizontal :106-108 уже так робить).
2/6. **Пропущений TS `isClean` (власні interiors) — редундантний BY CONSTRUCTION.** Коли gap-check
   проходить (route_vertical=Some), порти сидять на bottom/top власних боксів і маршрут іде В ЗАЗОР:
   childBelow midY ∈ (from.bottom, to.top) → нижче from-боксу й вище to-боксу; straight-сегмент теж
   лише в зазорі. Отже vert НІКОЛИ не пенетрує власні from/to interiors. ⟹ Rust `is_clean`
   (= TS `!blocked`) + ця гарантія ≡ TS (`isClean && !blocked`). **Faithful.** Варто закомітити
   інваріант коментарем.
3. **childBelow + clear-gap: route_vertical ≡ route_ortho БАЙТ-У-БАЙТ.** Ті самі порти
   (fromCx,from.bottom)/(toCx,to.top), corr=(from.bottom+to.top)/2=midY, той самий elbow_or_straight.
   Доведено.

## 🔴 BLOCKING (план/тест, не код)
**B1 — A2.3 є ДОВЕДЕНИМ NO-OP скрізь, КРІМ target-above (childAbove); claimed-ефекти (а)+(в) хибні.**
Розбір усіх випадків lead-org в avoid clean-path:
- childBelow, gap, НЕ sameBand: ладдер [V,H], V=route_ortho перший = route_vertical. **NO-OP.**
- childBelow, V-blocked/H-clean: і без A2.3 ладдер [V,H]→H; і з A2.3 vert(=ortho) blocked→падає в
  той самий [V,H]→H. **NO-OP.**
- sameBand lead-org (ефект «а» плану): sameBand ⟹ `|toCy-fromCy|<min(h)·0.35`; для ЧИСТОГО
  вертикального зазору потрібно `to.y>from.bottom` ⟹ `toCy-fromCy>h` ≫ 0.35·h. **sameBand І gap
  ВЗАЄМОВИКЛЮЧНІ** (перевірено для рівних і нерівних висот). ⟹ route_vertical=None ⟹ падає в
  ладдер → H. **Ефект (а) НЕДОСЯЖНИЙ геометрично — N8 «закривається» вакуумно.**
- no-gap (ефект «в»): route_vertical=None; ладдер V=route_ortho теж вироджений/брудний → H/detour,
  те саме й без A2.3. **NO-OP.**
- childAbove (target-above, ефект «б»): route_vertical дає ВЕРХНІЙ маршрут (правильний);
  route_ortho завжди вниз (хибний). Якщо vert clean → A2.3 обирає правильний. **ЄДИНА реальна зміна.**
Наслідок для TDD: RED-тест ОБОВ'ЯЗКОВО на childAbove lead-org в avoid. Тест на childBelow/ sameBand
пройде ЗЕЛЕНИМ БЕЗ фічі (assert-true-without-feature, пам'ять) — немає інформації. План мусить:
(1) викреслити ефекти (а)+(в) як no-op; (2) назвати РЕАЛЬНИЙ сценарій, де org-картка ВИЩЕ лід-особи
— інакше A2.3 = чистий TS-паритет для недосяжного у prod кейсу (навко-YAGNI; прийнятно як
faithfulness, але сказати це вголос). «Змінює golden свідомо» — ПЕРЕБІЛЬШЕНО: наявного avoid
lead-org golden нема, зміна суто АДИТИВНА; h6 (усі admin) і lead_org_person_to_org_card_resolves
(non-avoid childBelow) не зачіпаються.

## 🟡 NON-BLOCKING / підтвердження
- N1 Rust is_clean = `dist<pad`, не TS interior-penetration ⟹ lead-org vert у Rust ДОДАТКОВО
  вимагає pad-кліренс від чужих карток/рамок → падає в ладдер частіше за TS. Прийнята дивергенція
  (detour-модель), але НАЗВАТИ як golden-diff від TS.
- N2 gap-check — СТРОГИЙ `>` з асиметричними операндами (childBelow: `y1>y2-eps`; childAbove:
  `y2>y1-eps`). Легко переплутати бік/знак.
- N3 Вставка — ЛИШЕ в `if avoid` clean-path, ПІСЛЯ визначення is_clean (:516), ПЕРЕД ладдер-`chosen`
  (:530); None(vert)→падає в наявний ладдер (не пропускати detour). Non-avoid (:557-558) лишається
  route_ortho — підтверджено планом.
- N4 target-above з BLOCKED vert → падає в ладдер V=route_ortho (хибний напрям). A2.3 не фіксить цей
  під-кейс (pre-existing), але й не гіршить.
- N5 Non-avoid lead-org target-above лишається route_ortho (хибний напрям vs TS) — косметика, prod =
  avoid (card_pad≥8). Питання власнику, чи ок.
- N6 §12-маркер на обраному vert: is_clean гарантує foreign-frame pad-clear ⟹ frame_intrusion_count=0
  ⟹ marked None. Узгоджено, окремої обробки не треба.
- N7 route_vertical ПЕРЕВИКОРИСТАТИ elbow_or_straight (не дублювати straight/midУ) — DRY і паритет.

## ВЕРДИКТ: 🟡
Дизайн route_vertical — faithful порт; пропуск TS `isClean` редундантний by construction (доведено);
childBelow ≡ route_ortho. КОД безпечний. Блокер — у ПЛАНІ+ТЕСТІ: A2.3 реально міняє лише
target-above lead-org; ефекти (а) sameBand і (в) no-gap — no-op/недосяжні, тож RED-тест мусить
бити в childAbove, а план — викреслити хибні claims і назвати реальний сценарій. Після цього — 🟢.

## ДИСКУСІЯ (власник: пресувати «недосяжно» + принцип відповідальності)

### Напрям 1 — атака на «childAbove lead-org недосяжний». ВИСТОЯВ.
Перечитано РЕАЛЬНИЙ розклад (не припущення):
- `staff_compose.rs:42,64` — `compose_tiers` cursor_y СТАРТУЄ з margin і МОНОТОННО росте вниз
  (`cursor_y += height + tier_gap`); recenter зсуває tier1 ЛИШЕ по X (`:72-82 node.x += dx`), НІКОЛИ
  по Y. ⟹ tier1-смуга завжди ВИЩЕ tier2.
- mgr_head ∈ tier1 (`staff_layout.rs:931 tier:1`), cur_head ∈ tier2 (`:967 tier:2`).
  ⟹ ребро mgr_head→cur_head: джерело вище цілі = **childBelow завжди**.
- `staff_layout.rs:1038 card_y = composed.content_bottom` (= низ tier2); `compose_org_cards:135`
  expanded-діти ще нижче (`card_y + org_card_height + vertical_gap`). ⟹ org-картка завжди НИЖЧЕ
  cur_head ⟹ ребро cur_head→card: **childBelow завжди**.
Проби власника — ДІР НЕ ЗНАЙДЕНО:
- external-pin (`pin_external_managers:656`) пінить менеджерів лише ВСЕРЕДИНІ блока tier1 над його
  головою — крос-тирний Y-порядок tier1<tier2 не інвертує.
- detach/side-column (`pack_side_column:328`), dept-eject (`:563`) рухають X/пакують праворуч —
  не піднімають картку над cur_head чи tier2 над tier1.
- far/mid LOD: layout Y LOD-незалежний (lod лише в staff_routes для розміру edge-box); колапс
  зменшує h ⟹ gap БІЛЬШИЙ, поріг sameBand (min(h)·0.35) МЕНШИЙ ⟹ лишається childBelow-clear. Жоден
  LOD не породжує childAbove.
- sameBand+gap СТРОГО взаємовиключні (загальне доведення): gap ⟹ |Δcy| > (fh+th)/2 + 0.5 >
  min(h)·0.35 ⟹ route_vertical=Some ⟹ НЕ sameBand. Тобто overlap-і-по-X випадок (route_horizontal=None
  і route_vertical=None) для lead-org недосяжний: cur_head↔card завжди рознесені tier_gap/vertical_gap.
ВИСНОВОК: lead-org оба ребра childBelow by construction. route_vertical ≡ route_ortho для них.
**A2.3 як lead-org-precedence не змінює ЖОДНОГО prod-досяжного lead-org ребра — чистий no-op.**

### Напрям 2 — принцип відповідальності. ПЕРЕОСМИСЛЕНО → знайдено ШИРШИЙ баг.
Який edges взагалі маршрутизує staff_routes? `staff_layout.rs:903` fresh `edges`, далі тільки:
**lead-org** (`:1091,:1101`) + **matrix/dotted** (`:1122`). Admin tree-ребра (`:695-701`) у цей vec
НЕ потрапляють (рендеряться row-tree-конектором, не staff_routes). Отже множина маршрутів =
{lead-org (childBelow завжди), matrix, dotted}.
- matrix/dotted беруться з `input.reports` (`:1109-1127`) — ДОВІЛЬНІ крос-лінки; обидва кінці лише
  мусять бути в node_ids (`:1113`), тирі/глибина довільні. ⟹ **matrix/dotted ребро МОЖЕ бути
  ціль-вище-джерела (childAbove)** — контракт напрям не обмежує.
- У ладдері для matrix/dotted preferHorizontal=true → H перший; якщо H блокований → V=route_ortho
  (`staff_routes.rs:506,536`), яке ЗАВЖДИ from.bottom→to.top (вниз). Для childAbove це **хибний
  напрям**. TS натомість V-кандидат ладдера = `verticalPolyline` (`staffEdgeGeometry.ts:388,:391`) —
  напрям-коректний + nullable. detour_edge:395 база теж route_ortho (вниз) ⟹ і detour хибний для
  childAbove. ⟹ **route_ortho як V-кандидат ладдера — ЛАТЕНТНИЙ geometry-баг для БУДЬ-ЯКОГО
  childAbove ребра, і matrix/dotted роблять його PROD-ДОСЯЖНИМ** (на відміну від lead-org).

### Вердикт крізь принцип відповідальності
Якщо Rust відповідає за КОРЕКТНУ геометрію маршрутів, то:
1. route_vertical (напрям-коректний, nullable) — НЕ YAGNI: це правильний примітив, якого в Rust бракує.
2. Але правильне МІСЦЕ для нього — **ЗАМІНА route_ortho→route_vertical У ЛАДДЕРІ** (обидва V-слоти,
   prefer і non-prefer), а НЕ lead-org-only precedence. Це:
   - фіксить РЕАЛЬНО досяжний matrix/dotted childAbove (поточний баг vs TS),
   - суб'юмить lead-org (childBelow → ідентично, бо route_vertical≡route_ortho там),
   - робить Rust ладдер точним портом TS (:388/:391),
   - прибирає потенційний вибір виродженого route_ortho на no-gap (route_vertical→null→skip).
3. A2.3-as-scoped (lead-org precedence, route_ortho лишається в ладдері) — **фіксить НЕДОСЯЖНИЙ кейс
   і ЛИШАЄ досяжний**. Lead-org-only precedence сам по собі — no-op (доведено Напрям 1).
   Golden-застереження: заміна в ладдері ширша за golden (childBelow ідентично; no-gap-вироджені та
   target-above matrix/dotted зміняться) — власник має прийняти, але це і є faithful-порт.

### (в) Ширший childAbove-баг (названо)
`staff_routes.rs:506,536` (V=route_ortho у ладдері) + `:395` (detour база route_ortho): для
matrix/dotted ребра з ціллю вище джерела (childAbove; `staff_layout.rs:1109-1127` не обмежує напрям)
і блокованим H — Rust малює маршрут У ХИБНОМУ напрямі (вниз), тоді як TS `verticalPolyline`
(`staffEdgeGeometry.ts:388,:391`) дав би коректний (вгору/null→around). Це ПОЗА scope A2.3 як
написано, але саме це, а не lead-org, вимагає route_vertical за принципом відповідальності.

## ВЕРДИКТ (оновлено): 🟡 — рекомендація РОЗШИРИТИ scope A2.3
- route_vertical як примітив — потрібен (не YAGNI).
- lead-org-only precedence — no-op (childAbove lead-org недосяжно, доведено по коду).
- Faithful + відповідальність → замінити route_ortho→route_vertical у ЛАДДЕРІ (V-слоти), що фіксить
  досяжний matrix/dotted childAbove. Інакше A2.3 фіксить порожнечу й лишає реальний баг.
- Якщо власник свідомо тримає вузький scope (lead-org precedence) — зафіксувати matrix/dotted
  childAbove як ОКРЕМИЙ відкритий борг, і НЕ подавати A2.3 як «виправлення напряму».
