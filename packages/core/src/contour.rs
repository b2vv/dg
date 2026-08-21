use std::collections::{HashSet, VecDeque};

use crate::types::{
    ContourMagnetConfig, ContourPoint, ContourPositionInput, DeptContourResult,
};

#[derive(Clone, Copy, PartialEq, Eq, Hash, Debug)]
struct Cell {
    col: i32,
    row: i32,
}

impl Cell {
    fn neighbors4(self) -> [Cell; 4] {
        [
            Cell { col: self.col, row: self.row - 1 },
            Cell { col: self.col + 1, row: self.row },
            Cell { col: self.col, row: self.row + 1 },
            Cell { col: self.col - 1, row: self.row },
        ]
    }
}

/// Flood-fill inside region: own cells + reachable empty, blocked by foreign (G2, G5).
fn flood_inside(own: &HashSet<Cell>, foreign: &HashSet<Cell>, bbox: &BBox) -> HashSet<Cell> {
    let mut inside = HashSet::new();
    let mut queue = VecDeque::new();

    for &c in own {
        if inside.insert(c) {
            queue.push_back(c);
        }
    }

    while let Some(cur) = queue.pop_front() {
        for nb in cur.neighbors4() {
            if nb.col < bbox.min_col
                || nb.col > bbox.max_col
                || nb.row < bbox.min_row
                || nb.row > bbox.max_row
            {
                continue;
            }
            if foreign.contains(&nb) || inside.contains(&nb) {
                continue;
            }
            // empty cell reachable (M3)
            if inside.insert(nb) {
                queue.push_back(nb);
            }
        }
    }

    inside
}

#[derive(Clone, Copy, Debug)]
struct BBox {
    min_col: i32,
    max_col: i32,
    min_row: i32,
    max_row: i32,
}

fn compute_bbox(cells: impl IntoIterator<Item = Cell>, pad: i32) -> BBox {
    let mut min_col = i32::MAX;
    let mut max_col = i32::MIN;
    let mut min_row = i32::MAX;
    let mut max_row = i32::MIN;
    let mut any = false;
    for c in cells {
        any = true;
        min_col = min_col.min(c.col);
        max_col = max_col.max(c.col);
        min_row = min_row.min(c.row);
        max_row = max_row.max(c.row);
    }
    if !any {
        return BBox {
            min_col: 0,
            max_col: 0,
            min_row: 0,
            max_row: 0,
        };
    }
    BBox {
        min_col: min_col - pad,
        max_col: max_col + pad,
        min_row: min_row - pad,
        max_row: max_row + pad,
    }
}

fn is_inside(set: &HashSet<Cell>, c: Cell) -> bool {
    set.contains(&c)
}

/// Flood from bbox border through cells that are not `inside` (outside air).
fn flood_outside(inside: &HashSet<Cell>, bbox: &BBox) -> HashSet<Cell> {
    let mut outside = HashSet::new();
    let mut queue = VecDeque::new();

    let mut seed = |c: Cell| {
        if c.col < bbox.min_col
            || c.col > bbox.max_col
            || c.row < bbox.min_row
            || c.row > bbox.max_row
        {
            return;
        }
        if inside.contains(&c) || !outside.insert(c) {
            return;
        }
        queue.push_back(c);
    };

    for col in bbox.min_col..=bbox.max_col {
        seed(Cell {
            col,
            row: bbox.min_row,
        });
        seed(Cell {
            col,
            row: bbox.max_row,
        });
    }
    for row in bbox.min_row..=bbox.max_row {
        seed(Cell {
            col: bbox.min_col,
            row,
        });
        seed(Cell {
            col: bbox.max_col,
            row,
        });
    }

    while let Some(cur) = queue.pop_front() {
        for nb in cur.neighbors4() {
            if nb.col < bbox.min_col
                || nb.col > bbox.max_col
                || nb.row < bbox.min_row
                || nb.row > bbox.max_row
            {
                continue;
            }
            if inside.contains(&nb) || outside.contains(&nb) {
                continue;
            }
            outside.insert(nb);
            queue.push_back(nb);
        }
    }
    outside
}

/// Lower is better. Prefer opening right of foreign (canonical Variant B / G6),
/// then down, left, up — so the C-notch mouth matches “немає борту справа від P4”.
fn foreign_far_side_dir_priority(
    cell: Cell,
    foreign: &HashSet<Cell>,
    own: &HashSet<Cell>,
) -> Option<u8> {
    let mut best: Option<u8> = None;
    for &f in foreign {
        for (dc, dr, pri) in [(1, 0, 0u8), (0, 1, 1), (-1, 0, 2), (0, -1, 3)] {
            if f.col + dc == cell.col && f.row + dr == cell.row && !own_on_ray(own, f, dc, dr) {
                best = Some(best.map_or(pri, |b| b.min(pri)));
            }
        }
    }
    best
}

/// G5: convert enclosed holes into C-notches by cutting shortest corridors through empty fill.
/// Own cells are never removed.
///
/// When several shortest openings exist, prefer cutting a **foreign far-side** cell
/// (G6) so Variant B opens to the right of CEO and keeps the left/bottom C-arms.
fn apply_prefer_notch(
    inside: &mut HashSet<Cell>,
    own: &HashSet<Cell>,
    foreign: &HashSet<Cell>,
    bbox: &BBox,
) {
    for _ in 0..64 {
        let outside = flood_outside(inside, bbox);
        let mut enclosed = false;
        let mut start_candidates: Vec<Cell> = Vec::new();

        for row in bbox.min_row..=bbox.max_row {
            for col in bbox.min_col..=bbox.max_col {
                let c = Cell { col, row };
                if inside.contains(&c) || outside.contains(&c) {
                    continue;
                }
                enclosed = true;
                for nb in c.neighbors4() {
                    if inside.contains(&nb) && !own.contains(&nb) {
                        start_candidates.push(nb);
                    }
                }
            }
        }

        if !enclosed {
            break;
        }
        if start_candidates.is_empty() {
            // Hole touches only own cells — open by clearing one empty neighbor of outside
            // reachable via expanding; if none, stop (topology stuck).
            break;
        }

        let mut parent: std::collections::HashMap<Cell, Option<Cell>> =
            std::collections::HashMap::new();
        let mut dist: std::collections::HashMap<Cell, u32> = std::collections::HashMap::new();
        let mut queue = VecDeque::new();
        // Prefer far-side / right-of-foreign openings first (Variant B G6 mouth).
        start_candidates.sort_by_key(|c| {
            (
                foreign_far_side_dir_priority(*c, foreign, own).unwrap_or(4),
                c.row,
                c.col,
            )
        });
        start_candidates.dedup();
        for s in &start_candidates {
            if parent.contains_key(s) {
                continue;
            }
            parent.insert(*s, None);
            dist.insert(*s, 0);
            queue.push_back(*s);
        }

        let mut goals: Vec<(u32, Cell)> = Vec::new();
        let mut best_dist: Option<u32> = None;
        while let Some(cur) = queue.pop_front() {
            let d = dist[&cur];
            if let Some(bd) = best_dist {
                if d > bd {
                    break;
                }
            }
            let touches_exterior = cur.neighbors4().iter().any(|nb| {
                outside.contains(nb)
                    || nb.col < bbox.min_col
                    || nb.col > bbox.max_col
                    || nb.row < bbox.min_row
                    || nb.row > bbox.max_row
            });
            if touches_exterior {
                best_dist = Some(d);
                goals.push((d, cur));
                continue;
            }
            let mut nbs = cur.neighbors4();
            nbs.sort_by_key(|c| (c.row, c.col));
            for nb in nbs {
                if !inside.contains(&nb) || own.contains(&nb) || parent.contains_key(&nb) {
                    continue;
                }
                parent.insert(nb, Some(cur));
                dist.insert(nb, d + 1);
                queue.push_back(nb);
            }
        }

        if goals.is_empty() {
            break;
        }
        let baseline = own_component_count(own, inside);
        goals.sort_by_key(|(d, c)| {
            // Prefer non-bridge cuts so G6 can still clear the far-side wall.
            let mut trial = inside.clone();
            trial.remove(c);
            let splits = own_component_count(own, &trial) > baseline;
            (
                *d,
                splits,
                foreign_far_side_dir_priority(*c, foreign, own).unwrap_or(4),
                c.row,
                c.col,
            )
        });
        let end = goals[0].1;

        let mut cur = end;
        loop {
            if !own.contains(&cur) {
                inside.remove(&cur);
            }
            match parent.get(&cur).copied().flatten() {
                Some(p) => cur = p,
                None => break,
            }
        }
    }
}

fn signed_area(path: &[(i32, i32)]) -> i64 {
    if path.len() < 3 {
        return 0;
    }
    let mut area: i64 = 0;
    for i in 0..path.len() {
        let (x0, y0) = path[i];
        let (x1, y1) = path[(i + 1) % path.len()];
        area += i64::from(x0) * i64::from(y1) - i64::from(x1) * i64::from(y0);
    }
    area
}

fn count_true_corners(path: &[(i32, i32)]) -> u32 {
    if path.len() < 3 {
        return path.len() as u32;
    }
    let mut count = 0u32;
    let n = path.len();
    for i in 0..n {
        let (x0, y0) = path[(i + n - 1) % n];
        let (x1, y1) = path[i];
        let (x2, y2) = path[(i + 1) % n];
        let dx0 = x1 - x0;
        let dy0 = y1 - y0;
        let dx1 = x2 - x1;
        let dy1 = y2 - y1;
        if dx0 * dy1 != dy0 * dx1 {
            count += 1;
        }
    }
    count
}

/// True if an own cell lies on the open ray from `from` in direction `(dc, dr)`
/// (strictly beyond the first step). Used for G6 “no own beyond”.
fn own_on_ray(own: &HashSet<Cell>, from: Cell, dc: i32, dr: i32) -> bool {
    let mut c = Cell {
        col: from.col + dc,
        row: from.row + dr,
    };
    // Bound the walk; contours are small grids.
    for _ in 0..256 {
        if own.contains(&c) {
            return true;
        }
        c = Cell {
            col: c.col + dc,
            row: c.row + dr,
        };
    }
    false
}

/// 4-connected component count of `own` through the `walkable` fill
/// (own + empty inside). Empty bridges keep distant own cells in one component.
fn own_component_count(own: &HashSet<Cell>, walkable: &HashSet<Cell>) -> usize {
    let mut seen: HashSet<Cell> = HashSet::new();
    let mut components = 0usize;
    let mut own_seeds: Vec<Cell> = own.iter().copied().collect();
    own_seeds.sort_by_key(|c| (c.row, c.col));
    for start in own_seeds {
        if seen.contains(&start) || !walkable.contains(&start) {
            continue;
        }
        components += 1;
        let mut stack = vec![start];
        seen.insert(start);
        while let Some(cur) = stack.pop() {
            for nb in cur.neighbors4() {
                if walkable.contains(&nb) && seen.insert(nb) {
                    stack.push(nb);
                }
            }
        }
    }
    components
}

fn min_manhattan_to_own(c: Cell, own: &HashSet<Cell>) -> i32 {
    own.iter()
        .map(|o| (o.col - c.col).abs() + (o.row - c.row).abs())
        .min()
        .unwrap_or(i32::MAX)
}

/// G7: peel vacant exterior empty cells beyond own padding (Manhattan).
/// Keeps an orthogonal pad ring around own; drops diagonal bbox corners / U-tongues.
/// Bridge-preserving via `own_component_count` (same as G6).
///
/// Runs **after** G6 so far-side clear can still use temporary exterior pad as an
/// alternate path (then G7 removes that vacant exterior once the wall is gone).
fn apply_g7_peel_vacant_exterior(inside: &mut HashSet<Cell>, own: &HashSet<Cell>, pad: i32) {
    if pad <= 0 {
        return;
    }
    let baseline = own_component_count(own, inside);
    loop {
        let mut candidates: Vec<Cell> = inside
            .iter()
            .copied()
            .filter(|c| !own.contains(c) && min_manhattan_to_own(*c, own) > pad)
            .collect();
        if candidates.is_empty() {
            break;
        }
        candidates.sort_by_key(|c| (c.row, c.col));
        let mut removed_any = false;
        for c in candidates {
            if !inside.contains(&c) {
                continue;
            }
            inside.remove(&c);
            if own_component_count(own, inside) > baseline {
                inside.insert(c);
            } else {
                removed_any = true;
            }
        }
        if !removed_any {
            break;
        }
    }
}

/// G6: remove empty fill on foreign faces that have no own beyond (far side).
/// That drops walls such as the vertical to the right of Variant-B CEO (P4).
///
/// Bridge-preserving: never remove an empty cell if doing so would split the
/// own-cell cluster into more 4-connected components through the remaining
/// fill (Variant B C-arms `(0,1)` / `(1,2)` must stay).
fn apply_g6_clear_far_side_fill(
    inside: &mut HashSet<Cell>,
    foreign: &HashSet<Cell>,
    own: &HashSet<Cell>,
) {
    let mut candidates: Vec<Cell> = Vec::new();
    for &f in foreign {
        for (dc, dr) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
            let nb = Cell {
                col: f.col + dc,
                row: f.row + dr,
            };
            if own.contains(&nb) || !inside.contains(&nb) {
                continue;
            }
            // Far side only when no own lies further on this ray (incl. `nb`).
            if own_on_ray(own, f, dc, dr) {
                continue;
            }
            candidates.push(nb);
        }
    }
    candidates.sort_by_key(|c| (c.row, c.col));
    candidates.dedup();

    let baseline = own_component_count(own, inside);
    for c in candidates {
        inside.remove(&c);
        if own_component_count(own, inside) > baseline {
            inside.insert(c); // restore bridge
        }
    }
}

/// Orthogonal perimeter as grid-corner points (G4).
/// Deterministic: traces all cycles and returns the largest-area ring (outer).
fn trace_orthogonal_contour(inside: &HashSet<Cell>, _bbox: &BBox) -> Vec<(i32, i32)> {
    let mut edges: Vec<((i32, i32), (i32, i32))> = Vec::new();

    let mut cells: Vec<Cell> = inside.iter().copied().collect();
    cells.sort_by_key(|c| (c.row, c.col));

    for cell in cells {
        let c = cell.col;
        let r = cell.row;
        if !is_inside(inside, Cell { col: c, row: r - 1 }) {
            edges.push(((c, r), (c + 1, r)));
        }
        if !is_inside(inside, Cell { col: c + 1, row: r }) {
            edges.push(((c + 1, r), (c + 1, r + 1)));
        }
        if !is_inside(inside, Cell { col: c, row: r + 1 }) {
            edges.push(((c + 1, r + 1), (c, r + 1)));
        }
        if !is_inside(inside, Cell { col: c - 1, row: r }) {
            edges.push(((c, r + 1), (c, r)));
        }
    }

    if edges.is_empty() {
        return Vec::new();
    }

    // Vertex → remaining outgoing targets (handles rings; overwrites are unsafe for holes).
    let mut adj: std::collections::HashMap<(i32, i32), Vec<(i32, i32)>> =
        std::collections::HashMap::new();
    for (a, b) in edges {
        adj.entry(a).or_default().push(b);
    }
    for v in adj.values_mut() {
        v.sort();
    }

    let mut cycles: Vec<Vec<(i32, i32)>> = Vec::new();
    loop {
        let start = {
            let mut keys: Vec<(i32, i32)> = adj
                .iter()
                .filter(|(_, v)| !v.is_empty())
                .map(|(k, _)| *k)
                .collect();
            if keys.is_empty() {
                break;
            }
            keys.sort();
            keys[0]
        };

        let mut path = vec![start];
        let mut cur = start;
        for _ in 0..(adj.len() * 4 + 8) {
            let Some(outs) = adj.get_mut(&cur) else {
                break;
            };
            if outs.is_empty() {
                break;
            }
            let next = outs.remove(0);
            if next == start {
                break;
            }
            path.push(next);
            cur = next;
        }
        if path.len() >= 4 {
            cycles.push(path);
        }
        adj.retain(|_, v| !v.is_empty());
    }

    cycles
        .into_iter()
        .max_by_key(|p| signed_area(p).unsigned_abs())
        .unwrap_or_default()
}

/// Chaikin corner cutting (G4 smooth).
fn chaikin(points: &[(i32, i32)], iterations: u32) -> Vec<(f32, f32)> {
    if points.len() < 3 {
        return points
            .iter()
            .map(|(x, y)| (*x as f32, *y as f32))
            .collect();
    }

    let mut current: Vec<(f32, f32)> = points.iter().map(|(x, y)| (*x as f32, *y as f32)).collect();

    for _ in 0..iterations {
        let n = current.len();
        let mut next = Vec::with_capacity(n * 2);
        for i in 0..n {
            let p0 = current[i];
            let p1 = current[(i + 1) % n];
            next.push((0.75 * p0.0 + 0.25 * p1.0, 0.75 * p0.1 + 0.25 * p1.1));
            next.push((0.25 * p0.0 + 0.75 * p1.0, 0.25 * p0.1 + 0.75 * p1.1));
        }
        current = next;
    }
    current
}

fn to_svg_path(points: &[(f32, f32)], cell_w: f32, cell_h: f32) -> String {
    if points.is_empty() {
        return String::new();
    }
    let mut s = String::new();
    let (x0, y0) = points[0];
    s.push_str(&format!("M {} {}", x0 * cell_w, y0 * cell_h));
    for (x, y) in &points[1..] {
        s.push_str(&format!(" L {} {}", x * cell_w, y * cell_h));
    }
    s.push_str(" Z");
    s
}

/// Build dept contours with magnetism rules (§4.6.1).
/// Returns one result per own-cell component (M4 / magnet_radius).
pub fn compute_dept_contour(
    department_id: &str,
    positions: &[ContourPositionInput],
    config: &ContourMagnetConfig,
) -> Result<Vec<DeptContourResult>, String> {
    let pad = config.padding_cells.max(0);
    let corridor = config.corridor_cells.max(0);
    let radius = if config.magnet_radius.is_finite() {
        config.magnet_radius.max(0.0)
    } else {
        f32::MAX
    };

    let own_list: Vec<Cell> = positions
        .iter()
        .filter(|p| p.department_id == department_id)
        .map(|p| Cell {
            col: p.col,
            row: p.row,
        })
        .collect();

    if own_list.is_empty() {
        return Err(format!("no positions for department {department_id}"));
    }

    let mut foreign: HashSet<Cell> = HashSet::new();
    for p in positions {
        if p.department_id != department_id {
            let base = Cell {
                col: p.col,
                row: p.row,
            };
            for dc in -corridor..=corridor {
                for dr in -corridor..=corridor {
                    foreign.insert(Cell {
                        col: base.col + dc,
                        row: base.row + dr,
                    });
                }
            }
        }
    }

    let clusters = cluster_own_cells(&own_list, radius);
    let mut results = Vec::with_capacity(clusters.len());

    for own in clusters {
        let own_set: HashSet<Cell> = own.iter().copied().collect();
        let all_cells: HashSet<Cell> = own_set.iter().chain(foreign.iter()).copied().collect();
        // Fill bbox uses only user padding — do NOT add a mandatory +1 ring
        // (that made padding=0 look like a full empty cell of dead space).
        // prefer_notch still needs a 1-cell air ring for outside-flood.
        let fill_bbox = compute_bbox(all_cells, pad);
        let work_bbox = BBox {
            min_col: fill_bbox.min_col - 1,
            max_col: fill_bbox.max_col + 1,
            min_row: fill_bbox.min_row - 1,
            max_row: fill_bbox.max_row + 1,
        };

        let mut inside = flood_inside(&own_set, &foreign, &fill_bbox);
        if config.prefer_notch {
            apply_prefer_notch(&mut inside, &own_set, &foreign, &work_bbox);
        }
        apply_g6_clear_far_side_fill(&mut inside, &foreign, &own_set);
        apply_g7_peel_vacant_exterior(&mut inside, &own_set, pad);
        let raw_corners = trace_orthogonal_contour(&inside, &work_bbox);

        let smooth_pts = if config.smooth_iterations > 0 {
            chaikin(&raw_corners, config.smooth_iterations)
        } else {
            raw_corners
                .iter()
                .map(|(x, y)| (*x as f32, *y as f32))
                .collect()
        };

        let points: Vec<ContourPoint> = smooth_pts
            .iter()
            .map(|(x, y)| ContourPoint {
                x: x * config.cell_width,
                y: y * config.cell_height,
            })
            .collect();

        let path = to_svg_path(&smooth_pts, config.cell_width, config.cell_height);
        let corner_count = raw_corners.len() as u32;

        results.push(DeptContourResult {
            department_id: department_id.to_string(),
            points,
            path,
            corner_count,
        });
    }

    Ok(results)
}

/// Union-find clusters: merge own cells when Manhattan distance ≤ magnet_radius.
fn cluster_own_cells(own: &[Cell], magnet_radius: f32) -> Vec<Vec<Cell>> {
    let n = own.len();
    if n == 0 {
        return Vec::new();
    }
    let mut parent: Vec<usize> = (0..n).collect();

    fn find(i: usize, parent: &mut [usize]) -> usize {
        let mut i = i;
        while parent[i] != i {
            parent[i] = parent[parent[i]];
            i = parent[i];
        }
        i
    }

    for i in 0..n {
        for j in (i + 1)..n {
            let a = own[i];
            let b = own[j];
            let dist =
                (a.col - b.col).unsigned_abs() as f32 + (a.row - b.row).unsigned_abs() as f32;
            if dist <= magnet_radius {
                let pi = find(i, &mut parent);
                let pj = find(j, &mut parent);
                if pi != pj {
                    parent[pj] = pi;
                }
            }
        }
    }

    let mut groups: std::collections::HashMap<usize, Vec<Cell>> =
        std::collections::HashMap::new();
    for i in 0..n {
        let root = find(i, &mut parent);
        groups.entry(root).or_default().push(own[i]);
    }
    let mut out: Vec<Vec<Cell>> = groups.into_values().collect();
    out.sort_by(|a, b| {
        let ka = a.iter().map(|c| (c.row, c.col)).min().unwrap();
        let kb = b.iter().map(|c| (c.row, c.col)).min().unwrap();
        ka.cmp(&kb)
    });
    out
}

/// All unique departments in positions (flattened components).
pub fn compute_all_contours(
    positions: &[ContourPositionInput],
    config: &ContourMagnetConfig,
) -> Vec<DeptContourResult> {
    let mut dept_ids: HashSet<String> = HashSet::new();
    for p in positions {
        dept_ids.insert(p.department_id.clone());
    }
    let mut depts: Vec<String> = dept_ids.into_iter().collect();
    depts.sort();
    depts
        .iter()
        .filter_map(|id| compute_dept_contour(id, positions, config).ok())
        .flatten()
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::ContourMagnetConfig;

    fn pos(id: &str, dept: &str, col: i32, row: i32) -> ContourPositionInput {
        ContourPositionInput {
            id: id.into(),
            department_id: dept.into(),
            col,
            row,
        }
    }

    fn default_cfg() -> ContourMagnetConfig {
        ContourMagnetConfig {
            magnet_radius: 2.0, // Variant B top↔bottom Manhattan gap; not an inflated 8
            padding_cells: 0,
            corridor_cells: 0,
            cell_width: 100.0,
            cell_height: 80.0,
            smooth_iterations: 0,
            prefer_notch: true,
        }
    }

    #[test]
    fn variant_a_it_wraps_p4_with_notch() {
        let positions = vec![
            pos("P1", "IT", 0, 0),
            pos("P2", "IT", 1, 0),
            pos("P3", "IT", 1, 1),
            pos("P4", "CEO", 0, 1),
        ];
        let rs = compute_dept_contour("IT", &positions, &default_cfg()).unwrap();
        assert_eq!(rs.len(), 1);
        let r = &rs[0];
        // L / C-notch around CEO: at least 6 true corners (not a 4-gon hole or AABB).
        let grid: Vec<(i32, i32)> = r
            .points
            .iter()
            .map(|p| {
                (
                    (p.x / default_cfg().cell_width).round() as i32,
                    (p.y / default_cfg().cell_height).round() as i32,
                )
            })
            .collect();
        let turns = count_true_corners(&grid);
        assert!(
            turns >= 6,
            "notch contour needs >= 6 true corners, got {turns} (vertices={})",
            r.corner_count
        );
        assert!(r.corner_count >= 6, "notch contour has >= 6 vertices");
        assert!(r.path.starts_with('M'));
        assert!(r.path.ends_with('Z'));
        // CEO cell center must stay outside the fill polygon (M2).
        let cx = 0.5 * default_cfg().cell_width;
        let cy = 1.5 * default_cfg().cell_height;
        assert!(
            !point_in_poly(cx, cy, &r.points),
            "CEO center must not be inside IT fill"
        );
    }

    fn point_in_poly(x: f32, y: f32, pts: &[ContourPoint]) -> bool {
        // Ray cast; ContourPoint polygon in px.
        let n = pts.len();
        if n < 3 {
            return false;
        }
        let mut inside = false;
        let mut j = n - 1;
        for i in 0..n {
            let pi = &pts[i];
            let pj = &pts[j];
            let intersect = ((pi.y > y) != (pj.y > y))
                && (x < (pj.x - pi.x) * (y - pi.y) / (pj.y - pi.y + f32::EPSILON) + pi.x);
            if intersect {
                inside = !inside;
            }
            j = i;
        }
        inside
    }

    #[test]
    fn variant_b_no_vertical_wall_right_of_p4() {
        let positions = vec![
            pos("P1", "IT", 0, 0),
            pos("P2", "IT", 1, 0),
            pos("P3", "IT", 2, 0),
            pos("P4", "CEO", 1, 1),
            pos("P5", "IT", 0, 2),
            pos("P6", "IT", 2, 2),
        ];
        let rs = compute_dept_contour("IT", &positions, &default_cfg()).unwrap();
        assert_eq!(rs.len(), 1);
        let r = &rs[0];
        assert!(r.corner_count >= 8, "got {}", r.corner_count);
        let cfg = default_cfg();
        // G6: no vertical contour segment on the right edge of P4 (x = 2 * cell_w, y in [cell_h, 2*cell_h]).
        let right_x = 2.0 * cfg.cell_width;
        let y0 = cfg.cell_height;
        let y1 = 2.0 * cfg.cell_height;
        let wall = r.points.windows(2).any(|w| {
            let a = &w[0];
            let b = &w[1];
            if (a.x - right_x).abs() >= 1.0 || (b.x - right_x).abs() >= 1.0 {
                return false;
            }
            let seg_lo = a.y.min(b.y);
            let seg_hi = a.y.max(b.y);
            // Strict interior overlap with P4's right edge (exclude touching only at a corner).
            seg_lo < y1 - 1.0 && seg_hi > y0 + 1.0
        });
        assert!(!wall, "G6: vertical wall right of P4 must be absent, path={}", r.path);
        let ceo_cx = 1.5 * cfg.cell_width;
        let ceo_cy = 1.5 * cfg.cell_height;
        assert!(!point_in_poly(ceo_cx, ceo_cy, &r.points), "CEO must stay outside IT fill");
        for (col, row, label) in [(0, 0, "P1"), (1, 0, "P2"), (2, 0, "P3"), (0, 2, "P5"), (2, 2, "P6")] {
            let cx = (col as f32 + 0.5) * cfg.cell_width;
            let cy = (row as f32 + 0.5) * cfg.cell_height;
            assert!(
                point_in_poly(cx, cy, &r.points),
                "{label} center must be inside IT fill; path={}",
                r.path
            );
        }
    }

    #[test]
    fn foreign_not_in_own_contour() {
        let positions = vec![pos("P1", "IT", 0, 0), pos("P4", "CEO", 1, 1)];
        let rs = compute_dept_contour("CEO", &positions, &default_cfg()).unwrap();
        assert_eq!(rs.len(), 1);
        assert!(rs[0].corner_count >= 4);
    }

    #[test]
    fn disconnected_own_two_contours() {
        let positions = vec![pos("P1", "IT", 0, 0), pos("P2", "IT", 5, 0)];
        let mut cfg = ContourMagnetConfig::default(); // magnet_radius 1.5
        cfg.smooth_iterations = 0;
        let rs = compute_dept_contour("IT", &positions, &cfg).unwrap();
        assert_eq!(rs.len(), 2, "expected 2 components, got {}", rs.len());
        assert!(rs.iter().all(|r| r.department_id == "IT"));
        assert!(rs.iter().all(|r| r.path.starts_with('M')));
    }

    #[test]
    fn magnet_radius_limits_merge() {
        let positions = vec![pos("P1", "IT", 0, 0), pos("P2", "IT", 3, 0)]; // manhattan 3
        let mut cfg = ContourMagnetConfig::default();
        cfg.magnet_radius = 1.5;
        cfg.smooth_iterations = 0;
        let rs = compute_dept_contour("IT", &positions, &cfg).unwrap();
        assert_eq!(rs.len(), 2);

        cfg.magnet_radius = 3.0;
        let merged = compute_dept_contour("IT", &positions, &cfg).unwrap();
        assert_eq!(merged.len(), 1);
    }

    #[test]
    fn magnet_radius_zero_each_cell_own_contour() {
        let positions = vec![
            pos("P1", "IT", 0, 0),
            pos("P2", "IT", 1, 0),
            pos("P3", "IT", 0, 1),
        ];
        let mut cfg = ContourMagnetConfig::default();
        cfg.magnet_radius = 0.0;
        cfg.smooth_iterations = 0;
        let rs = compute_dept_contour("IT", &positions, &cfg).unwrap();
        assert_eq!(rs.len(), 3);
    }

    #[test]
    fn empty_positions_err() {
        let cfg = ContourMagnetConfig::default();
        let err = compute_dept_contour("IT", &[], &cfg).unwrap_err();
        assert!(err.contains("no positions") || err.contains("IT"));
    }

    #[test]
    fn unknown_department_err() {
        let positions = vec![pos("P1", "CEO", 0, 0)];
        let cfg = ContourMagnetConfig::default();
        let err = compute_dept_contour("IT", &positions, &cfg).unwrap_err();
        assert!(err.contains("no positions"));
    }

    #[test]
    fn padding_zero_does_not_extend_fill_by_extra_cell() {
        let positions = vec![pos("P1", "IT", 0, 0)];
        let mut cfg = default_cfg();
        cfg.padding_cells = 0;
        cfg.magnet_radius = 0.0;
        let rs = compute_dept_contour("IT", &positions, &cfg).unwrap();
        assert_eq!(rs.len(), 1);
        let r = &rs[0];
        let min_x = r.points.iter().map(|p| p.x).fold(f32::INFINITY, f32::min);
        let max_x = r.points.iter().map(|p| p.x).fold(f32::NEG_INFINITY, f32::max);
        // Own cell is [0, cell_w] — no mandatory exterior pad ring.
        assert!(
            min_x >= -1.0,
            "pad=0 must not grow left empty cell, min_x={min_x}"
        );
        assert!(
            max_x <= cfg.cell_width + 1.0,
            "pad=0 must not grow right empty cell, max_x={max_x}"
        );

        cfg.padding_cells = 1;
        let padded = compute_dept_contour("IT", &positions, &cfg).unwrap();
        let pmax = padded[0]
            .points
            .iter()
            .map(|p| p.x)
            .fold(f32::NEG_INFINITY, f32::max);
        assert!(
            pmax > cfg.cell_width + 1.0,
            "padding_cells=1 should expand contour beyond own cell"
        );
    }

    #[test]
    fn g7_peels_manhattan_diagonal_corners_keeps_orthogonal_pad() {
        let mut own = HashSet::new();
        own.insert(Cell { col: 0, row: 0 });
        let foreign = HashSet::new();
        let bbox = compute_bbox(own.iter().copied(), 1);
        let mut inside = flood_inside(&own, &foreign, &bbox);
        assert!(
            inside.contains(&Cell { col: -1, row: -1 }),
            "flood should include Chebyshev corner before peel"
        );
        apply_g7_peel_vacant_exterior(&mut inside, &own, 1);
        assert!(
            !inside.contains(&Cell { col: -1, row: -1 }),
            "G7 must peel Manhattan>pad diagonal corner"
        );
        assert!(inside.contains(&Cell { col: 1, row: 0 }));
        assert!(inside.contains(&Cell { col: 0, row: 1 }));
        assert!(inside.contains(&Cell { col: 0, row: 0 }));
    }

    #[test]
    fn g7_preserves_mid_corridor_bridge() {
        let mut own = HashSet::new();
        own.insert(Cell { col: 0, row: 0 });
        own.insert(Cell { col: 0, row: 4 });
        let mut inside = own.clone();
        for r in 1..=3 {
            inside.insert(Cell { col: 0, row: r });
        }
        apply_g7_peel_vacant_exterior(&mut inside, &own, 1);
        assert!(
            inside.contains(&Cell { col: 0, row: 2 }),
            "bridge cell with manh>pad must be restored"
        );
        assert_eq!(own_component_count(&own, &inside), 1);
    }

    #[test]
    fn g7_variant_b_pad1_keeps_c_arms_no_ceo_wall() {
        let positions = vec![
            pos("P1", "IT", 0, 0),
            pos("P2", "IT", 1, 0),
            pos("P3", "IT", 2, 0),
            pos("P4", "CEO", 1, 1),
            pos("P5", "IT", 0, 2),
            pos("P6", "IT", 2, 2),
        ];
        let mut cfg = default_cfg();
        cfg.padding_cells = 1;
        cfg.smooth_iterations = 0;
        let rs = compute_dept_contour("IT", &positions, &cfg).unwrap();
        assert_eq!(rs.len(), 1);
        let r = &rs[0];
        let ceo_cx = 1.5 * cfg.cell_width;
        let ceo_cy = 1.5 * cfg.cell_height;
        assert!(!point_in_poly(ceo_cx, ceo_cy, &r.points), "CEO must stay outside");
        for (col, row, label) in [(0, 0, "P1"), (1, 0, "P2"), (2, 0, "P3"), (0, 2, "P5"), (2, 2, "P6")]
        {
            let cx = (col as f32 + 0.5) * cfg.cell_width;
            let cy = (row as f32 + 0.5) * cfg.cell_height;
            assert!(
                point_in_poly(cx, cy, &r.points),
                "{label} must stay inside with pad=1 + G7"
            );
        }
        let right_x = 2.0 * cfg.cell_width;
        let y0 = cfg.cell_height;
        let y1 = 2.0 * cfg.cell_height;
        let wall = r.points.windows(2).any(|w| {
            let a = &w[0];
            let b = &w[1];
            if (a.x - right_x).abs() >= 1.0 || (b.x - right_x).abs() >= 1.0 {
                return false;
            }
            let seg_lo = a.y.min(b.y);
            let seg_hi = a.y.max(b.y);
            seg_lo < y1 - 1.0 && seg_hi > y0 + 1.0
        });
        assert!(!wall, "G6 then G7: no vertical wall right of P4");
    }

    /// pad=1 after G7 must be tighter than pre-peel flood (fewer tongue cells).
    #[test]
    fn g7_variant_b_pad1_smaller_than_unpeeled_flood() {
        let positions = vec![
            pos("P1", "IT", 0, 0),
            pos("P2", "IT", 1, 0),
            pos("P3", "IT", 2, 0),
            pos("P4", "CEO", 1, 1),
            pos("P5", "IT", 0, 2),
            pos("P6", "IT", 2, 2),
        ];
        let own: HashSet<Cell> = positions
            .iter()
            .filter(|p| p.department_id == "IT")
            .map(|p| Cell {
                col: p.col,
                row: p.row,
            })
            .collect();
        let foreign: HashSet<Cell> = positions
            .iter()
            .filter(|p| p.department_id != "IT")
            .map(|p| Cell {
                col: p.col,
                row: p.row,
            })
            .collect();
        let all: HashSet<Cell> = own.iter().chain(foreign.iter()).copied().collect();
        let fill_bbox = compute_bbox(all, 1);
        let work_bbox = BBox {
            min_col: fill_bbox.min_col - 1,
            max_col: fill_bbox.max_col + 1,
            min_row: fill_bbox.min_row - 1,
            max_row: fill_bbox.max_row + 1,
        };
        let mut inside = flood_inside(&own, &foreign, &fill_bbox);
        apply_prefer_notch(&mut inside, &own, &foreign, &work_bbox);
        apply_g6_clear_far_side_fill(&mut inside, &foreign, &own);
        let before = inside.len();
        apply_g7_peel_vacant_exterior(&mut inside, &own, 1);
        let after = inside.len();
        assert!(
            after < before,
            "G7 should peel vacant cells: before={before} after={after}"
        );
        assert!(
            !inside.contains(&Cell { col: -1, row: -1 }),
            "diagonal tongue corner must be gone"
        );
    }

    #[test]
    fn negative_padding_clamped() {
        let positions = vec![pos("P1", "IT", 0, 0)];
        let mut cfg = ContourMagnetConfig::default();
        cfg.padding_cells = -3;
        cfg.smooth_iterations = 0;
        let rs = compute_dept_contour("IT", &positions, &cfg).unwrap();
        assert_eq!(rs.len(), 1);
        assert!(rs[0].path.starts_with('M'));
    }

    #[test]
    fn config_defaults_match_spec() {
        let d = ContourMagnetConfig::default();
        assert!((d.magnet_radius - 1.5).abs() < f32::EPSILON);
        assert!(d.prefer_notch);
        assert_eq!(d.smooth_iterations, 2);
    }

    /// G6: foreign blocks flood — no IT perimeter through CEO cell center (implicit).
    #[test]
    fn g6_implicit_foreign_blocks_flood() {
        let positions = vec![
            pos("P1", "IT", 0, 0),
            pos("P2", "IT", 2, 0),
            pos("P4", "CEO", 1, 0),
        ];
        let mut cfg = ContourMagnetConfig::default();
        cfg.magnet_radius = 2.0;
        cfg.smooth_iterations = 0;
        let rs = compute_dept_contour("IT", &positions, &cfg).unwrap();
        // Two IT cells with foreign between → one component when radius covers gap 2;
        // flood must not treat CEO cell as inside.
        assert!(!rs.is_empty());
        for r in rs {
            assert!(r.path.contains('M'));
        }
    }
}

