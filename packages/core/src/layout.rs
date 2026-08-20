use crate::types::{HierarchyNode, LayoutEdge, LayoutNode, LayoutOptions, LayoutResult};

struct InternalNode<'a> {
    node: &'a HierarchyNode,
    prelim: f32,
    mod_: f32,
    shift: f32,
    change: f32,
    number: usize,
    parent: Option<*mut InternalNode<'a>>,
    children: Vec<InternalNode<'a>>,
    thread: Option<*mut InternalNode<'a>>,
    ancestor: *mut InternalNode<'a>,
    x: f32,
    y: f32,
}

pub fn compute_tree_layout(root: &HierarchyNode, opts: &LayoutOptions) -> LayoutResult {
    let mut internal = build_internal(root, None, 0);
    first_walk(&mut internal, opts);
    second_walk(&mut internal, 0.0, 0.0);

    let horizontal = opts.direction == "horizontal";
    let mut nodes: Vec<LayoutNode> = Vec::new();
    collect(&internal, &mut nodes, horizontal, opts);

    let (min_x, min_y, max_x, max_y) = bounds(&nodes);
    let ox = opts.margin - min_x;
    let oy = opts.margin - min_y;

    for n in &mut nodes {
        n.x += ox;
        n.y += oy;
    }

    let node_map: std::collections::HashMap<String, (f32, f32, f32, f32)> = nodes
        .iter()
        .map(|n| (n.id.clone(), (n.x, n.y, n.width, n.height)))
        .collect();

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

    LayoutResult {
        width: max_x - min_x + opts.margin * 2.0,
        height: max_y - min_y + opts.margin * 2.0,
        direction: opts.direction.clone(),
        nodes,
        edges,
    }
}

fn build_internal<'a>(
    node: &'a HierarchyNode,
    parent: Option<*mut InternalNode<'a>>,
    index: usize,
) -> InternalNode<'a> {
    let mut internal = InternalNode {
        node,
        prelim: 0.0,
        mod_: 0.0,
        shift: 0.0,
        change: 0.0,
        number: index,
        parent,
        children: Vec::new(),
        thread: None,
        ancestor: std::ptr::null_mut(),
        x: 0.0,
        y: 0.0,
    };
    internal.ancestor = &mut internal as *mut _;
    internal.children = node
        .children
        .iter()
        .enumerate()
        .map(|(i, c)| build_internal(c, Some(&mut internal as *mut _), i))
        .collect();
    internal
}

fn sep(opts: &LayoutOptions) -> f32 {
    opts.node_width + opts.horizontal_gap
}

fn first_walk<'a>(v: &mut InternalNode<'a>, opts: &LayoutOptions) {
    if v.children.is_empty() {
        let left = left_sibling(v);
        v.prelim = left
            .map(|s| unsafe { (*s).prelim + sep(opts) })
            .unwrap_or(0.0);
    } else {
        let mut default_ancestor = &mut v.children[0] as *mut InternalNode<'a>;
        for child in &mut v.children {
            first_walk(child, opts);
            default_ancestor = apportion(child, default_ancestor, opts);
        }
        execute_shifts(v);
        let mid = (v.children.first().unwrap().prelim + v.children.last().unwrap().prelim) / 2.0;
        if let Some(ls) = left_sibling(v) {
            let ls_prelim = unsafe { (*ls).prelim };
            v.prelim = ls_prelim + sep(opts);
            v.mod_ = v.prelim - mid;
        } else {
            v.prelim = mid;
        }
    }
}

fn second_walk<'a>(v: &mut InternalNode<'a>, mod_sum: f32, depth: f32) {
    v.x = v.prelim + mod_sum;
    v.y = depth;
    for child in &mut v.children {
        second_walk(child, mod_sum + v.mod_, depth + 1.0);
    }
}

fn left_sibling<'a>(v: &InternalNode<'a>) -> Option<*mut InternalNode<'a>> {
    if v.number == 0 {
        return None;
    }
    v.parent.map(|p| unsafe {
        let parent = &mut *p;
        &mut parent.children[v.number - 1] as *mut _
    })
}

fn apportion<'a>(
    v: &mut InternalNode<'a>,
    mut default_ancestor: *mut InternalNode<'a>,
    opts: &LayoutOptions,
) -> *mut InternalNode<'a> {
    let left = match left_sibling(v) {
        Some(l) => l,
        None => return default_ancestor,
    };

    let mut vir: *mut InternalNode<'a> = v as *mut _;
    let mut vor: *mut InternalNode<'a> = v as *mut _;
    let mut vil: *mut InternalNode<'a> = left;
    let parent = unsafe { &*v.parent.unwrap() };
    let mut vol: *mut InternalNode<'a> = &parent.children[0] as *const _ as *mut _;

    let mut sir = unsafe { (*vir).mod_ };
    let mut sor = unsafe { (*vor).mod_ };
    let mut sil = unsafe { (*vil).mod_ };
    let mut sol = unsafe { (*vol).mod_ };

    let mut nr = next_right(vil);
    let mut nl = next_left(vir);

    while nr.is_some() && nl.is_some() {
        vil = nr.unwrap();
        vir = nl.unwrap();
        vol = next_left(vol).unwrap();
        vor = next_right(vor).unwrap();

        unsafe {
            (*vor).ancestor = v as *mut _;
            let shift = (*vil).prelim + sil - ((*vir).prelim + sir) + sep(opts);
            if shift > 0.0 {
                move_subtree(get_ancestor(vil, v, default_ancestor), v as *mut _, shift);
                sir += shift;
                sor += shift;
            }
            sil += (*vil).mod_;
            sir += (*vir).mod_;
            sol += (*vol).mod_;
            sor += (*vor).mod_;
        }
        nr = next_right(vil);
        nl = next_left(vir);
    }

    if nr.is_some() && next_right(vor).is_none() {
        unsafe {
            (*vor).thread = nr;
            (*vor).mod_ += sil - sor;
        }
    }
    if nl.is_some() && next_left(vol).is_none() {
        unsafe {
            (*vol).thread = nl;
            (*vol).mod_ += sir - sol;
            default_ancestor = v as *mut _;
        }
    }
    default_ancestor
}

fn move_subtree<'a>(wl: *mut InternalNode<'a>, wr: *mut InternalNode<'a>, shift: f32) {
    unsafe {
        let subtrees = (*wr).number as f32 - (*wl).number as f32;
        if subtrees <= 0.0 {
            return;
        }
        (*wr).change -= shift / subtrees;
        (*wr).shift += shift;
        (*wl).change += shift / subtrees;
        (*wr).prelim += shift;
        (*wr).mod_ += shift;
    }
}

fn execute_shifts<'a>(v: &mut InternalNode<'a>) {
    let mut shift = 0.0f32;
    let mut change = 0.0f32;
    for child in v.children.iter_mut().rev() {
        child.prelim += shift;
        child.mod_ += shift;
        change += child.change;
        shift += child.shift + change;
    }
}

fn get_ancestor<'a>(
    vil: *mut InternalNode<'a>,
    v: &InternalNode<'a>,
    default: *mut InternalNode<'a>,
) -> *mut InternalNode<'a> {
    unsafe {
        if (*(*vil).ancestor).parent == v.parent {
            (*vil).ancestor
        } else {
            default
        }
    }
}

fn next_left<'a>(v: *mut InternalNode<'a>) -> Option<*mut InternalNode<'a>> {
    unsafe {
        if (*v).children.is_empty() {
            (*v).thread
        } else {
            Some(&mut (*v).children[0] as *mut _)
        }
    }
}

fn next_right<'a>(v: *mut InternalNode<'a>) -> Option<*mut InternalNode<'a>> {
    unsafe {
        if (*v).children.is_empty() {
            (*v).thread
        } else {
            let len = (*v).children.len();
            Some(&mut (*v).children[len - 1] as *mut _)
        }
    }
}

fn collect<'a>(
    internal: &InternalNode<'a>,
    out: &mut Vec<LayoutNode>,
    horizontal: bool,
    opts: &LayoutOptions,
) {
    let sep_x = opts.node_width + opts.horizontal_gap;
    let sep_y = opts.node_height + opts.vertical_gap;

    let x = if horizontal {
        internal.y * sep_x
    } else {
        internal.x * sep_x
    };
    let y = if horizontal {
        internal.x * sep_y
    } else {
        internal.y * sep_y
    };

    let parent_id = internal.parent.map(|p| unsafe { (*p).node.id.clone() });
    let depth = internal.y as u32;

    out.push(LayoutNode {
        id: internal.node.id.clone(),
        label: internal.node.label.clone(),
        node_type: internal.node.node_type.clone(),
        position: internal.node.position.clone(),
        person: internal.node.person.clone(),
        department: internal.node.department.clone(),
        status: internal.node.status.clone(),
        x,
        y,
        width: opts.node_width,
        height: opts.node_height,
        depth,
        parent_id,
        org_id: internal.node.id.clone(),
    });

    for child in &internal.children {
        collect(child, out, horizontal, opts);
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
