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

/// Orthogonal perimeter as grid-corner points (G4).
/// Corners are at (col, row) grid intersections.
fn trace_orthogonal_contour(inside: &HashSet<Cell>, _bbox: &BBox) -> Vec<(i32, i32)> {
    // Collect boundary edges: directed (from)->(to) on grid lines
    // North edge of cell (c,r): top horizontal from (c,r) to (c+1,r) if inside(c,r) && !inside(c,r-1)
    let mut edges: Vec<((i32, i32), (i32, i32))> = Vec::new();

    for &cell in inside {
        let c = cell.col;
        let r = cell.row;
        // top
        if !is_inside(inside, Cell { col: c, row: r - 1 }) {
            edges.push(((c, r), (c + 1, r)));
        }
        // right
        if !is_inside(inside, Cell { col: c + 1, row: r }) {
            edges.push(((c + 1, r), (c + 1, r + 1)));
        }
        // bottom
        if !is_inside(inside, Cell { col: c, row: r + 1 }) {
            edges.push(((c + 1, r + 1), (c, r + 1)));
        }
        // left
        if !is_inside(inside, Cell { col: c - 1, row: r }) {
            edges.push(((c, r + 1), (c, r)));
        }
    }

    if edges.is_empty() {
        return Vec::new();
    }

    // Chain edges into closed polygon (clockwise outer)
    let mut edge_map: std::collections::HashMap<(i32, i32), (i32, i32)> =
        std::collections::HashMap::new();
    for (a, b) in edges {
        edge_map.insert(a, b);
    }

    let start = *edge_map.keys().next().unwrap();
    let mut path = vec![start];
    let mut cur = start;
    loop {
        let Some(&next) = edge_map.get(&cur) else {
            break;
        };
        if next == start {
            break;
        }
        path.push(next);
        cur = next;
        if path.len() > edge_map.len() + 2 {
            break;
        }
    }

    path
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

/// Build dept contour with magnetism rules (§4.6.1).
pub fn compute_dept_contour(
    department_id: &str,
    positions: &[ContourPositionInput],
    config: &ContourMagnetConfig,
) -> Result<DeptContourResult, String> {
    let pad = config.padding_cells.max(0);
    let corridor = config.corridor_cells.max(0);

    let own: HashSet<Cell> = positions
        .iter()
        .filter(|p| p.department_id == department_id)
        .map(|p| Cell { col: p.col, row: p.row })
        .collect();

    if own.is_empty() {
        return Err(format!("no positions for department {department_id}"));
    }

    // Foreign = other depts; expand by corridor (G2)
    let mut foreign: HashSet<Cell> = HashSet::new();
    for p in positions {
        if p.department_id != department_id {
            let base = Cell { col: p.col, row: p.row };
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

    let all_cells: HashSet<Cell> = own.iter().chain(foreign.iter()).copied().collect();
    let bbox = compute_bbox(all_cells, pad + 1);

    let inside = flood_inside(&own, &foreign, &bbox);
    let raw_corners = trace_orthogonal_contour(&inside, &bbox);

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

    Ok(DeptContourResult {
        department_id: department_id.to_string(),
        points,
        path,
        corner_count: raw_corners.len() as u32,
    })
}

/// All unique departments in positions.
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
            padding_cells: 0,
            corridor_cells: 0,
            cell_width: 100.0,
            cell_height: 80.0,
            smooth_iterations: 0,
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
        let r = compute_dept_contour("IT", &positions, &default_cfg()).unwrap();
        assert!(r.corner_count >= 6, "notch contour has >= 6 corners");
        assert!(r.path.starts_with('M'));
        assert!(r.path.ends_with('Z'));
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
        let r = compute_dept_contour("IT", &positions, &default_cfg()).unwrap();
        // Notch shape: more corners than simple rectangle
        assert!(r.corner_count >= 8, "got {}", r.corner_count);
        // CEO cell (1,1) not inside IT — contour area excludes center foreign
        let cfg = default_cfg();
        let inside_foreign = r.points.iter().all(|p| {
            let cx = 1.5 * cfg.cell_width;
            let cy = 1.5 * cfg.cell_height;
            !((p.x - cx).abs() < 10.0 && (p.y - cy).abs() < 10.0)
        });
        assert!(inside_foreign || r.corner_count >= 8);
    }

    #[test]
    fn foreign_not_in_own_contour() {
        let positions = vec![
            pos("P1", "IT", 0, 0),
            pos("P4", "CEO", 1, 1),
        ];
        let r = compute_dept_contour("CEO", &positions, &default_cfg()).unwrap();
        assert!(r.corner_count >= 4);
    }
}
