//! R6: маршрути staff-лінків (ЯК, T126). R6-1 деревні; R6-3a порти з per-LOD боксів + org-картки;
//! R6-3b обхід КАРТОК; R6-4a — around-frame lane (чужі рамки як перешкоди) + **§12-маркер залишку**.
//!
//! Бере ВЖЕ позиціоновані вузли (R3/R4/R5) і рахує ЛИШЕ ортогональні маршрути — НЕ перерозкладає
//! (інваріант R6; §6.5 K-loop reorder/rebuild = relayout = борг 4a, поза T126).
//!
//! **Обхід (PIN-1, локальний, НЕ grid-A*):** обчислити R6-3a-елбоу → перевірити проти перешкод
//! (картки, крім власних from/to + ЧУЖІ рамки, крім рідної — per-part A) при pad → якщо чисто: лишити
//! БАЙТ-ІДЕНТИЧНО → якщо блок: сканувати детерміновані corridorY-доріжки → перша чиста → інакше базовий
//! як ЗАЛИШОК. Пер-ребро, stateless.
//!
//! **§12-маркер (R6-4a, PIN-1):** `StaffEdgeRoute.marked = Some(true)` ⟺ фінальний маршрут ВСЕ ЩЕ
//! пенетрує чужу рамку (`staff_geom::frame_intrusion_count` > 0 — ТЕ САМЕ джерело, що детектор-оракул →
//! маркер = фактичні інтрузії BY CONSTRUCTION). R6-4a — чесний МАРКЕР, не 0: corridorY-lane огинає
//! легкі блоки, але НЕ робить бічного обходу високої рамки (→ R6-4b); K-loop reorder → борг.
//!
//! **Lookup (P1):** два РОЗДІЛЬНІ лінійні find, precedence person→org. **member_of (PIN-3):**
//! `(department_id, part_index)` зі StaffNodeGeo; вузол без депу й org-кінці → None (не член рамок).
//! **Паритет:** card_pad<=0 і/або без рамок → чистий R6-3a/R6-3b; near без hints = повний бокс.

use crate::staff_edge_box::{
    visual_org_edge_box, visual_person_edge_box, EdgeRect, PersonEdgeHints,
};
use crate::staff_geom::{
    frame_intrusion_count, obstacle_rect, seg_rect_distance, DeptPart, FrameRect,
};
use crate::types::{
    StaffEdge, StaffEdgeRoute, StaffNodeGeo, StaffOrgCardGeo, StaffRoutePoint, StaffRouteSet,
};

/// Бік бокса. Порт — центр відповідного ребра.
#[derive(Debug, Clone, Copy)]
enum Side {
    Top,
    Bottom,
}

/// Прямокутник-перешкода `(x, y, width, height)`.
type ObstacleRect = (f32, f32, f32, f32);

/// Поріг вертикального вирівнювання (пряма без елбоу). Легасі-паритет `staffEdgeGeometry.ts:136`.
const STRAIGHT_EPS: f32 = 0.5;
/// Нижня межа `card_pad` при обході = детектор-гейт (`MIN_CLEARANCE_PX`) (PIN-4).
const MIN_CARD_PAD: f32 = 8.0;
/// Поріг дедупу близьких доріжок-кандидатів.
const LANE_DEDUP_EPS: f32 = 0.5;

/// Входи маршрутизатора. `card_pad>0` вмикає обхід (картки+чужі рамки, ≥pad); `<=0` — чистий R6-3a.
/// `department_frames` — per-part рамки відділів (R6-4a): перешкоди around-lane + джерело §12-маркера.
pub struct RouteInputs<'a> {
    pub persons: &'a [StaffNodeGeo],
    pub org_cards: &'a [StaffOrgCardGeo],
    pub edges: &'a [StaffEdge],
    pub lod: &'a str,
    pub person_hints: &'a [(String, PersonEdgeHints)],
    pub department_frames: &'a [FrameRect],
    pub card_pad: f32,
}

/// Порт бокса: центр верхнього/нижнього ребра (per-LOD).
fn port(rect: &EdgeRect, side: Side) -> StaffRoutePoint {
    let x = rect.x + rect.width / 2.0;
    let y = match side {
        Side::Top => rect.y,
        Side::Bottom => rect.y + rect.height,
    };
    StaffRoutePoint { x, y }
}

/// Ортогональна база `from.bottom → corridorY → to.top` по per-LOD боксах (R6-3a).
fn route_ortho(from: &EdgeRect, to: &EdgeRect) -> Vec<StaffRoutePoint> {
    let a = port(from, Side::Bottom);
    let b = port(to, Side::Top);
    let corridor = (from.y + from.height + to.y) / 2.0;
    elbow_or_straight(a.x, from.y + from.height, b.x, to.y, corridor)
}

/// Елбоу `[a,(ax,corr),(bx,corr),b]`, або пряма `[a,b]` коли x вирівняні (|dx|<0.5).
fn elbow_or_straight(ax: f32, ay: f32, bx: f32, by: f32, corr: f32) -> Vec<StaffRoutePoint> {
    let a = StaffRoutePoint { x: ax, y: ay };
    let b = StaffRoutePoint { x: bx, y: by };
    if (ax - bx).abs() < STRAIGHT_EPS {
        return vec![a, b];
    }
    vec![
        a,
        StaffRoutePoint { x: ax, y: corr },
        StaffRoutePoint { x: bx, y: corr },
        b,
    ]
}

/// Резолв кінця ребра в per-LOD edge-бокс. Precedence person→org (P1); hints — лише до персон.
fn resolve_box(
    id: &str,
    persons: &[StaffNodeGeo],
    org_cards: &[StaffOrgCardGeo],
    lod: &str,
    person_hints: &[(String, PersonEdgeHints)],
) -> Option<EdgeRect> {
    if let Some(p) = persons.iter().find(|n| n.id == id) {
        let hint = person_hints.iter().find(|(k, _)| k == id).map(|(_, v)| v);
        return Some(visual_person_edge_box(
            &p.id, p.x, p.y, p.width, p.height, lod, hint,
        ));
    }
    if let Some(o) = org_cards.iter().find(|c| c.org_id == id) {
        return Some(visual_org_edge_box(
            &o.org_id, o.x, o.y, o.width, o.height, lod,
        ));
    }
    None
}

/// Членство вузла: `(department_id, part_index)` зі StaffNodeGeo (PIN-3, per-part A). Вузол без
/// department_id і org-кінці (не в persons) → None (не члени жодної рамки).
fn member_of(id: &str, persons: &[StaffNodeGeo]) -> Option<DeptPart> {
    persons
        .iter()
        .find(|n| n.id == id)
        .and_then(|n| n.department_id.clone().map(|d| (d, n.part_index)))
}

/// Набір карток-перешкод = усі persons+orgs у per-LOD боксах (ЛИШЕ картки; рамки окремо).
fn build_card_set(
    persons: &[StaffNodeGeo],
    org_cards: &[StaffOrgCardGeo],
    lod: &str,
    person_hints: &[(String, PersonEdgeHints)],
) -> Vec<EdgeRect> {
    let mut cards = Vec::with_capacity(persons.len() + org_cards.len());
    for p in persons {
        let hint = person_hints
            .iter()
            .find(|(k, _)| k == &p.id)
            .map(|(_, v)| v);
        cards.push(visual_person_edge_box(
            &p.id, p.x, p.y, p.width, p.height, lod, hint,
        ));
    }
    for o in org_cards {
        cards.push(visual_org_edge_box(
            &o.org_id, o.x, o.y, o.width, o.height, lod,
        ));
    }
    cards
}

/// Перешкоди одного ребра: картки (крім власних кінців за id) + ЧУЖІ рамки (крім рідної — per-part A,
/// self-exempt коли ключ рамки == член джерела чи цілі). Детермінований порядок: картки, потім рамки.
fn obstacles_for_edge(
    cards: &[EdgeRect],
    frames: &[FrameRect],
    from_id: &str,
    to_id: &str,
    src: &Option<DeptPart>,
    dst: &Option<DeptPart>,
) -> Vec<ObstacleRect> {
    let mut obs: Vec<ObstacleRect> = Vec::new();
    for c in cards {
        if c.id != from_id && c.id != to_id {
            obs.push(obstacle_rect(c));
        }
    }
    for f in frames {
        let k = f.key();
        if Some(&k) == src.as_ref() || Some(&k) == dst.as_ref() {
            continue; // рідна рамка — ендпоінт усередині, не перешкода
        }
        obs.push((f.x, f.y, f.width, f.height));
    }
    obs
}

/// Чи полілінія тримає ≥pad від УСІХ перешкод.
fn route_clear_of(points: &[StaffRoutePoint], obstacles: &[ObstacleRect], pad: f32) -> bool {
    for &(rx, ry, rw, rh) in obstacles {
        for s in points.windows(2) {
            if seg_rect_distance(&s[0], &s[1], rx, ry, rw, rh) < pad {
                return false;
            }
        }
    }
    true
}

/// Локальний корид-детур (PIN-1). Повертає базовий маршрут, якщо чисто або якщо локальної чистої
/// доріжки нема (залишок). `obstacles` уже self-exempted (картки/рамки ребра).
fn detour_edge(
    from: &EdgeRect,
    to: &EdgeRect,
    obstacles: &[ObstacleRect],
    pad: f32,
) -> Vec<StaffRoutePoint> {
    let base = route_ortho(from, to);
    if route_clear_of(&base, obstacles, pad) {
        return base; // паритет: детур не біжить на чистому маршруті
    }

    let ax = from.x + from.width / 2.0;
    let bx = to.x + to.width / 2.0;
    if (ax - bx).abs() < STRAIGHT_EPS {
        return base; // пряма вертикаль: corridorY-зсув не допоможе → залишок
    }
    let from_bottom = from.y + from.height;
    let to_top = to.y;
    let corr0 = (from_bottom + to_top) / 2.0;

    // Кандидатні доріжки: над і під кожною перешкодою (при pad); кожну валідує route_clear_of,
    // тож зайві кандидати нешкідливі — беремо першу чисту за |Δ corr0|.
    let mut lanes: Vec<f32> = Vec::new();
    for &(_, ry, _, rh) in obstacles {
        lanes.push(ry - pad);
        lanes.push(ry + rh + pad);
    }
    lanes.sort_by(|a, b| a.partial_cmp(b).unwrap());
    lanes.dedup_by(|a, b| (*a - *b).abs() < LANE_DEDUP_EPS);
    lanes.sort_by(|a, b| {
        let (da, db) = ((a - corr0).abs(), (b - corr0).abs());
        da.partial_cmp(&db).unwrap().then(a.partial_cmp(b).unwrap())
    });

    for lane in lanes {
        let cand = elbow_or_straight(ax, from_bottom, bx, to_top, lane);
        if route_clear_of(&cand, obstacles, pad) {
            return cand;
        }
    }
    base // чистої локальної доріжки нема → залишок
}

/// Маршрути для одного LOD. При `card_pad>0` — з локальним обходом карток і чужих рамок; §12-маркер
/// (`marked`) ставиться BY CONSTRUCTION, коли фінальний маршрут усе ще пенетрує чужу рамку.
pub fn staff_routes(input: &RouteInputs) -> StaffRouteSet {
    debug_assert!(
        input.card_pad <= 0.0 || input.card_pad >= MIN_CARD_PAD,
        "card_pad має бути ≥ MIN_CARD_PAD (гейт детектора) або ≤ 0 (вимкнено)"
    );
    let avoid = input.card_pad > 0.0;
    let cards = if avoid {
        build_card_set(
            input.persons,
            input.org_cards,
            input.lod,
            input.person_hints,
        )
    } else {
        Vec::new()
    };
    let mo = |id: &str| member_of(id, input.persons);

    let mut segments: Vec<StaffEdgeRoute> = Vec::new();
    for edge in input.edges {
        if edge.from_id == edge.to_id {
            continue; // self-loop
        }
        let from = resolve_box(
            &edge.from_id,
            input.persons,
            input.org_cards,
            input.lod,
            input.person_hints,
        );
        let to = resolve_box(
            &edge.to_id,
            input.persons,
            input.org_cards,
            input.lod,
            input.person_hints,
        );
        let (Some(from), Some(to)) = (from, to) else {
            continue; // висяче ребро
        };

        let points = if avoid {
            let (src, dst) = (mo(&edge.from_id), mo(&edge.to_id));
            let obs = obstacles_for_edge(
                &cards,
                input.department_frames,
                &edge.from_id,
                &edge.to_id,
                &src,
                &dst,
            );
            detour_edge(&from, &to, &obs, input.card_pad)
        } else {
            route_ortho(&from, &to)
        };

        // §12-маркер by construction: той самий frame_intrusion_count, що й детектор-оракул.
        let intrusions = frame_intrusion_count(
            &points,
            &edge.from_id,
            &edge.to_id,
            input.department_frames,
            &mo,
        );
        let marked = if intrusions > 0 { Some(true) } else { None };

        segments.push(StaffEdgeRoute {
            from_id: edge.from_id.clone(),
            to_id: edge.to_id.clone(),
            kind: edge.kind.clone(),
            points,
            marked,
        });
    }
    StaffRouteSet {
        lod: input.lod.to_string(),
        segments,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn node(id: &str, x: f32, y: f32, tier: u8) -> StaffNodeGeo {
        node_full(id, x, y, 100.0, 50.0, tier, None, None)
    }
    fn node_wh(id: &str, x: f32, y: f32, w: f32, h: f32) -> StaffNodeGeo {
        node_full(id, x, y, w, h, 2, None, None)
    }
    fn node_dept(id: &str, x: f32, y: f32, w: f32, h: f32, dept: &str) -> StaffNodeGeo {
        node_full(id, x, y, w, h, 2, Some(dept), None)
    }
    #[allow(clippy::too_many_arguments)] // тест-білдер дзеркалить StaffNodeGeo (11 полів)
    fn node_full(
        id: &str,
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        tier: u8,
        dept: Option<&str>,
        part: Option<u32>,
    ) -> StaffNodeGeo {
        StaffNodeGeo {
            id: id.to_string(),
            organization_id: "o1".to_string(),
            x,
            y,
            width: w,
            height: h,
            tier,
            role: None,
            depth: None,
            department_id: dept.map(str::to_string),
            part_index: part,
        }
    }

    fn org_card(org_id: &str, x: f32, y: f32) -> StaffOrgCardGeo {
        StaffOrgCardGeo {
            org_id: org_id.to_string(),
            x,
            y,
            width: 160.0,
            height: 60.0,
        }
    }

    fn edge(from: &str, to: &str) -> StaffEdge {
        edge_kind(from, to, "admin")
    }
    fn edge_kind(from: &str, to: &str, kind: &str) -> StaffEdge {
        StaffEdge {
            from_id: from.to_string(),
            to_id: to.to_string(),
            kind: kind.to_string(),
        }
    }
    fn frame(dept: &str, x: f32, y: f32, w: f32, h: f32) -> FrameRect {
        FrameRect {
            department_id: dept.to_string(),
            part_index: None,
            x,
            y,
            width: w,
            height: h,
        }
    }

    const NO_CARDS: &[StaffOrgCardGeo] = &[];
    const NO_HINTS: &[(String, PersonEdgeHints)] = &[];
    const NO_FRAMES: &[FrameRect] = &[];

    fn persons_input<'a>(
        persons: &'a [StaffNodeGeo],
        edges: &'a [StaffEdge],
        lod: &'a str,
    ) -> RouteInputs<'a> {
        RouteInputs {
            persons,
            org_cards: NO_CARDS,
            edges,
            lod,
            person_hints: NO_HINTS,
            department_frames: NO_FRAMES,
            card_pad: 0.0,
        }
    }

    const EPS: f32 = 1e-6;

    fn is_orthogonal(points: &[StaffRoutePoint]) -> bool {
        points
            .windows(2)
            .all(|w| (w[0].x - w[1].x).abs() < EPS || (w[0].y - w[1].y).abs() < EPS)
    }
    fn point_eq(p: &StaffRoutePoint, x: f32, y: f32) -> bool {
        (p.x - x).abs() < EPS && (p.y - y).abs() < EPS
    }
    fn points_eq(a: &[StaffRoutePoint], b: &[StaffRoutePoint]) -> bool {
        a.len() == b.len() && a.iter().zip(b).all(|(p, q)| point_eq(p, q.x, q.y))
    }

    // --- R6-1/R6-3a геометрія (card_pad=0) ---

    #[test]
    fn elbow_endpoints_sit_on_center_ports_and_is_orthogonal() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 200.0, 120.0, 2)];
        let edges = [edge("p", "c")];
        let set = staff_routes(&persons_input(&nodes, &edges, "near"));
        let r = &set.segments[0];
        assert_eq!(r.points.len(), 4);
        assert!(point_eq(&r.points[0], 50.0, 50.0));
        assert!(point_eq(r.points.last().unwrap(), 250.0, 120.0));
        assert!(is_orthogonal(&r.points));
        assert_eq!(r.marked, None);
    }

    #[test]
    fn corridor_y_is_midpoint_matching_legacy() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 200.0, 120.0, 2)];
        let edges = [edge("p", "c")];
        let set = staff_routes(&persons_input(&nodes, &edges, "near"));
        let r = &set.segments[0];
        let expected = (0.0 + 50.0 + 120.0) / 2.0;
        assert_eq!(r.points[1].y, expected);
        assert_eq!(r.points[2].y, expected);
    }

    #[test]
    fn aligned_x_produces_straight_two_point_route() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 0.3, 120.0, 2)];
        let edges = [edge("p", "c")];
        let set = staff_routes(&persons_input(&nodes, &edges, "near"));
        assert_eq!(set.segments[0].points.len(), 2);
    }

    #[test]
    fn preserves_input_edge_order() {
        let nodes = [
            node("p", 0.0, 0.0, 2),
            node("zed", 200.0, 120.0, 2),
            node("abe", -200.0, 120.0, 2),
        ];
        let edges = [edge("p", "zed"), edge("p", "abe")];
        let set = staff_routes(&persons_input(&nodes, &edges, "near"));
        assert_eq!(set.segments[0].to_id, "zed");
        assert_eq!(set.segments[1].to_id, "abe");
    }

    #[test]
    fn skips_self_loop_and_dangling_and_stamps_lod() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 200.0, 120.0, 2)];
        let edges = [edge("p", "p"), edge("p", "ghost"), edge("p", "c")];
        let set = staff_routes(&persons_input(&nodes, &edges, "far"));
        assert_eq!(set.lod, "far");
        assert_eq!(set.segments.len(), 1);
        assert_eq!(set.segments[0].to_id, "c");
    }

    #[test]
    fn near_no_hints_is_numerically_identical_to_raw_node_route() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 200.0, 120.0, 2)];
        let edges = [edge("p", "c")];
        let set = staff_routes(&persons_input(&nodes, &edges, "near"));
        let r = &set.segments[0];
        assert_eq!(r.points.len(), 4);
        assert!(point_eq(&r.points[0], 50.0, 50.0));
        assert!(point_eq(&r.points[1], 50.0, 85.0));
        assert!(point_eq(&r.points[2], 250.0, 85.0));
        assert!(point_eq(&r.points[3], 250.0, 120.0));
    }

    #[test]
    fn lead_org_person_to_org_card_resolves() {
        let persons = [node("head", 0.0, 0.0, 2)];
        let cards = [org_card("org9", 200.0, 300.0)];
        let edges = [edge_kind("head", "org9", "lead-org")];
        let input = RouteInputs {
            persons: &persons,
            org_cards: &cards,
            edges: &edges,
            lod: "near",
            person_hints: NO_HINTS,
            department_frames: NO_FRAMES,
            card_pad: 0.0,
        };
        let set = staff_routes(&input);
        assert_eq!(set.segments.len(), 1);
        let r = &set.segments[0];
        assert_eq!(r.kind, "lead-org");
        assert!(point_eq(&r.points[0], 50.0, 50.0));
        assert!(point_eq(r.points.last().unwrap(), 280.0, 300.0));
    }

    #[test]
    fn person_wins_over_org_card_on_id_collision() {
        let persons = [node("p", 0.0, 0.0, 2), node("x", 200.0, 120.0, 2)];
        let cards = [org_card("x", 999.0, 999.0)];
        let edges = [edge("p", "x")];
        let input = RouteInputs {
            persons: &persons,
            org_cards: &cards,
            edges: &edges,
            lod: "near",
            person_hints: NO_HINTS,
            department_frames: NO_FRAMES,
            card_pad: 0.0,
        };
        let set = staff_routes(&input);
        assert!(point_eq(
            set.segments[0].points.last().unwrap(),
            250.0,
            120.0
        ));
    }

    #[test]
    fn figma_hint_docks_source_port_on_tile_center() {
        let persons = [node("p", 0.0, 0.0, 2), node("c", 0.0, 200.0, 2)];
        let hints = [(
            "p".to_string(),
            PersonEdgeHints::FigmaRow {
                tile_x: 12.0,
                tile_y: 16.0,
                tile_size: 40.0,
            },
        )];
        let edges = [edge("p", "c")];
        let input = RouteInputs {
            persons: &persons,
            org_cards: NO_CARDS,
            edges: &edges,
            lod: "near",
            person_hints: &hints,
            department_frames: NO_FRAMES,
            card_pad: 0.0,
        };
        let set = staff_routes(&input);
        assert!(point_eq(&set.segments[0].points[0], 32.0, 56.0));
    }

    // --- R6-3b: обхід карток ---

    fn avoid_input<'a>(
        persons: &'a [StaffNodeGeo],
        edges: &'a [StaffEdge],
        lod: &'a str,
        pad: f32,
    ) -> RouteInputs<'a> {
        RouteInputs {
            persons,
            org_cards: NO_CARDS,
            edges,
            lod,
            person_hints: NO_HINTS,
            department_frames: NO_FRAMES,
            card_pad: pad,
        }
    }

    fn near_boxes(nodes: &[StaffNodeGeo]) -> Vec<EdgeRect> {
        nodes
            .iter()
            .map(|n| visual_person_edge_box(&n.id, n.x, n.y, n.width, n.height, "near", None))
            .collect()
    }

    #[test]
    fn avoidance_is_byte_identical_when_no_card_blocks() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 200.0, 120.0, 2)];
        let edges = [edge("p", "c")];
        let base = staff_routes(&persons_input(&nodes, &edges, "near"));
        let avoided = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        assert!(points_eq(
            &avoided.segments[0].points,
            &base.segments[0].points
        ));
    }

    #[test]
    fn avoidance_detours_resolvable_block_clearing_violations() {
        use crate::staff_clearance::card_clearance;
        let nodes = [
            node_wh("P", 100.0, 0.0, 100.0, 50.0),
            node_wh("c1", 0.0, 200.0, 100.0, 50.0),
            node_wh("X", 80.0, 110.0, 40.0, 20.0),
        ];
        let edges = [edge("P", "c1")];
        let boxes = near_boxes(&nodes);
        let base = staff_routes(&avoid_input(&nodes, &edges, "near", 0.0));
        assert!(card_clearance(&base.segments, &boxes).violations > 0);
        let avoided = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        assert_eq!(card_clearance(&avoided.segments, &boxes).violations, 0);
        assert!(!points_eq(
            &avoided.segments[0].points,
            &base.segments[0].points
        ));
    }

    #[test]
    fn avoidance_leaves_unresolvable_block_as_remnant() {
        use crate::staff_clearance::card_clearance;
        let nodes = [
            node_wh("P", 100.0, 0.0, 100.0, 50.0),
            node_wh("c1", 0.0, 200.0, 100.0, 50.0),
            node_wh("X", 60.0, 110.0, 80.0, 30.0),
        ];
        let edges = [edge("P", "c1")];
        let boxes = near_boxes(&nodes);
        let base = staff_routes(&avoid_input(&nodes, &edges, "near", 0.0));
        let avoided = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        assert!(points_eq(
            &avoided.segments[0].points,
            &base.segments[0].points
        ));
        assert!(card_clearance(&avoided.segments, &boxes).violations > 0);
    }

    #[test]
    fn avoidance_is_deterministic_across_runs() {
        let nodes = [
            node_wh("P", 100.0, 0.0, 100.0, 50.0),
            node_wh("c1", 0.0, 200.0, 100.0, 50.0),
            node_wh("X", 80.0, 110.0, 40.0, 20.0),
        ];
        let edges = [edge("P", "c1")];
        let a = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        let b = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        assert!(points_eq(&a.segments[0].points, &b.segments[0].points));
    }

    // --- R6-4a: around-frame lane + §12-маркер ---

    fn frames_input<'a>(
        persons: &'a [StaffNodeGeo],
        edges: &'a [StaffEdge],
        frames: &'a [FrameRect],
        lod: &'a str,
        pad: f32,
    ) -> RouteInputs<'a> {
        RouteInputs {
            persons,
            org_cards: NO_CARDS,
            edges,
            lod,
            person_hints: NO_HINTS,
            department_frames: frames,
            card_pad: pad,
        }
    }

    // PIN-2 паритет: без рамок маркер відсутній, маршрут = R6-3b.
    #[test]
    fn no_frames_means_no_marker_and_parity() {
        let nodes = [
            node_dept("p", 0.0, 0.0, 100.0, 50.0, "d1"),
            node_dept("c", 200.0, 120.0, 100.0, 50.0, "d1"),
        ];
        let edges = [edge("p", "c")];
        let base = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        let withf = staff_routes(&frames_input(&nodes, &edges, NO_FRAMES, "near", 16.0));
        assert_eq!(withf.segments[0].marked, None);
        assert!(points_eq(
            &withf.segments[0].points,
            &base.segments[0].points
        ));
    }

    // Чужа рамка, РОЗВ'ЯЗНА локально: around-lane огинає → маркера нема.
    #[test]
    fn foreign_frame_resolvable_is_avoided_without_marker() {
        // Ребро d1; мала чужа рамка dF у горизонтальному коридорі з запасом між колонками.
        let nodes = [
            node_dept("P", 100.0, 0.0, 100.0, 50.0, "d1"),
            node_dept("c1", 0.0, 200.0, 100.0, 50.0, "d1"),
        ];
        let frames = [frame("dF", 80.0, 110.0, 40.0, 20.0)]; // x∈[80..120], чужа ребру d1
        let edges = [edge("P", "c1")];
        let base = staff_routes(&avoid_input(&nodes, &edges, "near", 0.0));
        // База пенетрує dF → якби без обходу, був би маркер.
        let no_avoid = staff_routes(&frames_input(&nodes, &edges, &frames, "near", 0.0));
        assert_eq!(no_avoid.segments[0].marked, Some(true));
        // З обходом — огинає, маркера нема, маршрут змінено.
        let avoided = staff_routes(&frames_input(&nodes, &edges, &frames, "near", 16.0));
        assert_eq!(avoided.segments[0].marked, None);
        assert!(!points_eq(
            &avoided.segments[0].points,
            &base.segments[0].points
        ));
    }

    // Чужа рамка, НЕРОЗВ'ЯЗНА локально (широка): залишок → §12-маркер Some(true).
    #[test]
    fn foreign_frame_unresolvable_is_marked() {
        let nodes = [
            node_dept("P", 100.0, 0.0, 100.0, 50.0, "d1"),
            node_dept("c1", 0.0, 200.0, 100.0, 50.0, "d1"),
        ];
        let frames = [frame("dF", 55.0, 110.0, 90.0, 30.0)]; // широка, впритул до обох колонок
        let edges = [edge("P", "c1")];
        let avoided = staff_routes(&frames_input(&nodes, &edges, &frames, "near", 16.0));
        assert_eq!(
            avoided.segments[0].marked,
            Some(true),
            "нерозв'язна чужа рамка має дати §12-маркер"
        );
    }

    // РІДНА рамка (член) НЕ перешкода й НЕ маркер, навіть якщо маршрут крізь неї (per-part A).
    #[test]
    fn own_frame_is_neither_obstacle_nor_marked() {
        let nodes = [
            node_dept("P", 100.0, 0.0, 100.0, 50.0, "d1"),
            node_dept("c1", 0.0, 200.0, 100.0, 50.0, "d1"),
        ];
        let own = [frame("d1", 55.0, 110.0, 90.0, 30.0)]; // РІДНА рамка ребра (d1)
        let edges = [edge("P", "c1")];
        let base = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        let withown = staff_routes(&frames_input(&nodes, &edges, &own, "near", 16.0));
        assert_eq!(withown.segments[0].marked, None, "рідна рамка не маркерує");
        assert!(points_eq(
            &withown.segments[0].points,
            &base.segments[0].points
        ));
    }

    // Маркер == детектор BY CONSTRUCTION: marked збігається з foreign_frame_intrusions по ребру.
    #[test]
    fn marker_equals_detector_by_construction() {
        use crate::staff_clearance::foreign_frame_intrusions;
        let nodes = [
            node_dept("P", 100.0, 0.0, 100.0, 50.0, "d1"),
            node_dept("c1", 0.0, 200.0, 100.0, 50.0, "d1"),
        ];
        let frames = [frame("dF", 55.0, 110.0, 90.0, 30.0)];
        let edges = [edge("P", "c1")];
        let set = staff_routes(&frames_input(&nodes, &edges, &frames, "near", 16.0));
        let mo = |id: &str| member_of(id, &nodes);
        let detector = foreign_frame_intrusions(&set.segments, &frames, &mo);
        let marked = set.segments[0].marked == Some(true);
        assert_eq!(marked, detector > 0, "маркер має збігатись із детектором");
    }

    // Регрес (відновлено з R6-3a): детектор над РЕАЛЬНИМ виходом — чиста рознесена фікстура дає 0
    // кліренс-порушень; чужа рамка на шляху ловиться (детектор споживає вихід роутера).
    #[test]
    fn oracle_clean_fixture_zero_violations_and_frame_is_detected() {
        use crate::staff_clearance::{card_clearance, foreign_frame_intrusions};
        let nodes = [
            node("P", 0.0, 0.0, 2),
            node("Q", 600.0, 0.0, 2),
            node("c1", -80.0, 200.0, 2),
            node("c2", 120.0, 200.0, 2),
            node("c3", 520.0, 200.0, 2),
            node("c4", 720.0, 200.0, 2),
        ];
        let edges = [
            edge("P", "c1"),
            edge("P", "c2"),
            edge("Q", "c3"),
            edge("Q", "c4"),
        ];
        let set = staff_routes(&persons_input(&nodes, &edges, "near"));
        let boxes = near_boxes(&nodes);
        assert_eq!(
            card_clearance(&set.segments, &boxes).violations,
            0,
            "чиста рознесена фікстура — 0 порушень"
        );
        let foreign = [frame("dX", -10.0, 110.0, 40.0, 30.0)];
        let no_member = |_id: &str| None;
        assert!(
            foreign_frame_intrusions(&set.segments, &foreign, &no_member) >= 1,
            "детектор ловить чужу рамку на реальному маршруті"
        );
    }

    // --- R6-5: детермінізм (H6) ---
    //
    // `staff_routes` детермінована BY CONSTRUCTION (чиста fn, Vec+лінійний find, lanes sort/dedup
    // нормалізують порядок перешкод) — 2-прогонний тест сам по собі мутаційно порожній (критик
    // R6-5, `_r6-5-critic-dg24.md`). Тому H6 реалізовано ДВОМА тестами:
    //   1. golden-снапшот усього StaffRouteSet на комбінованій фікстурі (кілька карток + 2 рамки +
    //      3 ребра; detour/remnant/clean; 1 marked) — ловить corr0, ±pad lane-offset,
    //      detour-селекцію, порти, §12-маркер, порядок ребер (мутаційна верифікація нижче).
    //      НЕ ловить (чесно): видалення dedup@217 (дублі-доріжки не міняють обрану → вихід той самий)
    //      і tie-break .then()@220 (редундантний: sort@216 уже дає asc, stable sort зберігає);
    //   2. дешевий 2-run tripwire (дослівна форма H6 plan §8) — guard проти МАЙБУТНЬОГО
    //      недетермінізму (заміна Vec/лінійного find на HashMap-ітерацію / rayon / час).
    // Порівняння через `format!("{:?}", …)` (Debug) — exact («байт-у-байт»), без serde_json/PartialEq
    // (контракт types.rs не чіпається).

    /// Комбінована фікстура H6 (вручну вивірена, `_r6-5-critic-dg24.md` / session-нота).
    fn h6_scene() -> (Vec<StaffNodeGeo>, Vec<StaffEdge>, Vec<FrameRect>) {
        let persons = vec![
            node_dept("P", 0.0, 0.0, 100.0, 50.0, "d1"),
            node_dept("A", 200.0, 300.0, 100.0, 50.0, "d1"),
            node_dept("S", 600.0, 0.0, 100.0, 50.0, "d1"),
            node_dept("T", 600.0, 300.0, 100.0, 50.0, "d1"),
            node_dept("M", -400.0, 0.0, 100.0, 50.0, "d1"),
            node_dept("N", -200.0, 300.0, 100.0, 50.0, "d1"),
            node_dept("X", 120.0, 160.0, 60.0, 30.0, "d2"), // чужа картка в коридорі P→A
        ];
        let frames = vec![
            frame("df", 610.0, 120.0, 120.0, 60.0), // foreign, блокує aligned S→T → marked
            frame("dh", 120.0, 200.0, 60.0, 30.0),  // foreign, додає lane-кандидати P→A
        ];
        let edges = vec![edge("P", "A"), edge("S", "T"), edge("M", "N")]; // НЕсортований порядок
        (persons, edges, frames)
    }

    fn route_pt(x: f32, y: f32) -> StaffRoutePoint {
        StaffRoutePoint { x, y }
    }
    fn seg(
        from: &str,
        to: &str,
        points: Vec<StaffRoutePoint>,
        marked: Option<bool>,
    ) -> StaffEdgeRoute {
        StaffEdgeRoute {
            from_id: from.to_string(),
            to_id: to.to_string(),
            kind: "admin".to_string(),
            points,
            marked,
        }
    }

    #[test]
    fn h6_combined_scene_matches_golden() {
        let (persons, edges, frames) = h6_scene();
        let set = staff_routes(&frames_input(&persons, &edges, &frames, "near", 16.0));
        let expected = StaffRouteSet {
            lod: "near".to_string(),
            segments: vec![
                // P→A: база блокована X@corr175; detour бере першу чисту доріжку y=144 (gap=pad).
                seg(
                    "P",
                    "A",
                    vec![
                        route_pt(50.0, 50.0),
                        route_pt(50.0, 144.0),
                        route_pt(250.0, 144.0),
                        route_pt(250.0, 300.0),
                    ],
                    None,
                ),
                // S→T: aligned x=650 → пряма крізь foreign-рамку df → залишок + §12-маркер.
                seg(
                    "S",
                    "T",
                    vec![route_pt(650.0, 50.0), route_pt(650.0, 300.0)],
                    Some(true),
                ),
                // M→N: чистий elbow, далеко від усіх перешкод.
                seg(
                    "M",
                    "N",
                    vec![
                        route_pt(-350.0, 50.0),
                        route_pt(-350.0, 175.0),
                        route_pt(-150.0, 175.0),
                        route_pt(-150.0, 300.0),
                    ],
                    None,
                ),
            ],
        };
        assert_eq!(
            format!("{set:?}"),
            format!("{expected:?}"),
            "golden StaffRouteSet розійшовся — див. actual vs expected"
        );
    }

    #[test]
    fn h6_combined_scene_is_byte_identical_across_runs() {
        let (persons, edges, frames) = h6_scene();
        for lod in ["near", "mid", "far"] {
            let a = staff_routes(&frames_input(&persons, &edges, &frames, lod, 16.0));
            let b = staff_routes(&frames_input(&persons, &edges, &frames, lod, 16.0));
            assert_eq!(
                format!("{a:?}"),
                format!("{b:?}"),
                "маршрути мають бути байт-ідентичні між прогонами (lod={lod})"
            );
        }
    }
}
