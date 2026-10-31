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

/// Ортогональна база `from.bottom → corridorY → to.top` по per-LOD боксах (R6-3a). Спільний елбоу-
/// білдер internal-tree ребер: detour-шлях і A*-пайплайн (T7 `route_scene`) малюють int однаково.
pub(crate) fn route_ortho(from: &EdgeRect, to: &EdgeRect) -> Vec<StaffRoutePoint> {
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

/// Вертикальний кандидат (A2.3, порт `staffEdgeGeometry.ts::verticalPolyline` :129-175): НАПРЯМ-
/// залежний (ціль нижче → порти bottom→top; ціль вище → top→bottom) і `None`, коли нема чистого
/// вертикального зазору. Замінює `route_ortho` як V-кандидат ладдера — route_ortho завжди йшов униз
/// (хибний напрям для childAbove; matrix/dotted з `input.reports` роблять childAbove prod-досяжним).
/// Для childBelow+gap тотожний `route_ortho` байт-у-байт (corr==midY, ті самі порти).
fn route_vertical(from: &EdgeRect, to: &EdgeRect) -> Option<Vec<StaffRoutePoint>> {
    let from_cx = from.x + from.width / 2.0;
    let to_cx = to.x + to.width / 2.0;
    let from_cy = from.y + from.height / 2.0;
    let to_cy = to.y + to.height / 2.0;
    let child_below = to_cy >= from_cy; // tie→below (оракул :134, не строгий)
    let (y1, y2) = if child_below {
        (from.y + from.height, to.y) // from.bottom → to.top
    } else {
        (from.y, to.y + to.height) // from.top → to.bottom
    };
    // Чистий зазор у напрямку руху (інакше None → ладдер пробує H / падає в detour).
    let clear_gap = if child_below {
        y1 <= y2 - STRAIGHT_EPS
    } else {
        y2 <= y1 - STRAIGHT_EPS
    };
    if !clear_gap {
        return None;
    }
    let corr = (y1 + y2) / 2.0;
    Some(elbow_or_straight(from_cx, y1, to_cx, y2, corr))
}

/// Горизонтальний кандидат (A2.2, порт `staffEdgeGeometry.ts::horizontalPolyline` :181-209): бічні
/// порти (центр left/right ребра) + midX-елбоу. `None`, коли нема ЧИСТОГО горизонтального зазору між
/// AABB — ця умова несуча: Rust clean-check не перевіряє перетин ВЛАСНИХ from/to боксів (idx скіпає їх
/// по id), тож `None` при !clear_gap — єдиний запобіжник проти H, що ріже власний бокс (A2.2 критик B2).
fn route_horizontal(from: &EdgeRect, to: &EdgeRect) -> Option<Vec<StaffRoutePoint>> {
    let from_cx = from.x + from.width / 2.0;
    let to_cx = to.x + to.width / 2.0;
    let from_cy = from.y + from.height / 2.0;
    let to_cy = to.y + to.height / 2.0;
    let from_right = from.x + from.width;
    let to_right = to.x + to.width;
    let go_right = to_cx >= from_cx; // tie→right (оракул :188, не строгий)
    let clear_gap = if go_right {
        from_right <= to.x + STRAIGHT_EPS
    } else {
        to_right <= from.x + STRAIGHT_EPS
    };
    if !clear_gap {
        return None;
    }
    let x1 = if go_right { from_right } else { from.x };
    let x2 = if go_right { to.x } else { to_right };
    if (from_cy - to_cy).abs() < STRAIGHT_EPS {
        return Some(vec![
            StaffRoutePoint { x: x1, y: from_cy },
            StaffRoutePoint { x: x2, y: to_cy },
        ]);
    }
    let mid_x = if go_right {
        (from_right + to.x) / 2.0
    } else {
        (to_right + from.x) / 2.0
    };
    Some(vec![
        StaffRoutePoint { x: x1, y: from_cy },
        StaffRoutePoint {
            x: mid_x,
            y: from_cy,
        },
        StaffRoutePoint { x: mid_x, y: to_cy },
        StaffRoutePoint { x: x2, y: to_cy },
    ])
}

/// Бічний обхід (R6-4b): H-V-H навколо рамки — вихід униз, біг до вертикального коридору `lane_x`
/// збоку рамки, спуск уздовж нього, повернення до верху цілі. Нульові сегменти (lane_x==ax чи ==bx)
/// згортаються, тож маршрут лишається ортогональним без дублів-точок.
fn side_detour(
    ax: f32,
    from_bottom: f32,
    bx: f32,
    to_top: f32,
    lane_x: f32,
) -> Vec<StaffRoutePoint> {
    let raw = [
        StaffRoutePoint {
            x: ax,
            y: from_bottom,
        },
        StaffRoutePoint {
            x: lane_x,
            y: from_bottom,
        },
        StaffRoutePoint {
            x: lane_x,
            y: to_top,
        },
        StaffRoutePoint { x: bx, y: to_top },
    ];
    let mut out: Vec<StaffRoutePoint> = Vec::with_capacity(4);
    for p in raw {
        if let Some(last) = out.last() {
            if (last.x - p.x).abs() < STRAIGHT_EPS && (last.y - p.y).abs() < STRAIGHT_EPS {
                continue;
            }
        }
        out.push(p);
    }
    out
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
/// Повертає `(усі перешкоди, індекс першої рамки)`: картки йдуть першими, далі self-exempted
/// чужі рамки. Хвіст `obs[frames_at..]` — лише рамки, джерело X-кандидатів бічного обходу (R6-4b,
/// «високих **рамок**»); картки свій бічний обхід не отримують.
fn obstacles_for_edge(
    cards: &[EdgeRect],
    frames: &[FrameRect],
    from_id: &str,
    to_id: &str,
    src: &Option<DeptPart>,
    dst: &Option<DeptPart>,
) -> (Vec<ObstacleRect>, usize) {
    let mut obs: Vec<ObstacleRect> = Vec::new();
    for c in cards {
        if c.id != from_id && c.id != to_id {
            obs.push(obstacle_rect(c));
        }
    }
    let frames_at = obs.len();
    for f in frames {
        let k = f.key();
        if Some(&k) == src.as_ref() || Some(&k) == dst.as_ref() {
            continue; // рідна рамка — ендпоінт усередині, не перешкода
        }
        obs.push((f.x, f.y, f.width, f.height));
    }
    (obs, frames_at)
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

/// Просторовий індекс карток-перешкод (A2.1). Збудований РАЗ на весь виклик `staff_routes` →
/// прибирає ДОМІНАНТНИЙ n² clean-check (кожне чисте ребро більше не сканує всі картки). Порт
/// `staffEdgeGeometry.ts::ObstacleIndex`, але критерій тут — `seg_rect_distance < pad` (не
/// interior-hit), тож інфляція bbox = **`pad`**, не TS-ні 1px (A2.1 критик B1).
///
/// EXACT: полілінія ⊆ своєї bbox ⇒ `dist(polyline, rect) ≥ dist(bbox, rect)`. Per-axis reject по
/// `pad` (box-Minkowski) відкидає ЛИШЕ коли gapX>pad АБО gapY>pad ⇒ dist>pad — ніколи не губить
/// реальний блокер; кутові кандидати (до pad·√2) лишаються й перевіряються точним
/// `seg_rect_distance` ⇒ булеве значення тотожне наївному скану (байт-ідентичність виходу).
///
/// Несе `ids` паралельно (skip from/to **по id**, не по індексу): card-set може містити person+org
/// з однаковим id — обидва мусять скіпатися (паритет `person_wins_over_org_card_on_id_collision`).
/// Межі/сорт — по `obstacle_rect` (figma-row розгортає весь рядок).
struct CardIndex {
    /// `obstacle_rect` карток, у порядку зростання top (`.1`).
    rects: Vec<ObstacleRect>,
    /// Паралельний id картки (для skip-by-id).
    ids: Vec<String>,
    /// `rects[i].1` окремим пласким масивом — щоб `partition_point` читав один зріз.
    tops: Vec<f32>,
    /// Найвища картка: наскільки вище смуги може початися перекриття.
    max_height: f32,
}

impl CardIndex {
    fn build(cards: &[EdgeRect]) -> Self {
        let mut items: Vec<(ObstacleRect, String)> = cards
            .iter()
            .map(|c| (obstacle_rect(c), c.id.clone()))
            .collect();
        // partial_cmp (дзеркало TS `a.y - b.y`), не total_cmp — зберегти tie-порядок; координати
        // layout скінченні (A2.1 критик NB5). Для булевого clear-of порядок рівних-top не важить.
        items.sort_by(|a, b| a.0 .1.partial_cmp(&b.0 .1).unwrap());
        let mut rects = Vec::with_capacity(items.len());
        let mut ids = Vec::with_capacity(items.len());
        let mut tops = Vec::with_capacity(items.len());
        let mut max_height = 0.0f32;
        for (r, id) in items {
            if r.3 > max_height {
                max_height = r.3;
            }
            tops.push(r.1);
            rects.push(r);
            ids.push(id);
        }
        CardIndex {
            rects,
            ids,
            tops,
            max_height,
        }
    }

    /// Чи `points` тримає ≥`pad` від УСІХ карток, крім `from_id`/`to_id` (skip by id). Булево
    /// тотожне `route_clear_of(points, <картки ∖ {from,to}>, pad)`.
    fn clear_of(&self, points: &[StaffRoutePoint], pad: f32, from_id: &str, to_id: &str) -> bool {
        let mut min_x = f32::INFINITY;
        let mut min_y = f32::INFINITY;
        let mut max_x = f32::NEG_INFINITY;
        let mut max_y = f32::NEG_INFINITY;
        for p in points {
            min_x = min_x.min(p.x);
            max_x = max_x.max(p.x);
            min_y = min_y.min(p.y);
            max_y = max_y.max(p.y);
        }
        // Старт смуги: картка з top аж до `min_y - pad - max_height` ще може дотягтися знизу в смугу.
        let start = self
            .tops
            .partition_point(|&t| t < min_y - pad - self.max_height);
        for i in start..self.rects.len() {
            let (rx, ry, rw, rh) = self.rects[i];
            if ry > max_y + pad {
                break; // tops відсортовані зростанням → далі всі ще нижче, gapY>pad
            }
            if self.ids[i] == from_id || self.ids[i] == to_id {
                continue; // власний кінець ребра
            }
            if rx > max_x + pad || rx + rw < min_x - pad || ry + rh < min_y - pad {
                continue; // bbox-reject по pad: gap>pad ⇒ dist>pad (EXACT)
            }
            for s in points.windows(2) {
                if seg_rect_distance(&s[0], &s[1], rx, ry, rw, rh) < pad {
                    return false;
                }
            }
        }
        true
    }
}

/// Чи `points` пенетрує (ближче за `pad`) якусь ЧУЖУ рамку (own-рамки `src`/`dst` exempt) — та сама
/// множина рамок-перешкод, що й хвіст `obstacles_for_edge`. Рамок мало → лінійно, per-edge.
fn foreign_frame_blocks(
    points: &[StaffRoutePoint],
    frames: &[FrameRect],
    src: &Option<DeptPart>,
    dst: &Option<DeptPart>,
    pad: f32,
) -> bool {
    for f in frames {
        let k = f.key();
        if Some(&k) == src.as_ref() || Some(&k) == dst.as_ref() {
            continue; // рідна рамка — ендпоінт усередині
        }
        for s in points.windows(2) {
            if seg_rect_distance(&s[0], &s[1], f.x, f.y, f.width, f.height) < pad {
                return true;
            }
        }
    }
    false
}

/// Локальний корид-детур (PIN-1). Повертає базовий маршрут, якщо чисто або якщо локальної чистої
/// доріжки нема (залишок). `obstacles` уже self-exempted (картки/рамки ребра).
fn detour_edge(
    from: &EdgeRect,
    to: &EdgeRect,
    obstacles: &[ObstacleRect],
    frames: &[ObstacleRect],
    pad: f32,
) -> Vec<StaffRoutePoint> {
    let base = route_ortho(from, to);
    if route_clear_of(&base, obstacles, pad) {
        return base; // паритет: детур не біжить на чистому маршруті
    }

    let ax = from.x + from.width / 2.0;
    let bx = to.x + to.width / 2.0;
    if (ax - bx).abs() < STRAIGHT_EPS {
        return base; // пряма вертикаль: ні corridorY-зсув, ні бічний обхід не допоможе → залишок
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

    // R6-4b бічний обхід: жодна Y-доріжка не чиста (висока рамка перекриває колонки ax/bx).
    // Пробуємо вертикальний коридор ЗБОКУ кожної РАМКИ (не картки — scope «високих рамок»).
    // Кандидата валідуємо проти ВСІХ перешкод; детермінований порядок — ближчий до колони першим.
    let mut xlanes: Vec<f32> = Vec::new();
    for &(rx, _, rw, _) in frames {
        xlanes.push(rx - pad);
        xlanes.push(rx + rw + pad);
    }
    xlanes.sort_by(|a, b| a.partial_cmp(b).unwrap());
    xlanes.dedup_by(|a, b| (*a - *b).abs() < LANE_DEDUP_EPS);
    xlanes.sort_by(|a, b| {
        let da = (a - ax).abs().min((a - bx).abs());
        let db = (b - ax).abs().min((b - bx).abs());
        da.partial_cmp(&db).unwrap().then(a.partial_cmp(b).unwrap())
    });
    for lane_x in xlanes {
        let cand = side_detour(ax, from_bottom, bx, to_top, lane_x);
        if route_clear_of(&cand, obstacles, pad) {
            return cand;
        }
    }

    base // ні Y-доріжки, ні бічного обходу — залишок
}

/// Маршрути для одного LOD. При `card_pad>0` — з локальним обходом карток і чужих рамок; §12-маркер
/// (`marked`) ставиться BY CONSTRUCTION, коли фінальний маршрут усе ще пенетрує чужу рамку.
/// Internal dev switch (NOT a public flag): default keeps the stateless detour so `golden` is
/// unchanged; the A* pipeline (`route_scene`, T4–T7) is reachable for bring-up and tests. Flipping
/// the default to A* is T8 step C — it changes routed coordinates, so it waits on the manual R3
/// visual gate + golden rebaseline (T10). Removed with the detour at T12.
pub(crate) const DEFAULT_STAFF_ASTAR: bool = false;

/// Route the staff scene — the single seam the production path and the acceptance harness share.
/// `use_astar=false` → the detour (byte-identical to the pre-T8 path). `true` → the A* pipeline, plus
/// one diagnostic line with the §10.4 detector counts + total bends (a live "good-lines" meter for
/// the R3 tuning; empty for the detour).
pub(crate) fn resolve_staff_routes(
    input: &RouteInputs,
    canvas_w: f32,
    canvas_h: f32,
    use_astar: bool,
) -> (StaffRouteSet, Vec<String>) {
    if use_astar {
        route_via_astar(input, canvas_w, canvas_h)
    } else {
        (staff_routes(input), Vec::new())
    }
}

/// Can `from` reach `target` following admin edges (from → to)? Tells a bypass edge (ancestor → node)
/// from the node's nearer/primary parent (T6 secondary classification).
fn admin_reaches(edges: &[StaffEdge], from: &str, target: &str) -> bool {
    let mut stack = vec![from.to_string()];
    let mut seen = std::collections::HashSet::new();
    while let Some(n) = stack.pop() {
        if n == target {
            return true;
        }
        if !seen.insert(n.clone()) {
            continue;
        }
        for e in edges.iter().filter(|e| e.kind == "admin" && e.from_id == n) {
            stack.push(e.to_id.clone());
        }
    }
    false
}

/// A bypass (secondary) edge: its target has another admin parent that this edge's source is an
/// ANCESTOR of — the line skips a level, so it takes the offset entry port (§10.1.5). Narrow by
/// design: two independent parents (neither an ancestor of the other) are general dual-subordination,
/// out of this slice's scope.
fn edge_is_secondary(edges: &[StaffEdge], i: usize) -> bool {
    let e = &edges[i];
    if e.kind != "admin" {
        return false;
    }
    edges
        .iter()
        .filter(|o| o.kind == "admin" && o.to_id == e.to_id && o.from_id != e.from_id)
        .any(|o| admin_reaches(edges, &e.from_id, &o.from_id))
}

/// Route every edge through the A* pipeline (`route_scene`), mapped back into the SAME `StaffRouteSet`
/// contract the detour produces. Ports are taken from the per-LOD `obstacle_rect` box (NOT the raw
/// node) so they land on the grid the pipeline seeds (critic B1); `cards` includes org cards (B2);
/// edges map to routes by INDEX and the detour skips (self-loop, dangling box) are replicated so the
/// index stays aligned (B3). `marked` mirrors the detour's §12 rule (foreign-frame intrusion) and
/// additionally flags a best-effort (`failed`) line.
///
/// Known C-time (flip) gaps, latent while this branch is off by default (dg33 T8 critic N1/N2):
/// matrix/dotted/lead-org edges are routed here as if admin (A* enters the target from above), which
/// may not match their side-port intent — the owner decides at the R3/flip whether to keep those on
/// the detour. Both are harmless now because this branch never runs under `DEFAULT_STAFF_ASTAR`.
fn route_via_astar(
    input: &RouteInputs,
    canvas_w: f32,
    canvas_h: f32,
) -> (StaffRouteSet, Vec<String>) {
    use crate::{route_scene, EdgeSpec, SECONDARY_PORT_DX};
    let cards = build_card_set(
        input.persons,
        input.org_cards,
        input.lod,
        input.person_hints,
    );
    let mo = |id: &str| member_of(id, input.persons);

    let mut specs: Vec<EdgeSpec> = Vec::new();
    let mut meta: Vec<(String, bool)> = Vec::new(); // (kind, ends_on_dept_top) parallel to specs
    for (i, edge) in input.edges.iter().enumerate() {
        if edge.from_id == edge.to_id {
            continue; // self-loop (detour skip)
        }
        let (Some(from), Some(to)) = (
            resolve_box(
                &edge.from_id,
                input.persons,
                input.org_cards,
                input.lod,
                input.person_hints,
            ),
            resolve_box(
                &edge.to_id,
                input.persons,
                input.org_cards,
                input.lod,
                input.person_hints,
            ),
        ) else {
            continue; // dangling edge (detour skip)
        };
        let from_dept = mo(&edge.from_id).map(|(d, _)| d);
        let dept_top_y = if edge.kind == "admin" {
            input.department_frames.iter().find_map(|f| {
                (f.head_id.as_deref() == Some(edge.to_id.as_str())
                    && from_dept.as_deref() != Some(f.department_id.as_str()))
                .then_some(f.y)
            })
        } else {
            None
        };
        let (fx, fy, fw, fh) = obstacle_rect(&from);
        let start = (fx + fw / 2.0, fy + fh);
        let secondary = edge_is_secondary(input.edges, i);
        let (tx, ty, tw, _) = obstacle_rect(&to);
        let target = match dept_top_y {
            Some(y) => (tx + tw / 2.0, y),
            None => {
                let cx = tx + tw / 2.0;
                (
                    if secondary {
                        cx + SECONDARY_PORT_DX
                    } else {
                        cx
                    },
                    ty,
                )
            }
        };
        specs.push(EdgeSpec {
            from_id: edge.from_id.clone(),
            to_id: edge.to_id.clone(),
            start,
            target,
            secondary,
        });
        meta.push((edge.kind.clone(), dept_top_y.is_some()));
    }

    let routes = route_scene(
        canvas_w,
        canvas_h,
        &cards,
        input.department_frames,
        &specs,
        &mo,
    );
    let segments = specs
        .iter()
        .zip(&routes)
        .zip(&meta)
        .map(|((s, r), (kind, dept_top))| {
            let intrusions = frame_intrusion_count(
                &r.points,
                &s.from_id,
                &s.to_id,
                input.department_frames,
                &mo,
            );
            StaffEdgeRoute {
                from_id: s.from_id.clone(),
                to_id: s.to_id.clone(),
                kind: kind.clone(),
                points: r.points.clone(),
                marked: (r.failed || intrusions > 0).then_some(true),
                ends_on_dept_top: dept_top.then_some(true),
            }
        })
        .collect();
    let set = StaffRouteSet {
        lod: input.lod.to_string(),
        segments,
    };
    // Live "good-lines" meter (the mockup's `stats()` panel): the §10.4 detector counts + total
    // bends across the routed scene, surfaced as a diagnostic for the R3 tuning overlay.
    let stats = crate::route_stats(&set.segments, &cards, input.department_frames, &mo);
    let (bends, excess_turns) = turn_totals(&set.segments, &mo);
    let marked = set
        .segments
        .iter()
        .filter(|s| s.marked == Some(true))
        .count();
    let diag = format!(
        "A*: cross={} over={} card={} near8={} dept={} bends={} turns={} excess={} marked={} edges={}",
        stats.crossings,
        stats.overlaps,
        stats.through_card,
        stats.near_card,
        stats.through_foreign,
        bends,
        bends,
        excess_turns,
        marked,
        set.segments.len(),
    );
    (set, vec![diag])
}

/// Справжні зміни напрямку; нульові відрізки та колінеарні продовження пропускаються.
pub(crate) fn true_turns(points: &[StaffRoutePoint]) -> usize {
    let mut previous: Option<(f64, f64)> = None;
    let mut turns = 0;
    for pair in points.windows(2) {
        let dx = f64::from(pair[1].x) - f64::from(pair[0].x);
        let dy = f64::from(pair[1].y) - f64::from(pair[0].y);
        if dx == 0.0 && dy == 0.0 {
            continue;
        }
        if let Some((px, py)) = previous {
            if px * dy != py * dx || px * dx + py * dy < 0.0 {
                turns += 1;
            }
        }
        previous = Some((dx, dy));
    }
    turns
}

fn turn_limit(from_id: &str, to_id: &str, member_of: &dyn Fn(&str) -> Option<DeptPart>) -> usize {
    if crate::staff_router::is_internal(from_id, to_id, member_of) {
        2
    } else {
        4
    }
}

/// Один підрахунок для bends/turns та excess; marked best-effort не входить у excess.
fn turn_totals(
    segments: &[StaffEdgeRoute],
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
) -> (usize, usize) {
    segments.iter().fold((0, 0), |(total, excess), segment| {
        let turns = true_turns(&segment.points);
        let extra = if segment.marked == Some(true) {
            0
        } else {
            turns.saturating_sub(turn_limit(&segment.from_id, &segment.to_id, member_of))
        };
        (total + turns, excess + extra)
    })
}

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
    // Глобальний індекс карток — РАЗ на виклик (A2.1): clean-check per-edge без n²-скану всіх карток.
    let card_index = if avoid {
        Some(CardIndex::build(&cards))
    } else {
        None
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

        let (src, dst) = (mo(&edge.from_id), mo(&edge.to_id));

        // A2.4 deptTop: крос-dept admin-ребро в голову відділу докується на ВЕРХ рамки (не на
        // картку голови). Синт-порт {head.cx-1, frame.y, 2×2}, to_id ЗБЕРЕЖЕНО (obstacle-skip і
        // foreign-frame keyять на реальну голову). from-виключення — на рівні DEPT, не part
        // (= TS `!memberIds.has(from)`, staffEdgeGeometry.ts:454-460). Гейт строго kind=="admin"
        // (:455). `dst` лишається реальною головою → власна рамка голови exempt у is_clean/detour.
        let dept_top_y = if edge.kind == "admin" {
            let from_dept = src.as_ref().map(|(d, _)| d.as_str());
            input.department_frames.iter().find_map(|f| {
                (f.head_id.as_deref() == Some(edge.to_id.as_str())
                    && from_dept != Some(f.department_id.as_str()))
                .then_some(f.y)
            })
        } else {
            None
        };
        let routed_to = match dept_top_y {
            Some(y) => EdgeRect {
                id: to.id.clone(),
                x: to.x + to.width / 2.0 - 1.0,
                y,
                width: 2.0,
                height: 2.0,
                obstacle: None,
            },
            None => to,
        };

        let points = if avoid {
            // A2.2 candidate-ladder (порт classifyStaffEdgeRoute :384-401): matrix/dotted/sameBand
            // віддають перевагу БІЧНИМ портам. sameBand — на per-LOD edge-box height (A2.2 критик N4).
            // Для deptTop routed_to — 2×2-бокс (h=2) → sameBand≈0.7px → майже завжди [V,H] (A2.4 T5).
            let from_cy = from.y + from.height / 2.0;
            let to_cy = routed_to.y + routed_to.height / 2.0;
            let same_band = (to_cy - from_cy).abs() < from.height.min(routed_to.height) * 0.35;
            let prefer_horizontal = edge.kind == "matrix" || edge.kind == "dotted" || same_band;
            let idx = card_index.as_ref().expect("card_index будується при avoid");
            // Clean-check — ТОЙ САМИЙ предикат для H і V (idx skip from/to by id + чужі рамки);
            // лише idx+foreign, без per-edge obs → lazy-obs A2.1 збережено (A2.2 критик N7).
            let is_clean = |cand: &[StaffRoutePoint]| -> bool {
                idx.clear_of(cand, input.card_pad, &edge.from_id, &edge.to_id)
                    && !foreign_frame_blocks(
                        cand,
                        input.department_frames,
                        &src,
                        &dst,
                        input.card_pad,
                    )
            };
            // Порядок кандидатів: prefer→[H,V], інакше→[V,H]. Перший ЧИСТИЙ виграє (= TS direct-гілка).
            // Обидва nullable (route_vertical — None при no-gap, A2.3; route_horizontal — None без
            // зазору). Рахуємо ЛІНИВО через or_else: невикористаний кандидат не алокує Vec («0
            // алокацій» A2.1 для чистого першого кандидата).
            let clean_vertical = || route_vertical(&from, &routed_to).filter(|v| is_clean(v));
            let clean_horizontal = || route_horizontal(&from, &routed_to).filter(|h| is_clean(h));
            let chosen = if prefer_horizontal {
                clean_horizontal().or_else(clean_vertical)
            } else {
                clean_vertical().or_else(clean_horizontal)
            };
            match chosen {
                Some(pts) => pts,
                None => {
                    // Жоден кандидат не чистий → per-edge obs ЛІНИВО + наявний вертикальний detour
                    // (lane-gen Y/X байт-незмінний, A2.1 критик B3; = TS around/forced-еквівалент).
                    let (obs, frames_at) = obstacles_for_edge(
                        &cards,
                        input.department_frames,
                        &edge.from_id,
                        &edge.to_id,
                        &src,
                        &dst,
                    );
                    detour_edge(&from, &routed_to, &obs, &obs[frames_at..], input.card_pad)
                }
            }
        } else {
            route_ortho(&from, &routed_to)
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
            // A2.4: Some(true) ЛИШЕ коли routed_to був синт-портом deptTop (headFrame-hit);
            // ніколи Some(false) — None↔TS omit, паритет skip_serializing_if (types.rs:573).
            ends_on_dept_top: dept_top_y.map(|_| true),
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

    #[test]
    fn collinear_z_fallback_has_no_true_turns() {
        use crate::staff_router::{astar_route, build_corridor_grid, Occupancy};
        let grid = build_corridor_grid(100.0, 100.0, &[], &[], &[]);
        let route = astar_route(
            &grid,
            (13.25, 11.25),
            (13.25, 89.25),
            "a",
            "b",
            &[],
            &[],
            &|_| None,
            &Occupancy::default(),
        );
        assert!(route.failed);
        assert_eq!(route.points.len().saturating_sub(2), 2);
        assert_eq!(true_turns(&route.points), 0);
    }

    #[test]
    fn true_turns_ignores_duplicates_and_counts_direction_changes() {
        let points = |coords: &[(f32, f32)]| {
            coords
                .iter()
                .map(|&(x, y)| StaffRoutePoint { x, y })
                .collect::<Vec<_>>()
        };
        assert_eq!(true_turns(&[]), 0);
        assert_eq!(true_turns(&points(&[(0.0, 0.0)])), 0);
        assert_eq!(
            true_turns(&points(&[(0.0, 0.0), (0.0, 1.0), (0.0, 2.0)])),
            0
        );
        assert_eq!(
            true_turns(&points(&[
                (0.0, 0.0),
                (0.0, 1.0),
                (0.0, 1.0),
                (1.0, 1.0),
                (1.0, 2.0)
            ])),
            2
        );
        assert_eq!(
            true_turns(&points(&[(0.0, 0.0), (0.0, 1.0), (0.0, 0.0)])),
            1
        );
    }

    #[test]
    fn turn_limit_uses_endpoint_department_and_part() {
        let member = |id: &str| match id {
            "a" | "b" => Some(("dept".to_string(), Some(0))),
            "other-part" => Some(("dept".to_string(), Some(1))),
            "other-dept" => Some(("other".to_string(), Some(0))),
            _ => None,
        };
        assert_eq!(turn_limit("a", "b", &member), 2);
        assert_eq!(turn_limit("a", "other-dept", &member), 4);
        assert_eq!(turn_limit("a", "other-part", &member), 4);
        assert_eq!(turn_limit("a", "external", &member), 4);
        assert_eq!(turn_limit("external", "external2", &member), 4);
    }

    #[test]
    fn turn_totals_exclude_marked_failures_only_from_excess() {
        let mut edge = StaffEdgeRoute {
            from_id: "a".into(),
            to_id: "b".into(),
            kind: "admin".into(),
            points: [
                (0.0, 0.0),
                (0.0, 1.0),
                (1.0, 1.0),
                (1.0, 2.0),
                (2.0, 2.0),
                (2.0, 3.0),
            ]
            .into_iter()
            .map(|(x, y)| StaffRoutePoint { x, y })
            .collect(),
            marked: None,
            ends_on_dept_top: Some(true),
        };
        let member = |_: &str| Some(("dept".into(), None));
        assert_eq!(turn_totals(&[edge.clone()], &member), (4, 2));
        let successful = edge.clone();
        edge.marked = Some(true);
        assert_eq!(turn_totals(&[edge.clone()], &member), (4, 0));
        assert_eq!(turn_totals(&[successful, edge.clone()], &member), (8, 2));
        edge.marked = Some(false);
        assert_eq!(turn_totals(&[edge.clone()], &member), (4, 2));
        assert_eq!(turn_totals(&[edge.clone()], &|_| None), (4, 0));
        edge.points.truncate(2);
        assert_eq!(turn_totals(&[edge], &member), (0, 0));
        assert_eq!(turn_totals(&[], &member), (0, 0));
    }

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
            head_id: None,
        }
    }
    fn frame_head(dept: &str, x: f32, y: f32, w: f32, h: f32, head: &str) -> FrameRect {
        FrameRect {
            head_id: Some(head.to_string()),
            ..frame(dept, x, y, w, h)
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

    // --- A2.1: просторовий індекс карток ⇔ наївний скан (байт-ідентичність clean-check) ---

    fn edge_rect(id: &str, x: f32, y: f32, w: f32, h: f32) -> EdgeRect {
        EdgeRect {
            id: id.into(),
            x,
            y,
            width: w,
            height: h,
            obstacle: None,
        }
    }

    /// Наївний еталон clean-check (той самий критерій, що route_clear_of), skip from/to by id.
    fn cards_clear_naive(
        points: &[StaffRoutePoint],
        cards: &[EdgeRect],
        pad: f32,
        from_id: &str,
        to_id: &str,
    ) -> bool {
        for c in cards {
            if c.id == from_id || c.id == to_id {
                continue;
            }
            let (rx, ry, rw, rh) = obstacle_rect(c);
            for s in points.windows(2) {
                if seg_rect_distance(&s[0], &s[1], rx, ry, rw, rh) < pad {
                    return false;
                }
            }
        }
        true
    }

    #[test]
    fn card_index_matches_naive_including_near_miss_outside_bbox() {
        let pad = 16.0;
        // Елбоу-маршрут: (150,50)↓(150,125)→(50,125)↓(50,200). bbox x∈[50,150], y∈[50,200].
        let points = vec![
            route_pt(150.0, 50.0),
            route_pt(150.0, 125.0),
            route_pt(50.0, 125.0),
            route_pt(50.0, 200.0),
        ];
        let cases: Vec<(&str, Vec<EdgeRect>)> = vec![
            // near-miss ПОЗА bbox: правий край 47 = minX(50)-3, біля вертикалі x=50 → dist 3 < pad.
            // Саме цей кейс 1px-інфляція (rx+rw < minX-1 → 47<49) хибно відкинула б (критик B1).
            (
                "near_miss_outside_bbox",
                vec![edge_rect("blk", 7.0, 118.0, 40.0, 20.0)],
            ),
            (
                "far_clear",
                vec![edge_rect("far", 500.0, 500.0, 40.0, 20.0)],
            ),
            (
                "directly_on_route",
                vec![edge_rect("on", 40.0, 118.0, 40.0, 20.0)],
            ),
            // skip-by-id: блокер має id кінця ребра → скіпається → чисто.
            (
                "skip_from_id",
                vec![edge_rect("P", 40.0, 118.0, 40.0, 20.0)],
            ),
            // колізія id (person+org): обидва з id кінця → обидва скіпаються.
            (
                "id_collision_both_skipped",
                vec![
                    edge_rect("c1", 40.0, 118.0, 40.0, 20.0),
                    edge_rect("c1", 40.0, 118.0, 40.0, 20.0),
                ],
            ),
            // just-outside pad band у Y (bottom вище minY на >pad) → reject коректний.
            (
                "above_band_rejected",
                vec![edge_rect("hi", 100.0, 0.0, 40.0, 20.0)],
            ),
        ];
        for (name, cards) in &cases {
            let idx = CardIndex::build(cards);
            assert_eq!(
                idx.clear_of(&points, pad, "P", "c1"),
                cards_clear_naive(&points, cards, pad, "P", "c1"),
                "index≠naive для кейсу {name}"
            );
        }
    }

    #[test]
    fn card_index_near_miss_is_detected_as_blocker() {
        // Прямий guard на B1: блокер на 3px ПОЗА bbox мусить лічитися як блокер (clear=false).
        let pad = 16.0;
        let points = vec![
            route_pt(150.0, 50.0),
            route_pt(150.0, 125.0),
            route_pt(50.0, 125.0),
            route_pt(50.0, 200.0),
        ];
        let cards = [edge_rect("blk", 7.0, 118.0, 40.0, 20.0)];
        let idx = CardIndex::build(&cards);
        assert!(
            !idx.clear_of(&points, pad, "P", "c1"),
            "перешкода на 1<d<pad поза bbox має блокувати (інакше 1px-інфляція б загубила)"
        );
    }

    // --- A2.2: side-порти + preferHorizontal (candidate-ladder) ---

    // matrix-ребро з чистим горизонтальним зазором → бічні порти (пряма H), не вертикаль.
    #[test]
    fn matrix_edge_prefers_horizontal_side_ports() {
        let nodes = [
            node_wh("F", 0.0, 0.0, 100.0, 50.0),
            node_wh("T", 200.0, 0.0, 100.0, 50.0),
        ];
        let edges = [edge_kind("F", "T", "matrix")];
        let set = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        // go_right, cy рівні → пряма H [(from.right,cy),(to.x,cy)] = [(100,25),(200,25)].
        assert!(
            points_eq(
                &set.segments[0].points,
                &[route_pt(100.0, 25.0), route_pt(200.0, 25.0)]
            ),
            "matrix з чистим зазором → бічні порти, got {:?}",
            set.segments[0].points
        );
    }

    // B1: admin (НЕ sameBand) з БЛОКОВАНОЮ вертикаллю, але ЧИСТОЮ горизонталлю → H, НЕ detour.
    // Саме цю зміну поведінки A2.2 вводить проти A2.1 (там V blocked → detour).
    #[test]
    fn admin_vertical_blocked_horizontal_clean_takes_horizontal() {
        let nodes = [
            node_wh("F", 0.0, 0.0, 100.0, 50.0),     // cy=25
            node_wh("T", 200.0, 200.0, 100.0, 50.0), // cy=225 → не sameBand (Δ200≫17.5)
            node_wh("X", 40.0, 115.0, 30.0, 20.0),   // блокує V-corr (y=125, x50..250) на x50..70
        ];
        let edges = [edge("F", "T")]; // admin
        let set = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        // H-елбоу: [(100,25),(150,25),(150,225),(200,225)], midX=(100+200)/2=150.
        assert!(
            points_eq(
                &set.segments[0].points,
                &[
                    route_pt(100.0, 25.0),
                    route_pt(150.0, 25.0),
                    route_pt(150.0, 225.0),
                    route_pt(200.0, 225.0)
                ]
            ),
            "V blocked, H clean → H, got {:?}",
            set.segments[0].points
        );
    }

    // sameBand admin → prefer_horizontal (sameBand kind-незалежний, оракул) → бічні порти.
    #[test]
    fn same_band_admin_flips_to_horizontal() {
        let nodes = [
            node_wh("F", 0.0, 0.0, 100.0, 100.0),    // cy=50
            node_wh("T", 200.0, 10.0, 100.0, 100.0), // cy=60, Δ=10 < min(100)*0.35=35 → sameBand
        ];
        let edges = [edge("F", "T")]; // admin, але sameBand
        let set = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        let first = &set.segments[0].points[0];
        assert!(
            (first.x - 100.0).abs() < 1e-6 && (first.y - 50.0).abs() < 1e-6,
            "sameBand admin → бічний порт (from.right, cy), got {first:?}"
        );
    }

    // admin V-clean лишається V (істинний інваріант A2.2; той самий предикат, V перший).
    #[test]
    fn admin_vertical_clean_stays_vertical() {
        let nodes = [
            node_wh("F", 0.0, 0.0, 100.0, 50.0),
            node_wh("T", 0.0, 300.0, 100.0, 50.0),
        ];
        let edges = [edge("F", "T")];
        let avoided = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        let base = staff_routes(&avoid_input(&nodes, &edges, "near", 0.0));
        assert!(
            points_eq(&avoided.segments[0].points, &base.segments[0].points),
            "V-clean admin має лишитись route_ortho"
        );
    }

    // B2: route_horizontal → None, коли нема чистого горизонтального зазору (overlap / стек).
    #[test]
    fn route_horizontal_none_without_clear_gap() {
        let f = edge_rect("f", 0.0, 0.0, 100.0, 50.0);
        let overlap = edge_rect("o", 50.0, 0.0, 100.0, 50.0); // from_right100 > to.x50 → нема зазору
        assert!(route_horizontal(&f, &overlap).is_none());
        let stacked = edge_rect("s", 0.0, 300.0, 100.0, 50.0); // та сама колонка
        assert!(route_horizontal(&f, &stacked).is_none());
        let clear = edge_rect("c", 200.0, 0.0, 100.0, 50.0); // чистий зазор
        assert!(route_horizontal(&f, &clear).is_some());
    }

    // --- A2.3: route_vertical як V-кандидат ладдера (напрям + nullable) ---

    // B1/RED: matrix childAbove (ціль ВИЩЕ) з недоступним H (та сама колонка) → route_vertical ВГОРУ
    // (from.top→to.bottom), НЕ route_ortho вниз. На коді до A2.3 дало б [(50,350),(50,0)] → червоний.
    #[test]
    fn matrix_child_above_routes_vertical_upward() {
        let nodes = [
            node_wh("F", 0.0, 300.0, 100.0, 50.0), // from_cy=325, top=300
            node_wh("T", 0.0, 0.0, 100.0, 50.0),   // to_cy=25 (вище), bottom=50, та сама колонка
        ];
        let edges = [edge_kind("F", "T", "matrix")];
        let set = staff_routes(&avoid_input(&nodes, &edges, "near", 16.0));
        assert!(
            points_eq(
                &set.segments[0].points,
                &[route_pt(50.0, 300.0), route_pt(50.0, 50.0)]
            ),
            "childAbove → V вгору from.top→to.bottom, got {:?}",
            set.segments[0].points
        );
    }

    #[test]
    fn route_vertical_direction_and_nullable() {
        let from = edge_rect("f", 0.0, 0.0, 100.0, 50.0); // cy=25, bottom=50, top=0
                                                          // childBelow із зазором → from.bottom(50)→to.top(300), тотожно route_ortho.
        let below = edge_rect("b", 0.0, 300.0, 100.0, 50.0);
        let v_below = route_vertical(&from, &below).expect("childBelow+gap → Some");
        assert!(
            points_eq(&v_below, &route_ortho(&from, &below)),
            "childBelow+gap має дорівнювати route_ortho, got {v_below:?}"
        );
        // childAbove із зазором → from.top(300)→to.bottom(50) вгору.
        let above_from = edge_rect("af", 0.0, 300.0, 100.0, 50.0); // top=300
        let above_to = edge_rect("at", 0.0, 0.0, 100.0, 50.0); // bottom=50 (вище)
        let v_above = route_vertical(&above_from, &above_to).expect("childAbove+gap → Some");
        assert!(
            points_eq(&v_above, &[route_pt(50.0, 300.0), route_pt(50.0, 50.0)]),
            "childAbove → from.top→to.bottom вгору, got {v_above:?}"
        );
        // no-gap (перекриті по Y) → None.
        let overlap = edge_rect("o", 0.0, 30.0, 100.0, 50.0); // y30..80 перекриває from y0..50
        assert!(route_vertical(&from, &overlap).is_none(), "no-gap → None");
    }

    // --- A2.4: deptTop (крос-dept admin у голову докується на верх рамки) ---

    // Крос-dept admin: org-голова (без dept) → голова відділу D1. Докується на верх рамки
    // (routeTo = {head.cx-1, frame.y, 2×2}, to_id збережено), ends_on_dept_top=Some(true).
    #[test]
    fn cross_dept_admin_into_head_docks_on_frame_top() {
        let nodes = [
            node_wh("H", 0.0, 0.0, 100.0, 50.0), // org-голова, без dept
            node_dept("T", 0.0, 300.0, 100.0, 50.0, "D1"), // голова D1
        ];
        let edges = [edge("H", "T")]; // admin
        let frames = [frame_head("D1", 0.0, 280.0, 100.0, 70.0, "T")];
        let set = staff_routes(&frames_input(&nodes, &edges, &frames, "near", 16.0));
        let r = &set.segments[0];
        assert_eq!(
            r.ends_on_dept_top,
            Some(true),
            "крос-dept admin у голову → deptTop"
        );
        assert!(
            point_eq(&r.points[0], 50.0, 50.0),
            "старт — нижній порт H, got {:?}",
            r.points[0]
        );
        // Синт-бокс {x:to.cx-1, w:2} центрований на to.cx → ПОРТ (центр верх-ребра) = to.cx = 50
        // (= TS: box.x+box.w/2 = to.cx-1+1). y — верх рамки (frame.y=280). from.cx==to.cx → пряма.
        assert!(
            point_eq(r.points.last().unwrap(), 50.0, 280.0),
            "кінець — синт-порт deptTop на to.cx, frame.y, got {:?}",
            r.points.last().unwrap()
        );
    }

    // Дискримінація порту (ревʼю-нит): from.cx≠to.cx → ендпойнт мусить сісти на to.cx (голова),
    // НЕ на from.cx. H зсунуто (cx=250), T.cx=50 → синт-порт на 50 доводить port=to.cx, не from.cx.
    #[test]
    fn dept_top_port_tracks_head_cx_not_source_cx() {
        let nodes = [
            node_wh("H", 200.0, 0.0, 100.0, 50.0),         // from.cx=250
            node_dept("T", 0.0, 300.0, 100.0, 50.0, "D1"), // to.cx=50
        ];
        let edges = [edge("H", "T")];
        let frames = [frame_head("D1", 0.0, 280.0, 100.0, 70.0, "T")];
        let set = staff_routes(&frames_input(&nodes, &edges, &frames, "near", 16.0));
        let r = &set.segments[0];
        assert_eq!(r.ends_on_dept_top, Some(true));
        let last = r.points.last().unwrap();
        assert!(
            point_eq(last, 50.0, 280.0),
            "deptTop-порт на to.cx (50), не from.cx (250), got {last:?}"
        );
    }

    // Intra-dept admin (from — член того ж відділу) НЕ отримує deptTop → card-top голови.
    #[test]
    fn intra_dept_admin_stays_on_card_top() {
        let nodes = [
            node_dept("F", 0.0, 0.0, 100.0, 50.0, "D1"),   // член D1
            node_dept("T", 0.0, 300.0, 100.0, 50.0, "D1"), // голова D1
        ];
        let edges = [edge("F", "T")]; // admin, але intra-dept
        let frames = [frame_head("D1", 0.0, 280.0, 100.0, 70.0, "T")];
        let set = staff_routes(&frames_input(&nodes, &edges, &frames, "near", 16.0));
        let r = &set.segments[0];
        assert_eq!(r.ends_on_dept_top, None, "intra-dept → без deptTop");
        assert!(
            point_eq(r.points.last().unwrap(), 50.0, 300.0),
            "кінець — верх картки голови (to.cx, to.y), got {:?}",
            r.points.last().unwrap()
        );
    }

    // Non-admin (matrix) у голову: гейт kind=="admin" → без deptTop, навіть із match-рамкою.
    #[test]
    fn non_admin_into_head_does_not_dock_on_frame_top() {
        let nodes = [
            node_wh("H", 0.0, 0.0, 100.0, 50.0),
            node_dept("T", 0.0, 300.0, 100.0, 50.0, "D1"),
        ];
        let edges = [edge_kind("H", "T", "matrix")];
        let frames = [frame_head("D1", 0.0, 280.0, 100.0, 70.0, "T")];
        let set = staff_routes(&frames_input(&nodes, &edges, &frames, "near", 16.0));
        assert_eq!(
            set.segments[0].ends_on_dept_top, None,
            "non-admin у голову → без deptTop (гейт kind)"
        );
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

    // Чужа рамка НА ВЕРТИКАЛІ між вирівняними колонками: ні Y-, ні X-детур не допоможе
    // (прямий дроп, рання віддача до бічних кандидатів) → залишок → §12-маркер Some(true).
    // R6-4b: бічний обхід свідомо НЕ огинає рамку, що сидить рівно на вирівняній колонці.
    #[test]
    fn foreign_frame_unresolvable_is_marked() {
        let nodes = [
            node_dept("P", 100.0, 0.0, 100.0, 50.0, "d1"),
            node_dept("c1", 100.0, 200.0, 100.0, 50.0, "d1"), // ВИРІВНЯНА з P колонка (ax==bx)
        ];
        let frames = [frame("dF", 120.0, 110.0, 60.0, 30.0)]; // на вертикалі x=150 між колонками
        let edges = [edge("P", "c1")];
        let avoided = staff_routes(&frames_input(&nodes, &edges, &frames, "near", 16.0));
        assert_eq!(
            avoided.segments[0].marked,
            Some(true),
            "рамка на вирівняній колонці нерозв'язна бічним обходом → §12-маркер"
        );
    }

    // R6-4b: чужа рамка валить усі Y-доріжки (R6-4a лишала її §12-залишком), але розв'язна
    // БІЧНИМ обходом — вертикальний коридор збоку рамки. marked зникає, коридор іде поза колонками.
    #[test]
    fn foreign_frame_resolvable_via_side_detour() {
        let nodes = [
            node_dept("P", 100.0, 0.0, 100.0, 50.0, "d1"), // ax=150, bottom=50
            node_dept("c1", 0.0, 200.0, 100.0, 50.0, "d1"), // bx=50, top=200
        ];
        let frames = [frame("dF", 55.0, 110.0, 90.0, 30.0)]; // x∈[55,145] — валить Y-доріжки
        let edges = [edge("P", "c1")];
        let base = staff_routes(&avoid_input(&nodes, &edges, "near", 0.0));
        let avoided = staff_routes(&frames_input(&nodes, &edges, &frames, "near", 16.0));
        assert_eq!(
            avoided.segments[0].marked, None,
            "бічний обхід має зняти §12-маркер"
        );
        assert!(!points_eq(
            &avoided.segments[0].points,
            &base.segments[0].points
        ));
        assert!(
            avoided.segments[0]
                .points
                .iter()
                .any(|p| p.x > 151.0 || p.x < 49.0),
            "бічний коридор має вийти за межі колонок [50,150]"
        );
    }

    // R6-4b: бічний обхід детермінований — реордер входу рамок не змінює маршрут (H6).
    #[test]
    fn side_detour_is_deterministic_across_frame_reorder() {
        let nodes = [
            node_dept("P", 100.0, 0.0, 100.0, 50.0, "d1"),
            node_dept("c1", 0.0, 200.0, 100.0, 50.0, "d1"),
        ];
        let edges = [edge("P", "c1")];
        let f_ab = [
            frame("dF", 55.0, 110.0, 90.0, 30.0),
            frame("dG", 300.0, 110.0, 40.0, 30.0),
        ];
        let f_ba = [
            frame("dG", 300.0, 110.0, 40.0, 30.0),
            frame("dF", 55.0, 110.0, 90.0, 30.0),
        ];
        let a = staff_routes(&frames_input(&nodes, &edges, &f_ab, "near", 16.0));
        let b = staff_routes(&frames_input(&nodes, &edges, &f_ba, "near", 16.0));
        assert!(points_eq(&a.segments[0].points, &b.segments[0].points));
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
            node_dept("c1", 100.0, 200.0, 100.0, 50.0, "d1"), // вирівняна колонка → нерозв'язно
        ];
        let frames = [frame("dF", 120.0, 110.0, 60.0, 30.0)];
        let edges = [edge("P", "c1")];
        let set = staff_routes(&frames_input(&nodes, &edges, &frames, "near", 16.0));
        let mo = |id: &str| member_of(id, &nodes);
        let detector = foreign_frame_intrusions(&set.segments, &frames, &mo);
        let marked = set.segments[0].marked == Some(true);
        assert!(detector > 0, "фікстура має лишати залишок (не вакуумна)");
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
            ends_on_dept_top: None,
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

    // --- T128 T1: §10.1 acceptance schemas (S0–S9), measured against the current detour ---
    //
    // These are the AC10 fixtures: every schema must read `0/0/0/0/0` once the A* router lands.
    // Hand-positioned (the external §10.1 shapes; no raw-spec coords in-repo — acceptance table
    // `plan.md §7` + `_r6-lines-spec-analysis-dg23.md:57-61` are the proxy). Built on the SAME
    // `staff_routes` the renderer drives, with `card_pad = MIN_CARD_PAD` (8) — the tightest valid
    // gate; the renderer passes `content_padding` (≥ 8, `staff_layout.rs:1246`), so this is a lower
    // bound on the clearance the real scene has. Avoidance on, so the detector sees real routes.
    //
    // RED-first (measured dg32, blocker B3): on the per-edge detour, two schemas carry a real §10.4
    // violation the stateless router cannot remove — S4 (two managers sharing a corridor → their
    // buses coincide: `overlaps=1`, which §5.4 lanes / T5 separate) and S5 (a target two levels down
    // past a sibling → `crossings=1`, which T4 A* + T6 rip-up remove). The other eight are already
    // clean on the detour and stay clean under A* (live guards below). The `ac10_*` gate asserts all
    // ten at zero and is therefore RED now (run with `--ignored` to see it); un-ignore it at T6.

    type DeptPart = crate::staff_geom::DeptPart;

    fn schema_member(nodes: &[StaffNodeGeo], id: &str) -> Option<DeptPart> {
        nodes
            .iter()
            .find(|n| n.id == id)
            .and_then(|n| n.department_id.clone().map(|d| (d, n.part_index)))
    }

    fn schema_stats(
        nodes: &[StaffNodeGeo],
        edges: &[StaffEdge],
        frames: &[FrameRect],
    ) -> crate::RouteStats {
        let set = staff_routes(&frames_input(nodes, edges, frames, "near", 8.0));
        let boxes = near_boxes(nodes);
        let mo = |id: &str| schema_member(nodes, id);
        crate::route_stats(&set.segments, &boxes, frames, &mo)
    }

    /// One acceptance scene: `(name, nodes, edges, frames)`.
    type SchemaScene = (
        &'static str,
        Vec<StaffNodeGeo>,
        Vec<StaffEdge>,
        Vec<FrameRect>,
    );

    /// The ten acceptance scenes.
    fn schema_scenes() -> Vec<SchemaScene> {
        let s7_nodes = {
            let mut v = vec![node("w", 450.0, 0.0, 2)];
            for k in 0..10 {
                v.push(node(&format!("w{k}"), (k as f32) * 110.0, 260.0, 2));
            }
            v
        };
        let s7_edges: Vec<StaffEdge> = (0..10).map(|k| edge("w", &format!("w{k}"))).collect();
        vec![
            // S0 — zero: empty canvas, no lines, no crash (§ boundary).
            ("S0", vec![], vec![], vec![]),
            // S1 — §10.1.1 internal tree: one manager, two children, same dept.
            (
                "S1",
                vec![
                    node("m", 0.0, 0.0, 2),
                    node("a", -150.0, 200.0, 2),
                    node("b", 150.0, 200.0, 2),
                ],
                vec![edge("m", "a"), edge("m", "b")],
                vec![],
            ),
            // S2 — §10.1.2 three reports under one head (straight-through middle trunk).
            (
                "S2",
                vec![
                    node("h", 0.0, 0.0, 2),
                    node("a", -200.0, 250.0, 2),
                    node("b", 0.0, 250.0, 2),
                    node("c", 200.0, 250.0, 2),
                ],
                vec![edge("h", "a"), edge("h", "b"), edge("h", "c")],
                vec![],
            ),
            // S3 — §10.1.3 manager in dept A with subordinates in A and B.
            (
                "S3",
                vec![
                    node_dept("m", 0.0, 0.0, 100.0, 50.0, "A"),
                    node_dept("ca", -150.0, 260.0, 100.0, 50.0, "A"),
                    node_dept("cb", 250.0, 260.0, 100.0, 50.0, "B"),
                ],
                vec![edge("m", "ca"), edge("m", "cb")],
                vec![
                    frame("A", -170.0, -20.0, 290.0, 340.0),
                    frame("B", 230.0, 240.0, 140.0, 90.0),
                ],
            ),
            // S4 — §10.1.4 two managers of different depts share a corridor (→ lanes §5.4).
            (
                "S4",
                vec![
                    node("m1", 0.0, 0.0, 2),
                    node("m2", 400.0, 0.0, 2),
                    node("c1", 400.0, 400.0, 2),
                    node("c2", 0.0, 400.0, 2),
                ],
                vec![edge("m1", "c1"), edge("m2", "c2")],
                vec![],
            ),
            // S5 — §10.1.5 target two levels down, past a sibling at the middle level (bypass).
            (
                "S5",
                vec![
                    node("m", 0.0, 0.0, 2),
                    node("sib", 300.0, 220.0, 2),
                    node("gc", 300.0, 440.0, 2),
                ],
                vec![edge("m", "gc"), edge("m", "sib"), edge("sib", "gc")],
                vec![],
            ),
            // S6 — §10.1.6 external (dept-less) head over two department heads.
            (
                "S6",
                vec![
                    node("ceo", 0.0, 0.0, 2),
                    node_dept("ha", -200.0, 260.0, 100.0, 50.0, "A"),
                    node_dept("hb", 200.0, 260.0, 100.0, 50.0, "B"),
                ],
                vec![edge("ceo", "ha"), edge("ceo", "hb")],
                vec![
                    frame("A", -220.0, 240.0, 140.0, 90.0),
                    frame("B", 180.0, 240.0, 140.0, 90.0),
                ],
            ),
            // S7 — §10.1.7 wide department: one manager, ten children in a row.
            ("S7", s7_nodes, s7_edges, vec![]),
            // S8 — §10.1.8 collapsed branch: only the visible cross-dept target remains.
            (
                "S8",
                vec![
                    node_dept("m", 0.0, 0.0, 100.0, 50.0, "A"),
                    node_dept("cb", 250.0, 260.0, 100.0, 50.0, "B"),
                ],
                vec![edge("m", "cb")],
                vec![
                    frame("A", -20.0, -20.0, 140.0, 90.0),
                    frame("B", 230.0, 240.0, 140.0, 90.0),
                ],
            ),
            // S9 — §10.1.9 max card: one very tall/wide card beside a normal one.
            (
                "S9",
                vec![
                    node("m", 0.0, 0.0, 2),
                    node_wh("big", -200.0, 280.0, 260.0, 160.0),
                    node("n", 250.0, 280.0, 2),
                ],
                vec![edge("m", "big"), edge("m", "n")],
                vec![],
            ),
        ]
    }

    /// The eight schemas the detour already routes cleanly — live regression guards (they stay
    /// `0/0/0/0/0` under the A* router too, so they never go red).
    #[test]
    fn clean_schemas_have_no_violations() {
        let clean = ["S0", "S1", "S2", "S3", "S6", "S7", "S8", "S9"];
        for (name, nodes, edges, frames) in schema_scenes() {
            if !clean.contains(&name) {
                continue;
            }
            let s = schema_stats(&nodes, &edges, &frames);
            assert_eq!(s, crate::RouteStats::default(), "schema {name}: {s:?}");
        }
    }

    /// The two schemas where the stateless detour leaves a real §10.4 violation — this pins that the
    /// detector actually SEES the defect the A* router must remove (not a vacuous gate).
    #[test]
    fn detour_leaves_a_violation_on_the_hard_schemas() {
        let by = |want: &str| {
            schema_scenes()
                .into_iter()
                .find(|(n, ..)| *n == want)
                .map(|(_, nodes, edges, frames)| schema_stats(&nodes, &edges, &frames))
                .unwrap()
        };
        assert!(
            by("S4").overlaps >= 1,
            "S4 shared corridor should overlap on the detour"
        );
        assert!(
            by("S5").crossings >= 1,
            "S5 bypass should cross on the detour"
        );
    }

    // --- T6: route a schema through the A* pipeline (not the detour) for the AC10 gate ---

    /// Route a schema through the A* pipeline (grid → secondary-classify → route_edges) and measure
    /// it with the SAME detector as the gate. Returns the five-metric panel plus the diagonal count.
    fn astar_schema_stats(
        nodes: &[StaffNodeGeo],
        edges: &[StaffEdge],
        frames: &[FrameRect],
    ) -> (crate::RouteStats, usize, bool) {
        use crate::{route_scene, EdgeSpec, SECONDARY_PORT_DX};
        let boxes = near_boxes(nodes);
        let w = nodes.iter().map(|n| n.x + n.width).fold(0.0f32, f32::max) + 100.0;
        let h = nodes.iter().map(|n| n.y + n.height).fold(0.0f32, f32::max) + 100.0;
        let specs: Vec<EdgeSpec> = edges
            .iter()
            .enumerate()
            .map(|(i, e)| {
                let m = nodes.iter().find(|n| n.id == e.from_id).unwrap();
                let c = nodes.iter().find(|n| n.id == e.to_id).unwrap();
                let secondary = edge_is_secondary(edges, i);
                let cx = c.x + c.width / 2.0;
                let tx = if secondary {
                    cx + SECONDARY_PORT_DX
                } else {
                    cx
                };
                EdgeSpec {
                    from_id: e.from_id.clone(),
                    to_id: e.to_id.clone(),
                    start: (m.x + m.width / 2.0, m.y + m.height),
                    target: (tx, c.y),
                    secondary,
                }
            })
            .collect();
        let member = |id: &str| schema_member(nodes, id);
        let routes = route_scene(w, h, &boxes, frames, &specs, &member);
        let srs: Vec<StaffEdgeRoute> = specs
            .iter()
            .zip(&routes)
            .map(|(s, r)| StaffEdgeRoute {
                from_id: s.from_id.clone(),
                to_id: s.to_id.clone(),
                kind: "admin".into(),
                points: r.points.clone(),
                marked: None,
                ends_on_dept_top: None,
            })
            .collect();
        let stats = crate::route_stats(&srs, &boxes, frames, &member);
        let failed = routes.iter().any(|r| r.failed);
        (stats, crate::diagonal_segments(&srs), failed)
    }

    /// T8(A) — the A* wiring (`resolve_staff_routes(.., use_astar=true)` → `route_via_astar`) routes a
    /// FAR-LOD scene with an org card on-grid. FAR shrinks each card to a chip, so `obstacle_rect(box)`
    /// ≠ raw node: ports taken from the raw node (critic B1) would be off-grid → every line best-effort
    /// (`marked`). An org card feeds a lead-org edge (B2 — org cards must seed the grid). A clean panel
    /// of `marked.is_none()` across all three edges proves ports came from the per-LOD obstacle box.
    #[test]
    fn t8a_astar_branch_routes_far_lod_scene_with_org_on_grid() {
        let nodes = vec![
            node_dept("m", 0.0, 200.0, 160.0, 120.0, "A"),
            node_dept("a", -250.0, 620.0, 160.0, 120.0, "A"),
            node_dept("b", 260.0, 620.0, 160.0, 120.0, "A"),
        ];
        let orgs = [org_card("o1", 0.0, 0.0)];
        let edges = [
            edge("m", "a"),
            edge("m", "b"),
            edge_kind("o1", "m", "lead-org"),
        ];
        let frames = [frame("A", -300.0, 160.0, 760.0, 620.0)];
        let inputs = RouteInputs {
            persons: &nodes,
            org_cards: &orgs,
            edges: &edges,
            lod: "far",
            person_hints: NO_HINTS,
            department_frames: &frames,
            card_pad: 8.0,
        };
        let w = 600.0;
        let h = 900.0;
        let (detour, _) = resolve_staff_routes(&inputs, w, h, false);
        let (astar, astar_diag) = resolve_staff_routes(&inputs, w, h, true);
        // The A* branch emits the live "good-lines" diagnostic (detector counts + bends).
        assert!(
            astar_diag.iter().any(|d| d.starts_with("A*:")),
            "A* stats diagnostic present"
        );

        // Same contract shape, same edge set (skips replicated), kinds preserved by index (B3).
        assert_eq!(astar.segments.len(), 3, "three edges routed, none skipped");
        assert_eq!(detour.segments.len(), astar.segments.len());
        assert_eq!(
            astar
                .segments
                .iter()
                .map(|s| s.kind.as_str())
                .collect::<Vec<_>>(),
            vec!["admin", "admin", "lead-org"],
            "kind stitched from input edges by index"
        );
        // B1: at FAR LOD the admin lines route on the grid (real A* paths, not best-effort) — proof
        // the ports came from the per-LOD obstacle box, not the raw node (raw would be off-grid here).
        for s in astar.segments.iter().filter(|s| s.kind == "admin") {
            assert!(
                s.marked.is_none(),
                "{}->{} went best-effort/intruded — off-grid port (B1 regression)",
                s.from_id,
                s.to_id
            );
        }
        // B2: the org card is in the routing card set (so its ports seed the grid).
        let cards = build_card_set(&nodes, &orgs, "far", NO_HINTS);
        assert!(
            cards.iter().any(|c| c.id == "o1"),
            "org card must be in the grid card set"
        );
        // NOTE (N1, latent while A* is off by default): a lead-org edge enters its target's frame from
        // OUTSIDE — routing it through A* is not yet proven (it may go best-effort here). Whether
        // matrix/dotted/lead-org route through A* or stay on the detour is the owner's call at flip (C).
    }

    /// AC10 — every §10.1 schema reads `0/0/0/0/0` AND carries no diagonal segment, routed through the
    /// A* pipeline (T6). The permanent acceptance gate; S5's bypass is separated by the secondary port.
    #[test]
    fn ac10_all_schemas_zero_violations() {
        for (name, nodes, edges, frames) in schema_scenes() {
            let (s, diag, failed) = astar_schema_stats(&nodes, &edges, &frames);
            // A clean panel on a best-effort (failed) route would be a false pass — forbid it (M1).
            assert!(!failed, "schema {name}: an edge degraded to best-effort");
            assert_eq!(s, crate::RouteStats::default(), "schema {name}: {s:?}");
            assert_eq!(diag, 0, "schema {name} has a non-orthogonal segment");
        }
    }

    /// T7 — an internal-tree scene the AC10 fixtures barely exercise (only S3 carries one int edge).
    /// A manager and two children in the SAME `(dept, part)` must draw as direct `route_ortho` elbows
    /// (NOT A* wiggles), occupied first, and read a clean detector panel (dg33 T7 critic coverage gap).
    #[test]
    fn t7_internal_tree_edges_are_ortho_elbows() {
        let nodes = vec![
            node_dept("m", 0.0, 0.0, 100.0, 50.0, "A"),
            node_dept("a", -150.0, 260.0, 100.0, 50.0, "A"),
            node_dept("b", 150.0, 260.0, 100.0, 50.0, "A"),
        ];
        let edges = [edge("m", "a"), edge("m", "b")];
        let frames = [frame("A", -170.0, -20.0, 440.0, 350.0)];
        let boxes = near_boxes(&nodes);
        let find = |id: &str| boxes.iter().find(|c| c.id == id).unwrap();

        let w = nodes.iter().map(|n| n.x + n.width).fold(0.0f32, f32::max) + 100.0;
        let h = nodes.iter().map(|n| n.y + n.height).fold(0.0f32, f32::max) + 100.0;
        let specs: Vec<crate::EdgeSpec> = edges
            .iter()
            .map(|e| {
                let m = nodes.iter().find(|n| n.id == e.from_id).unwrap();
                let c = nodes.iter().find(|n| n.id == e.to_id).unwrap();
                crate::EdgeSpec {
                    from_id: e.from_id.clone(),
                    to_id: e.to_id.clone(),
                    start: (m.x + m.width / 2.0, m.y + m.height),
                    target: (c.x + c.width / 2.0, c.y),
                    secondary: false,
                }
            })
            .collect();
        let member = |id: &str| schema_member(&nodes, id);
        let routes = crate::route_scene(w, h, &boxes, &frames, &specs, &member);

        // Each internal edge is EXACTLY the shared ortho-elbow builder's output — proof it did not go
        // through A* (which would place points off the `route_ortho` corridor).
        for (spec, r) in specs.iter().zip(&routes) {
            let expect = route_ortho(find(&spec.from_id), find(&spec.to_id));
            let got: Vec<(f32, f32)> = r.points.iter().map(|p| (p.x, p.y)).collect();
            let want: Vec<(f32, f32)> = expect.iter().map(|p| (p.x, p.y)).collect();
            assert_eq!(
                got, want,
                "{}->{} is not the ortho elbow",
                spec.from_id, spec.to_id
            );
        }
        // …and the scene is clean.
        let srs: Vec<StaffEdgeRoute> = specs
            .iter()
            .zip(&routes)
            .map(|(s, r)| StaffEdgeRoute {
                from_id: s.from_id.clone(),
                to_id: s.to_id.clone(),
                kind: "admin".into(),
                points: r.points.clone(),
                marked: None,
                ends_on_dept_top: None,
            })
            .collect();
        assert_eq!(
            crate::route_stats(&srs, &boxes, &frames, &member),
            crate::RouteStats::default()
        );
    }
}
