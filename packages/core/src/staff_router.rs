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
//!
//! DEPRECATED(dg41): superseded by the tidy engine (staff_tidy_layout.rs; owner decision
//! 2026-11-06, see work/reports/staff-link-routing-astar/_decision-routing-direction-dg41.md).
//! Do not extend. Still the LIVE default until the tidy path becomes default.
//! Removal = one step, blocked on: (1) tidy path default + enabled in the host,
//! (2) matrix/headless scenes covered on the tidy path (today served by computeViaTs),
//! (3) golden rebaseline, (4) host (cassiopeia) coordination.
//! The tidy engine does not import this module (only crate::types inputs),
//! so removal will not break it.
//! route_stats here is a second §10.4 detector alongside the tidy engine's stats_core;
//! it goes away with this module.

use crate::staff_edge_box::EdgeRect;
use crate::staff_geom::{
    frame_intrusion_count, obstacle_rect, polyline_hits_box_interior, seg_rect_distance, DeptPart,
    FrameRect, INTERIOR_EPS,
};
use crate::staff_routes::route_ortho;
use crate::types::{StaffEdgeRoute, StaffRoutePoint};
use std::cmp::Ordering;
use std::collections::{BinaryHeap, HashMap};

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
    route_stats_detailed(routes, boxes, frames, member_of).0
}

/// Same detector as `route_stats`, but also returns the SORTED set of edge indices that take part in
/// any violation — the targets rip-up (T6) re-routes. One truth: `route_stats` is this with the set
/// dropped, so the gate and rip-up never disagree about what counts.
pub fn route_stats_detailed(
    routes: &[StaffEdgeRoute],
    boxes: &[EdgeRect],
    frames: &[FrameRect],
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
) -> (RouteStats, Vec<usize>) {
    let mut stats = RouteStats::default();
    let mut bad = vec![false; routes.len()];
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
                        bad[i] = true;
                        bad[j] = true;
                    }
                    // overlaps: collinear coincidence of positive length. One manager's shared
                    // trunk/bus is one drawn structure, so same-`from_id` pairs are exempt.
                    if !same_manager && collinear_overlap(si, sj) {
                        stats.overlaps += 1;
                        bad[i] = true;
                        bad[j] = true;
                    }
                }
            }
        }
    }

    // --- line-vs-card: through_card (interior) and near_card (<8px, not interior) ---
    for (idx, edge) in routes.iter().enumerate() {
        for b in boxes {
            if b.id == edge.from_id || b.id == edge.to_id {
                continue; // own endpoint — a line is allowed to touch its own card
            }
            let (rx, ry, rw, rh) = obstacle_rect(b);
            if polyline_hits_box_interior(&edge.points, rx, ry, rw, rh, INTERIOR_EPS) {
                stats.through_card += 1;
                bad[idx] = true;
                continue; // one (edge, card) pair counts once; interior dominates near
            }
            let mut min_d = f32::INFINITY;
            for s in edge.points.windows(2) {
                min_d = min_d.min(seg_rect_distance(&s[0], &s[1], rx, ry, rw, rh));
            }
            if min_d < MIN_CLEARANCE_PX {
                stats.near_card += 1;
                bad[idx] = true;
            }
        }
    }

    // --- line-vs-frame: foreign department-frame intrusion (prod primitive, one source) ---
    for (idx, edge) in routes.iter().enumerate() {
        let n = frame_intrusion_count(&edge.points, &edge.from_id, &edge.to_id, frames, member_of);
        stats.through_foreign += n;
        if n > 0 {
            bad[idx] = true;
        }
    }

    let bad_idx = bad
        .iter()
        .enumerate()
        .filter_map(|(i, &b)| b.then_some(i))
        .collect();
    (stats, bad_idx)
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
/// Secondary-parent entry offset (mockup `SX`): a bypass edge enters its target at `centre + this`,
/// a column clear of the primary edge's `centre`, so two lines into one card never coincide (§10.1.5).
pub const SECONDARY_PORT_DX: f32 = 28.0;
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
        let cx = x + w / 2.0;
        xs.push(quant(cx));
        xs.push(quant(cx + SECONDARY_PORT_DX)); // secondary-parent entry column (mockup :118)
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

// ============================================================================================
// T4 — the A* router for one cross/ext edge over the T3 grid.
//
// Paraphrase of the acceptance mockup `shps-links.js:92-100` (deptOK) and `:130-155` (astar); the
// T128 mandate names that mockup as the reference. Two deliberate Rust-side adaptations, each from
// the dg33 critic and verified against the code that must agree with the router:
//
//   * ROLE IS PER-(dept, part), not per-dept. The mockup has one frame per department, so it keys a
//     frame's role on the bare department id. Here frames are per-part (`FrameRect.part_index`), and
//     the acceptance detector `frame_intrusion_count` exempts a frame only when its `(dept, part)`
//     key equals `member_of(from)`/`member_of(to)`. Keying the router's deptOK role on the bare dept
//     would let a line cross a SIBLING part-frame of its own department while the detector still
//     counts that as an intrusion — router and gate would disagree and AC10 could never close. So
//     role mirrors the detector: full-key match → Source/Target, else foreign.
//   * COST IS f64 WITH A TOTAL-ORDER HEAP, and the frontier carries its own `g`. Rust's `BinaryHeap`
//     needs `Ord`, which `f32` lacks; and reconstructing `g = f - h` in f32 (as the mockup does in a
//     Float64Array) loses the 1e-6 staleness epsilon once costs reach the ~6000 range. Carrying `g`
//     on each heap entry removes the subtraction, and `(f, seq)` with a monotonic push counter gives
//     the stable FIFO tie-break AC8 (determinism) needs.
//
// Occupancy / lane weights (the 6000 / 4000 / 0.15 terms) are T5: here the cost is length + turn
// penalty only, so unrelated edges may still share a corridor (expected — the 0/0/0/0/0 gate stays
// `#[ignore]` until T6). Internal-tree edges use a direct elbow (T7), not this router.
// ============================================================================================

/// Turn penalty (§5.1.2): discourages corners so routes keep near-minimal bends (mockup `:150`).
const TURN_PENALTY: f64 = 30.0;
/// A* iteration ceiling: beyond it the search gives up to a best-effort line (mockup `:144`).
const ITER_CAP: u64 = 250_000;

/// Which end of the edge a frame belongs to, for `dept_ok`. Source = the edge exits it downward;
/// Target = the edge enters it from the top. A frame that is neither is foreign (`None`).
#[derive(Clone, Copy, PartialEq)]
enum Role {
    Source,
    Target,
}

/// The outcome of routing one edge: the orthogonal polyline, and whether the router had to fall back
/// to a best-effort line (no corridor / iteration cap). `failed` is the hook a caller turns into the
/// §12 `marked` residual (T8) — a visible leftover, never a silent drop or a panic.
pub struct AStarRoute {
    pub points: Vec<StaffRoutePoint>,
    pub failed: bool,
}

/// Does the axis-aligned segment `seg` cut the interior of rect `r`? (mockup `hit`, :89 — reuses
/// `edge_hits` so the border-graze rule is identical to the grid's.)
fn seg_hits_rect(seg: Rect4, vert: bool, r: Rect4) -> bool {
    let (sx1, sy1, sx2, sy2) = seg;
    if vert {
        edge_hits(true, sx1, sy1, sy2, &r)
    } else {
        edge_hits(false, sy1, sx1, sx2, &r)
    }
}

/// Is `seg` an allowed move with respect to one department frame `d`, given the edge's `role` for it?
/// Faithful port of the mockup `deptOK` (:92-100); the six branches are order-sensitive (early
/// returns), so they are kept in sequence. `d` is `(x1,y1,x2,y2)` = frame top-left/bottom-right.
fn dept_ok(seg: Rect4, d: Rect4, role: Option<Role>) -> bool {
    let (sx1, sy1, sx2, sy2) = seg;
    let (dx1, dy1, dx2, dy2) = d;
    let vert = (sx1 - sx2).abs() <= COINCIDE_EPS;
    let in_x = vert && sx1 > dx1 + FRAME_MARGIN && sx1 < dx2 - FRAME_MARGIN;
    let hb = dy1 + HEADER_BAND;

    // 1. Target entry: a vertical line in the inner x-band coming down through the header into the body.
    if role == Some(Role::Target) && in_x && sy1 < hb && sy2 <= dy2 - FRAME_INSET {
        return true;
    }
    // 2. Entirely outside the frame + margin — always fine.
    let expanded = (
        dx1 - FRAME_MARGIN,
        dy1 - FRAME_MARGIN,
        dx2 + FRAME_MARGIN,
        dy2 + FRAME_MARGIN,
    );
    if !seg_hits_rect(seg, vert, expanded) {
        return true;
    }
    // 3. Foreign frame that the segment touches — forbidden (§10.2: no third department).
    let role = match role {
        Some(r) => r,
        None => return false,
    };
    // 4. Through the header band — forbidden (the title strip), except the branch-1 entry above.
    if seg_hits_rect(seg, vert, (dx1, dy1, dx2, hb)) {
        return false;
    }
    // 5. Fully inside the inner inset — legitimately within its own frame.
    let (ix1, iy1, ix2, iy2) = (
        dx1 + FRAME_INSET,
        dy1 + FRAME_INSET,
        dx2 - FRAME_INSET,
        dy2 - FRAME_INSET,
    );
    if sx1 >= ix1 && sx2 <= ix2 && sy1 >= iy1 && sy2 <= iy2 {
        return true;
    }
    // 6. Source exit: a vertical line in the inner x-band leaving downward past the bottom inset.
    role == Role::Source && in_x && sy1 >= hb && sy2 > dy2 - FRAME_INSET
}

/// Drop repeated points and collinear midpoints so the polyline is minimal (mockup `simp`, :101).
fn simplify_points(pts: &[(f32, f32)]) -> Vec<(f32, f32)> {
    let mut o: Vec<(f32, f32)> = Vec::with_capacity(pts.len());
    for &q in pts {
        if let Some(&l) = o.last() {
            if (l.0 - q.0).abs() <= COINCIDE_EPS && (l.1 - q.1).abs() <= COINCIDE_EPS {
                continue;
            }
        }
        if o.len() > 1 {
            let a = o[o.len() - 2];
            let l = o[o.len() - 1];
            let collinear = ((a.0 - l.0).abs() <= COINCIDE_EPS
                && (l.0 - q.0).abs() <= COINCIDE_EPS)
                || ((a.1 - l.1).abs() <= COINCIDE_EPS && (l.1 - q.1).abs() <= COINCIDE_EPS);
            if collinear {
                *o.last_mut().unwrap() = q;
                continue;
            }
        }
        o.push(q);
    }
    o
}

/// A frontier entry. Ordered for a MIN-heap over `std::collections::BinaryHeap` (a max-heap): the
/// entry with the smallest `f`, then smallest `seq`, compares GREATEST so it pops first. `g` and
/// `state` ride along and take no part in the ordering.
struct QEntry {
    f: f64,
    seq: u64,
    g: f64,
    state: usize,
}
impl PartialEq for QEntry {
    fn eq(&self, o: &Self) -> bool {
        self.cmp(o) == Ordering::Equal
    }
}
impl Eq for QEntry {}
impl PartialOrd for QEntry {
    fn partial_cmp(&self, o: &Self) -> Option<Ordering> {
        Some(self.cmp(o))
    }
}
impl Ord for QEntry {
    fn cmp(&self, o: &Self) -> Ordering {
        // Reverse `f` (and `seq`) so smaller is "greater" → the max-heap yields the min-f entry.
        o.f.total_cmp(&self.f).then(o.seq.cmp(&self.seq))
    }
}

fn point(x: f32, y: f32) -> StaffRoutePoint {
    StaffRoutePoint { x, y }
}

/// Best-effort Z fallback (mockup `:152`): a four-point orthogonal line at the mid-Y. Never a panic.
fn best_effort(start: (f32, f32), target: (f32, f32)) -> AStarRoute {
    let my = (start.1 + target.1) / 2.0;
    AStarRoute {
        points: vec![
            point(start.0, start.1),
            point(start.0, my),
            point(target.0, my),
            point(target.0, target.1),
        ],
        failed: true,
    }
}

// ============================================================================================
// T5 — lane occupancy (§5.4): keep different managers' lines on separate lanes.
//
// The weight terms (mockup `:149-150`): a grid edge already carrying THIS manager's line is cheap to
// reuse (`OWN_LANE_FACTOR`), so a manager's siblings share one bus; a grid edge or node carrying a
// DIFFERENT manager's line is dear (`FOREIGN_EDGE_COST` / `FOREIGN_NODE_COST`), so two managers in
// one corridor peel apart onto separate lanes. The owner is the edge's manager (`from_id`).
//
// The driver `route_edges` is the single pass that makes this bite: it routes edges in a stable
// order and occupies each before the next (mockup `:156-157`). Rip-up (mockup `:158`) is T6.
//
// Note (critic N1): `OWN_LANE_FACTOR < 1` makes an edge cheaper than its length, so the Manhattan
// heuristic is no longer admissible and A* is no longer provably optimal — route quality is judged
// by the §10.4 detector, not by optimality. This matches the mockup; the search still terminates and
// stays deterministic.
// ============================================================================================

/// Cost of sharing a grid EDGE with another manager's line (mockup `:150`): high enough to prefer a
/// detour of hundreds of px over a shared lane.
const FOREIGN_EDGE_COST: f64 = 6000.0;
/// Cost of landing on a grid NODE another manager's line occupies (mockup `:150`).
const FOREIGN_NODE_COST: f64 = 4000.0;
/// Reuse factor for a manager's own lane (mockup `:150`): siblings share a bus almost for free.
const OWN_LANE_FACTOR: f64 = 0.15;

/// Which managers' lines run along each grid node / edge. Keyed by owner (manager) id. Four maps, as
/// the mockup's `occ.{nH,nV,eH,eV}` (:124): node keys are the full index `j*nx+i`; edge-H keys are
/// `j*(nx-1)+i`, edge-V keys `j*nx+i` (critic B3 — a node map keyed like an edge map silently kills
/// the foreign-node term).
#[derive(Default)]
pub struct Occupancy {
    node_h: HashMap<usize, Vec<String>>,
    node_v: HashMap<usize, Vec<String>>,
    edge_h: HashMap<usize, Vec<String>>,
    edge_v: HashMap<usize, Vec<String>>,
}

/// Does some manager OTHER than `me` occupy this slot? (mockup `fo`, :128.)
fn has_foreign(v: Option<&Vec<String>>, me: &str) -> bool {
    v.is_some_and(|a| a.iter().any(|x| x != me))
}
/// Does `me` itself already occupy this slot? (mockup `ow`, :128.)
fn has_own(v: Option<&Vec<String>>, me: &str) -> bool {
    v.is_some_and(|a| a.iter().any(|x| x == me))
}

fn apply_owner(map: &mut HashMap<usize, Vec<String>>, key: usize, owner: &str, add: bool) {
    if add {
        map.entry(key).or_default().push(owner.to_string());
    } else if let Some(v) = map.get_mut(&key) {
        if let Some(pos) = v.iter().position(|x| x == owner) {
            v.swap_remove(pos); // remove ONE occurrence; order is irrelevant (existence predicates)
        }
    }
}

/// Add (`add`) or remove the `owner` along every node and edge a routed polyline covers. A segment
/// whose endpoints are not both grid nodes is SKIPPED — the best-effort fallback is off-grid, and
/// occupying it would index past the lattice (critic B1; the mockup's `.get(undefined)` is a no-op).
fn edit_occupancy(
    occ: &mut Occupancy,
    grid: &CorridorGrid,
    points: &[StaffRoutePoint],
    owner: &str,
    add: bool,
) {
    let nx = grid.nx();
    for w in points.windows(2) {
        let (a, b) = (&w[0], &w[1]);
        let vertical = (a.x - b.x).abs() <= COINCIDE_EPS;
        let horizontal = (a.y - b.y).abs() <= COINCIDE_EPS;
        if vertical == horizontal {
            continue; // diagonal or zero-length — not an orthogonal grid move
        }
        if vertical {
            let (lo, hi) = (a.y.min(b.y), a.y.max(b.y));
            let (i, j1, j2) = match (grid.xi(a.x), grid.yi(lo), grid.yi(hi)) {
                (Some(i), Some(j1), Some(j2)) => (i, j1, j2),
                _ => continue,
            };
            for j in j1..=j2 {
                apply_owner(&mut occ.node_v, j * nx + i, owner, add);
                if j < j2 {
                    apply_owner(&mut occ.edge_v, j * nx + i, owner, add);
                }
            }
        } else {
            let (lo, hi) = (a.x.min(b.x), a.x.max(b.x));
            let (j, i1, i2) = match (grid.yi(a.y), grid.xi(lo), grid.xi(hi)) {
                (Some(j), Some(i1), Some(i2)) => (j, i1, i2),
                _ => continue,
            };
            for i in i1..=i2 {
                apply_owner(&mut occ.node_h, j * nx + i, owner, add);
                if i < i2 {
                    apply_owner(&mut occ.edge_h, j * (nx - 1) + i, owner, add);
                }
            }
        }
    }
}

/// Mark every node/edge a routed line covers as occupied by `owner` (its manager).
pub fn occupy(occ: &mut Occupancy, grid: &CorridorGrid, points: &[StaffRoutePoint], owner: &str) {
    edit_occupancy(occ, grid, points, owner, true);
}
/// Undo a prior `occupy` of the same polyline and owner (for rip-up, T6).
pub fn release(occ: &mut Occupancy, grid: &CorridorGrid, points: &[StaffRoutePoint], owner: &str) {
    edit_occupancy(occ, grid, points, owner, false);
}

/// One edge to route: endpoint ids (ownership + own-card exemption) and the port coordinates.
/// `secondary` marks a bypass edge (its target has a nearer primary parent) — it is routed LAST and
/// enters the target at the offset column, so it never coincides with the primary line (§10.1.5).
pub struct EdgeSpec {
    pub from_id: String,
    pub to_id: String,
    pub start: (f32, f32),
    pub target: (f32, f32),
    pub secondary: bool,
}

/// Single-pass driver (mockup `:156-157`): route each edge in a stable order, occupying it before the
/// next so later lines take separate lanes (§5.4). Returns routes in INPUT order. Rip-up (T6) wraps
/// this. The order — manager Y, then X, then input index — is fixed, so the result is deterministic
/// (AC8).
pub fn route_edges(
    grid: &CorridorGrid,
    edges: &[EdgeSpec],
    cards: &[EdgeRect],
    frames: &[FrameRect],
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
) -> Vec<AStarRoute> {
    let mut occ = Occupancy::default();
    single_pass(grid, edges, cards, frames, member_of, &mut occ)
}

/// The stable routing order: primary edges first, then bypass (secondary) — a secondary line routes
/// against the primary's occupancy, not the reverse (mockup :156); within a group manager Y, X, index.
fn routing_order(edges: &[EdgeSpec]) -> Vec<usize> {
    let mut order: Vec<usize> = (0..edges.len()).collect();
    order.sort_by(|&a, &b| {
        edges[a]
            .secondary
            .cmp(&edges[b].secondary)
            .then(edges[a].start.1.total_cmp(&edges[b].start.1))
            .then(edges[a].start.0.total_cmp(&edges[b].start.0))
            .then(a.cmp(&b))
    });
    order
}

/// Route every edge once in `routing_order`, occupying each before the next; results in INPUT order.
fn single_pass(
    grid: &CorridorGrid,
    edges: &[EdgeSpec],
    cards: &[EdgeRect],
    frames: &[FrameRect],
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
    occ: &mut Occupancy,
) -> Vec<AStarRoute> {
    let mut out: Vec<Option<AStarRoute>> = (0..edges.len()).map(|_| None).collect();
    for idx in routing_order(edges) {
        let e = &edges[idx];
        let r = astar_route(
            grid, e.start, e.target, &e.from_id, &e.to_id, cards, frames, member_of, occ,
        );
        occupy(occ, grid, &r.points, &e.from_id);
        out[idx] = Some(r);
    }
    out.into_iter()
        .map(|o| o.expect("every slot filled"))
        .collect()
}

/// A routed edge as the detector sees it (polyline + endpoint ids).
fn to_staff_route(e: &EdgeSpec, r: &AStarRoute) -> StaffEdgeRoute {
    StaffEdgeRoute {
        from_id: e.from_id.clone(),
        to_id: e.to_id.clone(),
        kind: "admin".to_string(),
        points: r.points.clone(),
        marked: None,
        ends_on_dept_top: None,
    }
}

/// Single pass, then up to four RIP-UP passes (mockup :158): each pass re-measures with the §10.4
/// detector, and re-routes every edge that takes part in a violation against the others' current
/// occupancy (release → A* → occupy), alternating direction to break ties. Best-effort — it reduces
/// violations but does not guarantee zero (a residual surfaces as the route's `failed` flag, which a
/// caller turns into `marked`). Deterministic (fixed order and pass count; `astar_route`'s seq
/// tie-break). Returns routes in INPUT order.
#[allow(clippy::too_many_arguments)]
pub fn route_edges_ripup(
    grid: &CorridorGrid,
    edges: &[EdgeSpec],
    cards: &[EdgeRect],
    frames: &[FrameRect],
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
) -> Vec<AStarRoute> {
    let mut occ = Occupancy::default();
    let mut routes = single_pass(grid, edges, cards, frames, member_of, &mut occ);
    for pass in 0..4 {
        let srs: Vec<StaffEdgeRoute> = edges
            .iter()
            .zip(&routes)
            .map(|(e, r)| to_staff_route(e, r))
            .collect();
        let (_, mut bad) = route_stats_detailed(&srs, cards, frames, member_of);
        if bad.is_empty() {
            break;
        }
        if pass % 2 == 1 {
            bad.reverse();
        }
        for idx in bad {
            let e = &edges[idx];
            release(&mut occ, grid, &routes[idx].points, &e.from_id);
            let r = astar_route(
                grid, e.start, e.target, &e.from_id, &e.to_id, cards, frames, member_of, &occ,
            );
            occupy(&mut occ, grid, &r.points, &e.from_id);
            routes[idx] = r;
        }
    }
    routes
}

/// Is this an INTERNAL-tree edge — both endpoints in the SAME `(department, part)`? Keyed on the full
/// part key (not bare department), because the acceptance detector exempts a frame only per-part
/// (`frame_intrusion_count`): a "same dept, other part" edge drawn as a straight elbow could cut the
/// sibling part's frame, so it must stay a cross-edge for A* (dg33 T7 critic B2). A bypass (secondary)
/// edge is never internal (mockup :112) — it always routes with A*.
pub(crate) fn is_internal(
    from_id: &str,
    to_id: &str,
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
) -> bool {
    match (member_of(from_id), member_of(to_id)) {
        (Some(a), Some(b)) => a == b,
        _ => false,
    }
}

/// The full routing pipeline (T7): the one entry a host (T8) and the acceptance gate both call.
///
/// Internal-tree edges draw as a direct orthogonal elbow (`route_ortho`, shared with the detour so
/// there is one int-elbow truth) and are placed FIRST, occupying their lanes; cross/ext edges then
/// route with A* against that occupancy. Rip-up (≤4 passes) then re-routes EVERY edge still in a
/// violation — a HYBRID (dg33 owner decision): in a crowded department a straight internal elbow can
/// cut a sibling card, and such a dirty elbow BENDS through A*. A clean internal elbow is never
/// flagged, so it keeps its tidy shape and its O(1) cost; only the colliding few pay for A*. (This
/// diverges from the mockup, which never bends `det` and relies on layout spacing — §6, Bar-2 — to
/// keep internals clean; we add the router-side safety net.) The grid is built here, seeded with the
/// internal elbows' corridor Ys (mockup `:118`) so A* can see and avoid those buses. Routing every
/// internal edge through A* instead would also be correct (dg33 measured), but wigglier and slower —
/// elbow-first is the §2/Q2 perf split.
pub fn route_scene(
    canvas_w: f32,
    canvas_h: f32,
    cards: &[EdgeRect],
    frames: &[FrameRect],
    edges: &[EdgeSpec],
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
) -> Vec<AStarRoute> {
    let is_int: Vec<bool> = edges
        .iter()
        .map(|e| !e.secondary && is_internal(&e.from_id, &e.to_id, member_of))
        .collect();
    let find = |id: &str| cards.iter().find(|c| c.id == id);

    // Internal elbows' corridor Ys must be grid lines so their buses can be occupied / avoided.
    let mut bus_ys = Vec::new();
    for (i, e) in edges.iter().enumerate() {
        if is_int[i] {
            if let (Some(fc), Some(tc)) = (find(&e.from_id), find(&e.to_id)) {
                bus_ys.push((fc.y + fc.height + tc.y) / 2.0);
            }
        }
    }
    let grid = build_corridor_grid(canvas_w, canvas_h, cards, frames, &bus_ys);

    let mut occ = Occupancy::default();
    let mut routes: Vec<Option<AStarRoute>> = (0..edges.len()).map(|_| None).collect();

    // 1. Internal elbows — fixed, occupied first (mockup :129).
    for (i, e) in edges.iter().enumerate() {
        if is_int[i] {
            if let (Some(fc), Some(tc)) = (find(&e.from_id), find(&e.to_id)) {
                let points = route_ortho(fc, tc);
                occupy(&mut occ, &grid, &points, &e.from_id);
                routes[i] = Some(AStarRoute {
                    points,
                    failed: false,
                });
            }
        }
    }

    // 2. Cross/ext via A* in routing order, against the internal occupancy.
    let ce_order: Vec<usize> = routing_order(edges)
        .into_iter()
        .filter(|&i| routes[i].is_none())
        .collect();
    for idx in ce_order {
        let e = &edges[idx];
        let r = astar_route(
            &grid, e.start, e.target, &e.from_id, &e.to_id, cards, frames, member_of, &occ,
        );
        occupy(&mut occ, &grid, &r.points, &e.from_id);
        routes[idx] = Some(r);
    }

    // 3. Rip-up — re-route EVERY edge still in a violation, internal ones included: a dirty internal
    //    elbow (a crowded department where the straight bus cuts a sibling) BENDS through A* (dg33
    //    owner decision). A clean internal elbow is never flagged, so it keeps its tidy shape; only
    //    the colliding ones pay for A*. Best-effort (≤4 passes); a residual surfaces as the route's
    //    `failed` flag, which the wiring (T8) turns into the §12 `marked` — route_scene sets no mark.
    for pass in 0..4 {
        let srs: Vec<StaffEdgeRoute> = edges
            .iter()
            .zip(&routes)
            .map(|(e, r)| to_staff_route(e, r.as_ref().expect("routed in phases 1-2")))
            .collect();
        let (_, mut bad) = route_stats_detailed(&srs, cards, frames, member_of);
        if bad.is_empty() {
            break;
        }
        if pass % 2 == 1 {
            bad.reverse();
        }
        for idx in bad {
            let e = &edges[idx];
            let old = routes[idx].as_ref().unwrap().points.clone();
            release(&mut occ, &grid, &old, &e.from_id);
            let r = astar_route(
                &grid, e.start, e.target, &e.from_id, &e.to_id, cards, frames, member_of, &occ,
            );
            occupy(&mut occ, &grid, &r.points, &e.from_id);
            routes[idx] = Some(r);
        }
    }

    routes
        .into_iter()
        .map(|o| o.expect("every edge routed"))
        .collect()
}

/// Route one cross/ext edge from `start` (manager card bottom-centre) to `target` (child card
/// top-centre, or a department-top dock) with A* over the corridor grid (T4), lane-weighted by the
/// occupancy of earlier edges (T5, `occ`). See the module notes above for the Rust-side adaptations.
#[allow(clippy::too_many_arguments)]
pub fn astar_route(
    grid: &CorridorGrid,
    start: (f32, f32),
    target: (f32, f32),
    from_id: &str,
    to_id: &str,
    cards: &[EdgeRect],
    frames: &[FrameRect],
    member_of: &dyn Fn(&str) -> Option<DeptPart>,
    occ: &Occupancy,
) -> AStarRoute {
    let (nx, ny) = (grid.nx(), grid.ny());
    // Ports must land on grid nodes (T3 seeds card centres / tops / bottoms / dept tops). If one does
    // not — a malformed or off-grid port — degrade rather than index past the edge.
    let (si, sj, ti, tj) = match (
        grid.xi(start.0),
        grid.yi(start.1),
        grid.xi(target.0),
        grid.yi(target.1),
    ) {
        (Some(si), Some(sj), Some(ti), Some(tj)) => (si, sj, ti, tj),
        _ => return best_effort(start, target),
    };

    // Per-card obstacle data: own-endpoint cards relax to their raw rect on their own port column.
    struct Pc {
        endpoint: bool,
        cx: f32,
        raw: Rect4,
        padded: Rect4,
    }
    let pad = MIN_CLEARANCE_PX;
    let pc: Vec<Pc> = cards
        .iter()
        .map(|c| {
            let (x, y, w, h) = obstacle_rect(c);
            Pc {
                endpoint: c.id == from_id || c.id == to_id,
                cx: x + w / 2.0,
                raw: (x, y, x + w, y + h),
                padded: (x - pad, y - pad, x + w + pad, y + h + pad),
            }
        })
        .collect();

    // Per-frame role, mirroring the acceptance detector's `(dept, part)` exemption (critic B1).
    let from_key = member_of(from_id);
    let to_key = member_of(to_id);
    let frame_roles: Vec<(Rect4, Option<Role>)> = frames
        .iter()
        .map(|f| {
            let key = (f.department_id.clone(), f.part_index);
            let role = if from_key.as_ref() == Some(&key) {
                Some(Role::Source)
            } else if to_key.as_ref() == Some(&key) {
                Some(Role::Target)
            } else {
                None
            };
            ((f.x, f.y, f.x + f.width, f.y + f.height), role)
        })
        .collect();

    let xs = &grid.xs;
    let ys = &grid.ys;
    // Passability of a grid edge for THIS edge: matrix block relaxed on own ports, then every frame.
    let ok = |ei: usize, ej: usize, h: bool| -> bool {
        let seg: Rect4 = if h {
            (xs[ei], ys[ej], xs[ei + 1], ys[ej])
        } else {
            (xs[ei], ys[ej], xs[ei], ys[ej + 1])
        };
        let vert = !h;
        let matrix_blocked = if h {
            grid.mh[ej * (nx - 1) + ei] != 0
        } else {
            grid.mv[ej * nx + ei] != 0
        };
        if matrix_blocked {
            let hits_card = pc.iter().any(|c| {
                // Own-endpoint port column — the primary centre OR the secondary offset (mockup :136).
                let on_port = (seg.0 - c.cx).abs() <= COINCIDE_EPS
                    || (seg.0 - (c.cx + SECONDARY_PORT_DX)).abs() <= COINCIDE_EPS;
                let exempt = c.endpoint && vert && on_port;
                let rect = if exempt { c.raw } else { c.padded };
                seg_hits_rect(seg, vert, rect)
            });
            if hits_card {
                return false;
            }
        }
        frame_roles.iter().all(|&(d, role)| dept_ok(seg, d, role))
    };

    // A*: state = node * 3 + dir, dir 0 = start, 1 = horizontal, 2 = vertical.
    let n = nx * ny;
    let mut g = vec![f64::INFINITY; n * 3];
    let mut pv = vec![-1i64; n * 3];
    let hz = |i: usize, j: usize| -> f64 {
        ((xs[i] - target.0).abs() + (ys[j] - target.1).abs()) as f64
    };

    let mut heap: BinaryHeap<QEntry> = BinaryHeap::new();
    let start_state = (sj * nx + si) * 3;
    g[start_state] = 0.0;
    let mut seq: u64 = 0;
    heap.push(QEntry {
        f: hz(si, sj),
        seq,
        g: 0.0,
        state: start_state,
    });

    let mut goal: Option<usize> = None;
    let mut it: u64 = 0;
    while let Some(e) = heap.pop() {
        if it >= ITER_CAP {
            break;
        }
        it += 1;
        if e.g > g[e.state] {
            continue; // stale: a cheaper path to this state was queued later
        }
        let dir = e.state % 3;
        let node = e.state / 3;
        let (i, j) = (node % nx, node / nx);
        if i == ti && j == tj && dir == 2 {
            goal = Some(e.state);
            break;
        }
        for &(di, dj) in &[(1i64, 0i64), (-1, 0), (0, 1), (0, -1)] {
            let (ni, nj) = (i as i64 + di, j as i64 + dj);
            if ni < 0 || nj < 0 || ni >= nx as i64 || nj >= ny as i64 {
                continue;
            }
            let (ni, nj) = (ni as usize, nj as usize);
            if dir == 0 && dj != 1 {
                continue; // first step leaves the manager card going straight down
            }
            if ni == ti && nj == tj && dj != 1 {
                continue; // the target is entered from above, going down (§10.2 / AC5)
            }
            let h = dj == 0;
            let (ei, ej) = if h { (i.min(ni), j) } else { (i, j.min(nj)) };
            if !ok(ei, ej, h) {
                continue;
            }
            let nd = if h { 1 } else { 2 };
            let len = if h {
                (xs[ni] - xs[i]).abs() as f64
            } else {
                (ys[nj] - ys[j]).abs() as f64
            };
            let turn = if dir != 0 && nd != dir {
                TURN_PENALTY
            } else {
                0.0
            };
            // §5.4 lane weighting: own lane is cheap, a foreign lane/node is dear (T5).
            let ea = if h {
                occ.edge_h.get(&(ej * (nx - 1) + ei))
            } else {
                occ.edge_v.get(&(ej * nx + ei))
            };
            let lane = if has_own(ea, from_id) {
                len * OWN_LANE_FACTOR
            } else {
                len
            };
            let nn = nj * nx + ni;
            let foreign_node = has_foreign(occ.node_v.get(&nn), from_id)
                || has_foreign(occ.node_h.get(&nn), from_id);
            let penalty = if has_foreign(ea, from_id) {
                FOREIGN_EDGE_COST
            } else {
                0.0
            } + if foreign_node { FOREIGN_NODE_COST } else { 0.0 };
            let ng = e.g + lane + penalty + turn;
            let nstate = (nj * nx + ni) * 3 + nd;
            if ng < g[nstate] {
                g[nstate] = ng;
                pv[nstate] = e.state as i64;
                seq += 1;
                heap.push(QEntry {
                    f: ng + hz(ni, nj),
                    seq,
                    g: ng,
                    state: nstate,
                });
            }
        }
    }

    let goal = match goal {
        Some(k) => k,
        None => return best_effort(start, target),
    };
    // Reconstruct back to the start, then collapse collinear runs.
    let mut raw: Vec<(f32, f32)> = Vec::new();
    let mut k = goal as i64;
    while k >= 0 {
        let node = (k as usize) / 3;
        let (i, j) = (node % nx, node / nx);
        raw.push((xs[i], ys[j]));
        k = pv[k as usize];
    }
    raw.reverse();
    let points = simplify_points(&raw)
        .into_iter()
        .map(|(x, y)| point(x, y))
        .collect();
    AStarRoute {
        points,
        failed: false,
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

    // --- T4: astar_route (single cross/ext edge over the T3 grid) ---

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

    /// Consecutive points share exactly one axis (ortho-only, §5.1); no diagonal, no zero step.
    fn all_ortho(pts: &[StaffRoutePoint]) -> bool {
        pts.windows(2).all(|w| {
            let same_x = (w[0].x - w[1].x).abs() <= COINCIDE_EPS;
            let same_y = (w[0].y - w[1].y).abs() <= COINCIDE_EPS;
            same_x != same_y // exactly one axis fixed
        })
    }

    #[test]
    fn astar_routes_orthogonally_and_enters_target_from_above() {
        // Manager m (dept d1) above-left, child c (dept d2) below-right — a cross edge, no frames.
        let m = ebox("m", 100.0, 50.0, 100.0, 60.0);
        let c = ebox("c", 300.0, 300.0, 100.0, 60.0);
        let g = build_corridor_grid(600.0, 500.0, &[m.clone(), c.clone()], &[], &[]);
        let r = astar_route(
            &g,
            (150.0, 110.0),
            (350.0, 300.0),
            "m",
            "c",
            &[m, c],
            &[],
            &no_member,
            &Occupancy::default(),
        );

        assert!(!r.failed, "a clear cross edge must route");
        assert!(r.points.len() >= 2);
        let (first, last) = (r.points.first().unwrap(), r.points.last().unwrap());
        assert!(
            (first.x - 150.0).abs() < 1.0 && (first.y - 110.0).abs() < 1.0,
            "starts at the port"
        );
        assert!(
            (last.x - 350.0).abs() < 1.0 && (last.y - 300.0).abs() < 1.0,
            "ends at the target"
        );
        assert!(all_ortho(&r.points), "ortho-only: {:?}", r.points);
        assert_eq!(diagonal_segments(&[route("m", "c", r.points.clone())]), 0);
        // The last segment enters the target vertically, going DOWN (§10.2 / AC5: enter from above).
        let n = r.points.len();
        let (p, q) = (&r.points[n - 2], &r.points[n - 1]);
        assert!(
            (p.x - q.x).abs() < 1.0 && p.y < q.y,
            "enters target from above: {p:?}->{q:?}"
        );
    }

    #[test]
    fn astar_is_deterministic() {
        let m = ebox("m", 100.0, 50.0, 100.0, 60.0);
        let c = ebox("c", 300.0, 300.0, 100.0, 60.0);
        let g = build_corridor_grid(600.0, 500.0, &[m.clone(), c.clone()], &[], &[]);
        let a = astar_route(
            &g,
            (150.0, 110.0),
            (350.0, 300.0),
            "m",
            "c",
            &[m.clone(), c.clone()],
            &[],
            &no_member,
            &Occupancy::default(),
        );
        let b = astar_route(
            &g,
            (150.0, 110.0),
            (350.0, 300.0),
            "m",
            "c",
            &[m, c],
            &[],
            &no_member,
            &Occupancy::default(),
        );
        let tuples = |r: &AStarRoute| r.points.iter().map(|p| (p.x, p.y)).collect::<Vec<_>>();
        assert_eq!(
            tuples(&a),
            tuples(&b),
            "same input -> identical route (AC8)"
        );
    }

    #[test]
    fn astar_detours_around_a_foreign_card() {
        // A foreign card f sits on the straight line between m and c → the route must go around it.
        let m = ebox("m", 100.0, 50.0, 100.0, 60.0);
        let c = ebox("c", 100.0, 400.0, 100.0, 60.0);
        let f = ebox("f", 100.0, 200.0, 100.0, 60.0);
        let g = build_corridor_grid(600.0, 520.0, &[m.clone(), c.clone(), f.clone()], &[], &[]);
        let r = astar_route(
            &g,
            (150.0, 110.0),
            (150.0, 400.0),
            "m",
            "c",
            &[m, c, f.clone()],
            &[],
            &no_member,
            &Occupancy::default(),
        );

        assert!(!r.failed, "there is room to go around");
        assert!(all_ortho(&r.points));
        // The polyline never enters the foreign card's raw interior.
        let (fx, fy, fw, fh) = obstacle_rect(&f);
        assert!(
            !polyline_hits_box_interior(&r.points, fx, fy, fw, fh, INTERIOR_EPS),
            "route cuts the foreign card: {:?}",
            r.points
        );
    }

    #[test]
    fn astar_detours_around_a_foreign_frame() {
        // A foreign department frame (d3) straddles the straight path from m (d1) to c (d2).
        let m = ebox("m", 150.0, 50.0, 100.0, 60.0);
        let c = ebox("c", 150.0, 400.0, 100.0, 60.0);
        let frames = [frame("d3", 130.0, 200.0, 140.0, 120.0)];
        let member = |id: &str| match id {
            "m" => Some(("d1".to_string(), None)),
            "c" => Some(("d2".to_string(), None)),
            _ => None,
        };
        let g = build_corridor_grid(500.0, 520.0, &[m.clone(), c.clone()], &frames, &[]);
        let r = astar_route(
            &g,
            (200.0, 110.0),
            (200.0, 400.0),
            "m",
            "c",
            &[m, c],
            &frames,
            &member,
            &Occupancy::default(),
        );

        assert!(!r.failed, "there is room around the frame");
        assert!(all_ortho(&r.points));
        // The detector's own foreign-frame measure must read zero (router agrees with the gate).
        let route = [route("m", "c", r.points.clone())];
        assert_eq!(
            route_stats(&route, &[], &frames, &member).through_foreign,
            0,
            "route pierces the foreign frame: {:?}",
            r.points
        );
    }

    #[test]
    fn astar_degrades_to_best_effort_on_an_off_grid_port() {
        // A malformed/off-grid port (not a grid node) must degrade to a best-effort line — never an
        // out-of-bounds index or a panic (defense row #2: a visible leftover, not a silent drop).
        let m = ebox("m", 100.0, 50.0, 100.0, 60.0);
        let c = ebox("c", 300.0, 300.0, 100.0, 60.0);
        let g = build_corridor_grid(600.0, 500.0, &[m.clone(), c.clone()], &[], &[]);
        assert!(
            g.xi(355.0).is_none() && g.yi(305.0).is_none(),
            "target is deliberately off-grid"
        );
        let r = astar_route(
            &g,
            (150.0, 110.0),
            (355.0, 305.0),
            "m",
            "c",
            &[m, c],
            &[],
            &no_member,
            &Occupancy::default(),
        );

        assert!(r.failed, "an off-grid port cannot be routed on the lattice");
        assert_eq!(r.points.len(), 4, "best-effort Z fallback is four points");
        assert!(all_ortho(&r.points), "fallback is still orthogonal");
    }

    // --- T5: occupancy / lanes (§5.4) ---

    /// A straight-down manager→child corridor, for occupancy tests (centres share x = 350).
    fn straight_corridor_grid() -> (CorridorGrid, EdgeRect, EdgeRect) {
        let m = ebox("m", 300.0, 50.0, 100.0, 60.0);
        let c = ebox("c", 300.0, 600.0, 100.0, 60.0);
        let g = build_corridor_grid(700.0, 720.0, &[m.clone(), c.clone()], &[], &[]);
        (g, m, c)
    }

    /// Two grid-aligned points spanning the MIDDLE of the x = 350 corridor (so the port stubs stay
    /// free) — an occupant a later line must route a lane away from.
    fn midline_occupant(g: &CorridorGrid) -> Vec<StaffRoutePoint> {
        let mids: Vec<f32> =
            g.ys.iter()
                .copied()
                .filter(|&y| y > 250.0 && y < 450.0)
                .collect();
        assert!(mids.len() >= 2, "need a middle span on the lattice");
        vec![pt(350.0, mids[0]), pt(350.0, *mids.last().unwrap())]
    }

    #[test]
    fn occupancy_pushes_a_foreign_line_onto_its_own_lane() {
        let (g, m, c) = straight_corridor_grid();
        let cards = [m, c];
        // Baseline: with an empty occupancy the route is the straight corridor.
        let r0 = astar_route(
            &g,
            (350.0, 110.0),
            (350.0, 600.0),
            "m",
            "c",
            &cards,
            &[],
            &no_member,
            &Occupancy::default(),
        );
        assert!(
            r0.points.iter().all(|p| (p.x - 350.0).abs() < 1.0),
            "baseline is straight: {:?}",
            r0.points
        );

        // A FOREIGN occupant on the middle of that corridor must push the route to a separate lane.
        let ghost_pts = midline_occupant(&g);
        let mut occ = Occupancy::default();
        occupy(&mut occ, &g, &ghost_pts, "ghost");
        let r1 = astar_route(
            &g,
            (350.0, 110.0),
            (350.0, 600.0),
            "m",
            "c",
            &cards,
            &[],
            &no_member,
            &occ,
        );

        let ghost = route("ghost", "gz", ghost_pts.clone());
        let routed1 = route("m", "c", r1.points.clone());
        assert_eq!(
            route_stats(&[ghost.clone(), routed1], &[], &[], &no_member).overlaps,
            0,
            "a foreign occupant must not be overlapped: {:?}",
            r1.points
        );
        // Control: the straight baseline really would have overlapped that occupant.
        let routed0 = route("m", "c", r0.points.clone());
        assert!(
            route_stats(&[ghost, routed0], &[], &[], &no_member).overlaps >= 1,
            "baseline shares the occupant's lane"
        );
    }

    #[test]
    fn releasing_occupancy_restores_the_straight_route() {
        let (g, m, c) = straight_corridor_grid();
        let cards = [m, c];
        let ghost_pts = midline_occupant(&g);
        let mut occ = Occupancy::default();

        occupy(&mut occ, &g, &ghost_pts, "ghost");
        let diverted = astar_route(
            &g,
            (350.0, 110.0),
            (350.0, 600.0),
            "m",
            "c",
            &cards,
            &[],
            &no_member,
            &occ,
        );
        // The divert is one lane (§5.4 step = 8px), so it shifts well clear of the eps but not far.
        assert!(
            diverted.points.iter().any(|p| (p.x - 350.0).abs() >= 4.0),
            "occupied: diverted"
        );

        release(&mut occ, &g, &ghost_pts, "ghost");
        let restored = astar_route(
            &g,
            (350.0, 110.0),
            (350.0, 600.0),
            "m",
            "c",
            &cards,
            &[],
            &no_member,
            &occ,
        );
        assert!(
            restored.points.iter().all(|p| (p.x - 350.0).abs() < 1.0),
            "after release the corridor is free again: {:?}",
            restored.points
        );
    }

    #[test]
    fn route_edges_single_pass_separates_two_managers() {
        // Two managers of different departments whose lines share one horizontal corridor (y≈592,
        // the lane just above the child row): m1→c1 runs left→right, m2→c2 right→left across it.
        let m1 = ebox("m1", 100.0, 50.0, 100.0, 60.0);
        let c1 = ebox("c1", 300.0, 600.0, 100.0, 60.0);
        let m2 = ebox("m2", 600.0, 50.0, 100.0, 60.0);
        let c2 = ebox("c2", 50.0, 600.0, 100.0, 60.0);
        let cards = [m1, c1, m2, c2];
        let member = |id: &str| match id {
            "m1" => Some(("d1".to_string(), None)),
            "c1" => Some(("d3".to_string(), None)),
            "m2" => Some(("d2".to_string(), None)),
            "c2" => Some(("d4".to_string(), None)),
            _ => None,
        };
        let g = build_corridor_grid(800.0, 720.0, &cards, &[], &[]);
        let edges = vec![
            EdgeSpec {
                from_id: "m1".to_string(),
                to_id: "c1".to_string(),
                start: (150.0, 110.0),
                target: (350.0, 600.0),
                secondary: false,
            },
            EdgeSpec {
                from_id: "m2".to_string(),
                to_id: "c2".to_string(),
                start: (650.0, 110.0),
                target: (100.0, 600.0),
                secondary: false,
            },
        ];

        let routes = route_edges(&g, &edges, &cards, &[], &member);
        assert_eq!(routes.len(), 2, "one route per edge, in input order");
        let combined = [
            route("m1", "c1", routes[0].points.clone()),
            route("m2", "c2", routes[1].points.clone()),
        ];
        assert_eq!(
            route_stats(&combined, &[], &[], &member).overlaps,
            0,
            "single-pass occupancy keeps the two managers on separate lanes (S4)"
        );

        // Determinism (AC8): the driver gives the identical result on a second run.
        let again = route_edges(&g, &edges, &cards, &[], &member);
        let flat = |rs: &[AStarRoute]| {
            rs.iter()
                .flat_map(|r| r.points.iter().map(|p| (p.x, p.y)).collect::<Vec<_>>())
                .collect::<Vec<_>>()
        };
        assert_eq!(flat(&routes), flat(&again), "route_edges is deterministic");

        // Control: routed INDEPENDENTLY (no shared occupancy) the two lines share the corridor.
        let i1 = astar_route(
            &g,
            (150.0, 110.0),
            (350.0, 600.0),
            "m1",
            "c1",
            &cards,
            &[],
            &member,
            &Occupancy::default(),
        );
        let i2 = astar_route(
            &g,
            (650.0, 110.0),
            (100.0, 600.0),
            "m2",
            "c2",
            &cards,
            &[],
            &member,
            &Occupancy::default(),
        );
        let indep = [route("m1", "c1", i1.points), route("m2", "c2", i2.points)];
        assert!(
            route_stats(&indep, &[], &[], &member).overlaps >= 1,
            "without shared occupancy the two overlap on the corridor"
        );
    }

    #[test]
    fn route_edges_occupies_a_best_effort_edge_without_panicking() {
        // A failing edge (off-grid target) returns a best-effort line whose mid-Y point is NOT on the
        // lattice. The driver occupies every edge, including this one — it must skip the off-grid
        // segments, never index past the grid (critic B1, exercised through the real driver path).
        let m = ebox("m", 100.0, 50.0, 100.0, 60.0);
        let c = ebox("c", 300.0, 300.0, 100.0, 60.0);
        let cards = [m, c];
        let g = build_corridor_grid(600.0, 500.0, &cards, &[], &[]);
        let edges = vec![EdgeSpec {
            from_id: "m".to_string(),
            to_id: "c".to_string(),
            start: (150.0, 110.0),
            target: (355.0, 305.0), // off-grid → best-effort
            secondary: false,
        }];
        let routes = route_edges(&g, &edges, &cards, &[], &no_member);
        assert_eq!(routes.len(), 1);
        assert!(
            routes[0].failed,
            "the off-grid edge degrades to best-effort"
        );
    }

    // --- T6: rip-up + bad-edge detector ---

    fn spec(from: &str, to: &str, start: (f32, f32), target: (f32, f32)) -> EdgeSpec {
        EdgeSpec {
            from_id: from.to_string(),
            to_id: to.to_string(),
            start,
            target,
            secondary: false,
        }
    }

    /// Three managers whose descents weave to crossed children — single-pass leaves one crossing
    /// (the last-routed line has to cross an earlier one); rip-up re-routes and clears it.
    fn weave_scene() -> (CorridorGrid, [EdgeRect; 6], Vec<EdgeSpec>) {
        let cards = [
            ebox("m1", 0.0, 0.0, 100.0, 60.0),
            ebox("m2", 200.0, 0.0, 100.0, 60.0),
            ebox("m3", 400.0, 0.0, 100.0, 60.0),
            ebox("c1", 400.0, 400.0, 100.0, 60.0),
            ebox("c2", 0.0, 400.0, 100.0, 60.0),
            ebox("c3", 200.0, 400.0, 100.0, 60.0),
        ];
        let g = build_corridor_grid(600.0, 520.0, &cards, &[], &[]);
        let specs = vec![
            spec("m1", "c1", (50.0, 60.0), (450.0, 400.0)),
            spec("m2", "c2", (250.0, 60.0), (50.0, 400.0)),
            spec("m3", "c3", (450.0, 60.0), (250.0, 400.0)),
        ];
        (g, cards, specs)
    }

    fn stats_of(specs: &[EdgeSpec], routes: &[AStarRoute]) -> RouteStats {
        let srs: Vec<StaffEdgeRoute> = specs
            .iter()
            .zip(routes)
            .map(|(s, r)| route(&s.from_id, &s.to_id, r.points.clone()))
            .collect();
        route_stats(&srs, &[], &[], &no_member)
    }

    #[test]
    fn ripup_clears_a_crossing_that_single_pass_leaves() {
        let (g, cards, specs) = weave_scene();
        // Control: a single pass leaves a crossing (last line crosses an earlier one).
        let single = route_edges(&g, &specs, &cards, &[], &no_member);
        assert!(
            stats_of(&specs, &single).crossings >= 1,
            "the weave must cross on a single pass"
        );
        // Rip-up re-routes the involved edges and drives the crossing to zero.
        let fixed = route_edges_ripup(&g, &specs, &cards, &[], &no_member);
        assert_eq!(
            stats_of(&specs, &fixed).crossings,
            0,
            "rip-up clears the crossing"
        );
        assert!(!fixed.iter().any(|r| r.failed));
    }

    #[test]
    fn ripup_is_deterministic_and_a_noop_when_already_clean() {
        // A clean scene with TWO non-crossing edges (so `bad` is genuinely evaluated over a pair, not
        // trivially empty): rip-up changes nothing and is reproducible.
        let cards = [
            ebox("m1", 100.0, 50.0, 100.0, 60.0),
            ebox("c1", 100.0, 400.0, 100.0, 60.0),
            ebox("m2", 500.0, 50.0, 100.0, 60.0),
            ebox("c2", 500.0, 400.0, 100.0, 60.0),
        ];
        let g = build_corridor_grid(800.0, 520.0, &cards, &[], &[]);
        let specs = vec![
            spec("m1", "c1", (150.0, 110.0), (150.0, 400.0)),
            spec("m2", "c2", (550.0, 110.0), (550.0, 400.0)),
        ];
        let flat = |rs: &[AStarRoute]| {
            rs.iter()
                .flat_map(|r| r.points.iter().map(|p| (p.x, p.y)).collect::<Vec<_>>())
                .collect::<Vec<_>>()
        };
        let single = route_edges(&g, &specs, &cards, &[], &no_member);
        let a = route_edges_ripup(&g, &specs, &cards, &[], &no_member);
        let b = route_edges_ripup(&g, &specs, &cards, &[], &no_member);
        assert_eq!(flat(&a), flat(&single), "no-op on an already-clean scene");
        assert_eq!(flat(&a), flat(&b), "rip-up is deterministic (AC8)");
    }

    #[test]
    fn route_stats_detailed_flags_both_edges_of_a_crossing() {
        // A vertical and a horizontal line of different managers cross mid-segment → both are bad.
        let routes = [
            route("m1", "a", vec![pt(100.0, 0.0), pt(100.0, 200.0)]),
            route("m2", "b", vec![pt(0.0, 100.0), pt(200.0, 100.0)]),
        ];
        let (s, bad) = route_stats_detailed(&routes, &[], &[], &no_member);
        assert_eq!(s.crossings, 1);
        assert_eq!(bad, vec![0, 1], "both crossing edges are flagged, sorted");
    }

    #[test]
    fn ripup_bends_a_dirty_internal_elbow() {
        // A dense department: m, a, b all internal (dept A). `b` sits deep, so the straight internal
        // elbow for m→b runs its bus at y≈225 and cuts sibling `a`'s card — a collision the plain
        // elbow cannot avoid and the canon fixtures never exercise. The hybrid must detect the dirty
        // int elbow and BEND it through A* (route_scene rip-up no longer holds internals fixed).
        let m = ebox("m", 0.0, 0.0, 100.0, 50.0);
        let a = ebox("a", 150.0, 200.0, 100.0, 50.0);
        let b = ebox("b", 400.0, 400.0, 100.0, 50.0);
        let cards = [m, a, b];
        let member = |id: &str| match id {
            "m" | "a" | "b" => Some(("A".to_string(), None)),
            _ => None,
        };
        // Control: the plain internal elbow for m→b really does cut sibling `a` (not a vacuous test).
        let elbow = route_ortho(&cards[0], &cards[2]);
        let (ax, ay, aw, ah) = obstacle_rect(&cards[1]);
        assert!(
            polyline_hits_box_interior(&elbow, ax, ay, aw, ah, INTERIOR_EPS),
            "the plain elbow must collide, else the test proves nothing"
        );
        // Hybrid: the dirty int elbow bends via A* → the scene reads clean.
        let specs = vec![
            spec("m", "a", (50.0, 50.0), (200.0, 200.0)),
            spec("m", "b", (50.0, 50.0), (450.0, 400.0)),
        ];
        let routes = route_scene(600.0, 500.0, &cards, &[], &specs, &member);
        let srs: Vec<StaffEdgeRoute> = specs
            .iter()
            .zip(&routes)
            .map(|(s, r)| route(&s.from_id, &s.to_id, r.points.clone()))
            .collect();
        assert_eq!(
            route_stats(&srs, &cards, &[], &member),
            RouteStats::default(),
            "hybrid bends the colliding internal elbow: {:?}",
            routes[1].points
        );
    }
}
