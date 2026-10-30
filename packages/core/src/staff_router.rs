//! T128 staff link-routing — the §10.4 route-quality detector (`route_stats`).
//!
//! This is the ACCEPTANCE GATE for the A* router (T128): it counts, on a routed scene, the five
//! §10.4 violation classes the product forbids. The A* router (T3–T6) must drive every one to zero
//! on the nine §10.1 schemas (AC10 = `0/0/0/0/0`). Q4: the same code runs as a runtime `/debug`
//! overlay and as the `cargo test` gate — one detector, no second truth.
//!
//! Geometry is reused, not re-derived: card distance / interior-hit / foreign-frame intrusion all
//! come from the prod `staff_geom` primitives shared with the router (`seg_rect_distance`,
//! `polyline_hits_box_interior`, `frame_intrusion_count`). Only the two LINE-vs-LINE metrics
//! (crossings, overlaps) are new here — and each carries the exemption that the per-edge polyline
//! contract (`StaffEdgeRoute.points`, one polyline per edge) makes mandatory:
//!
//!   * siblings of one manager each carry a DUPLICATE trunk and meet at the shared bus junction, so
//!     a naive line-vs-line test reports a crossing at that junction and an overlap on that trunk on
//!     EVERY tree with ≥2 children — a false positive no router can remove, because the trunk is
//!     duplicated by the contract, not by the layout. The crossing metric therefore exempts an
//!     intersection that lands on a point shared by BOTH polylines (a tree node), and the overlap
//!     metric exempts collinear coincidence between two edges of the SAME manager (their shared
//!     trunk/bus is one drawn structure). The crossing exemption is GEOMETRIC, not a blanket
//!     same-manager skip: two siblings can still cross perpendicularly away from the bus, and that
//!     is a real defect that must be counted (dg32 T1 critic, blocker 1).

use crate::staff_edge_box::EdgeRect;
use crate::staff_geom::{
    frame_intrusion_count, obstacle_rect, polyline_hits_box_interior, seg_rect_distance, DeptPart,
    FrameRect, INTERIOR_EPS,
};
use crate::types::{StaffEdgeRoute, StaffRoutePoint};
use std::collections::HashMap;

/// Minimum allowed clearance of a line to a foreign card (req §10.4.2).
pub const MIN_CLEARANCE_PX: f32 = 8.0;
/// Coincidence tolerance for shared tree points and collinearity (f32-safe; fixtures sit far from it).
const COINCIDE_EPS: f32 = 0.5;

/// §10.4 detector panel — five independent counts on one routed scene. All five zero ⇒ AC1–AC3/AC10.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct RouteStats {
    /// §10.4.1 — a line crosses another (perpendicular), away from a shared tree point.
    pub crossings: usize,
    /// a line overlaps another collinearly (different managers; a shared trunk/bus is exempt).
    pub overlaps: usize,
    /// §10.4.3 — a line runs under a foreign card's interior.
    pub through_card: usize,
    /// §10.4.2 — a line is nearer than 8px to a foreign card (but not under it).
    pub near_card: usize,
    /// §10.4.3 — a line penetrates a foreign department frame.
    pub through_foreign: usize,
}

/// An axis-aligned segment, the only shape a routed polyline is allowed to contain (ortho-only, §5.1).
enum Seg {
    H {
        y: f32,
        x0: f32,
        x1: f32,
    },
    V {
        x: f32,
        y0: f32,
        y1: f32,
    },
    /// Zero-length (a repeated point) — carries no geometry, ignored by every metric.
    Degenerate,
    /// Non-orthogonal — must not occur; counted by `diagonal_segments` so a test can assert ortho-only.
    Diagonal,
}

fn classify(a: &StaffRoutePoint, b: &StaffRoutePoint) -> Seg {
    let dx = (a.x - b.x).abs();
    let dy = (a.y - b.y).abs();
    if dx <= COINCIDE_EPS && dy <= COINCIDE_EPS {
        Seg::Degenerate
    } else if dy <= COINCIDE_EPS {
        Seg::H {
            y: (a.y + b.y) / 2.0,
            x0: a.x.min(b.x),
            x1: a.x.max(b.x),
        }
    } else if dx <= COINCIDE_EPS {
        Seg::V {
            x: (a.x + b.x) / 2.0,
            y0: a.y.min(b.y),
            y1: a.y.max(b.y),
        }
    } else {
        Seg::Diagonal
    }
}

fn segs(route: &StaffEdgeRoute) -> Vec<Seg> {
    route
        .points
        .windows(2)
        .map(|w| classify(&w[0], &w[1]))
        .collect()
}

/// Strictly inside the open interval (further than eps from either end).
fn strictly_between(v: f32, lo: f32, hi: f32) -> bool {
    v > lo + COINCIDE_EPS && v < hi - COINCIDE_EPS
}

/// A PROPER crossing of an H and a V segment: the meeting point is in the INTERIOR of both.
///
/// This is the whole shared-tree-point exemption, done geometrically. A branch that meets a trunk
/// or bus does so at a vertex (an endpoint of one of the two segments), so the meeting point is not
/// interior to both and is not a crossing — no `from_id` blanket is needed, and a straight-through
/// sibling trunk (which carries no vertex at the bus Y) is handled too. A real X between two
/// independent lines is interior to both and is counted (dg32 T1 critic, blocker 1; the vertex-only
/// test it first proposed over-counted a straight sibling trunk, measured on schema S2).
fn proper_cross(h: &Seg, v: &Seg) -> bool {
    if let (Seg::H { y, x0, x1 }, Seg::V { x, y0, y1 }) = (h, v) {
        strictly_between(*x, *x0, *x1) && strictly_between(*y, *y0, *y1)
    } else {
        false
    }
}

/// Positive-length collinear overlap of two same-orientation segments, if any.
fn collinear_overlap(a: &Seg, b: &Seg) -> bool {
    match (a, b) {
        (
            Seg::H {
                y: ya,
                x0: a0,
                x1: a1,
            },
            Seg::H {
                y: yb,
                x0: b0,
                x1: b1,
            },
        ) => (ya - yb).abs() <= COINCIDE_EPS && a0.max(*b0) + COINCIDE_EPS < a1.min(*b1),
        (
            Seg::V {
                x: xa,
                y0: a0,
                y1: a1,
            },
            Seg::V {
                x: xb,
                y0: b0,
                y1: b1,
            },
        ) => (xa - xb).abs() <= COINCIDE_EPS && a0.max(*b0) + COINCIDE_EPS < a1.min(*b1),
        _ => false,
    }
}

/// §10.4 detector: five violation counts for a routed scene.
///
/// `boxes` are the cards (foreign-ness is by endpoint id); `frames` the department frames;
/// `member_of` maps an id to its `(department, part)` (org endpoints → `None`), as the router uses.
pub fn route_stats(
    routes: &[StaffEdgeRoute],
    boxes: &[EdgeRect],
    frames: &[FrameRect],
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
) -> RouteStats {
    let mut stats = RouteStats::default();
    let seg_sets: Vec<Vec<Seg>> = routes.iter().map(segs).collect();

    // --- line-vs-line: crossings & overlaps over unordered edge pairs ---
    for i in 0..routes.len() {
        for j in (i + 1)..routes.len() {
            let same_manager = routes[i].from_id == routes[j].from_id;
            for si in &seg_sets[i] {
                for sj in &seg_sets[j] {
                    // crossings: a proper X — interior to both segments (a tree T-junction, where
                    // one segment meets the other at a vertex, is not interior and is exempt).
                    if proper_cross(si, sj) || proper_cross(sj, si) {
                        stats.crossings += 1;
                    }
                    // overlaps: collinear coincidence of positive length. One manager's shared
                    // trunk/bus is one drawn structure, so same-`from_id` pairs are exempt.
                    if !same_manager && collinear_overlap(si, sj) {
                        stats.overlaps += 1;
                    }
                }
            }
        }
    }

    // --- line-vs-card: through_card (interior) and near_card (<8px, not interior) ---
    for edge in routes {
        for b in boxes {
            if b.id == edge.from_id || b.id == edge.to_id {
                continue; // own endpoint — a line is allowed to touch its own card
            }
            let (rx, ry, rw, rh) = obstacle_rect(b);
            if polyline_hits_box_interior(&edge.points, rx, ry, rw, rh, INTERIOR_EPS) {
                stats.through_card += 1;
                continue; // one (edge, card) pair counts once; interior dominates near
            }
            let mut min_d = f32::INFINITY;
            for s in edge.points.windows(2) {
                min_d = min_d.min(seg_rect_distance(&s[0], &s[1], rx, ry, rw, rh));
            }
            if min_d < MIN_CLEARANCE_PX {
                stats.near_card += 1;
            }
        }
    }

    // --- line-vs-frame: foreign department-frame intrusion (prod primitive, one source) ---
    for edge in routes {
        stats.through_foreign +=
            frame_intrusion_count(&edge.points, &edge.from_id, &edge.to_id, frames, member_of);
    }

    stats
}

// ============================================================================================
// T3 — the corridor grid: the STATIC obstacle layer the A* router (T4) traverses.
//
// Design note (dg33, verified against the acceptance mockup `shps-links.js:114-123`, which the
// T128 mandate names as the reference — this is a PARAPHRASE of its structure, never a copy):
//
//   * The grid is SPARSE, not a uniform pixel raster. Coordinate lines are placed only where they
//     matter — at obstacle edges, and one lane in the MIDDLE of every wide gap (plus a ±lane pair) —
//     so a 9px corridor is always routable and the node count stays O(obstacles), not O(canvas/step).
//     A uniform step would both miss narrow corridors (phase-dependent) and blow up AC9.
//   * It is built ONCE per scene, not per edge, so the whole thing can be cached by bbox across a
//     routing pass (plan §4 perf-lever). CARDS are the only passability obstacles here (inflated by
//     `pad`); department FRAMES contribute coordinate LINES only. A frame's passability is
//     role-dependent (an edge may exit its own frame and enter its target's, but no third frame —
//     §10.2/AC5), so it cannot be baked into one static matrix — that is the per-edge `deptOK`
//     overlay in T4, applied inside A*. Baking a frame as a static wall here would either wall off
//     the corridor or (if the target frame were exempted at build time) free it for every edge.
//   * Passability is two EDGE matrices, `mh`/`mv` — not a per-cell bitmap — because A* moves along
//     grid edges between adjacent coordinate lines, and an edge is what a card can block.
// ============================================================================================

/// Corridor lane offset (mockup `S.lane`): spacing of the extra routing lines seeded in a wide gap.
const LANE: f32 = 8.0;
/// Department-frame margin: coordinate offset outside a frame border (mockup `E(D,14)`).
const FRAME_MARGIN: f32 = 14.0;
/// Department header band: the title strip below a frame top that lines avoid (mockup `D.y1+38`).
const HEADER_BAND: f32 = 38.0;
/// Frame interior inset: the legitimate in-frame zone (mockup `E(D,-12)`).
const FRAME_INSET: f32 = 12.0;

/// Quantize a coordinate to 0.5px so float jitter never splits one logical line into two (R(n)).
fn quant(v: f32) -> f32 {
    (v * 2.0).round() / 2.0
}
/// Integer key for an index map, matching `quant`'s 0.5px lattice.
fn line_key(v: f32) -> i64 {
    (v * 2.0).round() as i64
}

/// The sparse, static routing grid. `xs`/`ys` are the sorted coordinate lines; `mh`/`mv` the
/// horizontal/vertical edge-passability matrices (1 = blocked by a card). See the module note above.
pub struct CorridorGrid {
    pub xs: Vec<f32>,
    pub ys: Vec<f32>,
    /// Horizontal edges: `mh[j*(nx-1)+i]` is the edge `(xs[i]..xs[i+1], ys[j])`.
    pub mh: Vec<u8>,
    /// Vertical edges: `mv[j*nx+i]` is the edge `(xs[i], ys[j]..ys[j+1])`.
    pub mv: Vec<u8>,
    xmap: HashMap<i64, usize>,
    ymap: HashMap<i64, usize>,
}

impl CorridorGrid {
    pub fn nx(&self) -> usize {
        self.xs.len()
    }
    pub fn ny(&self) -> usize {
        self.ys.len()
    }
    /// Index of the coordinate line at `x`, if `x` is one (quantized match).
    pub fn xi(&self, x: f32) -> Option<usize> {
        self.xmap.get(&line_key(x)).copied()
    }
    pub fn yi(&self, y: f32) -> Option<usize> {
        self.ymap.get(&line_key(y)).copied()
    }
    /// Is the horizontal edge `(xs[i]..xs[i+1], ys[j])` blocked by a card?
    pub fn h_blocked(&self, i: usize, j: usize) -> bool {
        self.mh[j * (self.nx() - 1) + i] != 0
    }
    /// Is the vertical edge `(xs[i], ys[j]..ys[j+1])` blocked by a card?
    pub fn v_blocked(&self, i: usize, j: usize) -> bool {
        self.mv[j * self.nx() + i] != 0
    }
}

/// An axis-aligned rect as `(x1, y1, x2, y2)` (min/max corners) — the shape `edge_hits` tests.
type Rect4 = (f32, f32, f32, f32);

/// Does an axis-aligned grid edge cut the INTERIOR of a rect? `vert` picks the edge orientation:
/// for a vertical edge `fixed` is its x and `lo..hi` its y-span; for a horizontal edge `fixed` is
/// its y and `lo..hi` its x-span. The fixed coordinate must be STRICTLY inside the rect's crossing
/// span (an edge grazing the border is not blocked), and the moving span must overlap with positive
/// length (mockup `hit`, :89). This is what lets a line run flush along a padded card's edge.
fn edge_hits(vert: bool, fixed: f32, lo: f32, hi: f32, r: &Rect4) -> bool {
    let (x1, y1, x2, y2) = *r;
    if vert {
        fixed > x1 && fixed < x2 && lo.max(y1) < hi.min(y2)
    } else {
        fixed > y1 && fixed < y2 && lo.max(x1) < hi.min(x2)
    }
}

/// Seed coordinate lines from a set of obstacle coordinates: each coordinate itself, plus — in every
/// gap of ≥2px between adjacent coordinates — a middle line and a ±`LANE` pair, so a corridor always
/// carries a routable line down its centre (mockup `wall`, :116). Appends to `out` (deduped later).
fn wall(out: &mut Vec<f32>, coords: &[f32]) {
    let mut w: Vec<f32> = coords.iter().map(|&v| quant(v)).collect();
    w.sort_by(|a, b| a.partial_cmp(b).expect("finite geometry, no NaN"));
    w.dedup();
    out.extend_from_slice(&w);
    for i in 1..w.len() {
        let (a, b) = (w[i - 1], w[i]);
        if b - a < 2.0 {
            continue;
        }
        let m = quant((a + b) / 2.0);
        out.push(m);
        if m - LANE > a + 1.0 {
            out.push(quant(m - LANE));
        }
        if m + LANE < b - 1.0 {
            out.push(quant(m + LANE));
        }
    }
}

/// Sort, quantize-dedup, and index a coordinate-line set.
fn finalize_lines(mut lines: Vec<f32>) -> (Vec<f32>, HashMap<i64, usize>) {
    lines.sort_by(|a, b| a.partial_cmp(b).expect("finite geometry, no NaN"));
    lines.dedup_by_key(|v| line_key(*v));
    let map = lines
        .iter()
        .enumerate()
        .map(|(i, &v)| (line_key(v), i))
        .collect();
    (lines, map)
}

/// Build the sparse static corridor grid (T3). `det_bus_ys` are the internal-tree bus Y lines routed
/// before the grid (empty is valid); they are added as exact lines so A* edges can meet them.
pub fn build_corridor_grid(
    canvas_w: f32,
    canvas_h: f32,
    cards: &[EdgeRect],
    frames: &[FrameRect],
    det_bus_ys: &[f32],
) -> CorridorGrid {
    let pad = MIN_CLEARANCE_PX;

    // --- coordinate lines: wall() the obstacle edges, then add exact port/anchor lines ---
    let mut wx = vec![0.0, canvas_w];
    let mut wy = vec![0.0, canvas_h];
    for c in cards {
        let (x, y, w, h) = obstacle_rect(c);
        wx.push(x - pad);
        wx.push(x + w + pad);
        wy.push(y - pad);
        wy.push(y + h + pad);
    }
    for d in frames {
        wx.push(d.x);
        wx.push(d.x + d.width);
        wx.push(d.x - FRAME_MARGIN);
        wx.push(d.x + d.width + FRAME_MARGIN);
        wx.push(d.x + FRAME_INSET);
        wx.push(d.x + d.width - FRAME_INSET);
        wy.push(d.y);
        wy.push(d.y + d.height);
        wy.push(d.y + HEADER_BAND);
        wy.push(d.y + d.height + FRAME_MARGIN);
        wy.push(d.y + d.height - FRAME_INSET);
        wy.push(d.y - FRAME_MARGIN);
    }

    let mut xs = Vec::new();
    let mut ys = Vec::new();
    wall(&mut xs, &wx);
    wall(&mut ys, &wy);
    // Exact port/anchor lines (no lane expansion around them): card centre + top/bottom, frame top,
    // internal-tree bus Ys. These must be grid lines so docking ports land exactly on a node.
    for c in cards {
        let (x, y, w, h) = obstacle_rect(c);
        xs.push(quant(x + w / 2.0));
        ys.push(quant(y));
        ys.push(quant(y + h));
    }
    for d in frames {
        ys.push(quant(d.y));
    }
    for &by in det_bus_ys {
        ys.push(quant(by));
    }

    let (xs, xmap) = finalize_lines(xs);
    let (ys, ymap) = finalize_lines(ys);
    let (nx, ny) = (xs.len(), ys.len());

    // --- padded card rects (the only passability obstacles) ---
    let padded: Vec<Rect4> = cards
        .iter()
        .map(|c| {
            let (x, y, w, h) = obstacle_rect(c);
            (x - pad, y - pad, x + w + pad, y + h + pad)
        })
        .collect();

    // --- edge matrices: an edge is blocked iff it cuts some padded card's interior ---
    let mut mh = vec![0u8; nx.saturating_sub(1) * ny];
    let mut mv = vec![0u8; nx * ny.saturating_sub(1)];
    for j in 0..ny {
        for i in 0..nx.saturating_sub(1) {
            if padded
                .iter()
                .any(|r| edge_hits(false, ys[j], xs[i], xs[i + 1], r))
            {
                mh[j * (nx - 1) + i] = 1;
            }
        }
    }
    for j in 0..ny.saturating_sub(1) {
        for i in 0..nx {
            if padded
                .iter()
                .any(|r| edge_hits(true, xs[i], ys[j], ys[j + 1], r))
            {
                mv[j * nx + i] = 1;
            }
        }
    }

    CorridorGrid {
        xs,
        ys,
        mh,
        mv,
        xmap,
        ymap,
    }
}

/// Count of non-orthogonal segments across the scene — a line must be ortho-only (§5.1). A separate
/// probe (not part of the `0/0/0/0/0` panel) so a test can assert the router never emits a diagonal.
pub fn diagonal_segments(routes: &[StaffEdgeRoute]) -> usize {
    routes
        .iter()
        .flat_map(segs)
        .filter(|s| matches!(s, Seg::Diagonal))
        .count()
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn no_member(_: &str) -> Option<DeptPart> {
        None
    }

    // --- crossings (new metric) ---

    #[test]
    fn crossing_between_different_managers_is_counted() {
        // A: vertical x=100, 0→200. B: horizontal y=100, 0→200. They cross at (100,100) mid-segment,
        // and (100,100) is a vertex of neither polyline → a real crossing.
        let routes = [
            route("m1", "a", vec![pt(100.0, 0.0), pt(100.0, 200.0)]),
            route("m2", "b", vec![pt(0.0, 100.0), pt(200.0, 100.0)]),
        ];
        assert_eq!(route_stats(&routes, &[], &[], &no_member).crossings, 1);
    }

    #[test]
    fn sibling_bus_junction_is_not_a_crossing() {
        // Two children of one manager `m`: shared trunk x=100 down to bus y=100, then buses to each
        // child. Child-1's bus (100,100)→(40,100) meets child-2's trunk segment at (100,100), which
        // is a shared vertex of both polylines → exempt, not a crossing.
        let routes = [
            route(
                "m",
                "c1",
                vec![
                    pt(100.0, 0.0),
                    pt(100.0, 100.0),
                    pt(40.0, 100.0),
                    pt(40.0, 160.0),
                ],
            ),
            route(
                "m",
                "c2",
                vec![
                    pt(100.0, 0.0),
                    pt(100.0, 100.0),
                    pt(160.0, 100.0),
                    pt(160.0, 160.0),
                ],
            ),
        ];
        let s = route_stats(&routes, &[], &[], &no_member);
        assert_eq!(s.crossings, 0, "{s:?}");
    }

    #[test]
    fn straight_through_sibling_trunk_is_not_a_crossing() {
        // Three children of `m`: the middle child's riser is a straight trunk x=50 that passes
        // through the bus Y=175 WITHOUT a vertex there, while the left/right buses meet it at Y=175.
        // Those meetings are T-junctions (the bus ends on the trunk), not proper X crossings — the
        // over-strict "vertex of both" rule counted them; interior-of-both does not (schema S2).
        let routes = [
            route(
                "m",
                "a",
                vec![
                    pt(50.0, 50.0),
                    pt(50.0, 175.0),
                    pt(-150.0, 175.0),
                    pt(-150.0, 250.0),
                ],
            ),
            route("m", "b", vec![pt(50.0, 50.0), pt(50.0, 250.0)]),
            route(
                "m",
                "c",
                vec![
                    pt(50.0, 50.0),
                    pt(50.0, 175.0),
                    pt(250.0, 175.0),
                    pt(250.0, 250.0),
                ],
            ),
        ];
        let s = route_stats(&routes, &[], &[], &no_member);
        assert_eq!(s.crossings, 0, "{s:?}");
    }

    // --- overlaps (new metric) ---

    #[test]
    fn partial_overlap_of_different_managers_is_counted() {
        // Two unrelated vertical lines on the same x, overlapping on y in [50,150] → one overlap.
        let routes = [
            route("m1", "a", vec![pt(100.0, 0.0), pt(100.0, 150.0)]),
            route("m2", "b", vec![pt(100.0, 50.0), pt(100.0, 300.0)]),
        ];
        assert_eq!(route_stats(&routes, &[], &[], &no_member).overlaps, 1);
    }

    #[test]
    fn shared_bus_of_siblings_is_not_an_overlap() {
        // Children on the same side share the bus prefix (100,100)→(140,100): a legitimate shared
        // structure of one manager, so same-`from_id` collinear coincidence is exempt.
        let routes = [
            route(
                "m",
                "c1",
                vec![
                    pt(100.0, 0.0),
                    pt(100.0, 100.0),
                    pt(140.0, 100.0),
                    pt(140.0, 160.0),
                ],
            ),
            route(
                "m",
                "c2",
                vec![
                    pt(100.0, 0.0),
                    pt(100.0, 100.0),
                    pt(200.0, 100.0),
                    pt(200.0, 160.0),
                ],
            ),
        ];
        let s = route_stats(&routes, &[], &[], &no_member);
        assert_eq!(s.overlaps, 0, "{s:?}");
    }

    // --- card metrics ---

    #[test]
    fn line_on_card_boundary_is_near_not_through() {
        // The line runs exactly along card X's left edge (x=100): distance 0, but the eps-narrowed
        // interior is not hit → counts as near_card (d<8), never through_card (blocker 4).
        let routes = [route("a", "b", vec![pt(100.0, 0.0), pt(100.0, 300.0)])];
        let boxes = [
            ebox("a", 60.0, -10.0, 100.0, 20.0),
            ebox("b", 60.0, 290.0, 100.0, 20.0),
            ebox("X", 100.0, 120.0, 100.0, 60.0),
        ];
        let s = route_stats(&routes, &boxes, &[], &no_member);
        assert_eq!(s.through_card, 0, "{s:?}");
        assert_eq!(s.near_card, 1, "{s:?}");
    }

    #[test]
    fn line_through_card_interior_is_through_not_near() {
        let routes = [route("a", "b", vec![pt(150.0, 0.0), pt(150.0, 300.0)])];
        let boxes = [
            ebox("a", 100.0, -10.0, 100.0, 20.0),
            ebox("b", 100.0, 290.0, 100.0, 20.0),
            ebox("X", 100.0, 120.0, 100.0, 60.0),
        ];
        let s = route_stats(&routes, &boxes, &[], &no_member);
        assert_eq!(s.through_card, 1, "{s:?}");
        assert_eq!(s.near_card, 0, "{s:?}");
    }

    #[test]
    fn own_endpoint_card_is_never_a_violation() {
        // The line ends inside its own card — allowed, not a self-violation.
        let routes = [route("a", "b", vec![pt(110.0, 150.0), pt(110.0, 400.0)])];
        let boxes = [
            ebox("a", 60.0, 120.0, 100.0, 60.0),
            ebox("b", 60.0, 390.0, 100.0, 20.0),
        ];
        let s = route_stats(&routes, &boxes, &[], &no_member);
        assert_eq!(s.through_card, 0, "{s:?}");
        assert_eq!(s.near_card, 0, "{s:?}");
    }

    // --- foreign frame metric (reuses the prod primitive; one source with the §12 marker) ---

    #[test]
    fn line_through_foreign_frame_is_counted() {
        let routes = [route("a", "c", vec![pt(50.0, 50.0), pt(350.0, 50.0)])];
        let frames = [FrameRect {
            department_id: "d2".to_string(),
            part_index: None,
            x: 150.0,
            y: 0.0,
            width: 100.0,
            height: 100.0,
            head_id: None,
        }];
        let member = |id: &str| match id {
            "a" => Some(("d1".to_string(), None)),
            "c" => Some(("d3".to_string(), None)),
            _ => None,
        };
        assert_eq!(
            route_stats(&routes, &[], &frames, &member).through_foreign,
            1
        );
    }

    // --- clean scene & ortho probe ---

    #[test]
    fn clean_scene_is_all_zero() {
        let routes = [route("a", "b", vec![pt(0.0, 0.0), pt(0.0, 300.0)])];
        let boxes = [
            ebox("a", -50.0, -10.0, 100.0, 20.0),
            ebox("b", -50.0, 290.0, 100.0, 20.0),
            ebox("X", 200.0, 120.0, 100.0, 60.0), // far away
        ];
        assert_eq!(
            route_stats(&routes, &boxes, &[], &no_member),
            RouteStats::default()
        );
    }

    #[test]
    fn diagonal_segment_is_detected_by_the_ortho_probe() {
        let routes = [route("a", "b", vec![pt(0.0, 0.0), pt(100.0, 100.0)])];
        assert_eq!(diagonal_segments(&routes), 1);
    }

    // --- T3: corridor grid (sparse, static; passability from cards only) ---

    /// Geometric midpoint of a horizontal grid edge `(xs[i]..xs[i+1], ys[j])`.
    fn h_mid(g: &CorridorGrid, i: usize, j: usize) -> (f32, f32) {
        ((g.xs[i] + g.xs[i + 1]) / 2.0, g.ys[j])
    }

    #[test]
    fn corridor_grid_is_sparse_well_formed_and_card_aligned() {
        // Two cards sharing an x-span, stacked with an open gap (y 110..200).
        let cards = [
            ebox("A", 50.0, 50.0, 100.0, 60.0),
            ebox("B", 50.0, 200.0, 100.0, 60.0),
        ];
        let g = build_corridor_grid(400.0, 300.0, &cards, &[], &[]);

        // Sparse, not a uniform pixel raster: far fewer lines than canvas_w/step.
        assert!(g.nx() >= 2 && g.ny() >= 2, "grid has lines");
        assert!(
            g.nx() < 40 && g.ny() < 40,
            "sparse, not a 400/8 raster: {} {}",
            g.nx(),
            g.ny()
        );
        // Edge matrices sized to the mockup's convention.
        assert_eq!(g.mh.len(), (g.nx() - 1) * g.ny(), "mH size");
        assert_eq!(g.mv.len(), g.nx() * (g.ny() - 1), "mV size");

        // Padded card edges (±pad = 8) are coordinate lines; so are canvas bounds and card centers.
        assert!(g.xi(42.0).is_some(), "left card edge - pad");
        assert!(g.xi(158.0).is_some(), "right card edge + pad");
        assert!(g.xi(100.0).is_some(), "card center port");
        assert!(
            g.xi(0.0).is_some() && g.xi(400.0).is_some(),
            "canvas x bounds"
        );
        assert!(
            g.yi(42.0).is_some() && g.yi(118.0).is_some(),
            "card A padded band"
        );
        // A routable line sits inside the open gap between the cards (wall() midpoint rule).
        assert!(
            g.ys.iter().any(|&y| y > 118.0 && y < 192.0),
            "a corridor line exists in the gap"
        );
    }

    #[test]
    fn corridor_grid_blocks_under_padded_cards_only() {
        let cards = [ebox("A", 50.0, 50.0, 100.0, 60.0)];
        let g = build_corridor_grid(400.0, 300.0, &cards, &[], &[]);

        // Some horizontal edge whose midpoint lies strictly inside the padded card is BLOCKED.
        let (pl, pr, pt_, pb) = (42.0, 158.0, 42.0, 118.0); // card ± pad
        let blocked_inside = (0..g.ny()).any(|j| {
            (0..g.nx() - 1).any(|i| {
                let (mx, my) = h_mid(&g, i, j);
                mx > pl && mx < pr && my > pt_ && my < pb && g.h_blocked(i, j)
            })
        });
        assert!(
            blocked_inside,
            "an edge under the padded card must be blocked"
        );

        // No edge far from the card (x < 40) is ever blocked: cards are the only obstacle layer.
        let free_left = (0..g.nx()).all(|i| {
            if g.xs[i] >= 40.0 {
                return true;
            }
            (0..g.ny() - 1).all(|j| !g.v_blocked(i, j))
        });
        assert!(free_left, "open corridor left of the card must be free");
    }

    #[test]
    fn corridor_grid_frames_contribute_coordinates_not_blocking() {
        // A lone department frame, no cards: it adds coordinate lines but blocks nothing.
        let frames = [FrameRect {
            department_id: "d1".to_string(),
            part_index: None,
            x: 100.0,
            y: 100.0,
            width: 120.0,
            height: 120.0,
            head_id: None,
        }];
        let g = build_corridor_grid(400.0, 400.0, &[], &frames, &[]);

        // Frame geometry became coordinate lines (margin ±14, header band +38).
        assert!(g.xi(86.0).is_some(), "frame x1 - 14");
        assert!(g.yi(138.0).is_some(), "frame header band y1 + 38");
        // …but with no cards, nothing is blocked: frame passability is per-edge (T4), not baked here.
        assert!(
            g.mh.iter().all(|&b| b == 0) && g.mv.iter().all(|&b| b == 0),
            "frames never block the grid"
        );
    }
}
