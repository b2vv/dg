//! R6: маршрути staff-лінків (ЯК, T126). Зріз R6-1 — деревні (intra-block admin) ребра.
//!
//! Бере ВЖЕ позиціоновані вузли (R3/R4/R5) і рахує ЛИШЕ ортогональні маршрути — не перерозкладає.
//! Ядро — порт `routeOrtho` з probe-рушія A (`_shps-routing-probe/probeA.constructive.ts`), але
//! БЕЗ його власної розкладки: позиції дає staff_compose/staff_packing.
//!
//! **Scope R6-1 = intra-block admin** (батько→дитина в межах одного ярусу). Для tidy layered-блоку
//! (org_layout/ploeg_layout: діти під батьком, субдерева не накладаються) це 0 перетинів
//! **by construction** — властивість РОЗКЛАДКИ, не роутера. Вісь R4 зсуває лише tier-1
//! (`staff_compose.rs`), тож cross-tier тут НЕ покривається — це пізніший зріз.
//!
//! **Паритет (ціль R6-6):** corridorY = середина проміжку `(from.y+from.h + to.y)/2` — точно збігається
//! з легасі `staffEdgeGeometry.ts::verticalPolyline` midY=(y1+y2)/2. Поріг «пряма вниз» = 0.5 px
//! (як легасі), не машинний epsilon, щоб f32-джитер не давав мікро-елбоу.

use crate::types::{StaffEdge, StaffEdgeRoute, StaffNodeGeo, StaffRoutePoint, StaffRouteSet};

/// Бік вузла, з якого виходить/входить лінк. Порт — центр відповідного ребра бокса.
/// (R6-2 узагальнить до edgePort center|avatar; R6-1 — лише центр.)
#[derive(Debug, Clone, Copy)]
enum Side {
    Top,
    Bottom,
}

/// Поріг, за якого вважаємо вузли вертикально вирівняними (пряма вниз без елбоу).
/// Легасі-паритет: `staffEdgeGeometry.ts:136`.
const STRAIGHT_EPS: f32 = 0.5;

/// Порт вузла: центр верхнього або нижнього ребра бокса.
fn port(node: &StaffNodeGeo, side: Side) -> StaffRoutePoint {
    let x = node.x + node.width / 2.0;
    let y = match side {
        Side::Top => node.y,
        Side::Bottom => node.y + node.height,
    };
    StaffRoutePoint { x, y }
}

/// Ортогональна полілінія `from.bottom → corridorY → to.top`. Вузли вирівняні по x (|dx|<0.5) →
/// пряма [a,b]; інакше елбоу [a, (a.x,corr), (b.x,corr), b]. corridorY — середина проміжку.
fn route_ortho(from: &StaffNodeGeo, to: &StaffNodeGeo) -> Vec<StaffRoutePoint> {
    let a = port(from, Side::Bottom);
    let b = port(to, Side::Top);
    let corridor = (from.y + from.height + to.y) / 2.0;
    let (ax, bx) = (a.x, b.x);
    if (ax - bx).abs() < STRAIGHT_EPS {
        return vec![a, b];
    }
    vec![
        a,
        StaffRoutePoint { x: ax, y: corridor },
        StaffRoutePoint { x: bx, y: corridor },
        b,
    ]
}

/// Маршрути для одного LOD. Кожне ребро → ортогональний елбоу `from→to`. Порядок сегментів зберігає
/// вхідний порядок `edges` (детермінізм без пересортування). Ребра з невідомими кінцями або
/// self-loop (from==to) пропускаються. `lod` штампується у вихід.
pub fn staff_routes(nodes: &[StaffNodeGeo], edges: &[StaffEdge], lod: &str) -> StaffRouteSet {
    let find = |id: &str| nodes.iter().find(|n| n.id == id);
    let mut segments: Vec<StaffEdgeRoute> = Vec::new();
    for edge in edges {
        if edge.from_id == edge.to_id {
            continue; // self-loop: нема що маршрутизувати
        }
        let (Some(from), Some(to)) = (find(&edge.from_id), find(&edge.to_id)) else {
            continue; // висяче ребро — валідацію робить окремий шар
        };
        segments.push(StaffEdgeRoute {
            from_id: edge.from_id.clone(),
            to_id: edge.to_id.clone(),
            kind: edge.kind.clone(),
            points: route_ortho(from, to),
        });
    }
    StaffRouteSet {
        lod: lod.to_string(),
        segments,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn node(id: &str, x: f32, y: f32, tier: u8) -> StaffNodeGeo {
        StaffNodeGeo {
            id: id.to_string(),
            organization_id: "o1".to_string(),
            x,
            y,
            width: 100.0,
            height: 50.0,
            tier,
            role: None,
            depth: None,
            department_id: None,
            part_index: None,
        }
    }

    fn edge(from: &str, to: &str) -> StaffEdge {
        StaffEdge {
            from_id: from.to_string(),
            to_id: to.to_string(),
            kind: "admin".to_string(),
        }
    }

    // --- Оракул (порт crossingDetector.ts §5.3): строге транзверсальне перетинання. ---
    const EPS: f32 = 1e-6;

    fn cross(o: &StaffRoutePoint, a: &StaffRoutePoint, b: &StaffRoutePoint) -> f32 {
        (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
    }
    fn sgn(v: f32) -> i32 {
        if v > EPS {
            1
        } else if v < -EPS {
            -1
        } else {
            0
        }
    }
    fn segments_properly_cross(
        p1: &StaffRoutePoint,
        p2: &StaffRoutePoint,
        p3: &StaffRoutePoint,
        p4: &StaffRoutePoint,
    ) -> bool {
        let d1 = sgn(cross(p3, p4, p1));
        let d2 = sgn(cross(p3, p4, p2));
        let d3 = sgn(cross(p1, p2, p3));
        let d4 = sgn(cross(p1, p2, p4));
        d1 != 0 && d2 != 0 && d3 != 0 && d4 != 0 && d1 != d2 && d3 != d4
    }
    /// Транзверсальні перетини між РІЗНИМИ ребрами; сегменти одного ребра та спільне джерело
    /// (sameParent) не рахуються (crossingDetector.ts:106-111).
    fn proper_crossings(routes: &[StaffEdgeRoute]) -> usize {
        // (edge_index, seg_start_point_index): ідентифікує сегмент без копіювання точок.
        let mut segs: Vec<(usize, usize)> = Vec::new();
        for (i, r) in routes.iter().enumerate() {
            for k in 0..r.points.len().saturating_sub(1) {
                let (p, q) = (&r.points[k], &r.points[k + 1]);
                if (p.x - q.x).abs() < EPS && (p.y - q.y).abs() < EPS {
                    continue;
                }
                segs.push((i, k));
            }
        }
        let mut count = 0;
        for i in 0..segs.len() {
            for j in (i + 1)..segs.len() {
                let (ei, ki) = segs[i];
                let (ej, kj) = segs[j];
                if ei == ej {
                    continue; // одне ребро
                }
                if routes[ei].from_id == routes[ej].from_id {
                    continue; // спільний стовбур одного батька
                }
                let (a, b) = (&routes[ei].points[ki], &routes[ei].points[ki + 1]);
                let (c, d) = (&routes[ej].points[kj], &routes[ej].points[kj + 1]);
                if segments_properly_cross(a, b, c, d) {
                    count += 1;
                }
            }
        }
        count
    }

    fn is_orthogonal(points: &[StaffRoutePoint]) -> bool {
        points
            .windows(2)
            .all(|w| (w[0].x - w[1].x).abs() < EPS || (w[0].y - w[1].y).abs() < EPS)
    }

    fn point_eq(p: &StaffRoutePoint, x: f32, y: f32) -> bool {
        (p.x - x).abs() < EPS && (p.y - y).abs() < EPS
    }

    // B2: інформативна мульти-батьківська фікстура (два батьки, по двоє дітей) — 0 перетинів
    // by construction, бо субдерева не накладаються в x.
    #[test]
    fn intra_block_admin_multi_parent_has_zero_crossings() {
        let nodes = [
            node("P", 0.0, 0.0, 2),
            node("Q", 400.0, 0.0, 2),
            node("c1", -50.0, 120.0, 2),
            node("c2", 50.0, 120.0, 2),
            node("c3", 350.0, 120.0, 2),
            node("c4", 450.0, 120.0, 2),
        ];
        let edges = [
            edge("P", "c1"),
            edge("P", "c2"),
            edge("Q", "c3"),
            edge("Q", "c4"),
        ];
        let set = staff_routes(&nodes, &edges, "near");
        assert_eq!(set.segments.len(), 4);
        // Непорожність: кожне ребро справді має маршрут (інакше crossings==0 тривіальне).
        assert!(set.segments.iter().all(|r| r.points.len() >= 2));
        assert_eq!(proper_crossings(&set.segments), 0);
        assert!(set.segments.iter().all(|r| is_orthogonal(&r.points)));
    }

    // Елбоу: ендпоінти на портах (bottom-center джерела, top-center цілі), усі сегменти осьові.
    #[test]
    fn elbow_endpoints_sit_on_center_ports_and_is_orthogonal() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 200.0, 120.0, 2)];
        let set = staff_routes(&nodes, &[edge("p", "c")], "near");
        let r = &set.segments[0];
        assert_eq!(r.points.len(), 4);
        assert!(point_eq(&r.points[0], 50.0, 50.0)); // p bottom-center
        assert!(point_eq(r.points.last().unwrap(), 250.0, 120.0)); // c top-center
        assert!(is_orthogonal(&r.points));
    }

    // Паритет: corridorY = середина проміжку = (from.y+from.h + to.y)/2 (легасі midY).
    #[test]
    fn corridor_y_is_midpoint_matching_legacy() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 200.0, 120.0, 2)];
        let set = staff_routes(&nodes, &[edge("p", "c")], "near");
        let r = &set.segments[0];
        let expected = (0.0 + 50.0 + 120.0) / 2.0; // 85
        assert_eq!(r.points[1].y, expected);
        assert_eq!(r.points[2].y, expected);
    }

    // Вирівняні по x (|dx|<0.5) → пряма [a,b], без елбоу.
    #[test]
    fn aligned_x_produces_straight_two_point_route() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 0.3, 120.0, 2)];
        let set = staff_routes(&nodes, &[edge("p", "c")], "near");
        assert_eq!(set.segments[0].points.len(), 2);
    }

    // Детермінізм: порядок сегментів = вхідний порядок ребер (без пересортування).
    // Входи навмисно в ЗВОРОТНОМУ алфавітному і зворотному-за-x порядку (zed перший, ліворуч),
    // щоб тест упав і на сорті-за-id, і на сорті-за-x — mutation-sensitive (ревʼю NB1).
    #[test]
    fn preserves_input_edge_order() {
        let nodes = [
            node("p", 0.0, 0.0, 2),
            node("zed", 200.0, 120.0, 2),
            node("abe", -200.0, 120.0, 2),
        ];
        let set = staff_routes(&nodes, &[edge("p", "zed"), edge("p", "abe")], "near");
        assert_eq!(set.segments[0].to_id, "zed");
        assert_eq!(set.segments[1].to_id, "abe");
    }

    // Виродженості: self-loop і висяче ребро пропускаються, lod штампується.
    #[test]
    fn skips_self_loop_and_dangling_and_stamps_lod() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 200.0, 120.0, 2)];
        let edges = [edge("p", "p"), edge("p", "ghost"), edge("p", "c")];
        let set = staff_routes(&nodes, &edges, "far");
        assert_eq!(set.lod, "far");
        assert_eq!(set.segments.len(), 1);
        assert_eq!(set.segments[0].to_id, "c");
    }
}
