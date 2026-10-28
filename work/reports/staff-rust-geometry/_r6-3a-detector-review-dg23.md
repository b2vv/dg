claude-opus-4-8

ДАЛІ: звірити типи EdgeRect/Rect/StaffEdgeRoute/StaffRoutePoint із портом; перевірити вірність порту обох вимірів, f32-пастки, дискримінаторність тестів, підрахунок пар проти TS, мертвий код.

## ФАКТИ (звірка)

ТИПИ: EdgeRect{id,x,y,width,height,obstacle:Option<Rect>} (staff_edge_box.rs:19-25), Rect{x,y,w,h} (:30-34), StaffEdgeRoute{from_id,to_id,kind,points} (types.rs:545-552), StaffRoutePoint{x,y} (:533-536). Порт використовує поля коректно.

МОДУЛЬ: lib.rs:6-7 `#[cfg(test)] mod staff_clearance;` — test-only підтверджено.

1. ВІРНІСТЬ ПОРТУ:
- clearance (seg_rect_distance): clampf/point_seg_dist/orient/on_seg/seg_seg_intersect/seg_seg_dist/point_in_rect/seg_rect_distance — рядок-у-рядок = clearance.ts:16-87. Math.hypot→власний hypot (екв. окрім f32-overflow, нерелевантно).
- interior-hit: segment_hits_box_interior/polyline — точний порт staffEdgeGeometry.ts:206-237 (8 семплів t=1/8..7/8, строгі < >, eps 0.75).
- P7 obstacle_rect = `box.obstacle ?? box` ПІДТВЕРДЖЕНО staffEdgeGeometry.ts:48,290,354. Fidelity ОК.

2. f32-ПАСТКИ:
- ORIENT_EPS=1e-6 замість TS 1e-9: доречно (1e-9 < f32-eps ~1.19e-7 → став би точним ==). Застосовано однаково в orient і on_seg.
- INFO: 1e-6 — абсолютний поріг на крос-добуток; при великих координатах (~1000+) f32-похибка добутку може перевищити 1e-6 у майже-колінеарних випадках. Але осьові ортогональні маршрути + круглі фікстури цього уникають; впливає лише на exact-touch у clearance і деградує м'яко до min(pointSegDist). Для test-only оракула прийнятно.
- осьові ребра: v=0 точно для колінеарних → гілка on_seg, = TS.

3. ТЕСТИ-ДИСКРИМІНАТОРИ: усі 12 справжні, з парними + / - контролями:
- clean=0 / intrude>0 на ТІЙ САМІЙ картці X (змінюється лише маршрут) — card_clearance_clean vs _intruding.
- self-exempt: лінія стартує в своїй a → 0 (ламалось би на >0).
- figma-row obstacle: tile далеко (x=120..160), obstacle-рядок накриває x=200 → лов лише по obstacle (P7-дискримінатор).
- per-part A: (d1,1) чужа → 1, тоді own_part_not_counted той самий геом-перетин (d1,0)=свій → 0 (доводить чужість, не геометрію).
- org-end: org9→None, Some(k)==None ніколи → 1. None ніколи не збігається з жодною рамкою (P2 коректно).
- eps-межа: лінія x=100 по межі → 0, x=150 всередині → hit (P1).
- фікстури далеко від 8px (зазор 50/60px; коментар ":307/:302 ~50px" насправді 60px — косметика, асерт лише >8).

4. ПІДРАХУНОК: card_clearance — per (ребро,картка,сегмент), = TS cardClearance. foreign_frame_intrusions — per (ребро,рамка) (polyline bool, count++), = throughThirdFrame per-frame + детекція interior-hit з edgeIntrudesForeignFrame (задокументований гібрид, P1). id-простори не плутаються: членство через member_of (відповідальність викликача), self-exempt card_clearance по b.id. Жодних хибних members у самому модулі.

5. МЕРТВИЙ КОД: усі pub (seg_rect_distance, polyline_hits_box_interior, card_clearance, foreign_frame_intrusions, FrameRect, ClearanceReport, DeptPart, консти) вжиті тестами; приватні (key, obstacle_rect, hypot, clampf, orient...) вжиті. Модуль cfg(test) → не входить у прод. Гейти зелені.

6. ЧЕСНІСТЬ: docs :4-5 явно «0 порушень НЕ заявляється», обхід = R6-3b/4. Детектор лише міряє (повертає counts), не виправляє.

## РІШЕННЯ: GREEN. Блокерів нема. Частину-1 можна комітити як є.
