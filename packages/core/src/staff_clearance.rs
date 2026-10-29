//! R6: детектор-оракул кліренсу й інтрузій (ЯК, T126) — **TEST-ONLY ВИМІР, без обходу**.
//!
//! Весь модуль під `#[cfg(test)]` (підключення в `lib.rs`): у прод-WASM не входить. Міряє, скільки
//! маршрут порушує, НЕ виправляє. «0 порушень» не заявляється.
//!
//! Геопримітиви (`seg_rect_distance`, `obstacle_rect`, interior-hit, `FrameRect`,
//! `frame_intrusion_count`) живуть у прод-модулі `staff_geom` і діляться з роутером (детур карток
//! R6-3b, around-lane+§12-маркер R6-4a) — ЄДИНЕ джерело, без «двох правд». Тут лишаються лише
//! тест-агрегати: `card_clearance` і `foreign_frame_intrusions`.

use crate::staff_edge_box::EdgeRect;
use crate::staff_geom::{
    frame_intrusion_count, obstacle_rect, seg_rect_distance, DeptPart, FrameRect,
};
use crate::types::StaffEdgeRoute;

/// Мінімальний дозволений кліренс лінії до чужої картки (req §5.1 / §10.4).
pub const MIN_CLEARANCE_PX: f32 = 8.0;

/// Звіт кліренсу: мінімум по схемі + кількість порушень 8px.
#[derive(Debug, Clone, PartialEq)]
pub struct ClearanceReport {
    pub min_clearance: f32,
    pub violations: usize,
}

/// Мін. кліренс ребро↔чужа-картка (self-exempt по id кінців) + лічильник порушень <8px.
/// Порт `clearance.ts::cardClearance`; картки — ефективні obstacle-прямокутники (`staff_geom::obstacle_rect`).
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

/// Сума (ребро,чужа-рамка) інтрузій по всій схемі — per-part A (membership через `member_of`).
/// Тонкий агрегат над прод `staff_geom::frame_intrusion_count` (одне джерело з §12-маркером роутера).
pub fn foreign_frame_intrusions(
    routes: &[StaffEdgeRoute],
    frames: &[FrameRect],
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
) -> usize {
    routes
        .iter()
        .map(|e| frame_intrusion_count(&e.points, &e.from_id, &e.to_id, frames, member_of))
        .sum()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::staff_geom::{polyline_hits_box_interior, INTERIOR_EPS};
    use crate::types::StaffRoutePoint;

    type Pt = StaffRoutePoint;

    fn pt(x: f32, y: f32) -> Pt {
        Pt { x, y }
    }
    fn route(from: &str, to: &str, points: Vec<Pt>) -> StaffEdgeRoute {
        StaffEdgeRoute {
            from_id: from.to_string(),
            to_id: to.to_string(),
            kind: "admin".to_string(),
            points,
            marked: None,
            ends_on_dept_top: None,
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

    // --- card_clearance ---

    #[test]
    fn card_clearance_clean_route_has_zero_violations() {
        let routes = [route("a", "b", vec![pt(0.0, 0.0), pt(0.0, 300.0)])];
        let boxes = [
            ebox("a", -50.0, -10.0, 100.0, 20.0),
            ebox("b", -50.0, 290.0, 100.0, 20.0),
            ebox("X", 60.0, 120.0, 100.0, 60.0), // зазор 60px
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
        let routes = [route("a", "b", vec![pt(110.0, 0.0), pt(110.0, 300.0)])];
        let boxes = [
            ebox("a", 60.0, -10.0, 100.0, 20.0),
            ebox("b", 60.0, 290.0, 100.0, 20.0),
            ebox("X", 60.0, 120.0, 100.0, 60.0),
        ];
        let rep = card_clearance(&routes, &boxes);
        assert!(rep.violations > 0);
        assert_eq!(rep.min_clearance, 0.0);
    }

    #[test]
    fn card_clearance_exempts_own_endpoints() {
        let routes = [route("a", "b", vec![pt(110.0, 150.0), pt(110.0, 400.0)])];
        let boxes = [
            ebox("a", 60.0, 120.0, 100.0, 60.0),
            ebox("b", 60.0, 390.0, 100.0, 20.0),
        ];
        assert_eq!(card_clearance(&routes, &boxes).violations, 0);
    }

    #[test]
    fn card_clearance_uses_figma_row_obstacle_not_tile() {
        let routes = [route("a", "b", vec![pt(200.0, 0.0), pt(200.0, 300.0)])];
        let mut row = ebox("X", 120.0, 10.0, 40.0, 40.0);
        row.obstacle = Some(crate::staff_edge_box::Rect {
            x: 120.0,
            y: 120.0,
            width: 200.0,
            height: 60.0,
        });
        let boxes = [
            ebox("a", 150.0, -10.0, 100.0, 20.0),
            ebox("b", 150.0, 290.0, 100.0, 20.0),
            row,
        ];
        assert!(card_clearance(&routes, &boxes).violations > 0);
    }

    // --- foreign_frame_intrusions (per-part A) ---

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
            frame("d2", None, 150.0, 0.0, 100.0, 100.0),
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
        let routes = [route("a", "b", vec![pt(50.0, 50.0), pt(350.0, 50.0)])];
        let frames = [
            frame("d1", Some(0), 0.0, 0.0, 100.0, 100.0),
            frame("d1", Some(1), 150.0, 0.0, 100.0, 100.0),
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
            _ => None,
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
