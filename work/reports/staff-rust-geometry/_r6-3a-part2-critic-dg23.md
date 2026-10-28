claude-opus-4-8

# R6-3a частина-2 — критик ПЕРЕД зрізом (Dg23)

ДАЛІ: читаю staff_routes.rs, staff_edge_box.rs, types.rs, canvasLayout.ts, lib.rs, контекст-доки.

## ФАКТИ (звірено з кодом)
- staff_routes.rs:61 сигнатура `staff_routes(nodes:&[StaffNodeGeo], edges:&[StaffEdge], lod:&str)`;
  lookup лише по nodes (:62 `nodes.iter().find`); self-loop skip (:65); dangling skip (:68);
  порядок сегментів = порядок edges (:64); kind копіюється верватим (:73-74).
- route_ortho (:42-56) і port (:31-38) працюють на StaffNodeGeo; corridorY=(from.y+from.h+to.y)/2;
  STRAIGHT_EPS 0.5.
- staff_edge_box.rs: near+None → person_visual_world_rect "near" = (x,y,w,h) ПОВНИЙ бокс
  (:75-76,:144) ⇒ ТОЧНИЙ паритет сирому вузлу. mid→band, far→dot (менші, порт зсувається).
  figma near → порт на tile (:127-139) + obstacle=повний рядок. gojs near → коротший AABB.
  EdgeRect/PersonEdgeHints/Rect — БЕЗ derive(TS) (:18,:38) ⇒ regen НЕ тригериться.
- types.rs: StaffEdge.kind "admin|matrix|dotted|cross-tier" (:523, докстр :336);
  StaffOrgCardGeo по org_id (:458); StaffRouteSet контракт незмінний (:561).
- canvasLayout.ts:245 mgrHead→curHead kind='cross-tier' (person→person);
  :249 curHead→card.orgId kind='cross-tier' (person→ORG). Обидва cross-tier ⇒ kind НЕ розрізняє
  тип кінця.
- lib.rs:6-7 `#[cfg(test)] mod staff_clearance;` ⇒ детектор у прод-WASM НЕ входить.
- staff_routes БЕЗ зовнішніх викликачів (grep: лише lib.rs re-export) ⇒ зміна сигнатури ламає
  ТІЛЬКИ in-file R6-1 тести.
- Рішення власника §6: джерело = низ картки керівника; ціль = верх картки (інакше верх рамки лише
  d.head===c&kind≠int); deptBottom НЕ порт. E.1: ярусні org-лінки = .plink (R6-7, окремо).

## РІШЕННЯ / ОЦІНКА ПАСТОК
1. Колізія id-простору person.id vs org_id (ВИСОКА) — kind='cross-tier' не каже, чи to_id org;
   єдина мапа клобить при збігу. Рек: ДВА лінійні find (nodes→org_cards, person-first), без HashMap.
2. cross-tier наївний drop — НЕ mardefault: bottom-center→top-center = §6 для картки-цілі. Ризик лише
   якщо запекти plink/label/frame-port. Тримати суцільний ortho, kind верватим.
3. Паритет far: near-тести незмінні; skips_self_loop юзає far але НЕ пінить координати → виживе.
4. Сигнатура: безпечна (нема викликачів); map id→hints детермінований (порядок задають edges).
5. Детермінізм/виродженості: лінійні find зберігають; dangling = нема в обох мапах.
6. Детектор test-only — ПІДТВЕРДЖЕНО (lib.rs:6-7). Оракул лише в #[cfg(test)], не в staff_routes.
7. R6-7 не блокується: kind верватим, лише геометрія; R6-7 рестайлить пізніше.
+ HOLE-1 hints — load-bearing (avatar-dock ADR-0002), не косметика; порожня мапа = валід-дефолт.

ВЕРДИКТ: GREEN на старт (red-first), з 3 обовʼязковими пінами дизайну.
