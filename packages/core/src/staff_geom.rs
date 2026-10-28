//! Спільні геопримітиви staff (T126): ТОЧНА відстань сегмент↔прямокутник + ефективний obstacle-rect.
//!
//! Прод-модуль (НЕ test-only). Єдине джерело для ДВОХ споживачів — детур обходу карток
//! (`staff_routes`, прод) і детектор-оракул (`staff_clearance`, test) — щоб не з'явилося «двох правд»
//! розгортання figma-row чи порогу знака (пастка PIN-3). Порт `_shps-routing-probe/clearance.ts`.

use crate::staff_edge_box::EdgeRect;
use crate::types::StaffRoutePoint;

/// Поріг знака орієнтації для f32 (НЕ TS-ний 1e-9 — нижче f32-epsilon; фікстури далеко від межі).
pub const ORIENT_EPS: f32 = 1e-6;

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

/// Знак орієнтації трійки (`clearance.ts::orient`, eps f32-безпечний).
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

/// Ефективний прямокутник бокса для перешкоди: figma-row розгортає `obstacle` (весь рядок),
/// інакше сам бокс. Єдине джерело (дзеркалить TS `(b.obstacle ?? b)`) — без «двох правд».
pub fn obstacle_rect(b: &EdgeRect) -> (f32, f32, f32, f32) {
    match &b.obstacle {
        Some(o) => (o.x, o.y, o.width, o.height),
        None => (b.x, b.y, b.width, b.height),
    }
}

/// Відступ interior-hit (прод-паритет `segmentHitsBoxInterior`, staffEdgeGeometry.ts:209).
pub const INTERIOR_EPS: f32 = 0.75;

/// SAMPLING interior-hit: сегмент `a→b` заходить усередину бокса, звуженого на `eps`.
/// Порт `staffEdgeGeometry.ts::segmentHitsBoxInterior` (8 семплів t=1/8..7/8).
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

/// Ідентичність частини відділу: `(department_id, part_index)`. Рівність Option-aware (per-part A).
pub type DeptPart = (String, Option<u32>);

/// Рамка частини відділу як перешкода (per-part A). Спільна прод-структура для роутера (around-lane +
/// §12-маркер) і детектора-оракула (`staff_clearance`) — без «двох правд».
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
    /// Ключ членства `(department_id, part_index)`.
    pub fn key(&self) -> DeptPart {
        (self.department_id.clone(), self.part_index)
    }
}

/// Скільки ЧУЖИХ рамок (не джерела й не цілі ребра — §3.2) пенетрує полілінія. Членство кінця задає
/// `member_of` (id → `(department_id, part_index)`; org-кінці → `None`). Інтрузія — interior-hit eps 0.75.
/// Єдине джерело для §12-маркера роутера й агрегату детектора (per-part A).
pub fn frame_intrusion_count(
    points: &[Pt],
    from_id: &str,
    to_id: &str,
    frames: &[FrameRect],
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
) -> usize {
    let src = member_of(from_id);
    let dst = member_of(to_id);
    let mut count = 0usize;
    for f in frames {
        let k = f.key();
        if Some(&k) == src.as_ref() || Some(&k) == dst.as_ref() {
            continue; // рамка джерела або цілі — дозволений перетин
        }
        if polyline_hits_box_interior(points, f.x, f.y, f.width, f.height, INTERIOR_EPS) {
            count += 1;
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

    #[test]
    fn distance_zero_when_segment_crosses_rect() {
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
    fn distance_measures_gap() {
        let d = seg_rect_distance(&pt(0.0, 50.0), &pt(300.0, 50.0), 100.0, 100.0, 100.0, 100.0);
        assert!((d - 50.0).abs() < 1e-3, "{d}");
    }

    #[test]
    fn obstacle_rect_prefers_obstacle_over_box() {
        use crate::staff_edge_box::Rect;
        let mut b = EdgeRect {
            id: "x".into(),
            x: 10.0,
            y: 20.0,
            width: 30.0,
            height: 40.0,
            obstacle: None,
        };
        assert_eq!(obstacle_rect(&b), (10.0, 20.0, 30.0, 40.0));
        b.obstacle = Some(Rect {
            x: 1.0,
            y: 2.0,
            width: 200.0,
            height: 80.0,
        });
        assert_eq!(obstacle_rect(&b), (1.0, 2.0, 200.0, 80.0));
    }
}
