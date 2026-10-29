//! R7 (Варіант 2): staff block-layout TREE-шлях у Rust + оркестратор `StaffGeometryResult`.
//!
//! Порт TS `layoutStaffOrgBlock` (orgBlockLayout.ts) tree-режиму + `layoutStaffCanvas`
//! (canvasLayout.ts). **ЛИШЕ tree:** контрактний `StaffPositionInput` не несе координат
//! (`positionHasCoords`-полів немає) ⇒ matrix/hybrid-з-member-координатами СТРУКТУРНО
//! недосяжні — TS-адаптер гейтить їх до виклику. collapse/`detached:true`/`expanded`/
//! `memberOrder` теж не в контракті ⇒ TS-адаптер. Тут — чистий tree + dept-grouping +
//! зовнішні менеджери + тирна композиція.
//!
//! **Переюз (не переписую):** row-tree ядро `compute_org_row_tree_layout` (org_layout.rs),
//! `compose_tiers`/`compose_org_cards`/`canvas_dimensions` (staff_compose.rs),
//! `enrich_namespaces` (staff_bounds.rs), `department_frame` (staff_packing.rs),
//! `staff_routes` (staff_routes.rs). Тут — лише позиціонування членів і склейка.
//!
//! **Паритет:** `layout_connected_tree` викликає ТОЙ САМИЙ ploeg, що TS через WASM, тож
//! raw-координати ідентичні за конструкцією; порт відтворює лише wrapper-логіку
//! (reparent, recenter, side-column pack, dept region-pack, pin, tier-stack).

use std::collections::{HashMap, HashSet};

use crate::org_layout::compute_org_row_tree_layout;
use crate::staff_bounds::{enrich_namespaces, BoundsOptions};
use crate::staff_compose::{
    canvas_dimensions, compose_org_cards, compose_tiers, ExpandedBlock, OrgCardInput,
    OrgCardOptions, TierBlock,
};
use crate::staff_geom::FrameRect;
use crate::staff_packing::department_frame;
use crate::staff_routes::{staff_routes, RouteInputs};
use crate::types::{
    LayoutOptions, OrgFlatInput, StaffDepartmentFrameGeo, StaffEdge, StaffEdgeInput,
    StaffGeometryResult, StaffLayoutInput, StaffNamespace, StaffNodeGeo, StaffOrgCardGeo,
    StaffOrgInput, StaffPositionInput,
};

/// Сентинел «без відділу» (TS `NO_DEPARTMENT_ID`, data/types.ts:244).
const NO_DEPARTMENT_ID: &str = "\u{0000}no-department";
/// Нижня межа card_pad роутера (staff_routes `MIN_CARD_PAD`): нижче → вимкнути обхід.
const MIN_CARD_PAD: f32 = 8.0;

/// Геометричні метрики (підмножина, що керує позиціонуванням). Порт `StaffGeom` (coords.ts:5).
#[derive(Debug, Clone, Copy)]
pub struct Geom {
    pub node_width: f32,
    pub node_height: f32,
    pub horizontal_gap: f32,
    pub vertical_gap: f32,
    pub ref_cell_width: f32,
    pub ref_cell_height: f32,
    pub margin: f32,
}

/// Розкладений org-блок (аналог TS `StaffOrgBlockResult`, types.ts:104). `nodes` у
/// ЛОКАЛЬНИХ координатах блоку (від ~margin); tier проставляє композиція.
#[derive(Debug, Clone)]
pub struct StaffBlock {
    pub organization_id: String,
    pub nodes: Vec<StaffNodeGeo>,
    pub edges: Vec<StaffEdge>,
    pub width: f32,
    pub height: f32,
    pub diagnostics: Vec<String>,
}

/// Карта розмірів карток (`nodeSizes`) id → (width, height). Порт `positionSize` (coords.ts:38):
/// фолбек на geom, коли власного розміру немає.
fn size_map(sizes: &[crate::types::StaffNodeSize]) -> HashMap<String, (f32, f32)> {
    sizes
        .iter()
        .map(|s| (s.id.clone(), (s.width, s.height)))
        .collect()
}

// ─────────────────────────────────────────────────────────────────────────────
// Крок 1: граф-хелпери (resolveHead.ts / positionExpand.ts)
// ─────────────────────────────────────────────────────────────────────────────

/// Admin-батько: reportLines fromId=менеджер, toId=підлеглий (resolveHead.ts:5).
/// Фільтрує позиції до `org_id`; self-loop і крос-орг ребра відкидає.
fn admin_parent_map(
    positions: &[StaffPositionInput],
    reports: &[StaffEdgeInput],
    org_id: &str,
) -> HashMap<String, String> {
    let ids: HashSet<&str> = positions
        .iter()
        .filter(|p| p.organization_id == org_id)
        .map(|p| p.id.as_str())
        .collect();
    let mut parents = HashMap::new();
    for r in reports {
        if r.kind != "admin" || r.from_id == r.to_id {
            continue;
        }
        if !ids.contains(r.from_id.as_str()) || !ids.contains(r.to_id.as_str()) {
            continue;
        }
        parents.insert(r.to_id.clone(), r.from_id.clone());
    }
    parents
}

/// Admin-діти в порядку появи ребер (positionExpand.ts:5).
fn admin_children_map(
    positions: &[StaffPositionInput],
    reports: &[StaffEdgeInput],
    org_id: &str,
) -> HashMap<String, Vec<String>> {
    let ids: HashSet<&str> = positions
        .iter()
        .filter(|p| p.organization_id == org_id)
        .map(|p| p.id.as_str())
        .collect();
    let mut children: HashMap<String, Vec<String>> = HashMap::new();
    for r in reports {
        if r.kind != "admin" || r.from_id == r.to_id {
            continue;
        }
        if !ids.contains(r.from_id.as_str()) || !ids.contains(r.to_id.as_str()) {
            continue;
        }
        children
            .entry(r.from_id.clone())
            .or_default()
            .push(r.to_id.clone());
    }
    children
}

/// Голова орг-блоку (resolveHead.ts:48): рівно одна `isHead`, інакше — рівно одна
/// позиція без admin-батька. Інакше — `Err` (порт `StaffLayoutError`).
fn resolve_staff_head(
    positions: &[StaffPositionInput],
    org_id: &str,
    reports: &[StaffEdgeInput],
) -> Result<String, String> {
    let in_org: Vec<&StaffPositionInput> = positions
        .iter()
        .filter(|p| p.organization_id == org_id)
        .collect();
    if in_org.is_empty() {
        return Err(format!("No positions in organization {org_id}"));
    }
    let heads: Vec<&&StaffPositionInput> = in_org.iter().filter(|p| p.is_head).collect();
    if heads.len() == 1 {
        return Ok(heads[0].id.clone());
    }
    if heads.len() > 1 {
        return Err(format!("Multiple isHead positions in {org_id}"));
    }
    let parents = admin_parent_map(positions, reports, org_id);
    let parentless: Vec<&&StaffPositionInput> = in_org
        .iter()
        .filter(|p| !parents.contains_key(&p.id))
        .collect();
    if parentless.len() == 1 {
        return Ok(parentless[0].id.clone());
    }
    Err(format!(
        "Cannot resolve staff head for {org_id}: need one isHead or one parentless position"
    ))
}

/// Виведений detached (resolveHead.ts:26): не голова й без admin-батька.
/// (Контракт не несе `detached:true` — лише inference.)
fn is_detached(id: &str, head_id: &str, parents: &HashMap<String, String>) -> bool {
    id != head_id && !parents.contains_key(id)
}

/// Корені detached-компонент у порядку входу (resolveHead.ts:37).
fn detached_root_ids(
    positions: &[StaffPositionInput],
    reports: &[StaffEdgeInput],
    org_id: &str,
    head_id: &str,
) -> Vec<String> {
    let parents = admin_parent_map(positions, reports, org_id);
    positions
        .iter()
        .filter(|p| p.organization_id == org_id)
        .filter(|p| is_detached(&p.id, head_id, &parents))
        .map(|p| p.id.clone())
        .collect()
}

/// Сам + усі admin-нащадки в межах своєї орг (positionExpand.ts:143). Лише членство.
fn admin_descendant_ids(
    position_id: &str,
    positions: &[StaffPositionInput],
    reports: &[StaffEdgeInput],
) -> HashSet<String> {
    let Some(org_id) = positions
        .iter()
        .find(|p| p.id == position_id)
        .map(|p| p.organization_id.clone())
    else {
        return HashSet::new();
    };
    let children = admin_children_map(positions, reports, &org_id);
    let mut out = HashSet::new();
    let mut stack = vec![position_id.to_string()];
    while let Some(id) = stack.pop() {
        if !out.insert(id.clone()) {
            continue;
        }
        if let Some(kids) = children.get(&id) {
            for c in kids {
                stack.push(c.clone());
            }
        }
    }
    out
}

// ─────────────────────────────────────────────────────────────────────────────
// Крок 2: layout_connected_tree (orgBlockLayout.ts:47) — переюз ploeg + recenter
// ─────────────────────────────────────────────────────────────────────────────

/// Розкладає одну звʼязну admin-компоненту з відомим коренем через row-tree ядро
/// (той самий `compute_org_row_tree_layout`, що TS кличе через WASM) і центрує
/// корінь над bbox піддерева (orgBlockLayout.ts:93-102).
fn layout_connected_tree(
    positions: &[StaffPositionInput],
    reports: &[StaffEdgeInput],
    org_id: &str,
    root_id: &str,
    geom: &Geom,
    sizes: &HashMap<String, (f32, f32)>,
    role: &str,
) -> Result<Vec<StaffNodeGeo>, String> {
    if positions.is_empty() {
        return Ok(Vec::new());
    }
    let parents = admin_parent_map(positions, reports, org_id);
    let id_set: HashSet<&str> = positions.iter().map(|p| p.id.as_str()).collect();

    let flat: Vec<OrgFlatInput> = positions
        .iter()
        .map(|p| {
            // reparent: корінь → None; валідний in-set батько → він; інакше → під корінь (D5).
            let parent = if p.id == root_id {
                None
            } else {
                match parents.get(&p.id) {
                    Some(par) if id_set.contains(par.as_str()) => Some(par.clone()),
                    _ => Some(root_id.to_string()),
                }
            };
            let (w, h) = sizes
                .get(&p.id)
                .copied()
                .unwrap_or((geom.node_width, geom.node_height));
            OrgFlatInput {
                id: p.id.clone(),
                parent_org_id: parent,
                name: p.id.clone(),
                width: Some(w),
                height: Some(h),
            }
        })
        .collect();

    let opts = LayoutOptions {
        direction: "vertical".to_string(),
        node_width: geom.node_width,
        node_height: geom.node_height,
        horizontal_gap: geom.horizontal_gap,
        vertical_gap: geom.vertical_gap,
        margin: geom.margin,
    };
    let raw = compute_org_row_tree_layout(flat, root_id, &opts).map_err(|e| e.message())?;

    let mut nodes: Vec<StaffNodeGeo> = raw
        .nodes
        .into_iter()
        .map(|n| {
            let (w, h) = sizes.get(&n.id).copied().unwrap_or((n.width, n.height));
            StaffNodeGeo {
                id: n.id,
                organization_id: org_id.to_string(),
                x: n.x,
                y: n.y,
                width: w,
                height: h,
                tier: 0,
                role: Some(role.to_string()),
                depth: Some(n.depth),
                department_id: None,
                part_index: None,
            }
        })
        .collect();

    // Центруємо корінь над повним прольотом піддерева (orgBlockLayout.ts:93-102).
    if nodes.len() > 1 {
        let (mut min_x, mut max_x) = (f32::INFINITY, f32::NEG_INFINITY);
        for n in &nodes {
            min_x = min_x.min(n.x);
            max_x = max_x.max(n.x + n.width);
        }
        if let Some(root) = nodes.iter_mut().find(|n| n.id == root_id) {
            root.x = (min_x + max_x) / 2.0 - root.width / 2.0;
        }
    }
    // Детермінізм: нумерація вузлів і КООРДИНАТИ в `compute_org_row_tree_layout` детерміновані,
    // але ПОРЯДОК емісії Vec задає `tidy-tree::get_pos()` (зовнішній крейт) і він НЕ стабільний
    // між викликами — проб R7 дав 97 різних порядків на 200 викликів з ІДЕНТИЧНИМ входом при
    // COORDS_STABLE=true (поза зоною R1). Споживачі (golden) усе одно нормалізують сортуванням за
    // id; сортуємо тут, щоб downstream (side-column/dept eject, що залежить від порядку обробки)
    // був детермінованим.
    nodes.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(nodes)
}

// ─────────────────────────────────────────────────────────────────────────────
// Крок 3: side-column pack + layout_tree_block (orgBlockLayout.ts:121,171)
// ─────────────────────────────────────────────────────────────────────────────

/// AABB-перетин з зазором (coords.ts:69).
fn aabb_overlap(a: &StaffNodeGeo, b: &StaffNodeGeo, gap_x: f32, gap_y: f32) -> bool {
    !(a.x + a.width + gap_x <= b.x
        || b.x + b.width + gap_x <= a.x
        || a.y + a.height + gap_y <= b.y
        || b.y + b.height + gap_y <= a.y)
}

/// Пакує групи detached-вузлів у колонку праворуч від `anchors` (orgBlockLayout.ts:121).
fn pack_side_column(
    groups: &[Vec<StaffNodeGeo>],
    anchors: &[StaffNodeGeo],
    geom: &Geom,
) -> Vec<StaffNodeGeo> {
    if groups.is_empty() {
        return Vec::new();
    }
    let anchor_max_x = anchors
        .iter()
        .map(|a| a.x + a.width)
        .fold(0.0_f32, f32::max);
    let offset_x = anchor_max_x + geom.horizontal_gap + geom.margin;

    let mut out: Vec<StaffNodeGeo> = Vec::new();
    let mut cursor_y = geom.margin;
    for group in groups {
        if group.is_empty() {
            continue;
        }
        let min_fx = group.iter().map(|f| f.x).fold(f32::INFINITY, f32::min);
        let min_fy = group.iter().map(|f| f.y).fold(f32::INFINITY, f32::min);
        let mut placed: Vec<StaffNodeGeo> = group
            .iter()
            .map(|f| StaffNodeGeo {
                x: f.x - min_fx + offset_x,
                y: f.y - min_fy + cursor_y,
                role: Some("detached".to_string()),
                ..f.clone()
            })
            .collect();
        for item in placed.iter_mut() {
            let mut guard = 0;
            loop {
                let hits_anchor = anchors
                    .iter()
                    .any(|a| aabb_overlap(item, a, geom.horizontal_gap, geom.vertical_gap));
                let hits_out = out
                    .iter()
                    .any(|a| aabb_overlap(item, a, geom.horizontal_gap, geom.vertical_gap));
                if !(hits_anchor || hits_out) || guard >= 50 {
                    break;
                }
                item.y += geom.node_height + geom.vertical_gap;
                guard += 1;
            }
            out.push(item.clone());
        }
        let max_y = placed
            .iter()
            .map(|p| p.y + p.height)
            .fold(f32::NEG_INFINITY, f32::max);
        cursor_y = max_y + geom.vertical_gap;
    }
    out
}

/// Tree-блок: приєднаний ліс лишається під row-tree; detached корені та їхні
/// піддерева пакуються в бічну колонку (orgBlockLayout.ts:171).
#[allow(clippy::too_many_arguments)]
fn layout_tree_block(
    positions: &[StaffPositionInput],
    reports: &[StaffEdgeInput],
    org_id: &str,
    geom: &Geom,
    sizes: &HashMap<String, (f32, f32)>,
    role: &str,
    org_head_id: Option<&str>,
) -> Result<Vec<StaffNodeGeo>, String> {
    if positions.is_empty() {
        return Ok(Vec::new());
    }
    let head_id = match org_head_id {
        Some(h) => h.to_string(),
        None => resolve_staff_head(positions, org_id, reports)?,
    };
    let det_roots = detached_root_ids(positions, reports, org_id, &head_id);

    let mut detached_id_set: HashSet<String> = HashSet::new();
    for root_id in &det_roots {
        for id in admin_descendant_ids(root_id, positions, reports) {
            detached_id_set.insert(id);
        }
    }

    let attached: Vec<StaffPositionInput> = positions
        .iter()
        .filter(|p| !detached_id_set.contains(&p.id))
        .cloned()
        .collect();
    let mut attached_nodes: Vec<StaffNodeGeo> = Vec::new();
    if !attached.is_empty() {
        let attached_root = if attached.iter().any(|p| p.id == head_id) {
            head_id.clone()
        } else {
            resolve_staff_head(&attached, org_id, reports)?
        };
        attached_nodes = layout_connected_tree(
            &attached,
            reports,
            org_id,
            &attached_root,
            geom,
            sizes,
            role,
        )?;
    }

    let mut detached_groups: Vec<Vec<StaffNodeGeo>> = Vec::new();
    for root_id in &det_roots {
        let component_ids = admin_descendant_ids(root_id, positions, reports);
        let component: Vec<StaffPositionInput> = positions
            .iter()
            .filter(|p| component_ids.contains(&p.id))
            .cloned()
            .collect();
        let nodes = layout_connected_tree(
            &component, reports, org_id, root_id, geom, sizes, "detached",
        )?;
        detached_groups.push(nodes);
    }

    let detached_nodes = pack_side_column(&detached_groups, &attached_nodes, geom);
    let mut out = attached_nodes;
    out.extend(detached_nodes);
    Ok(out)
}

// ─────────────────────────────────────────────────────────────────────────────
// Крок 4: dept-grouping (staffDeptGrouping.ts:44) — TS region-packing
// ─────────────────────────────────────────────────────────────────────────────

/// `contourDepartmentId` (data/types.ts:247): departmentId або сентинел.
fn contour_department_id(p: &StaffPositionInput) -> String {
    match &p.department_id {
        Some(d) if !d.is_empty() => d.clone(),
        _ => NO_DEPARTMENT_ID.to_string(),
    }
}

/// Член-бокс групи по відділах (TS `StaffDeptGroupingResult`). Повертає позиціоновані
/// вузли (вже проштамповані `department_id` для реальних відділів) + діагностику.
fn group_staff_by_department(
    positions: &[StaffPositionInput],
    reports: &[StaffEdgeInput],
    departments: &[crate::types::StaffDepartmentInput],
    org_id: &str,
    geom: &Geom,
    sizes: &HashMap<String, (f32, f32)>,
) -> Result<Vec<StaffNodeGeo>, String> {
    let parents = admin_parent_map(positions, reports, org_id);
    // Оголошені відділи + їх `order` (gap #1): невідомий departmentId → no-dept bucket (gap #6).
    let declared: HashMap<&str, f64> = departments
        .iter()
        .map(|d| (d.id.as_str(), d.order.unwrap_or(0.0)))
        .collect();

    // Член-порядок = TS `comparePositions` (validateRouteInput.ts:36): (parentId null-first,
    // `order ?? 0`, id). Цей порядок стає sibling-каналом WASM row-tree ⇒ ВПЛИВАЄ НА ЛЕЙАУТ
    // (gap #2, лише dept-grouped шлях). Повний паритет: `StaffPositionInput.order` у контракті.
    let mut sorted: Vec<&StaffPositionInput> = positions.iter().collect();
    sorted.sort_by(|a, b| {
        let pa = parents.get(&a.id);
        let pb = parents.get(&b.id);
        match (pa, pb) {
            (None, Some(_)) => std::cmp::Ordering::Less,
            (Some(_), None) => std::cmp::Ordering::Greater,
            (Some(x), Some(y)) if x != y => x.cmp(y),
            // рівний батько (обидва None або Some==Some): `order ?? 0`, далі tie-break id.
            _ => a
                .order
                .unwrap_or(0.0)
                .partial_cmp(&b.order.unwrap_or(0.0))
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| a.id.cmp(&b.id)),
        }
    });

    // Бакети за відділом у comparePositions-порядку.
    let mut buckets: HashMap<String, Vec<StaffPositionInput>> = HashMap::new();
    for p in sorted {
        let raw = contour_department_id(p);
        // gap #6: departmentId не серед оголошених → NO_DEPARTMENT (TS: unknown→null→no-dept).
        let key = if raw == NO_DEPARTMENT_ID || declared.contains_key(raw.as_str()) {
            raw
        } else {
            NO_DEPARTMENT_ID.to_string()
        };
        buckets.entry(key).or_default().push(p.clone());
    }

    // Порядок відділів: оголошені (крім сентинела) що мають бакет, сорт (order ?? 0, id)
    // = TS `compareDepartments` (staffDeptGrouping.ts:37), тоді NO_DEPARTMENT останнім.
    let mut dept_ids: Vec<String> = departments
        .iter()
        .map(|d| d.id.clone())
        .filter(|id| id != NO_DEPARTMENT_ID && buckets.contains_key(id))
        .collect();
    dept_ids.sort_by(|a, b| {
        let oa = declared.get(a.as_str()).copied().unwrap_or(0.0);
        let ob = declared.get(b.as_str()).copied().unwrap_or(0.0);
        oa.partial_cmp(&ob)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.cmp(b))
    });
    dept_ids.dedup();
    if buckets.contains_key(NO_DEPARTMENT_ID) {
        dept_ids.push(NO_DEPARTMENT_ID.to_string());
    }
    let mut nodes: Vec<StaffNodeGeo> = Vec::new();
    let mut regions: Vec<(f32, f32, f32, f32)> = Vec::new(); // x,y,width,height
    let mut cursor_x = geom.margin;

    for dept_id in &dept_ids {
        let Some(members) = buckets.get(dept_id) else {
            continue;
        };
        let Some(first) = members.first() else {
            continue;
        };
        let member_ids: HashSet<&str> = members.iter().map(|m| m.id.as_str()).collect();
        // Корінь компоненти: перший член без in-set admin-батька, інакше перший.
        let root_id = members
            .iter()
            .find(|m| match parents.get(&m.id) {
                None => true,
                Some(par) => !member_ids.contains(par.as_str()),
            })
            .unwrap_or(first)
            .id
            .clone();
        let local = layout_connected_tree(members, reports, org_id, &root_id, geom, sizes, "tree")?;
        let Some((bx, by, bw, bh)) = region_bounds(&local) else {
            continue;
        };
        // Регіон стартує на (cursor_x, margin); колізія-eject праворуч.
        let mut region = (cursor_x, geom.margin, bw, bh);
        let mut guard = 0usize;
        loop {
            let collision = regions.iter().find(|placed| {
                region_overlap(&region, placed, geom.horizontal_gap, geom.vertical_gap)
            });
            match collision {
                None => break,
                Some(c) => {
                    if guard == regions.len() {
                        return Err("Department region packing did not converge".to_string());
                    }
                    region.0 = c.0 + c.2 + geom.horizontal_gap;
                    guard += 1;
                }
            }
        }
        let is_real = dept_id != NO_DEPARTMENT_ID;
        for node in &local {
            nodes.push(StaffNodeGeo {
                x: node.x - bx + region.0,
                y: node.y - by + region.1,
                department_id: if is_real { Some(dept_id.clone()) } else { None },
                ..node.clone()
            });
        }
        cursor_x = region.0 + region.2 + geom.horizontal_gap;
        regions.push(region);
    }
    Ok(nodes)
}

/// bbox набору вузлів → (x, y, width, height) (staffDeptGrouping.ts:21).
fn region_bounds(nodes: &[StaffNodeGeo]) -> Option<(f32, f32, f32, f32)> {
    let first = nodes.first()?;
    let (mut x, mut y) = (first.x, first.y);
    let (mut right, mut bottom) = (first.x + first.width, first.y + first.height);
    for n in nodes {
        x = x.min(n.x);
        y = y.min(n.y);
        right = right.max(n.x + n.width);
        bottom = bottom.max(n.y + n.height);
    }
    Some((x, y, right - x, bottom - y))
}

/// AABB-перетин двох регіонів `(x,y,w,h)` з зазором (coords.ts:69, region-варіант).
fn region_overlap(a: &(f32, f32, f32, f32), b: &(f32, f32, f32, f32), gx: f32, gy: f32) -> bool {
    !(a.0 + a.2 + gx <= b.0
        || b.0 + b.2 + gx <= a.0
        || a.1 + a.3 + gy <= b.1
        || b.1 + b.3 + gy <= a.1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Крок 5: зовнішні менеджери (externalManagers.ts:53)
// ─────────────────────────────────────────────────────────────────────────────

/// Зовнішні admin-менеджери `in_org` у порядку першої появи (externalManagers.ts:29).
fn external_managers_for(
    in_org: &[StaffPositionInput],
    reports: &[StaffEdgeInput],
) -> Vec<(String, Vec<String>)> {
    let inside: HashSet<&str> = in_org.iter().map(|p| p.id.as_str()).collect();
    let mut order: Vec<String> = Vec::new();
    let mut by_mgr: HashMap<String, Vec<String>> = HashMap::new();
    for r in reports {
        if r.kind != "admin" || r.from_id == r.to_id {
            continue;
        }
        // Наш підлеглий, чий менеджер — не наш.
        if !inside.contains(r.to_id.as_str()) || inside.contains(r.from_id.as_str()) {
            continue;
        }
        if !by_mgr.contains_key(&r.from_id) {
            order.push(r.from_id.clone());
        }
        by_mgr
            .entry(r.from_id.clone())
            .or_default()
            .push(r.to_id.clone());
    }
    order
        .into_iter()
        .map(|m| {
            let reports = by_mgr.remove(&m).unwrap_or_default();
            (m, reports)
        })
        .collect()
}

/// Пінить зовнішніх менеджерів над уже розкладеним блоком (externalManagers.ts:53).
fn pin_external_managers(
    block: StaffBlock,
    in_org: &[StaffPositionInput],
    reports: &[StaffEdgeInput],
    known_ids: &HashSet<String>,
    geom: &Geom,
) -> StaffBlock {
    let pins: Vec<(String, Vec<String>)> = external_managers_for(in_org, reports)
        .into_iter()
        .filter(|(mgr, _)| known_ids.contains(mgr))
        .collect();
    if pins.is_empty() {
        return block;
    }
    let row_height = geom.node_height + geom.vertical_gap;
    let mut nodes: Vec<StaffNodeGeo> = block
        .nodes
        .into_iter()
        .map(|n| StaffNodeGeo {
            y: n.y + row_height,
            ..n
        })
        .collect();
    let pitch_x = geom.node_width + geom.horizontal_gap;
    for (i, (mgr, _)) in pins.iter().enumerate() {
        nodes.push(StaffNodeGeo {
            id: mgr.clone(),
            organization_id: block.organization_id.clone(),
            x: geom.margin + i as f32 * pitch_x,
            y: geom.margin,
            width: geom.node_width,
            height: geom.node_height,
            tier: 0,
            role: Some("external".to_string()),
            depth: None,
            department_id: None,
            part_index: None,
        });
    }
    let mut edges = block.edges;
    for (mgr, report_ids) in &pins {
        for to in report_ids {
            edges.push(StaffEdge {
                from_id: mgr.clone(),
                to_id: to.clone(),
                kind: "admin".to_string(),
            });
        }
    }
    let max_x = block.width.max(geom.margin + pins.len() as f32 * pitch_x);
    StaffBlock {
        organization_id: block.organization_id,
        nodes,
        edges,
        width: max_x,
        height: block.height + row_height,
        diagnostics: block.diagnostics,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Крок 6: layout_staff_org_block (orgBlockLayout.ts:340/357, tree-only)
// ─────────────────────────────────────────────────────────────────────────────

/// Admin-ребра всередині набору (orgBlockLayout.ts:35).
fn admin_edges(positions: &[StaffPositionInput], reports: &[StaffEdgeInput]) -> Vec<StaffEdge> {
    let ids: HashSet<&str> = positions.iter().map(|p| p.id.as_str()).collect();
    reports
        .iter()
        .filter(|r| {
            r.from_id != r.to_id
                && ids.contains(r.from_id.as_str())
                && ids.contains(r.to_id.as_str())
        })
        .map(|r| StaffEdge {
            from_id: r.from_id.clone(),
            to_id: r.to_id.clone(),
            kind: r.kind.clone(),
        })
        .collect()
}

/// Межі розкладеного блоку (orgBlockLayout.ts:28).
fn bounds(nodes: &[StaffNodeGeo], margin: f32) -> (f32, f32) {
    if nodes.is_empty() {
        return (margin * 2.0, margin * 2.0);
    }
    let max_x = nodes
        .iter()
        .map(|n| n.x + n.width)
        .fold(f32::NEG_INFINITY, f32::max);
    let max_y = nodes
        .iter()
        .map(|n| n.y + n.height)
        .fold(f32::NEG_INFINITY, f32::max);
    (max_x + margin, max_y + margin)
}

/// Розкладає staff одної орг (tree-режим) + пінить зовнішніх менеджерів
/// (порт `layoutStaffOrgBlock`). `positions` — повний набір, видимий цьому виклику
/// (його id = `knownPositionIds` для піна). `dept_grouping`/`departments` керують
/// групуванням по відділах.
#[allow(clippy::too_many_arguments)]
pub fn layout_staff_org_block(
    positions: &[StaffPositionInput],
    reports: &[StaffEdgeInput],
    org_id: &str,
    departments: &[crate::types::StaffDepartmentInput],
    dept_grouping: bool,
    geom: &Geom,
    sizes: &HashMap<String, (f32, f32)>,
) -> Result<StaffBlock, String> {
    let in_org: Vec<StaffPositionInput> = positions
        .iter()
        .filter(|p| p.organization_id == org_id)
        .cloned()
        .collect();
    if in_org.is_empty() {
        return Ok(StaffBlock {
            organization_id: org_id.to_string(),
            nodes: Vec::new(),
            edges: Vec::new(),
            width: 0.0,
            height: 0.0,
            diagnostics: Vec::new(),
        });
    }

    let use_dept = dept_grouping
        && !departments.is_empty()
        && in_org.iter().any(|p| p.department_id.is_some());

    let nodes = if use_dept {
        group_staff_by_department(&in_org, reports, departments, org_id, geom, sizes)?
    } else {
        layout_tree_block(&in_org, reports, org_id, geom, sizes, "tree", None)?
    };
    let (w, h) = bounds(&nodes, geom.margin);
    let block = StaffBlock {
        organization_id: org_id.to_string(),
        nodes,
        edges: admin_edges(&in_org, reports),
        width: w,
        height: h,
        diagnostics: Vec::new(),
    };
    if block.nodes.is_empty() {
        return Ok(block);
    }
    let known_ids: HashSet<String> = positions.iter().map(|p| p.id.clone()).collect();
    Ok(pin_external_managers(
        block, &in_org, reports, &known_ids, geom,
    ))
}

// ─────────────────────────────────────────────────────────────────────────────
// Крок 7: оркестратор compute_staff_geometry (порт layoutStaffCanvas.ts:43)
// ─────────────────────────────────────────────────────────────────────────────

/// Лідерство керівної орг (ярус 1): голова + її прямі admin-підлеглі в цій орг
/// (canvasLayout.ts:27).
fn leadership_of(
    head_id: &str,
    org_positions: &[StaffPositionInput],
    reports: &[StaffEdgeInput],
) -> Vec<StaffPositionInput> {
    let direct: HashSet<&str> = reports
        .iter()
        .filter(|r| r.kind == "admin" && r.from_id == head_id)
        .map(|r| r.to_id.as_str())
        .collect();
    org_positions
        .iter()
        .filter(|p| p.id == head_id || direct.contains(p.id.as_str()))
        .cloned()
        .collect()
}

/// Голова орг для крос-тирних конекторів (canvasLayout.ts:235): resolveStaffHead,
/// інакше — перший композований вузол цієї орг.
fn head_id_of(
    positions: &[StaffPositionInput],
    org_id: &str,
    reports: &[StaffEdgeInput],
    composed: &[StaffNodeGeo],
) -> Option<String> {
    match resolve_staff_head(positions, org_id, reports) {
        Ok(h) => Some(h),
        Err(_) => composed
            .iter()
            .find(|n| n.organization_id == org_id)
            .map(|n| n.id.clone()),
    }
}

/// Рамки відділів із композованих вузлів: групування за `department_id` (part_index
/// = None — magnetic-розріз B5 робить TS). Рамка = `department_frame` (R3) над
/// світовими боксами членів; header=0 (контракт не несе dept-header), pad=content_padding.
fn department_frames_from_nodes(
    nodes: &[StaffNodeGeo],
    content_padding: f32,
) -> Vec<StaffDepartmentFrameGeo> {
    let mut order: Vec<String> = Vec::new();
    let mut by_dept: HashMap<String, Vec<StaffNodeGeo>> = HashMap::new();
    for n in nodes {
        if let Some(dept) = &n.department_id {
            if !by_dept.contains_key(dept) {
                order.push(dept.clone());
            }
            by_dept.entry(dept.clone()).or_default().push(n.clone());
        }
    }
    order
        .into_iter()
        .filter_map(|dept| {
            let members = by_dept.get(&dept)?;
            department_frame(&dept, members, content_padding, 0.0, None)
        })
        .collect()
}

/// Повна staff-геометрія для `current_org_id` (порт `layoutStaffCanvas`): яруси 1/2/3,
/// межі, рамки відділів, ребра й маршрути — єдиний `StaffGeometryResult`.
/// **ЛИШЕ tree** (контракт не несе member-координат; matrix/hybrid — TS-адаптер).
pub fn compute_staff_geometry(input: &StaffLayoutInput) -> Result<StaffGeometryResult, String> {
    let geom = Geom {
        node_width: input.options.node_width,
        node_height: input.options.node_height,
        horizontal_gap: input.options.horizontal_gap,
        vertical_gap: input.options.vertical_gap,
        ref_cell_width: input.options.ref_cell_width,
        ref_cell_height: input.options.ref_cell_height,
        margin: input.options.margin,
    };
    let sizes = size_map(&input.node_sizes);
    let departments = &input.departments;
    let dept_grouping = input.options.dept_grouping;
    let margin = geom.margin;

    let current = input
        .organizations
        .iter()
        .find(|o| o.id == input.current_org_id)
        .ok_or_else(|| format!("Unknown currentOrgId: {}", input.current_org_id))?;

    let mut diagnostics: Vec<String> = Vec::new();
    let mut tier_blocks: Vec<TierBlock> = Vec::new();
    let mut edges: Vec<StaffEdge> = Vec::new();

    // ── Ярус 1 — лідерство керівної орг ──────────────────────────────────────
    let managing_id: Option<String> = current.parent_org_id.clone();
    if let Some(mgr_id) = &managing_id {
        if input.organizations.iter().any(|o| &o.id == mgr_id) {
            let mgr_positions: Vec<StaffPositionInput> = input
                .positions
                .iter()
                .filter(|p| &p.organization_id == mgr_id)
                .cloned()
                .collect();
            let heads: Vec<&StaffPositionInput> =
                mgr_positions.iter().filter(|p| p.is_head).collect();
            if heads.len() == 1 {
                let head_id = heads[0].id.clone();
                let leadership = leadership_of(&head_id, &mgr_positions, &input.reports);
                let block1 = layout_staff_org_block(
                    &leadership,
                    &input.reports,
                    mgr_id,
                    departments,
                    dept_grouping,
                    &geom,
                    &sizes,
                )?;
                edges.extend(block1.edges.iter().cloned());
                diagnostics.extend(block1.diagnostics.iter().cloned());
                tier_blocks.push(TierBlock {
                    tier: 1,
                    head_id: Some(head_id),
                    organization_id: Some(mgr_id.clone()),
                    members: block1.nodes,
                    block_height: block1.height,
                    min_height: input.options.org_card_height,
                });
            } else if heads.len() > 1 {
                diagnostics.push(format!(
                    "Tier1 skipped: multiple isHead in managing org {mgr_id}"
                ));
            } else {
                diagnostics.push(format!("Tier1 skipped: no isHead in managing org {mgr_id}"));
            }
        }
    }

    // ── Ярус 2 — повний склад поточної орг ───────────────────────────────────
    let block2 = layout_staff_org_block(
        &input.positions,
        &input.reports,
        &input.current_org_id,
        departments,
        dept_grouping,
        &geom,
        &sizes,
    )?;
    let tier2_width = block2.width;
    edges.extend(block2.edges.iter().cloned());
    diagnostics.extend(block2.diagnostics.iter().cloned());
    let cur_head_id_tier: Option<String> = input
        .positions
        .iter()
        .find(|p| p.organization_id == input.current_org_id && p.is_head)
        .map(|p| p.id.clone());
    tier_blocks.push(TierBlock {
        tier: 2,
        head_id: cur_head_id_tier,
        organization_id: Some(input.current_org_id.clone()),
        members: block2.nodes,
        block_height: block2.height,
        min_height: geom.node_height + margin * 2.0,
    });

    // Стек ярусів 1/2 + recenter голови (compose_tiers робить і зсув ярусу-1).
    let composed = compose_tiers(
        &tier_blocks,
        margin,
        input.options.tier_gap,
        input.options.zone_label_band,
    );
    let mut nodes: Vec<StaffNodeGeo> = composed.nodes;
    let mut namespaces: Vec<StaffNamespace> = composed.namespaces;

    // ── Ярус 3 — картки дочірніх орг (+ expand-in-place) ─────────────────────
    let children: Vec<&StaffOrgInput> = input
        .organizations
        .iter()
        .filter(|o| o.parent_org_id.as_deref() == Some(input.current_org_id.as_str()))
        .collect();
    let child_ids: HashSet<&str> = children.iter().map(|c| c.id.as_str()).collect();
    // Контракт не несе maxExpandedOrgCards — застосовуємо список як є (cap = TS-адаптер).
    let expanded_set: HashSet<&str> = input
        .expanded_org_ids
        .iter()
        .map(String::as_str)
        .filter(|id| child_ids.contains(id))
        .collect();
    for id in input.expanded_org_ids.iter() {
        if !child_ids.contains(id.as_str()) {
            diagnostics.push(format!(
                "Tier3 expand ignored (not a child of {}): {id}",
                input.current_org_id
            ));
        }
    }

    let mut card_inputs: Vec<OrgCardInput> = Vec::new();
    for child in &children {
        let expanded = expanded_set.contains(child.id.as_str());
        let expanded_block = if expanded {
            let block = layout_staff_org_block(
                &input.positions,
                &input.reports,
                &child.id,
                departments,
                dept_grouping,
                &geom,
                &sizes,
            )?;
            edges.extend(block.edges.iter().cloned());
            diagnostics.extend(block.diagnostics.iter().cloned());
            Some(ExpandedBlock {
                members: block.nodes,
                width: block.width,
                height: block.height,
            })
        } else {
            None
        };
        card_inputs.push(OrgCardInput {
            org_id: child.id.clone(),
            expanded_block,
        });
    }

    let card_y = composed.content_bottom;
    let cards_result = compose_org_cards(
        card_y,
        &card_inputs,
        &OrgCardOptions {
            margin,
            horizontal_gap: geom.horizontal_gap,
            vertical_gap: geom.vertical_gap,
            org_card_width: input.options.org_card_width,
            org_card_height: input.options.org_card_height,
        },
    );
    let org_cards: Vec<StaffOrgCardGeo> = cards_result.cards;
    nodes.extend(cards_result.nodes);
    if let Some(ns) = cards_result.namespace {
        namespaces.push(ns);
    }
    let content_bottom = if children.is_empty() {
        composed.content_bottom
    } else {
        cards_result.content_bottom
    };

    // ── Розміри канви ────────────────────────────────────────────────────────
    let dims = canvas_dimensions(&nodes, &org_cards, tier2_width, margin, content_bottom);

    // ── Межі смуг-namespace (R5) ─────────────────────────────────────────────
    let namespaces = enrich_namespaces(
        &namespaces,
        &nodes,
        &org_cards,
        &BoundsOptions {
            margin,
            min_width: 0.0,
            canvas_width: dims.width,
            content_padding: input.options.content_padding,
            label_band: input.options.zone_label_band,
        },
    );

    // ── Крос-тирні ребра lead-org + декоративні matrix/dotted ────────────────
    let node_ids: HashSet<&str> = nodes.iter().map(|n| n.id.as_str()).collect();
    let mgr_head = managing_id
        .as_deref()
        .and_then(|m| head_id_of(&input.positions, m, &input.reports, &nodes));
    let cur_head = head_id_of(
        &input.positions,
        &input.current_org_id,
        &input.reports,
        &nodes,
    );
    if let (Some(mh), Some(ch)) = (&mgr_head, &cur_head) {
        if node_ids.contains(mh.as_str()) && node_ids.contains(ch.as_str()) {
            edges.push(StaffEdge {
                from_id: mh.clone(),
                to_id: ch.clone(),
                kind: "lead-org".to_string(),
            });
        }
    }
    if let Some(ch) = &cur_head {
        if node_ids.contains(ch.as_str()) {
            for card in &org_cards {
                edges.push(StaffEdge {
                    from_id: ch.clone(),
                    to_id: card.org_id.clone(),
                    kind: "lead-org".to_string(),
                });
            }
        }
    }
    for r in &input.reports {
        if r.kind != "matrix" && r.kind != "dotted" {
            continue;
        }
        if !node_ids.contains(r.from_id.as_str()) || !node_ids.contains(r.to_id.as_str()) {
            continue;
        }
        if edges
            .iter()
            .any(|e| e.from_id == r.from_id && e.to_id == r.to_id)
        {
            continue;
        }
        edges.push(StaffEdge {
            from_id: r.from_id.clone(),
            to_id: r.to_id.clone(),
            kind: r.kind.clone(),
        });
    }

    // ── Рамки відділів + маршрути ────────────────────────────────────────────
    let department_frames = department_frames_from_nodes(&nodes, input.options.content_padding);
    let frames_rect: Vec<FrameRect> = department_frames
        .iter()
        .map(|f| FrameRect {
            department_id: f.department_id.clone(),
            part_index: f.part_index,
            x: f.x,
            y: f.y,
            width: f.width,
            height: f.height,
        })
        .collect();
    let card_pad = if input.options.content_padding >= MIN_CARD_PAD {
        input.options.content_padding
    } else {
        0.0
    };
    let routes = staff_routes(&RouteInputs {
        persons: &nodes,
        org_cards: &org_cards,
        edges: &edges,
        lod: &input.lod,
        person_hints: &[],
        department_frames: &frames_rect,
        card_pad,
    });

    Ok(StaffGeometryResult {
        current_org_id: input.current_org_id.clone(),
        nodes,
        org_cards,
        namespaces,
        department_frames,
        edges,
        routes,
        width: dims.width,
        height: dims.height,
        diagnostics,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn geom() -> Geom {
        Geom {
            node_width: 136.0,
            node_height: 156.0,
            horizontal_gap: 20.0,
            vertical_gap: 28.0,
            ref_cell_width: 140.0,
            ref_cell_height: 160.0,
            margin: 32.0,
        }
    }

    fn pos(id: &str, org: &str, is_head: bool, dept: Option<&str>) -> StaffPositionInput {
        StaffPositionInput {
            id: id.to_string(),
            organization_id: org.to_string(),
            is_head,
            department_id: dept.map(str::to_string),
            order: None,
        }
    }

    fn pos_ord(id: &str, org: &str, dept: Option<&str>, order: f64) -> StaffPositionInput {
        StaffPositionInput {
            order: Some(order),
            ..pos(id, org, false, dept)
        }
    }

    fn admin(from: &str, to: &str) -> StaffEdgeInput {
        StaffEdgeInput {
            from_id: from.to_string(),
            to_id: to.to_string(),
            kind: "admin".to_string(),
        }
    }

    fn node_by<'a>(nodes: &'a [StaffNodeGeo], id: &str) -> &'a StaffNodeGeo {
        nodes.iter().find(|n| n.id == id).expect("node present")
    }

    fn empty_sizes() -> HashMap<String, (f32, f32)> {
        HashMap::new()
    }

    // ── Крок 1 helpers ──────────────────────────────────────────────────────

    #[test]
    fn resolve_head_single_is_head() {
        let ps = vec![pos("h", "o", true, None), pos("a", "o", false, None)];
        assert_eq!(resolve_staff_head(&ps, "o", &[]).unwrap(), "h");
    }

    #[test]
    fn resolve_head_single_parentless_when_no_is_head() {
        let ps = vec![pos("r", "o", false, None), pos("c", "o", false, None)];
        let reports = vec![admin("r", "c")];
        assert_eq!(resolve_staff_head(&ps, "o", &reports).unwrap(), "r");
    }

    #[test]
    fn resolve_head_errors_on_ambiguity() {
        let ps = vec![pos("a", "o", false, None), pos("b", "o", false, None)];
        assert!(resolve_staff_head(&ps, "o", &[]).is_err());
    }

    #[test]
    fn detached_roots_are_parentless_non_heads() {
        // h=head, c reports to h (attached), d has no parent (detached root).
        let ps = vec![
            pos("h", "o", true, None),
            pos("c", "o", false, None),
            pos("d", "o", false, None),
        ];
        let reports = vec![admin("h", "c")];
        let roots = detached_root_ids(&ps, &reports, "o", "h");
        assert_eq!(roots, vec!["d".to_string()]);
    }

    #[test]
    fn admin_descendants_include_self_and_subtree() {
        let ps = vec![
            pos("a", "o", false, None),
            pos("b", "o", false, None),
            pos("c", "o", false, None),
        ];
        let reports = vec![admin("a", "b"), admin("b", "c")];
        let set = admin_descendant_ids("a", &ps, &reports);
        assert_eq!(set.len(), 3);
        assert!(set.contains("a") && set.contains("b") && set.contains("c"));
    }

    // ── Крок 2: layout_connected_tree ────────────────────────────────────────

    #[test]
    fn connected_tree_empty_returns_empty() {
        let out =
            layout_connected_tree(&[], &[], "o", "r", &geom(), &empty_sizes(), "tree").unwrap();
        assert!(out.is_empty());
    }

    #[test]
    fn connected_tree_single_node_keeps_org_role_and_size_override() {
        let ps = vec![pos("r", "o", true, None)];
        let mut sizes = HashMap::new();
        sizes.insert("r".to_string(), (200.0, 90.0));
        let out = layout_connected_tree(&ps, &[], "o", "r", &geom(), &sizes, "tree").unwrap();
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].organization_id, "o");
        assert_eq!(out[0].role.as_deref(), Some("tree"));
        assert_eq!((out[0].width, out[0].height), (200.0, 90.0));
    }

    // Recenter (orgBlockLayout.ts:93-102): корінь центрується над bbox усіх вузлів.
    #[test]
    fn connected_tree_recenters_root_over_bbox() {
        let ps = vec![
            pos("r", "o", true, None),
            pos("a", "o", false, None),
            pos("b", "o", false, None),
        ];
        let reports = vec![admin("r", "a"), admin("r", "b")];
        let out = layout_connected_tree(&ps, &reports, "o", "r", &geom(), &empty_sizes(), "tree")
            .unwrap();
        let (mut min_x, mut max_x) = (f32::INFINITY, f32::NEG_INFINITY);
        for n in &out {
            min_x = min_x.min(n.x);
            max_x = max_x.max(n.x + n.width);
        }
        let root = node_by(&out, "r");
        let expected = (min_x + max_x) / 2.0 - root.width / 2.0;
        assert!(
            (root.x - expected).abs() < 1e-3,
            "root.x={} exp={}",
            root.x,
            expected
        );
    }

    // ── Крок 3: side column + tree block ─────────────────────────────────────

    #[test]
    fn side_column_offsets_groups_right_of_anchors() {
        let anchors = vec![StaffNodeGeo {
            id: "a".into(),
            organization_id: "o".into(),
            x: 32.0,
            y: 32.0,
            width: 136.0,
            height: 156.0,
            tier: 0,
            role: Some("tree".into()),
            depth: Some(0),
            department_id: None,
            part_index: None,
        }];
        let g = geom();
        let group = vec![StaffNodeGeo {
            id: "d".into(),
            organization_id: "o".into(),
            x: 10.0,
            y: 5.0,
            width: 136.0,
            height: 156.0,
            tier: 0,
            role: Some("detached".into()),
            depth: Some(0),
            department_id: None,
            part_index: None,
        }];
        let out = pack_side_column(&[group], &anchors, &g);
        assert_eq!(out.len(), 1);
        let anchor_max_x = 32.0 + 136.0;
        let offset_x = anchor_max_x + g.horizontal_gap + g.margin;
        assert_eq!(out[0].x, offset_x); // f.x - minFx + offsetX = 10-10+offset
        assert_eq!(out[0].role.as_deref(), Some("detached"));
    }

    #[test]
    fn tree_block_places_detached_right_of_attached() {
        // h head, c attached; d detached root.
        let ps = vec![
            pos("h", "o", true, None),
            pos("c", "o", false, None),
            pos("d", "o", false, None),
        ];
        let reports = vec![admin("h", "c")];
        let out =
            layout_tree_block(&ps, &reports, "o", &geom(), &empty_sizes(), "tree", None).unwrap();
        assert_eq!(out.len(), 3);
        let d = node_by(&out, "d");
        assert_eq!(d.role.as_deref(), Some("detached"));
        let attached_max_x = ["h", "c"]
            .iter()
            .map(|id| {
                let n = node_by(&out, id);
                n.x + n.width
            })
            .fold(f32::NEG_INFINITY, f32::max);
        assert!(
            d.x >= attached_max_x,
            "detached d.x={} < attached_max={}",
            d.x,
            attached_max_x
        );
    }

    // ── Крок 4: dept grouping ────────────────────────────────────────────────

    #[test]
    fn dept_grouping_places_second_dept_right_and_stamps_dept() {
        let ps = vec![
            pos("a1", "o", false, Some("A")),
            pos("b1", "o", false, Some("B")),
        ];
        let depts = vec![
            crate::types::StaffDepartmentInput {
                id: "A".into(),
                order: None,
            },
            crate::types::StaffDepartmentInput {
                id: "B".into(),
                order: None,
            },
        ];
        let out =
            group_staff_by_department(&ps, &[], &depts, "o", &geom(), &empty_sizes()).unwrap();
        assert_eq!(out.len(), 2);
        let a1 = node_by(&out, "a1");
        let b1 = node_by(&out, "b1");
        assert_eq!(a1.department_id.as_deref(), Some("A"));
        assert_eq!(b1.department_id.as_deref(), Some("B"));
        assert!(
            b1.x > a1.x,
            "second dept must be to the right: b1.x={} a1.x={}",
            b1.x,
            a1.x
        );
    }

    // gap #1/#2: dept.order перекриває id-алфавіт. "A"(order 2) vs "B"(order 1) →
    // compareDepartments ставить B лівіше A, попри алфавіт. Перевіряємо x-розкладку.
    #[test]
    fn dept_grouping_order_overrides_id_alphabet() {
        let ps = vec![
            pos("a1", "o", false, Some("A")),
            pos("b1", "o", false, Some("B")),
        ];
        let depts = vec![
            crate::types::StaffDepartmentInput {
                id: "A".into(),
                order: Some(2.0),
            },
            crate::types::StaffDepartmentInput {
                id: "B".into(),
                order: Some(1.0),
            },
        ];
        let out =
            group_staff_by_department(&ps, &[], &depts, "o", &geom(), &empty_sizes()).unwrap();
        let a1 = node_by(&out, "a1");
        let b1 = node_by(&out, "b1");
        // B (order 1) лівіше за A (order 2), хоча "A" < "B" алфавітно.
        assert!(
            b1.x < a1.x,
            "order must override id: b1.x={} a1.x={}",
            b1.x,
            a1.x
        );
    }

    // gap #2 (member sibling-order): дві sibling-посади під спільним parent мають `order`,
    // що дає порядок ВІДМІННИЙ від id-алфавіту. comparePositions=(parent, order, id) ⇒ sibling-
    // канал row-tree іде за order: "za"(order 1) ЛІВІШЕ за "ab"(order 2), хоча "ab"<"za" алфавітно.
    #[test]
    fn dept_grouping_member_sibling_order_follows_order_not_id() {
        let ps = vec![
            pos("h", "o", true, Some("D")),
            pos_ord("za", "o", Some("D"), 1.0),
            pos_ord("ab", "o", Some("D"), 2.0),
        ];
        let reports = vec![admin("h", "za"), admin("h", "ab")];
        let depts = vec![crate::types::StaffDepartmentInput {
            id: "D".into(),
            order: None,
        }];
        let out =
            group_staff_by_department(&ps, &reports, &depts, "o", &geom(), &empty_sizes()).unwrap();
        let za = node_by(&out, "za");
        let ab = node_by(&out, "ab");
        assert!(
            za.x < ab.x,
            "sibling order must follow `order` not id: za.x={} ab.x={}",
            za.x,
            ab.x
        );
        // Контроль: з переставленими order порядок інвертується (не залежить від id).
        let ps2 = vec![
            pos("h", "o", true, Some("D")),
            pos_ord("za", "o", Some("D"), 2.0),
            pos_ord("ab", "o", Some("D"), 1.0),
        ];
        let out2 = group_staff_by_department(&ps2, &reports, &depts, "o", &geom(), &empty_sizes())
            .unwrap();
        assert!(node_by(&out2, "ab").x < node_by(&out2, "za").x);
    }

    // gap #6: departmentId не серед оголошених → no-dept bucket (не викидається).
    #[test]
    fn dept_grouping_unknown_department_falls_back_to_no_dept() {
        let ps = vec![
            pos("a1", "o", false, Some("A")),
            pos("u1", "o", false, Some("GHOST")), // "GHOST" не оголошено
        ];
        let depts = vec![crate::types::StaffDepartmentInput {
            id: "A".into(),
            order: None,
        }];
        let out =
            group_staff_by_department(&ps, &[], &depts, "o", &geom(), &empty_sizes()).unwrap();
        // u1 НЕ викинуто; він у no-dept bucket (department_id = None).
        assert_eq!(
            out.len(),
            2,
            "unknown-dept member must survive in no-dept bucket"
        );
        assert_eq!(node_by(&out, "u1").department_id, None);
        assert_eq!(node_by(&out, "a1").department_id.as_deref(), Some("A"));
    }

    // item #6: eject-петля pack_side_column чутлива до порядку обробки. Два боксы в одній
    // групі з однаковим (x,y) → другий (у відсортованому порядку) виштовхується ВНИЗ рівно
    // на node_height+vertical_gap (orgBlockLayout.ts:144-153). Точний ejected-y + детермінізм.
    #[test]
    fn side_column_collision_ejects_second_box_down_deterministically() {
        let g = geom();
        let mk = |id: &str| StaffNodeGeo {
            id: id.into(),
            organization_id: "o".into(),
            x: 0.0,
            y: 0.0,
            width: 136.0,
            height: 156.0,
            tier: 0,
            role: Some("detached".into()),
            depth: Some(0),
            department_id: None,
            part_index: None,
        };
        // Один груп із двома боксами в тій самій точці → колізія.
        let group = vec![mk("x"), mk("y")];
        let run = || pack_side_column(std::slice::from_ref(&group), &[], &g);
        let out = run();
        assert_eq!(out.len(), 2);
        let offset_x = g.horizontal_gap + g.margin; // anchors empty → anchor_max_x=0
        let first = &out[0];
        let second = &out[1];
        // Перший сідає на (offset_x, margin); другий виштовхнутий рівно на один рядок.
        assert_eq!((first.x, first.y), (offset_x, g.margin));
        assert_eq!(second.x, offset_x);
        assert_eq!(second.y, g.margin + g.node_height + g.vertical_gap);
        // Детермінізм: той самий порядок/координати двічі.
        let a: Vec<_> = run().iter().map(|n| (n.id.clone(), n.x, n.y)).collect();
        let b: Vec<_> = run().iter().map(|n| (n.id.clone(), n.x, n.y)).collect();
        assert_eq!(a, b);
    }

    #[test]
    fn dept_grouping_no_department_bucket_last_and_unstamped() {
        let ps = vec![
            pos("a1", "o", false, Some("A")),
            pos("n1", "o", false, None),
        ];
        let depts = vec![crate::types::StaffDepartmentInput {
            id: "A".into(),
            order: None,
        }];
        let out =
            group_staff_by_department(&ps, &[], &depts, "o", &geom(), &empty_sizes()).unwrap();
        let n1 = node_by(&out, "n1");
        assert_eq!(n1.department_id, None);
    }

    // ── Крок 5: external managers ────────────────────────────────────────────

    #[test]
    fn pin_external_pushes_block_down_and_adds_edge() {
        // Block of org "o" with one node; external mgr "m" in org "x" manages "c".
        let in_org = vec![pos("c", "o", true, None)];
        let reports = vec![admin("m", "c")];
        let g = geom();
        let block = StaffBlock {
            organization_id: "o".into(),
            nodes: vec![StaffNodeGeo {
                id: "c".into(),
                organization_id: "o".into(),
                x: 32.0,
                y: 32.0,
                width: 136.0,
                height: 156.0,
                tier: 0,
                role: Some("tree".into()),
                depth: Some(0),
                department_id: None,
                part_index: None,
            }],
            edges: vec![],
            width: 200.0,
            height: 220.0,
            diagnostics: vec![],
        };
        let mut known = HashSet::new();
        known.insert("m".to_string());
        known.insert("c".to_string());
        let out = pin_external_managers(block, &in_org, &reports, &known, &g);
        let row = g.node_height + g.vertical_gap;
        assert_eq!(node_by(&out.nodes, "c").y, 32.0 + row);
        let m = node_by(&out.nodes, "m");
        assert_eq!(m.role.as_deref(), Some("external"));
        assert_eq!((m.x, m.y), (g.margin, g.margin));
        assert!(out
            .edges
            .iter()
            .any(|e| e.from_id == "m" && e.to_id == "c" && e.kind == "admin"));
        assert_eq!(out.height, 220.0 + row);
    }

    #[test]
    fn pin_external_skipped_when_manager_unknown() {
        let in_org = vec![pos("c", "o", true, None)];
        let reports = vec![admin("m", "c")];
        let g = geom();
        let block = StaffBlock {
            organization_id: "o".into(),
            nodes: vec![StaffNodeGeo {
                id: "c".into(),
                organization_id: "o".into(),
                x: 32.0,
                y: 32.0,
                width: 136.0,
                height: 156.0,
                tier: 0,
                role: Some("tree".into()),
                depth: Some(0),
                department_id: None,
                part_index: None,
            }],
            edges: vec![],
            width: 200.0,
            height: 220.0,
            diagnostics: vec![],
        };
        let known: HashSet<String> = ["c".to_string()].into_iter().collect();
        let out = pin_external_managers(block, &in_org, &reports, &known, &g);
        // mgr not known → unchanged
        assert_eq!(node_by(&out.nodes, "c").y, 32.0);
        assert_eq!(out.nodes.len(), 1);
    }

    // ── Крок 6: layout_staff_org_block ───────────────────────────────────────

    #[test]
    fn org_block_empty_org_returns_zero() {
        let block =
            layout_staff_org_block(&[], &[], "o", &[], false, &geom(), &empty_sizes()).unwrap();
        assert!(block.nodes.is_empty());
        assert_eq!((block.width, block.height), (0.0, 0.0));
    }

    #[test]
    fn org_block_single_position_tree() {
        let ps = vec![pos("h", "o", true, None)];
        let block =
            layout_staff_org_block(&ps, &[], "o", &[], false, &geom(), &empty_sizes()).unwrap();
        assert_eq!(block.nodes.len(), 1);
        assert_eq!(block.organization_id, "o");
        // bounds = maxX+margin, maxY+margin ; node width/height default
        assert!(block.width > 0.0 && block.height > 0.0);
    }

    #[test]
    fn org_block_filters_other_orgs() {
        let ps = vec![pos("h", "o", true, None), pos("x1", "other", true, None)];
        let block =
            layout_staff_org_block(&ps, &[], "o", &[], false, &geom(), &empty_sizes()).unwrap();
        assert_eq!(block.nodes.len(), 1);
        assert_eq!(block.nodes[0].id, "h");
    }

    #[test]
    fn org_block_determinism_identical_twice() {
        let ps = vec![
            pos("h", "o", true, None),
            pos("a", "o", false, None),
            pos("b", "o", false, None),
            pos("d", "o", false, None),
        ];
        let reports = vec![admin("h", "a"), admin("h", "b")];
        let run = || {
            layout_staff_org_block(&ps, &reports, "o", &[], false, &geom(), &empty_sizes())
                .unwrap()
                .nodes
                .iter()
                .map(|n| (n.id.clone(), n.x, n.y))
                .collect::<Vec<_>>()
        };
        assert_eq!(run(), run());
    }

    // ── Крок 7: оркестратор compute_staff_geometry ───────────────────────────

    fn metrics() -> crate::types::StaffLayoutMetrics {
        crate::types::StaffLayoutMetrics {
            node_width: 136.0,
            node_height: 156.0,
            ref_cell_width: 140.0,
            ref_cell_height: 160.0,
            horizontal_gap: 20.0,
            vertical_gap: 28.0,
            margin: 32.0,
            tier_gap: 36.0,
            org_card_width: 200.0,
            org_card_height: 64.0,
            zone_label_band: 0.0,
            content_padding: 0.0,
            dept_grouping: false,
        }
    }

    fn org(id: &str, parent: Option<&str>) -> StaffOrgInput {
        StaffOrgInput {
            id: id.to_string(),
            parent_org_id: parent.map(str::to_string),
        }
    }

    fn input(
        current: &str,
        positions: Vec<StaffPositionInput>,
        reports: Vec<StaffEdgeInput>,
        orgs: Vec<StaffOrgInput>,
        departments: Vec<crate::types::StaffDepartmentInput>,
    ) -> StaffLayoutInput {
        StaffLayoutInput {
            current_org_id: current.to_string(),
            positions,
            reports,
            organizations: orgs,
            departments,
            node_sizes: Vec::new(),
            options: metrics(),
            edge_ports: Vec::new(),
            expanded_org_ids: Vec::new(),
            lod: "near".to_string(),
        }
    }

    #[test]
    fn orchestrator_unknown_current_org_errors() {
        let inp = input(
            "missing",
            vec![pos("h", "o", true, None)],
            vec![],
            vec![org("o", None)],
            vec![],
        );
        assert!(compute_staff_geometry(&inp).is_err());
    }

    #[test]
    fn orchestrator_single_org_tier2_only() {
        let inp = input(
            "o",
            vec![pos("h", "o", true, None), pos("c", "o", false, None)],
            vec![admin("h", "c")],
            vec![org("o", None)],
            vec![],
        );
        let r = compute_staff_geometry(&inp).unwrap();
        assert_eq!(r.current_org_id, "o");
        assert_eq!(r.nodes.len(), 2);
        assert!(r.nodes.iter().all(|n| n.tier == 2));
        // one namespace, tier 2, with filled bounds (width>0)
        assert_eq!(r.namespaces.len(), 1);
        assert_eq!(r.namespaces[0].tier, 2);
        assert!(r.namespaces[0].width > 0.0);
        assert!(r.width > 0.0 && r.height > 0.0);
        assert!(r.org_cards.is_empty());
        // admin edge present (from block)
        assert!(r
            .edges
            .iter()
            .any(|e| e.from_id == "h" && e.to_id == "c" && e.kind == "admin"));
    }

    #[test]
    fn orchestrator_determinism_identical_twice() {
        let inp = input(
            "o",
            vec![
                pos("h", "o", true, None),
                pos("a", "o", false, None),
                pos("b", "o", false, None),
            ],
            vec![admin("h", "a"), admin("h", "b")],
            vec![org("o", None)],
            vec![],
        );
        let run = || {
            let r = compute_staff_geometry(&inp).unwrap();
            (
                r.nodes
                    .iter()
                    .map(|n| (n.id.clone(), n.x, n.y, n.tier))
                    .collect::<Vec<_>>(),
                r.width,
                r.height,
            )
        };
        assert_eq!(run(), run());
    }

    #[test]
    fn orchestrator_managing_tier1_and_lead_org_edge() {
        // mgr org "m" with head "mh"; current "o" child of "m" with head "oh".
        let inp = input(
            "o",
            vec![pos("mh", "m", true, None), pos("oh", "o", true, None)],
            vec![],
            vec![org("m", None), org("o", Some("m"))],
            vec![],
        );
        let r = compute_staff_geometry(&inp).unwrap();
        // tier1 node present
        assert!(r.nodes.iter().any(|n| n.id == "mh" && n.tier == 1));
        assert!(r.nodes.iter().any(|n| n.id == "oh" && n.tier == 2));
        // two namespaces (tier 1 and 2)
        assert_eq!(r.namespaces.len(), 2);
        // lead-org edge mgr head → cur head
        assert!(r
            .edges
            .iter()
            .any(|e| e.from_id == "mh" && e.to_id == "oh" && e.kind == "lead-org"));
    }

    #[test]
    fn orchestrator_tier3_cards_and_lead_org_to_cards() {
        // current "o" head "oh"; children "c1","c2" with no expand.
        let inp = input(
            "o",
            vec![
                pos("oh", "o", true, None),
                pos("x1", "c1", true, None),
                pos("x2", "c2", true, None),
            ],
            vec![],
            vec![org("o", None), org("c1", Some("o")), org("c2", Some("o"))],
            vec![],
        );
        let r = compute_staff_geometry(&inp).unwrap();
        assert_eq!(r.org_cards.len(), 2);
        // tier3 namespace present (org-cards)
        assert!(r.namespaces.iter().any(|n| n.kind == "org-cards"));
        // lead-org edges from cur head to each card
        for card in ["c1", "c2"] {
            assert!(r
                .edges
                .iter()
                .any(|e| e.from_id == "oh" && e.to_id == card && e.kind == "lead-org"));
        }
        // collapsed children do not place their staff on tier 3
        assert!(r.nodes.iter().all(|n| n.tier != 3));
    }

    #[test]
    fn orchestrator_expanded_child_places_staff_tier3() {
        let mut inp = input(
            "o",
            vec![pos("oh", "o", true, None), pos("x1", "c1", true, None)],
            vec![],
            vec![org("o", None), org("c1", Some("o"))],
            vec![],
        );
        inp.expanded_org_ids = vec!["c1".to_string()];
        let r = compute_staff_geometry(&inp).unwrap();
        assert!(r.nodes.iter().any(|n| n.id == "x1" && n.tier == 3));
    }

    #[test]
    fn orchestrator_dept_grouping_emits_frames() {
        let mut inp = input(
            "o",
            vec![
                pos("oh", "o", true, Some("A")),
                pos("b1", "o", false, Some("B")),
            ],
            vec![],
            vec![org("o", None)],
            vec![
                crate::types::StaffDepartmentInput {
                    id: "A".into(),
                    order: None,
                },
                crate::types::StaffDepartmentInput {
                    id: "B".into(),
                    order: None,
                },
            ],
        );
        inp.options.dept_grouping = true;
        inp.options.content_padding = 12.0;
        let r = compute_staff_geometry(&inp).unwrap();
        let dept_ids: Vec<&str> = r
            .department_frames
            .iter()
            .map(|f| f.department_id.as_str())
            .collect();
        assert!(dept_ids.contains(&"A") && dept_ids.contains(&"B"));
        // frames expand around member bbox (width>0)
        assert!(r
            .department_frames
            .iter()
            .all(|f| f.width > 0.0 && f.height > 0.0));
    }

    // Точний паритет арифметики композиції (canvasLayout.ts:114-118): ярус-2 без
    // ярусу-1 зсувається рівно на cursorY=margin (+band=0), x не змінюється (нема recenter).
    #[test]
    fn orchestrator_tier2_shift_equals_block_plus_margin() {
        let positions = vec![pos("h", "o", true, None), pos("c", "o", false, None)];
        let reports = vec![admin("h", "c")];
        let block = layout_staff_org_block(
            &positions,
            &reports,
            "o",
            &[],
            false,
            &geom(),
            &empty_sizes(),
        )
        .unwrap();
        let inp = input("o", positions, reports, vec![org("o", None)], vec![]);
        let r = compute_staff_geometry(&inp).unwrap();
        for bn in &block.nodes {
            let rn = node_by(&r.nodes, &bn.id);
            assert_eq!(rn.y, bn.y + metrics().margin, "node {} y shift", bn.id);
            assert_eq!(rn.x, bn.x, "node {} x unchanged", bn.id);
            assert_eq!(rn.tier, 2);
        }
    }

    #[test]
    fn orchestrator_zero_positions_current_empty_but_valid() {
        // current org declared but no positions in it → empty tier2 block.
        let inp = input("o", vec![], vec![], vec![org("o", None)], vec![]);
        let r = compute_staff_geometry(&inp).unwrap();
        assert!(r.nodes.is_empty());
        // width/height fall back to margin floor, finite
        assert!(r.width.is_finite() && r.height.is_finite());
    }
}
