//! Tidy tree layout — Reingold–Tilford (1981) з нитками Walker (1989).
//!
//! Index-based реалізація (без raw pointers) — стабільна для будь-якої глибини/ширини.
//!
//! Властивості:
//! - батько по центру над дітьми;
//! - піддерева не перетинаються;
//! - depth → row (y);
//! - O(n) час, O(n) пам'ять.

use crate::types::{HierarchyNode, LayoutEdge, LayoutNode, LayoutOptions, LayoutResult};

struct InternalNode {
    source: usize,
    prelim: f32,
    mod_: f32,
    shift: f32,
    change: f32,
    number: usize,
    parent: Option<usize>,
    children: Vec<usize>,
    thread: Option<usize>,
    ancestor: usize,
    x: f32,
    y: f32,
}

pub fn compute_tidy_tree_layout(root: &HierarchyNode, opts: &LayoutOptions) -> LayoutResult {
    compute_tree_layout_impl(root, opts)
}

/// Alias для сумісності з попереднім API.
pub fn compute_tree_layout(root: &HierarchyNode, opts: &LayoutOptions) -> LayoutResult {
    compute_tidy_tree_layout(root, opts)
}

fn compute_tree_layout_impl(root: &HierarchyNode, opts: &LayoutOptions) -> LayoutResult {
    let mut sources: Vec<&HierarchyNode> = Vec::new();
    let mut nodes: Vec<InternalNode> = Vec::new();
    let root_idx = build_index_tree(root, None, 0, &mut sources, &mut nodes);

    let horizontal = opts.direction == "horizontal";
    first_walk(root_idx, &mut nodes, opts, horizontal);
    second_walk(root_idx, &mut nodes, 0.0, 0.0);

    let horizontal = opts.direction == "horizontal";
    let mut out: Vec<LayoutNode> = Vec::new();
    collect_nodes(root_idx, &nodes, &sources, &mut out, horizontal, opts);

    let (min_x, min_y, max_x, max_y) = bounds(&out);
    let ox = opts.margin - min_x;
    let oy = opts.margin - min_y;
    for n in &mut out {
        n.x += ox;
        n.y += oy;
    }

    let node_map: std::collections::HashMap<String, (f32, f32, f32, f32)> = out
        .iter()
        .map(|n| (n.id.clone(), (n.x, n.y, n.width, n.height)))
        .collect();

    let mut edges = Vec::new();
    for n in &out {
        if let Some(pid) = &n.parent_id {
            if let (Some(p), Some(c)) = (node_map.get(pid), node_map.get(&n.id)) {
                edges.push(LayoutEdge {
                    from_id: pid.clone(),
                    to_id: n.id.clone(),
                    path: edge_path(p, c, horizontal),
                });
            }
        }
    }

    LayoutResult {
        width: max_x - min_x + opts.margin * 2.0,
        height: max_y - min_y + opts.margin * 2.0,
        direction: opts.direction.clone(),
        nodes: out,
        edges,
    }
}

fn build_index_tree<'a>(
    node: &'a HierarchyNode,
    parent: Option<usize>,
    index: usize,
    sources: &mut Vec<&'a HierarchyNode>,
    nodes: &mut Vec<InternalNode>,
) -> usize {
    let source = sources.len();
    sources.push(node);

    let idx = nodes.len();
    nodes.push(InternalNode {
        source,
        prelim: 0.0,
        mod_: 0.0,
        shift: 0.0,
        change: 0.0,
        number: index,
        parent,
        children: Vec::new(),
        thread: None,
        ancestor: idx,
        x: 0.0,
        y: 0.0,
    });

    let child_ids: Vec<usize> = node
        .children
        .iter()
        .enumerate()
        .map(|(i, c)| build_index_tree(c, Some(idx), i, sources, nodes))
        .collect();

    nodes[idx].children = child_ids;
    idx
}

/// Sibling separation in the primary (non-depth) axis.
/// Vertical mode  → siblings spread along X → node_width + h_gap.
/// Horizontal mode → siblings spread along Y → node_height + v_gap.
fn sep(opts: &LayoutOptions, horizontal: bool) -> f32 {
    if horizontal {
        opts.node_height + opts.vertical_gap
    } else {
        opts.node_width + opts.horizontal_gap
    }
}

fn first_walk(root: usize, nodes: &mut [InternalNode], opts: &LayoutOptions, horizontal: bool) {
    if nodes[root].children.is_empty() {
        let prelim = left_sibling(root, nodes)
            .map(|s| nodes[s].prelim + sep(opts, horizontal))
            .unwrap_or(0.0);
        nodes[root].prelim = prelim;
        return;
    }

    let mut default_ancestor = nodes[root].children[0];
    for &child in &nodes[root].children.clone() {
        first_walk(child, nodes, opts, horizontal);
        default_ancestor = apportion(child, default_ancestor, nodes, opts, horizontal);
    }

    execute_shifts(root, nodes);

    let first = nodes[root].children[0];
    let last = *nodes[root].children.last().unwrap();
    let mid = (nodes[first].prelim + nodes[last].prelim) / 2.0;

    if let Some(ls) = left_sibling(root, nodes) {
        nodes[root].prelim = nodes[ls].prelim + sep(opts, horizontal);
        nodes[root].mod_ = nodes[root].prelim - mid;
    } else {
        nodes[root].prelim = mid;
    }
}

fn second_walk(root: usize, nodes: &mut [InternalNode], mod_sum: f32, depth: f32) {
    nodes[root].x = nodes[root].prelim + mod_sum;
    nodes[root].y = depth;
    let next_mod = mod_sum + nodes[root].mod_;
    for &child in &nodes[root].children.clone() {
        second_walk(child, nodes, next_mod, depth + 1.0);
    }
}

fn left_sibling(v: usize, nodes: &[InternalNode]) -> Option<usize> {
    let node = &nodes[v];
    if node.number == 0 {
        return None;
    }
    let parent = node.parent?;
    Some(nodes[parent].children[node.number - 1])
}

fn apportion(
    v: usize,
    mut default_ancestor: usize,
    nodes: &mut [InternalNode],
    opts: &LayoutOptions,
    horizontal: bool,
) -> usize {
    let Some(left) = left_sibling(v, nodes) else {
        return default_ancestor;
    };

    let parent = nodes[v].parent.expect("node with left sibling has parent");
    let mut vir = v;
    let mut vor = v;
    let mut vil = left;
    let mut vol = nodes[parent].children[0];

    let mut sir = nodes[vir].mod_;
    let mut sor = nodes[vor].mod_;
    let mut sil = nodes[vil].mod_;
    let mut sol = nodes[vol].mod_;

    let mut nr = next_right(vil, nodes);
    let mut nl = next_left(vir, nodes);

    while nr.is_some() && nl.is_some() {
        vil = nr.unwrap();
        vir = nl.unwrap();
        vol = next_left(vol, nodes).unwrap();
        vor = next_right(vor, nodes).unwrap();

        nodes[vor].ancestor = v;
        let shift = nodes[vil].prelim + sil - (nodes[vir].prelim + sir) + sep(opts, horizontal);
        if shift > 0.0 {
            move_subtree(ancestor(vil, v, default_ancestor, nodes), v, shift, nodes);
            sir += shift;
            sor += shift;
        }
        sil += nodes[vil].mod_;
        sir += nodes[vir].mod_;
        sol += nodes[vol].mod_;
        sor += nodes[vor].mod_;

        nr = next_right(vil, nodes);
        nl = next_left(vir, nodes);
    }

    if nr.is_some() && next_right(vor, nodes).is_none() {
        nodes[vor].thread = nr;
        nodes[vor].mod_ += sil - sor;
    }
    if nl.is_some() && next_left(vol, nodes).is_none() {
        nodes[vol].thread = nl;
        nodes[vol].mod_ += sir - sol;
        default_ancestor = v;
    }
    default_ancestor
}

fn move_subtree(wl: usize, wr: usize, shift: f32, nodes: &mut [InternalNode]) {
    let subtrees = nodes[wr].number as f32 - nodes[wl].number as f32;
    if subtrees <= 0.0 {
        return;
    }
    nodes[wr].change -= shift / subtrees;
    nodes[wr].shift += shift;
    nodes[wl].change += shift / subtrees;
    nodes[wr].prelim += shift;
    nodes[wr].mod_ += shift;
}

fn execute_shifts(v: usize, nodes: &mut [InternalNode]) {
    let children: Vec<usize> = nodes[v].children.clone();
    let mut shift = 0.0f32;
    let mut change = 0.0f32;
    for child in children.into_iter().rev() {
        nodes[child].prelim += shift;
        nodes[child].mod_ += shift;
        change += nodes[child].change;
        shift += nodes[child].shift + change;
    }
}

fn ancestor(vil: usize, v: usize, default: usize, nodes: &[InternalNode]) -> usize {
    if nodes[nodes[vil].ancestor].parent == nodes[v].parent {
        nodes[vil].ancestor
    } else {
        default
    }
}

fn next_left(v: usize, nodes: &[InternalNode]) -> Option<usize> {
    if nodes[v].children.is_empty() {
        nodes[v].thread
    } else {
        Some(nodes[v].children[0])
    }
}

fn next_right(v: usize, nodes: &[InternalNode]) -> Option<usize> {
    if nodes[v].children.is_empty() {
        nodes[v].thread
    } else {
        Some(*nodes[v].children.last().unwrap())
    }
}

fn collect_nodes(
    idx: usize,
    nodes: &[InternalNode],
    sources: &[&HierarchyNode],
    out: &mut Vec<LayoutNode>,
    horizontal: bool,
    opts: &LayoutOptions,
) {
    let internal = &nodes[idx];
    let source = sources[internal.source];
    // internal.x = sibling-axis position (pixels from first_walk/second_walk).
    // internal.y = depth (integer, 0-based).
    // Depth axis step depends on direction:
    //   vertical   → depth maps to Y, step = node_height + v_gap
    //   horizontal → depth maps to X, step = node_width  + h_gap
    let depth_step = if horizontal {
        opts.node_width + opts.horizontal_gap
    } else {
        opts.node_height + opts.vertical_gap
    };
    let x = if horizontal { internal.y * depth_step } else { internal.x };
    let y = if horizontal { internal.x } else { internal.y * depth_step };

    let parent_id = internal
        .parent
        .map(|p| sources[nodes[p].source].id.clone());

    out.push(LayoutNode {
        id: source.id.clone(),
        label: source.label.clone(),
        node_type: source.node_type.clone(),
        position: source.position.clone(),
        person: source.person.clone(),
        department: source.department.clone(),
        status: source.status.clone(),
        x,
        y,
        width: opts.node_width,
        height: opts.node_height,
        depth: internal.y as u32,
        parent_id,
        org_id: source.id.clone(),
    });

    for &child in &internal.children {
        collect_nodes(child, nodes, sources, out, horizontal, opts);
    }
}

fn bounds(nodes: &[LayoutNode]) -> (f32, f32, f32, f32) {
    let mut min_x = f32::MAX;
    let mut min_y = f32::MAX;
    let mut max_x = f32::MIN;
    let mut max_y = f32::MIN;
    for n in nodes {
        min_x = min_x.min(n.x);
        min_y = min_y.min(n.y);
        max_x = max_x.max(n.x + n.width);
        max_y = max_y.max(n.y + n.height);
    }
    (min_x, min_y, max_x, max_y)
}

fn edge_path(from: &(f32, f32, f32, f32), to: &(f32, f32, f32, f32), horizontal: bool) -> String {
    if horizontal {
        let x1 = from.0 + from.2;
        let y1 = from.1 + from.3 / 2.0;
        let x2 = to.0;
        let y2 = to.1 + to.3 / 2.0;
        let mid = (x1 + x2) / 2.0;
        format!("M {x1} {y1} H {mid} V {y2} H {x2}")
    } else {
        let x1 = from.0 + from.2 / 2.0;
        let y1 = from.1 + from.3;
        let x2 = to.0 + to.2 / 2.0;
        let y2 = to.1;
        let mid = (y1 + y2) / 2.0;
        format!("M {x1} {y1} V {mid} H {x2} V {y2}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::HierarchyNode;

    fn default_opts() -> LayoutOptions {
        LayoutOptions {
            direction: "vertical".into(),
            node_width: 100.0,
            node_height: 40.0,
            horizontal_gap: 20.0,
            vertical_gap: 30.0,
            margin: 10.0,
        }
    }

    fn org_node(id: &str, children: Vec<HierarchyNode>) -> HierarchyNode {
        HierarchyNode {
            id: id.into(),
            label: id.into(),
            node_type: "organization".into(),
            position: None,
            person: None,
            department: None,
            status: "filled".into(),
            children,
        }
    }

    fn center_x(n: &LayoutNode) -> f32 {
        n.x + n.width / 2.0
    }

    #[test]
    fn tidy_tree_parent_centered_over_children() {
        let root = org_node(
            "root",
            vec![
                org_node("a", vec![]),
                org_node("b", vec![]),
                org_node("c", vec![]),
            ],
        );
        let layout = compute_tidy_tree_layout(&root, &default_opts());
        let by_id: std::collections::HashMap<_, _> =
            layout.nodes.iter().map(|n| (n.id.as_str(), n)).collect();

        let r = by_id["root"];
        let a = by_id["a"];
        let c = by_id["c"];
        let expected = (center_x(a) + center_x(c)) / 2.0;
        assert!((center_x(r) - expected).abs() < 0.01);
    }

    #[test]
    #[test]
    fn tidy_tree_horizontal_no_overlap() {
        let root = org_node(
            "root",
            vec![
                org_node("a", vec![org_node("a1", vec![]), org_node("a2", vec![])]),
                org_node("b", vec![]),
            ],
        );
        let mut opts = default_opts(); // node_width=100, node_height=40, h_gap=20, v_gap=30
        opts.direction = "horizontal".into();

        let layout = compute_tidy_tree_layout(&root, &opts);
        let sep_x = opts.node_width + opts.horizontal_gap; // depth step = 120
        let sep_y = opts.node_height + opts.vertical_gap;  // sibling step = 70

        // Depth increases along X
        let root_node = layout.nodes.iter().find(|n| n.id == "root").unwrap();
        let a_node = layout.nodes.iter().find(|n| n.id == "a").unwrap();
        assert!(a_node.x > root_node.x, "a must be to the right of root");
        // Depth difference = 1 → x gap = sep_x = 120; include margin
        let dx = a_node.x - root_node.x;
        assert!((dx - sep_x).abs() < 1.0, "horizontal depth step mismatch (got {})", dx);

        // Siblings a and b must not overlap along Y
        let b_node = layout.nodes.iter().find(|n| n.id == "b").unwrap();
        let (top, bot) = if a_node.y < b_node.y { (a_node, b_node) } else { (b_node, a_node) };
        let y_gap = bot.y - (top.y + top.height);
        assert!(y_gap + 0.01 >= opts.vertical_gap, "sibling y-gap {} < v_gap {}", y_gap, opts.vertical_gap);
        // Siblings too far is also wrong — max 4× sibling step
        assert!(y_gap <= sep_y * 4.0 + opts.node_height * 4.0, "siblings too far apart (gap={})", y_gap);
    }

    #[test]
    fn tidy_tree_siblings_do_not_overlap() {
        let root = org_node(
            "root",
            vec![
                org_node("a", vec![org_node("a1", vec![]), org_node("a2", vec![])]),
                org_node("b", vec![org_node("b1", vec![])]),
                org_node("c", vec![]),
            ],
        );
        let opts = default_opts();
        let layout = compute_tidy_tree_layout(&root, &opts);

        let mut by_depth: std::collections::HashMap<u32, Vec<&LayoutNode>> =
            std::collections::HashMap::new();
        for n in &layout.nodes {
            by_depth.entry(n.depth).or_default().push(n);
        }

        for nodes_at_depth in by_depth.values() {
            let mut sorted: Vec<_> = nodes_at_depth.iter().copied().collect();
            sorted.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap());
            for pair in sorted.windows(2) {
                let left = pair[0];
                let right = pair[1];
                let gap = right.x - (left.x + left.width);
                assert!(
                    gap + 0.01 >= opts.horizontal_gap,
                    "overlap at depth {} between {} and {} (gap={gap})",
                    left.depth,
                    left.id,
                    right.id
                );
                // Upper bound: Reingold–Tilford must not spread siblings more than
                // 4× the expected gap (catches the double-scale bug).
                assert!(
                    gap <= opts.horizontal_gap * 4.0 + opts.node_width * 4.0,
                    "siblings too far apart at depth {} between {} and {} (gap={gap})",
                    left.depth,
                    left.id,
                    right.id
                );
            }
        }
    }

    #[test]
    fn tidy_tree_depth_maps_to_rows() {
        let root = org_node("root", vec![org_node("c1", vec![org_node("gc", vec![])])]);
        let opts = default_opts();
        let row_step = opts.node_height + opts.vertical_gap;
        let layout = compute_tidy_tree_layout(&root, &opts);

        for n in &layout.nodes {
            let expected_y = opts.margin + n.depth as f32 * row_step;
            assert!((n.y - expected_y).abs() < 0.01, "{} y={} expected {}", n.id, n.y, expected_y);
        }
    }

    #[test]
    fn tidy_tree_single_node_has_margin() {
        let root = org_node("solo", vec![]);
        let opts = default_opts();
        let layout = compute_tidy_tree_layout(&root, &opts);
        assert_eq!(layout.nodes.len(), 1);
        assert!((layout.nodes[0].x - opts.margin).abs() < 0.01);
        assert!((layout.nodes[0].y - opts.margin).abs() < 0.01);
    }
}
