//! R6-3a: детектор-оракул кліренсу й інтрузій (ЯК, T126) — **TEST-ONLY ВИМІР, без обходу**.
//!
//! Весь модуль під `#[cfg(test)]` (підключення в `lib.rs`): у прод-WASM не входить. Це НЕ фіча
//! маршрутизації, а вимірювач для TDD-оракула R6 — міряє, скільки маршрут порушує, НЕ виправляє.
//! «0 порушень» на R6-3a НЕ заявляється: обхід карток/рамок — R6-3b/R6-4.
//!
//! Два незалежні виміри, портовані з двох TS-джерел ВІРНО (кожен зі своєю семантикою eps):
//!  - **кліренс ≥8px** — ТОЧНА відстань сегмент↔прямокутник (`_shps-routing-probe/clearance.ts::
//!    segRectDistance`): семпл проґавив би дотик на довгому сегменті, тому точна.
//!  - **інтрузія в рамку** — SAMPLING interior-hit із eps **0.75** (`staffEdgeGeometry.ts::
//!    segmentHitsBoxInterior`), а НЕ f32 `==0` (рішення власника Dg23, пастка P1): дзеркалить
//!    прод-детектор, яким SDK реально судить forced-маршрути.
//!
//! **Членство рамки — per-part (A, рішення власника):** рамка `(department_id, part_index)` «своя»
//! ребру ⟺ хоча б один кінець має РІВНУ пару (Option-aware). Magnetic-розріз дає кілька рамок на
//! `department_id`; лінія крізь ЧУЖУ part того ж депу = заборонений «третій перетин» (§3.2) = foreign.
//! Org-кінці (простір `org_id`) членства не мають → не «свої» жодній рамці (P2).

use crate::staff_edge_box::EdgeRect;
use crate::types::{StaffEdgeRoute, StaffRoutePoint};

/// Мінімальний дозволений кліренс лінії до чужої картки (req §5.1 / §10.4).
pub const MIN_CLEARANCE_PX: f32 = 8.0;
/// Відступ interior-hit (прод-паритет `segmentHitsBoxInterior`, staffEdgeGeometry.ts:209).
pub const INTERIOR_EPS: f32 = 0.75;
/// Поріг знака орієнтації для f32 (пастка P1: НЕ 1e-9 — нижче f32-epsilon; фікстури далеко від межі).
const ORIENT_EPS: f32 = 1e-6;

type Pt = StaffRoutePoint;

fn clampf(v: f32, lo: f32, hi: f32) -> f32 {
    if v < lo {
        lo
    } else if v > hi {
        hi
    } else {
        v
    }
}

fn hypot(dx: f32, dy: f32) -> f32 {
    (dx * dx + dy * dy).sqrt()
}

/// Відстань точки `p` до відрізка `a→b` (`clearance.ts::pointSegDist`).
fn point_seg_dist(p: &Pt, a: &Pt, b: &Pt) -> f32 {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let len2 = dx * dx + dy * dy;
    if len2 == 0.0 {
        return hypot(p.x - a.x, p.y - a.y);
    }
    let t = clampf(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0.0, 1.0);
    hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/// Знак орієнтації трійки (`clearance.ts::orient`, eps підвищено до f32-безпечного — P1).
fn orient(o: &Pt, a: &Pt, b: &Pt) -> i32 {
    let v = (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    if v > ORIENT_EPS {
        1
    } else if v < -ORIENT_EPS {
        -1
    } else {
        0
    }
}

fn on_seg(p: &Pt, a: &Pt, b: &Pt) -> bool {
    a.x.min(b.x) - ORIENT_EPS <= p.x
        && p.x <= a.x.max(b.x) + ORIENT_EPS
        && a.y.min(b.y) - ORIENT_EPS <= p.y
        && p.y <= a.y.max(b.y) + ORIENT_EPS
}

/// Перетин відрізків (транзверсально / колінеарно / дотиком) — `clearance.ts::segSegIntersect`.
fn seg_seg_intersect(a1: &Pt, a2: &Pt, b1: &Pt, b2: &Pt) -> bool {
    let o1 = orient(a1, a2, b1);
    let o2 = orient(a1, a2, b2);
    let o3 = orient(b1, b2, a1);
    let o4 = orient(b1, b2, a2);
    if o1 != o2 && o3 != o4 {
        return true;
    }
    (o1 == 0 && on_seg(b1, a1, a2))
        || (o2 == 0 && on_seg(b2, a1, a2))
        || (o3 == 0 && on_seg(a1, b1, b2))
        || (o4 == 0 && on_seg(a2, b1, b2))
}

/// Мін. відстань відрізок↔відрізок (`clearance.ts::segSegDist`).
fn seg_seg_dist(a1: &Pt, a2: &Pt, b1: &Pt, b2: &Pt) -> f32 {
    if seg_seg_intersect(a1, a2, b1, b2) {
        return 0.0;
    }
    point_seg_dist(a1, b1, b2)
        .min(point_seg_dist(a2, b1, b2))
        .min(point_seg_dist(b1, a1, a2))
        .min(point_seg_dist(b2, a1, a2))
}

fn point_in_rect(p: &Pt, x: f32, y: f32, w: f32, h: f32) -> bool {
    p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h
}

/// ТОЧНА відстань сегмента `a→b` до прямокутника (0 якщо перетинає) — `clearance.ts::segRectDistance`.
pub fn seg_rect_distance(a: &Pt, b: &Pt, x: f32, y: f32, w: f32, h: f32) -> f32 {
    if point_in_rect(a, x, y, w, h) || point_in_rect(b, x, y, w, h) {
        return 0.0;
    }
    let corners = [
        Pt { x, y },
        Pt { x: x + w, y },
        Pt { x: x + w, y: y + h },
        Pt { x, y: y + h },
    ];
    let mut min = f32::INFINITY;
    for i in 0..4 {
        let c = &corners[i];
        let d = &corners[(i + 1) % 4];
        min = min.min(seg_seg_dist(a, b, c, d));
    }
    min
}

/// SAMPLING interior-hit: сегмент `a→b` заходить усередину бокса, звуженого на `eps` з усіх боків.
/// Порт `staffEdgeGeometry.ts::segmentHitsBoxInterior` (8 семплів t=1/8..7/8) — вірність прод-детектору.
fn segment_hits_box_interior(a: &Pt, b: &Pt, x: f32, y: f32, w: f32, h: f32, eps: f32) -> bool {
    let left = x + eps;
    let right = x + w - eps;
    let top = y + eps;
    let bottom = y + h - eps;
    if right <= left || bottom <= top {
        return false;
    }
    let samples = 8;
    for i in 1..samples {
        let t = i as f32 / samples as f32;
        let px = a.x + (b.x - a.x) * t;
        let py = a.y + (b.y - a.y) * t;
        if px > left && px < right && py > top && py < bottom {
            return true;
        }
    }
    false
}

/// Полілінія заходить усередину бокса (`staffEdgeGeometry.ts::polylineHitsBoxInterior`).
pub fn polyline_hits_box_interior(points: &[Pt], x: f32, y: f32, w: f32, h: f32, eps: f32) -> bool {
    points
        .windows(2)
        .any(|s| segment_hits_box_interior(&s[0], &s[1], x, y, w, h, eps))
}

/// Ефективний прямокутник бокса для перешкоди: figma-row розгортає `obstacle` (весь рядок),
/// інакше сам бокс (пастка P7, дзеркалить TS `(b.obstacle ?? b)`).
fn obstacle_rect(b: &EdgeRect) -> (f32, f32, f32, f32) {
    match &b.obstacle {
        Some(o) => (o.x, o.y, o.width, o.height),
        None => (b.x, b.y, b.width, b.height),
    }
}

/// Звіт кліренсу: мінімум по схемі + кількість порушень 8px.
#[derive(Debug, Clone, PartialEq)]
pub struct ClearanceReport {
    pub min_clearance: f32,
    pub violations: usize,
}

/// Мін. кліренс ребро↔чужа-картка (self-exempt по id кінців) + лічильник порушень <8px.
/// Порт `clearance.ts::cardClearance`; картки беруться як ефективні obstacle-прямокутники (P7).
pub fn card_clearance(routes: &[StaffEdgeRoute], boxes: &[EdgeRect]) -> ClearanceReport {
    let mut min_clearance = f32::INFINITY;
    let mut violations = 0usize;
    for edge in routes {
        for b in boxes {
            if b.id == edge.from_id || b.id == edge.to_id {
                continue; // власний кінець — не перешкода
            }
            let (rx, ry, rw, rh) = obstacle_rect(b);
            for s in edge.points.windows(2) {
                let d = seg_rect_distance(&s[0], &s[1], rx, ry, rw, rh);
                if d < min_clearance {
                    min_clearance = d;
                }
                if d < MIN_CLEARANCE_PX {
                    violations += 1;
                }
            }
        }
    }
    ClearanceReport {
        min_clearance: if min_clearance.is_infinite() {
            MIN_CLEARANCE_PX
        } else {
            min_clearance
        },
        violations,
    }
}

/// Ідентичність частини відділу: `(department_id, part_index)`. Рівність Option-aware (P4).
pub type DeptPart = (String, Option<u32>);

/// Рамка частини відділу як перешкода (per-part, A).
#[derive(Debug, Clone, PartialEq)]
pub struct FrameRect {
    pub department_id: String,
    pub part_index: Option<u32>,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

impl FrameRect {
    fn key(&self) -> DeptPart {
        (self.department_id.clone(), self.part_index)
    }
}

/// Кількість (ребро,рамка) пар, де ребро заходить у ЧУЖУ рамку (не джерела й не цілі — §3.2).
/// Членство кінця задає `member_of` (id → `(department_id, part_index)`; org-кінці → `None`).
/// Інтрузія — interior-hit eps 0.75 (НЕ f32 `==0`, P1). Об'єднує `edgeIntrudesForeignFrame` +
/// `throughThirdFrame` на per-part A: «своя» рамка ⟺ ключ рамки == член одного з кінців.
pub fn foreign_frame_intrusions(
    routes: &[StaffEdgeRoute],
    frames: &[FrameRect],
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
) -> usize {
    let mut count = 0usize;
    for edge in routes {
        let src = member_of(&edge.from_id);
        let dst = member_of(&edge.to_id);
        for f in frames {
            let k = f.key();
            if Some(&k) == src.as_ref() || Some(&k) == dst.as_ref() {
                continue; // рамка джерела або цілі — дозволений перетин
            }
            if polyline_hits_box_interior(&edge.points, f.x, f.y, f.width, f.height, INTERIOR_EPS) {
                count += 1;
            }
        }
    }
    count
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pt(x: f32, y: f32) -> Pt {
        Pt { x, y }
    }
    fn route(from: &str, to: &str, points: Vec<Pt>) -> StaffEdgeRoute {
        StaffEdgeRoute {
            from_id: from.to_string(),
            to_id: to.to_string(),
            kind: "admin".to_string(),
            points,
        }
    }
    fn ebox(id: &str, x: f32, y: f32, w: f32, h: f32) -> EdgeRect {
        EdgeRect {
            id: id.to_string(),
            x,
            y,
            width: w,
            height: h,
            obstacle: None,
        }
    }

    // --- seg_rect_distance: точність (дзеркалить clearance.ts) ---

    #[test]
    fn seg_rect_distance_zero_when_segment_crosses_rect() {
        // Горизонтальний сегмент крізь прямокутник [100..200]x[100..200].
        let d = seg_rect_distance(
            &pt(0.0, 150.0),
            &pt(300.0, 150.0),
            100.0,
            100.0,
            100.0,
            100.0,
        );
        assert_eq!(d, 0.0);
    }

    #[test]
    fn seg_rect_distance_measures_gap_far_from_threshold() {
        // Сегмент на y=50, прямокутник top=100 → зазор рівно 50 (далеко від 8px-порога, P6).
        let d = seg_rect_distance(&pt(0.0, 50.0), &pt(300.0, 50.0), 100.0, 100.0, 100.0, 100.0);
        assert!((d - 50.0).abs() < 1e-3, "{d}");
    }

    // --- card_clearance: ДИСКРИМІНАТОР на ручних полілініях (P8) ---

    #[test]
    fn card_clearance_clean_route_has_zero_violations() {
        // Ребро a→b далеко оминає чужу картку X (зазор 60px, далеко від 8px-порога).
        let routes = [route("a", "b", vec![pt(0.0, 0.0), pt(0.0, 300.0)])];
        let boxes = [
            ebox("a", -50.0, -10.0, 100.0, 20.0),
            ebox("b", -50.0, 290.0, 100.0, 20.0),
            ebox("X", 60.0, 120.0, 100.0, 60.0), // лівий край x=60, зазор до лінії x=0 = 60px
        ];
        let rep = card_clearance(&routes, &boxes);
        assert_eq!(rep.violations, 0);
        assert!(
            rep.min_clearance > MIN_CLEARANCE_PX,
            "{}",
            rep.min_clearance
        );
    }

    #[test]
    fn card_clearance_intruding_route_reports_violations() {
        // Та сама картка X, але маршрут веде ПРЯМО крізь неї → порушення >0, кліренс 0.
        let routes = [route("a", "b", vec![pt(110.0, 0.0), pt(110.0, 300.0)])];
        let boxes = [
            ebox("a", 60.0, -10.0, 100.0, 20.0),
            ebox("b", 60.0, 290.0, 100.0, 20.0),
            ebox("X", 60.0, 120.0, 100.0, 60.0), // x∈[60..160], лінія x=110 всередині
        ];
        let rep = card_clearance(&routes, &boxes);
        assert!(rep.violations > 0, "очікували порушення, маємо 0");
        assert_eq!(rep.min_clearance, 0.0);
    }

    #[test]
    fn card_clearance_exempts_own_endpoints() {
        // Лінія стартує в своїй картці a — це НЕ порушення (self-exempt по id).
        let routes = [route("a", "b", vec![pt(110.0, 150.0), pt(110.0, 400.0)])];
        let boxes = [
            ebox("a", 60.0, 120.0, 100.0, 60.0), // лінія стартує всередині a
            ebox("b", 60.0, 390.0, 100.0, 20.0),
        ];
        let rep = card_clearance(&routes, &boxes);
        assert_eq!(rep.violations, 0);
    }

    #[test]
    fn card_clearance_uses_figma_row_obstacle_not_tile() {
        // Бокс докнутий на tile (маленький), але obstacle = весь рядок (P7): лінія крізь рядок,
        // повз tile — має рахуватись порушенням по obstacle-прямокутнику.
        let routes = [route("a", "b", vec![pt(200.0, 0.0), pt(200.0, 300.0)])];
        let mut row = ebox("X", 120.0, 10.0, 40.0, 40.0); // tile далеко від x=200
        row.obstacle = Some(crate::staff_edge_box::Rect {
            x: 120.0,
            y: 120.0,
            width: 200.0, // рядок x∈[120..320] накриває x=200
            height: 60.0,
        });
        let boxes = [
            ebox("a", 150.0, -10.0, 100.0, 20.0),
            ebox("b", 150.0, 290.0, 100.0, 20.0),
            row,
        ];
        let rep = card_clearance(&routes, &boxes);
        assert!(rep.violations > 0, "obstacle-рядок має ловити інтрузію");
    }

    // --- foreign_frame_intrusions: ДИСКРИМІНАТОР + per-part членство (P8, A) ---

    fn frame(dept: &str, part: Option<u32>, x: f32, y: f32, w: f32, h: f32) -> FrameRect {
        FrameRect {
            department_id: dept.to_string(),
            part_index: part,
            x,
            y,
            width: w,
            height: h,
        }
    }

    #[test]
    fn foreign_frame_clean_route_has_zero() {
        // Ребро в межах свого депу d1; рамка d1 — своя, інших рамок нема.
        let routes = [route("a", "b", vec![pt(50.0, 0.0), pt(50.0, 200.0)])];
        let frames = [frame("d1", None, 0.0, 0.0, 100.0, 220.0)];
        let member = |id: &str| match id {
            "a" | "b" => Some(("d1".to_string(), None)),
            _ => None,
        };
        assert_eq!(foreign_frame_intrusions(&routes, &frames, &member), 0);
    }

    #[test]
    fn foreign_frame_through_third_frame_is_counted() {
        // Ребро d1→d3 проходить крізь ЧУЖУ рамку d2 → 1 інтрузія.
        let routes = [route("a", "c", vec![pt(50.0, 50.0), pt(350.0, 50.0)])];
        let frames = [
            frame("d1", None, 0.0, 0.0, 100.0, 100.0),
            frame("d2", None, 150.0, 0.0, 100.0, 100.0), // чужа, лінія y=50 крізь неї
            frame("d3", None, 300.0, 0.0, 100.0, 100.0),
        ];
        let member = |id: &str| match id {
            "a" => Some(("d1".to_string(), None)),
            "c" => Some(("d3".to_string(), None)),
            _ => None,
        };
        assert_eq!(foreign_frame_intrusions(&routes, &frames, &member), 1);
    }

    #[test]
    fn foreign_frame_per_part_other_part_is_foreign() {
        // Рішення власника A: ребро обома кінцями в (d1,part0); рамка (d1,part1) — ЧУЖА,
        // лінія крізь неї = інтрузія. (per-department дало б 0 — цей тест це й стереже.)
        let routes = [route("a", "b", vec![pt(50.0, 50.0), pt(350.0, 50.0)])];
        let frames = [
            frame("d1", Some(0), 0.0, 0.0, 100.0, 100.0),
            frame("d1", Some(1), 150.0, 0.0, 100.0, 100.0), // та сама dept, ІНША part
            frame("d1", Some(0), 300.0, 0.0, 100.0, 100.0), // окрема частина part0-регіону
        ];
        let member = |id: &str| match id {
            "a" | "b" => Some(("d1".to_string(), Some(0u32))),
            _ => None,
        };
        // Рамки part0 — свої (ключ (d1,Some(0))); рамка part1 — чужа → рівно 1 інтрузія.
        assert_eq!(foreign_frame_intrusions(&routes, &frames, &member), 1);
    }

    #[test]
    fn foreign_frame_own_part_not_counted() {
        // Контроль до попереднього: якщо та сама рамка має ключ part0 (свій) — 0 інтрузій,
        // хоча геометрично лінія її перетинає. Доводить, що рахується саме ЧУЖІСТЬ, не геометрія.
        let routes = [route("a", "b", vec![pt(50.0, 50.0), pt(350.0, 50.0)])];
        let frames = [frame("d1", Some(0), 150.0, 0.0, 100.0, 100.0)];
        let member = |id: &str| match id {
            "a" | "b" => Some(("d1".to_string(), Some(0u32))),
            _ => None,
        };
        assert_eq!(foreign_frame_intrusions(&routes, &frames, &member), 0);
    }

    #[test]
    fn foreign_frame_org_endpoint_is_non_member() {
        // Org-кінець (простір org_id) членства не має → будь-яка перетнута рамка чужа (P2).
        let routes = [route("head", "org9", vec![pt(50.0, 50.0), pt(350.0, 50.0)])];
        let frames = [frame("d2", None, 150.0, 0.0, 100.0, 100.0)];
        let member = |id: &str| match id {
            "head" => Some(("d1".to_string(), None)),
            _ => None, // org9 — не член
        };
        assert_eq!(foreign_frame_intrusions(&routes, &frames, &member), 1);
    }

    #[test]
    fn interior_hit_uses_eps_not_exact_zero() {
        // Лінія рівно по межі бокса (x=100) НЕ рахується інтрузією (звуження на eps 0.75):
        // доводить interior-eps, а не дотик-нуль (P1).
        let edge_pts = [pt(100.0, 0.0), pt(100.0, 200.0)];
        assert!(!polyline_hits_box_interior(
            &edge_pts,
            100.0,
            50.0,
            100.0,
            100.0,
            INTERIOR_EPS
        ));
        // А лінія глибоко всередині (x=150) — так.
        let inside = [pt(150.0, 0.0), pt(150.0, 200.0)];
        assert!(polyline_hits_box_interior(
            &inside,
            100.0,
            50.0,
            100.0,
            100.0,
            INTERIOR_EPS
        ));
    }
}
