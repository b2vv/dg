//! Ploeg (2014) non-layered/layered tidy tree via [`tidy-tree`] crate.
//! Reference: https://github.com/b2vv/diagram-lib (wasm-diagram/crates/tidy-tree)

use std::collections::HashMap;

use tidy_tree::{TidyTree, NULL_ID};

use crate::types::{HierarchyNode, LayoutEdge, LayoutNode, LayoutOptions, LayoutResult};

/// Layered tidy tree — як `WasmLayoutType::LayeredTidy` у diagram-lib.
pub fn compute_ploeg_layered_layout(root: &HierarchyNode, opts: &LayoutOptions) -> LayoutResult {
    let mut tree =
        TidyTree::with_layered_tidy(opts.vertical_gap as f64, opts.horizontal_gap as f64);
    let mut numeric_to_id: HashMap<usize, String> = HashMap::new();
    let mut parent_numeric: HashMap<usize, usize> = HashMap::new();
    let mut id_to_numeric: HashMap<String, usize> = HashMap::new();
    let mut source_by_num: HashMap<usize, &HierarchyNode> = HashMap::new();
    let mut next_id = 1usize;

    // Ten parameters because the walk threads five mutable maps through the
    // recursion. Bundling them is a real improvement — and it belongs to the
    // work that makes this traversal iterative (the depth limit lives here),
    // not to a lint sweep that would rewrite it twice.
    #[allow(clippy::too_many_arguments)]
    fn walk<'a>(
        node: &'a HierarchyNode,
        parent_num: usize,
        tree: &mut TidyTree,
        node_width: f32,
        node_height: f32,
        next_id: &mut usize,
        numeric_to_id: &mut HashMap<usize, String>,
        parent_numeric: &mut HashMap<usize, usize>,
        id_to_numeric: &mut HashMap<String, usize>,
        source_by_num: &mut HashMap<usize, &'a HierarchyNode>,
    ) {
        let num = *next_id;
        *next_id += 1;
        numeric_to_id.insert(num, node.id.clone());
        id_to_numeric.insert(node.id.clone(), num);
        source_by_num.insert(num, node);
        if parent_num != NULL_ID {
            parent_numeric.insert(num, parent_num);
        }

        let parent = if parent_num == NULL_ID {
            NULL_ID
        } else {
            parent_num
        };
        tree.add_node(num, node_width as f64, node_height as f64, parent);

        for child in &node.children {
            walk(
                child,
                num,
                tree,
                node_width,
                node_height,
                next_id,
                numeric_to_id,
                parent_numeric,
                id_to_numeric,
                source_by_num,
            );
        }
    }

    walk(
        root,
        NULL_ID,
        &mut tree,
        opts.node_width,
        opts.node_height,
        &mut next_id,
        &mut numeric_to_id,
        &mut parent_numeric,
        &mut id_to_numeric,
        &mut source_by_num,
    );

    tree.layout();
    let positions = tree.get_pos();

    let mut depth_by_num = HashMap::new();
    for num in numeric_to_id.keys() {
        let depth = depth_of(*num, &parent_numeric);
        depth_by_num.insert(*num, depth);
    }

    let mut nodes = Vec::new();
    let mut i = 0usize;
    while i + 2 < positions.len() {
        let num = positions[i] as usize;
        let mut x = positions[i + 1] as f32;
        let mut y = positions[i + 2] as f32;
        x += opts.margin;
        y += opts.margin;

        let source = source_by_num[&num];
        let parent_id = parent_numeric
            .get(&num)
            .and_then(|p| numeric_to_id.get(p).cloned());

        nodes.push(LayoutNode {
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
            depth: depth_by_num[&num],
            parent_id,
            org_id: source.id.clone(),
        });
        i += 3;
    }

    let (min_x, min_y, _max_x, _max_y) = bounds(&nodes);
    let ox = opts.margin - min_x;
    let oy = opts.margin - min_y;
    for n in &mut nodes {
        n.x += ox;
        n.y += oy;
    }

    let node_map: HashMap<String, (f32, f32, f32, f32)> = nodes
        .iter()
        .map(|n| (n.id.clone(), (n.x, n.y, n.width, n.height)))
        .collect();

    let horizontal = opts.direction == "horizontal";
    let mut edges = Vec::new();
    for n in &nodes {
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

    let (min_x, min_y, max_x, max_y) = bounds(&nodes);
    LayoutResult {
        width: max_x - min_x + opts.margin * 2.0,
        height: max_y - min_y + opts.margin * 2.0,
        direction: opts.direction.clone(),
        nodes,
        edges,
    }
}

fn depth_of(num: usize, parent_numeric: &HashMap<usize, usize>) -> u32 {
    let mut d = 0u32;
    let mut cur = num;
    while let Some(&p) = parent_numeric.get(&cur) {
        d += 1;
        cur = p;
    }
    d
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

    fn opts() -> LayoutOptions {
        LayoutOptions {
            direction: "vertical".into(),
            node_width: 200.0,
            node_height: 72.0,
            horizontal_gap: 40.0,
            vertical_gap: 60.0,
            margin: 24.0,
        }
    }

    #[test]
    fn ploeg_layered_parent_above_children() {
        let root = org_node("root", vec![org_node("a", vec![]), org_node("b", vec![])]);
        let layout = compute_ploeg_layered_layout(&root, &opts());
        let by_id: HashMap<_, _> = layout.nodes.iter().map(|n| (n.id.as_str(), n)).collect();
        assert!(by_id["a"].y > by_id["root"].y);
        assert!(by_id["b"].y > by_id["root"].y);
    }

    #[test]
    fn ploeg_layered_siblings_same_row() {
        let root = org_node("root", vec![org_node("a", vec![]), org_node("b", vec![])]);
        let layout = compute_ploeg_layered_layout(&root, &opts());
        let a = layout.nodes.iter().find(|n| n.id == "a").unwrap();
        let b = layout.nodes.iter().find(|n| n.id == "b").unwrap();
        assert!((a.y - b.y).abs() < 0.01);
        assert!(b.x > a.x);
    }
}
