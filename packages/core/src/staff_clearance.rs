//! R6-3a: детектор-оракул кліренсу й інтрузій (ЯК, T126) — **TEST-ONLY ВИМІР, без обходу**.
//!
//! Весь модуль під `#[cfg(test)]` (підключення в `lib.rs`): у прод-WASM не входить. Це НЕ фіча
//! маршрутизації, а вимірювач для TDD-оракула R6 — міряє, скільки маршрут порушує, НЕ виправляє.
//! «0 порушень» не заявляється: обхід карток — R6-3b, рамок — R6-4.
//!
//! Точні геопримітиви (`seg_rect_distance`, `obstacle_rect`) живуть у прод-модулі `staff_geom` і
//! діляться з детуром обходу (`staff_routes`) — ЄДИНЕ джерело, без «двох правд» (R6-3b PIN-3).
//! Тут лишається test-only: interior-hit (sampling, прод-паритет `segmentHitsBoxInterior`) +
//! агрегати card_clearance / foreign_frame_intrusions + типи FrameRect/ClearanceReport.
//!
//! **Членство рамки — per-part (A):** рамка `(department_id, part_index)` «своя» ребру ⟺ хоча б один
//! кінець має РІВНУ пару (Option-aware). Org-кінці (простір `org_id`) членства не мають.

use crate::staff_edge_box::EdgeRect;
use crate::staff_geom::{obstacle_rect, seg_rect_distance};
use crate::types::{StaffEdgeRoute, StaffRoutePoint};

/// Мінімальний дозволений кліренс лінії до чужої картки (req §5.1 / §10.4).
pub const MIN_CLEARANCE_PX: f32 = 8.0;
/// Відступ interior-hit (прод-паритет `segmentHitsBoxInterior`, staffEdgeGeometry.ts:209).
pub const INTERIOR_EPS: f32 = 0.75;

type Pt = StaffRoutePoint;

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

/// Звіт кліренсу: мінімум по схемі + кількість порушень 8px.
#[derive(Debug, Clone, PartialEq)]
pub struct ClearanceReport {
    pub min_clearance: f32,
    pub violations: usize,
}

/// Мін. кліренс ребро↔чужа-картка (self-exempt по id кінців) + лічильник порушень <8px.
/// Порт `clearance.ts::cardClearance`; картки беруться як ефективні obstacle-прямокутники (спільний
/// `staff_geom::obstacle_rect`).
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

/// Ідентичність частини відділу: `(department_id, part_index)`. Рівність Option-aware.
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
/// Інтрузія — interior-hit eps 0.75 (НЕ f32 `==0`). per-part A.
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

    // --- card_clearance: ДИСКРИМІНАТОР на ручних полілініях ---

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

    // --- foreign_frame_intrusions: ДИСКРИМІНАТОР + per-part членство (A) ---

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
        // Рішення власника A: ребро обома кінцями в (d1,part0); рамка (d1,part1) — ЧУЖА.
        let routes = [route("a", "b", vec![pt(50.0, 50.0), pt(350.0, 50.0)])];
        let frames = [
            frame("d1", Some(0), 0.0, 0.0, 100.0, 100.0),
            frame("d1", Some(1), 150.0, 0.0, 100.0, 100.0), // та сама dept, ІНША part
            frame("d1", Some(0), 300.0, 0.0, 100.0, 100.0),
        ];
        let member = |id: &str| match id {
            "a" | "b" => Some(("d1".to_string(), Some(0u32))),
            _ => None,
        };
        assert_eq!(foreign_frame_intrusions(&routes, &frames, &member), 1);
    }

    #[test]
    fn foreign_frame_own_part_not_counted() {
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
        let edge_pts = [pt(100.0, 0.0), pt(100.0, 200.0)];
        assert!(!polyline_hits_box_interior(
            &edge_pts,
            100.0,
            50.0,
            100.0,
            100.0,
            INTERIOR_EPS
        ));
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
