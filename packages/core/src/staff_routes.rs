//! R6: маршрути staff-лінків (ЯК, T126). R6-1 деревні; R6-3a ч.2 — порти з per-LOD боксів + org-картки;
//! R6-3b — **локальний обхід КАРТОК** (пер-ребро корид-детур, ≥pad).
//!
//! Бере ВЖЕ позиціоновані вузли (R3/R4/R5) і рахує ЛИШЕ ортогональні маршрути — не перерозкладає.
//!
//! **R6-3b обхід (PIN-1, локальний, НЕ grid-A*):** обчислити R6-3a-елбоу → перевірити проти per-LOD
//! card-set (seg_rect_distance < pad, крім власних from/to) → якщо чисто: лишити БАЙТ-ІДЕНТИЧНО
//! (детур не біжить — паритет) → якщо блок: сканувати детерміновані corridorY-доріжки (над/під карткою
//! при pad) і взяти першу чисту проти ВСЬОГО card-set → якщо чистої нема: лишити базовий маршрут як
//! ЗАЛИШОК для R6-4 (тут НЕ маркуємо). Пер-ребро, stateless: спільні доріжки, рамки, §12-маркінг,
//! K-loop — R6-4; ярусні плінки — R6-7. Edge-edge перетини між незалежними детурами НЕ розв'язуються
//! тут (визнано) — це R6-4.
//!
//! **Межа/pad:** детектор-гейт `MIN_CLEARANCE_PX=8` — тверда нижня межа; детур ЦІЛИТЬ у `card_pad`
//! (вхід, прод-дефолт 16 = паритет мокапу) з інваріантом `card_pad ≥ MIN_CARD_PAD` → усе, що детектор
//! флагне (<8), детур перекрив (бо тригериться на ширшій смузі pad). `card_pad<=0` вимикає обхід (паритет R6-3a).
//!
//! **Lookup (P1):** два РОЗДІЛЬНІ лінійні find, precedence person→org. **Паритет (R6-6):** near без
//! hints person-бокс = повний (x,y,w,h); corridorY=`(from.y+from.h+to.y)/2`. Поріг «пряма» = 0.5 px.

use crate::staff_edge_box::{
    visual_org_edge_box, visual_person_edge_box, EdgeRect, PersonEdgeHints,
};
use crate::staff_geom::{obstacle_rect, seg_rect_distance};
use crate::types::{
    StaffEdge, StaffEdgeRoute, StaffNodeGeo, StaffOrgCardGeo, StaffRoutePoint, StaffRouteSet,
};

/// Бік бокса, з якого виходить/входить лінк. Порт — центр відповідного ребра.
#[derive(Debug, Clone, Copy)]
enum Side {
    Top,
    Bottom,
}

/// Поріг вертикального вирівнювання (пряма вниз без елбоу). Легасі-паритет `staffEdgeGeometry.ts:136`.
const STRAIGHT_EPS: f32 = 0.5;

/// Нижня межа `card_pad` при увімкненому обході = детектор-гейт (`MIN_CLEARANCE_PX`). pad нижче тіпнув би
/// нижче гейта через f32-округлення (PIN-4).
const MIN_CARD_PAD: f32 = 8.0;

/// Поріг зближення двох доріжок-кандидатів (дедуп близьких lane).
const LANE_DEDUP_EPS: f32 = 0.5;

/// Входи маршрутизатора. `person_hints` — плейн-пари (id, hints); near-figma докує порт на tile,
/// mid/far ІГНОРУЮТЬ hints. `card_pad>0` вмикає обхід карток (≥pad); `<=0` — чистий R6-3a (паритет).
/// Порядок виходу задають `edges`, не hints.
pub struct RouteInputs<'a> {
    pub persons: &'a [StaffNodeGeo],
    pub org_cards: &'a [StaffOrgCardGeo],
    pub edges: &'a [StaffEdge],
    pub lod: &'a str,
    pub person_hints: &'a [(String, PersonEdgeHints)],
    pub card_pad: f32,
}

/// Порт бокса: центр верхнього або нижнього ребра edge-бокса (per-LOD).
fn port(rect: &EdgeRect, side: Side) -> StaffRoutePoint {
    let x = rect.x + rect.width / 2.0;
    let y = match side {
        Side::Top => rect.y,
        Side::Bottom => rect.y + rect.height,
    };
    StaffRoutePoint { x, y }
}

/// Ортогональна полілінія `from.bottom → corridorY → to.top` по per-LOD боксах (R6-3a база).
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

/// Набір карток-перешкод = усі persons+orgs у per-LOD боксах (PIN-3: ЛИШЕ картки; рамки/`.dn` — R6-4).
/// Порядок детермінований: persons (вхідний порядок), потім orgs.
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

/// Чи полілінія тримає ≥pad від УСІХ перешкод (ефективний obstacle-rect, figma-розгортання).
fn route_clear_of(points: &[StaffRoutePoint], obstacles: &[&EdgeRect], pad: f32) -> bool {
    for c in obstacles {
        let (rx, ry, rw, rh) = obstacle_rect(c);
        for s in points.windows(2) {
            if seg_rect_distance(&s[0], &s[1], rx, ry, rw, rh) < pad {
                return false;
            }
        }
    }
    true
}

/// Локальний корид-детур одного ребра (PIN-1). Повертає базовий маршрут незмінним, якщо чисто або якщо
/// локальної чистої доріжки нема (залишок для R6-4).
fn detour_edge(
    from: &EdgeRect,
    to: &EdgeRect,
    from_id: &str,
    to_id: &str,
    cards: &[EdgeRect],
    pad: f32,
) -> Vec<StaffRoutePoint> {
    let base = route_ortho(from, to);
    // Перешкоди = усі картки, крім власних кінців ребра (self-exempt по id).
    let obstacles: Vec<&EdgeRect> = cards
        .iter()
        .filter(|c| c.id != from_id && c.id != to_id)
        .collect();
    if route_clear_of(&base, &obstacles, pad) {
        return base; // паритет: детур не біжить на чистому маршруті
    }

    let ax = from.x + from.width / 2.0;
    let bx = to.x + to.width / 2.0;
    if (ax - bx).abs() < STRAIGHT_EPS {
        return base; // пряма вертикаль: corridorY-зсув не допоможе → залишок R6-4
    }
    let from_bottom = from.y + from.height;
    let to_top = to.y;
    let corr0 = (from_bottom + to_top) / 2.0;

    // Кандидатні доріжки: над і під кожною НЕ-власною карткою (при pad); кожну валідує route_clear_of,
    // тож зайві кандидати нешкідливі — беремо першу чисту за |Δ corr0|.
    let mut lanes: Vec<f32> = Vec::new();
    for c in &obstacles {
        let (_, ry, _, rh) = obstacle_rect(c);
        lanes.push(ry - pad);
        lanes.push(ry + rh + pad);
    }
    // Дедуп близьких, потім сорт за |Δ від corr0| (нічия → менший y, тобто вгору).
    lanes.sort_by(|a, b| a.partial_cmp(b).unwrap());
    lanes.dedup_by(|a, b| (*a - *b).abs() < LANE_DEDUP_EPS);
    lanes.sort_by(|a, b| {
        let (da, db) = ((a - corr0).abs(), (b - corr0).abs());
        da.partial_cmp(&db).unwrap().then(a.partial_cmp(b).unwrap())
    });

    for lane in lanes {
        let cand = elbow_or_straight(ax, from_bottom, bx, to_top, lane);
        if route_clear_of(&cand, &obstacles, pad) {
            return cand;
        }
    }
    base // чистої локальної доріжки нема → залишок для R6-4
}

/// Маршрути для одного LOD. Кожне ребро → ортогональний маршрут `from→to` по per-LOD боксах; при
/// `card_pad>0` — з локальним обходом карток. Порядок сегментів = вхідний порядок `edges`. Self-loop і
/// висячі ребра пропускаються. `kind` вербатим; `lod` штампується.
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
            detour_edge(
                &from,
                &to,
                &edge.from_id,
                &edge.to_id,
                &cards,
                input.card_pad,
            )
        } else {
            route_ortho(&from, &to)
        };
        segments.push(StaffEdgeRoute {
            from_id: edge.from_id.clone(),
            to_id: edge.to_id.clone(),
            kind: edge.kind.clone(),
            points,
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

    fn node_wh(id: &str, x: f32, y: f32, w: f32, h: f32) -> StaffNodeGeo {
        StaffNodeGeo {
            id: id.to_string(),
            organization_id: "o1".to_string(),
            x,
            y,
            width: w,
            height: h,
            tier: 2,
            role: None,
            depth: None,
            department_id: None,
            part_index: None,
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
        StaffEdge {
            from_id: from.to_string(),
            to_id: to.to_string(),
            kind: "admin".to_string(),
        }
    }

    fn edge_kind(from: &str, to: &str, kind: &str) -> StaffEdge {
        StaffEdge {
            from_id: from.to_string(),
            to_id: to.to_string(),
            kind: kind.to_string(),
        }
    }

    const NO_CARDS: &[StaffOrgCardGeo] = &[];
    const NO_HINTS: &[(String, PersonEdgeHints)] = &[];

    /// Персони-only вхід БЕЗ обходу (паритетний R6-1/R6-3a виклик, card_pad=0).
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
    fn cross_tier_person_to_org_card_resolves() {
        let persons = [node("head", 0.0, 0.0, 2)];
        let cards = [org_card("org9", 200.0, 300.0)];
        let edges = [edge_kind("head", "org9", "cross-tier")];
        let input = RouteInputs {
            persons: &persons,
            org_cards: &cards,
            edges: &edges,
            lod: "near",
            person_hints: NO_HINTS,
            card_pad: 0.0,
        };
        let set = staff_routes(&input);
        assert_eq!(set.segments.len(), 1);
        let r = &set.segments[0];
        assert_eq!(r.kind, "cross-tier");
        assert!(point_eq(&r.points[0], 50.0, 50.0));
        assert!(point_eq(r.points.last().unwrap(), 280.0, 300.0));
        assert!(is_orthogonal(&r.points));
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
            card_pad: 0.0,
        };
        let set = staff_routes(&input);
        let r = &set.segments[0];
        assert!(point_eq(r.points.last().unwrap(), 250.0, 120.0));
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
            card_pad: 0.0,
        };
        let set = staff_routes(&input);
        let r = &set.segments[0];
        assert!(point_eq(&r.points[0], 32.0, 56.0));
    }

    #[test]
    fn oracle_asserts_clean_fixture_has_no_clearance_violations() {
        use crate::staff_clearance::{card_clearance, foreign_frame_intrusions, FrameRect};

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
        assert_eq!(set.segments.len(), 4);

        let boxes: Vec<EdgeRect> = nodes
            .iter()
            .map(|n| visual_person_edge_box(&n.id, n.x, n.y, n.width, n.height, "near", None))
            .collect();

        let rep = card_clearance(&set.segments, &boxes);
        assert_eq!(rep.violations, 0, "чиста рознесена фікстура — 0 порушень");

        let foreign = [FrameRect {
            department_id: "dX".to_string(),
            part_index: None,
            x: -10.0,
            y: 110.0,
            width: 40.0,
            height: 30.0,
        }];
        let no_member = |_id: &str| None;
        assert!(
            foreign_frame_intrusions(&set.segments, &foreign, &no_member) >= 1,
            "детектор має ловити інтрузію чужої рамки на реальному маршруті"
        );
    }

    // --- R6-3b: локальний обхід карток ---

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
            card_pad: pad,
        }
    }

    fn near_boxes(nodes: &[StaffNodeGeo]) -> Vec<EdgeRect> {
        nodes
            .iter()
            .map(|n| visual_person_edge_box(&n.id, n.x, n.y, n.width, n.height, "near", None))
            .collect()
    }

    // PIN-2 контроль: без блокуючої картки детур НЕ біжить — байт-ідентично R6-3a.
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

    // PIN-2 головний: РОЗВ'ЯЗНИЙ блок — детур зсуває коридор, порушення детектора 1→0.
    #[test]
    fn avoidance_detours_resolvable_block_clearing_violations() {
        use crate::staff_clearance::card_clearance;
        // P→c1 елбоу (корид y=125); X мала картка в коридорі, з запасом між колонками x=150/x=50.
        let nodes = [
            node_wh("P", 100.0, 0.0, 100.0, 50.0),
            node_wh("c1", 0.0, 200.0, 100.0, 50.0),
            node_wh("X", 80.0, 110.0, 40.0, 20.0), // x∈[80..120] (між колонками з запасом >pad)
        ];
        let edges = [edge("P", "c1")];
        let boxes = near_boxes(&nodes);

        let base = staff_routes(&avoid_input(&nodes, &edges, "near", 0.0));
        assert!(
            card_clearance(&base.segments, &boxes).violations > 0,
            "базовий маршрут має кліпати X"
        );

        let avoided = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        assert_eq!(
            card_clearance(&avoided.segments, &boxes).violations,
            0,
            "детур має прибрати всі порушення на розв'язному блоці"
        );
        // Детур реально змінив маршрут (не лишив базовий).
        assert!(!points_eq(
            &avoided.segments[0].points,
            &base.segments[0].points
        ));
        assert!(is_orthogonal(&avoided.segments[0].points));
    }

    // PIN-2 чесність: НЕРОЗВ'ЯЗНИЙ локально блок — детур лишає базовий (залишок R6-4), 0 НЕ заявляємо.
    #[test]
    fn avoidance_leaves_unresolvable_block_as_remnant() {
        use crate::staff_clearance::card_clearance;
        // X широка — накриває коридор майже впритул до обох колонок (<pad з боків) → чистої доріжки нема.
        let nodes = [
            node_wh("P", 100.0, 0.0, 100.0, 50.0),
            node_wh("c1", 0.0, 200.0, 100.0, 50.0),
            node_wh("X", 60.0, 110.0, 80.0, 30.0), // x∈[60..140], впритул до x=50/x=150
        ];
        let edges = [edge("P", "c1")];
        let boxes = near_boxes(&nodes);

        let base = staff_routes(&avoid_input(&nodes, &edges, "near", 0.0));
        let avoided = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        // Нема локальної доріжки → базовий маршрут незмінний (залишок для R6-4).
        assert!(points_eq(
            &avoided.segments[0].points,
            &base.segments[0].points
        ));
        // Чесно: порушення ЛИШАЮТЬСЯ (R6-4 їх закриє); 0 НЕ заявляємо.
        assert!(card_clearance(&avoided.segments, &boxes).violations > 0);
    }

    // PIN-4: детермінізм — два прогони байт-ідентичні.
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
}
