//! R6: маршрути staff-лінків (ЯК, T126). R6-1 — деревні (intra-block admin); R6-3a ч.2 — ІНТЕГРАЦІЯ:
//! порти рахуються з per-LOD едж-боксів (`staff_edge_box`), а не з сирих вузлів, і резолвляться
//! org-картки як цілі (HOLE-2), з threading hints (HOLE-1).
//!
//! Бере ВЖЕ позиціоновані вузли (R3/R4/R5) і рахує ЛИШЕ ортогональні маршрути — не перерозкладає.
//!
//! **Scope R6-3a ч.2 = dept-рівневий роутинг** по боксах. Вмикає НАЇВНУ cross-tier геометрію
//! (вертикальний drop bottom-center→top-center). БЕЗ обходу перешкод (R6-3b/R6-4) і БЕЗ плінк-стилю
//! чи frame-портів — ярусні org-лінки (штрих `.plink`, managing→current, deptTop для голів) = R6-7.
//! `kind` переноситься ВЕРБАТИМ, стиль — у TS-paint.
//!
//! **Lookup (критик P1):** два РОЗДІЛЬНІ лінійні find із precedence person→org — детерміновано, без
//! питання порядку HashMap. Інваріант диз'юнктності id-просторів (person.id vs org_id) тримає upstream.
//!
//! **Паритет (ціль R6-6):** на near без hints person-бокс = повний (x,y,w,h) сирого вузла
//! (`staff_edge_box::person_visual_world_rect`), тож corridorY = `(from.y+from.h + to.y)/2` і порти
//! збігаються з R6-1 / легасі `staffEdgeGeometry.ts::verticalPolyline`. Поріг «пряма» = 0.5 px.

use crate::staff_edge_box::{
    visual_org_edge_box, visual_person_edge_box, EdgeRect, PersonEdgeHints,
};
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

/// Входи маршрутизатора. `person_hints` — плейн-пари (id, hints); near-figma докує порт на tile
/// (avatar-dock, ADR-0002), mid/far ІГНОРУЮТЬ hints. Порядок виходу задають `edges`, не hints.
pub struct RouteInputs<'a> {
    pub persons: &'a [StaffNodeGeo],
    pub org_cards: &'a [StaffOrgCardGeo],
    pub edges: &'a [StaffEdge],
    pub lod: &'a str,
    pub person_hints: &'a [(String, PersonEdgeHints)],
}

/// Порт бокса: центр верхнього або нижнього ребра edge-бокса (НЕ сирого вузла — per-LOD).
fn port(rect: &EdgeRect, side: Side) -> StaffRoutePoint {
    let x = rect.x + rect.width / 2.0;
    let y = match side {
        Side::Top => rect.y,
        Side::Bottom => rect.y + rect.height,
    };
    StaffRoutePoint { x, y }
}

/// Ортогональна полілінія `from.bottom → corridorY → to.top` по per-LOD боксах. Вирівняні по x
/// (|dx|<0.5) → пряма [a,b]; інакше елбоу [a, (a.x,corr), (b.x,corr), b]. corridorY — середина проміжку.
fn route_ortho(from: &EdgeRect, to: &EdgeRect) -> Vec<StaffRoutePoint> {
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

/// Резолв кінця ребра в per-LOD edge-бокс. Precedence person→org (критик P1): спершу вузли-посади
/// (hints застосовуються лише до них), потім org-картки за `org_id`. `None` — висяче ребро.
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

/// Маршрути для одного LOD. Кожне ребро → ортогональний елбоу `from→to` по per-LOD боксах. Порядок
/// сегментів = вхідний порядок `edges` (детермінізм). Self-loop (from==to) і висячі ребра (кінець не
/// резолвиться ні в posts, ні в org-картки) пропускаються. `kind` переноситься вербатим; `lod` штампується.
pub fn staff_routes(input: &RouteInputs) -> StaffRouteSet {
    let mut segments: Vec<StaffEdgeRoute> = Vec::new();
    for edge in input.edges {
        if edge.from_id == edge.to_id {
            continue; // self-loop: нема що маршрутизувати
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
            continue; // висяче ребро — валідацію робить окремий шар
        };
        segments.push(StaffEdgeRoute {
            from_id: edge.from_id.clone(),
            to_id: edge.to_id.clone(),
            kind: edge.kind.clone(),
            points: route_ortho(&from, &to),
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

    /// Персони-only вхід (паритетний R6-1 виклик).
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

    // --- R6-1 геометрія (адаптована на RouteInputs; near+no-hints = паритет) ---

    #[test]
    fn elbow_endpoints_sit_on_center_ports_and_is_orthogonal() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 200.0, 120.0, 2)];
        let edges = [edge("p", "c")];
        let set = staff_routes(&persons_input(&nodes, &edges, "near"));
        let r = &set.segments[0];
        assert_eq!(r.points.len(), 4);
        assert!(point_eq(&r.points[0], 50.0, 50.0)); // p bottom-center
        assert!(point_eq(r.points.last().unwrap(), 250.0, 120.0)); // c top-center
        assert!(is_orthogonal(&r.points));
    }

    #[test]
    fn corridor_y_is_midpoint_matching_legacy() {
        let nodes = [node("p", 0.0, 0.0, 2), node("c", 200.0, 120.0, 2)];
        let edges = [edge("p", "c")];
        let set = staff_routes(&persons_input(&nodes, &edges, "near"));
        let r = &set.segments[0];
        let expected = (0.0 + 50.0 + 120.0) / 2.0; // 85
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

    // --- P3: паритет near+no-hints ЧИСЛОВО дорівнює R6-1 (regression-pin) ---
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

    // --- P1: HOLE-2 — ребро person→org РЕЗОЛВИТЬСЯ (не skip); кінець у top org-картки ---
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
        };
        let set = staff_routes(&input);
        assert_eq!(set.segments.len(), 1, "person→org має резолвитись, не skip");
        let r = &set.segments[0];
        assert_eq!(r.kind, "cross-tier"); // P2: kind вербатим
        assert!(point_eq(&r.points[0], 50.0, 50.0)); // низ картки head (person)
                                                     // верх org-картки: center x = 200+160/2=280, y=300
        assert!(point_eq(r.points.last().unwrap(), 280.0, 300.0));
        assert!(is_orthogonal(&r.points));
    }

    // --- P1: person виграє на (штучній) колізії id-просторів person.id == org_id ---
    #[test]
    fn person_wins_over_org_card_on_id_collision() {
        // І вузол-посада, І org-картка мають id "x"; ціль "x" має резолвитись у ПЕРСОНУ.
        let persons = [node("p", 0.0, 0.0, 2), node("x", 200.0, 120.0, 2)];
        let cards = [org_card("x", 999.0, 999.0)]; // якби виграла org — y був би ~999
        let edges = [edge("p", "x")];
        let input = RouteInputs {
            persons: &persons,
            org_cards: &cards,
            edges: &edges,
            lod: "near",
            person_hints: NO_HINTS,
        };
        let set = staff_routes(&input);
        let r = &set.segments[0];
        // top-center персони "x" = (250,120), НЕ org-картки (1079,999).
        assert!(point_eq(r.points.last().unwrap(), 250.0, 120.0));
    }

    // --- P3: figma-hint на near докує ПОРТ на tile-центр (avatar-dock, HOLE-1) ---
    #[test]
    fn figma_hint_docks_source_port_on_tile_center() {
        // from з figma-hint: tile (tile_x=12,tile_y=16,size=40) → бокс [12..52]x[16..56] у світі.
        // Нижній порт = (x+12+40/2, y+16+40) = (32, 56) при вузлі в (0,0).
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
        };
        let set = staff_routes(&input);
        let r = &set.segments[0];
        assert!(point_eq(&r.points[0], 32.0, 56.0)); // порт на tile-центрі, не на (50,50)
    }

    // --- P4: детектор-оракул як АСЕРТ над РЕАЛЬНИМ виходом роутера (не глобальне «0») ---
    // Чиста мульти-батьківська фікстура (депи/рамок нема, картки рознесені) → card_clearance 0 порушень.
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

        // Боксі перешкод = per-LOD near-боксі тих самих вузлів (повний бокс).
        let boxes: Vec<EdgeRect> = nodes
            .iter()
            .map(|n| visual_person_edge_box(&n.id, n.x, n.y, n.width, n.height, "near", None))
            .collect();

        let rep = card_clearance(&set.segments, &boxes);
        assert_eq!(rep.violations, 0, "чиста рознесена фікстура — 0 порушень");

        // Frame-half (дискримінуючий): чужа рамка на шляху РЕАЛЬНОГО маршруту P→c1 (елбоу через
        // коридор y=125) — детектор має зловити інтрузію на виході роутера, не на ручній полілінії.
        // Маршрут P→c1: (50,50)(50,125)(-30,125)(-30,200); рамка накриває горизонталь y=125.
        let foreign = [FrameRect {
            department_id: "dX".to_string(),
            part_index: None,
            x: -10.0,
            y: 110.0,
            width: 40.0,
            height: 30.0,
        }];
        let no_member = |_id: &str| None; // жоден кінець не член dX → рамка чужа
        assert!(
            foreign_frame_intrusions(&set.segments, &foreign, &no_member) >= 1,
            "детектор має ловити інтрузію чужої рамки на реальному маршруті"
        );
    }
}
