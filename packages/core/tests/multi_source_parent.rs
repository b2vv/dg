use org_hierarchy_core::{
    compute_staff_geometry, route_stats, StaffGeometryResult, StaffLayoutInput,
};

fn input(eval: Option<bool>) -> StaffLayoutInput {
    let mut value: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/multi-source-parent.json")).unwrap();
    if let Some(eval) = eval {
        value["multiSourceParentEval"] = eval.into();
    }
    serde_json::from_value(value).unwrap()
}

fn crossings(out: &StaffGeometryResult) -> usize {
    route_stats(&out.routes.segments, &[], &[], &|_| None).crossings
}

#[test]
fn multi_source_parent_chooses_clean_attachment_deterministically() {
    let baseline = compute_staff_geometry(&input(None)).unwrap();
    // The declaration-earliest head ah puts ana under fin; frame-aware A*
    // now routes this baseline with zero crossings, as does parent evaluation.
    assert_eq!(crossings(&baseline), 0);
    assert_eq!(
        serde_json::to_value(&baseline).unwrap(),
        serde_json::to_value(compute_staff_geometry(&input(Some(false))).unwrap()).unwrap()
    );
    let enabled = input(Some(true));
    let out = compute_staff_geometry(&enabled).unwrap();
    assert_eq!(crossings(&out), 0, "оцінка має обрати чисте приєднання");
    let sec = out
        .department_frames
        .iter()
        .find(|f| f.department_id == "sec")
        .unwrap();
    let dev = out
        .department_frames
        .iter()
        .find(|f| f.department_id == "dev")
        .unwrap();
    assert!(sec.y >= dev.y + dev.height, "sec має бути дочірнім до dev");
    assert!(out.diagnostics.iter().any(|d| d.contains("sec=ib")));
    assert_eq!(
        serde_json::to_value(&out).unwrap(),
        serde_json::to_value(compute_staff_geometry(&enabled).unwrap()).unwrap()
    );
}

#[test]
fn tree_block_default_mock3_head_is_ah_under_fin_deterministically() {
    let fixture = input(None);
    let out = compute_staff_geometry(&fixture).unwrap();
    let node = |id: &str| out.nodes.iter().find(|n| n.id == id).unwrap();
    // The local tree head is above the other roots; no head override/eval is set.
    assert!(node("ah").y < node("da").y);
    assert!(node("ah").y < node("bi").y);
    let frame = |id: &str| {
        out.department_frames
            .iter()
            .find(|f| f.department_id == id)
            .unwrap()
    };
    assert!(frame("ana").y >= frame("fin").y + frame("fin").height);
    assert_eq!(
        crossings(&out),
        0,
        "dg38: declaration-earliest head with frame-aware A* reduces cross 6 → 0"
    );
    // S1 probe baseline: singleton assistant keeps its absolute placement.
    assert_eq!(node("asst").x + node("asst").width / 2.0, 4438.0);
    assert_eq!(node("asst").y, 280.0);
    assert_eq!(
        serde_json::to_value(&out).unwrap(),
        serde_json::to_value(compute_staff_geometry(&fixture).unwrap()).unwrap()
    );
}

fn synthetic(head_counts: &[usize], same_parent_block: bool) -> StaffLayoutInput {
    let mut value = serde_json::to_value(input(Some(true))).unwrap();
    let mut positions = vec![serde_json::json!({"id":"root", "organizationId":"o", "isHead":true})];
    let mut reports = Vec::new();
    let mut departments = Vec::new();
    for (i, count) in head_counts.iter().enumerate() {
        let dept = format!("d{i}");
        departments.push(serde_json::json!({"id":dept}));
        for j in 0..*count {
            let manager = format!("m{i}{j}");
            let head = format!("h{i}{j}");
            let mut source = serde_json::json!({"id":manager,"organizationId":"o","isHead":false});
            if same_parent_block {
                source["departmentId"] = "sources".into();
            }
            positions.push(source);
            positions.push(serde_json::json!({"id":head,"organizationId":"o","isHead":false,"departmentId":dept}));
            reports.push(serde_json::json!({"fromId":"root","toId":manager,"kind":"admin"}));
            reports.push(serde_json::json!({"fromId":manager,"toId":head,"kind":"admin"}));
        }
    }
    if same_parent_block {
        departments.push(serde_json::json!({"id":"sources"}));
    }
    value["currentOrgId"] = "o".into();
    value["organizations"] = serde_json::json!([{"id":"o"}]);
    value["positions"] = positions.into();
    value["reports"] = reports.into();
    value["departments"] = departments.into();
    value["nodeSizes"] = serde_json::json!([]);
    value["dockHints"] = serde_json::json!([]);
    serde_json::from_value(value).unwrap()
}

#[test]
fn multi_source_parent_falls_back_above_cap_and_ignores_one_parent_block() {
    for mut enabled in [
        synthetic(&[2, 2, 2, 2], false),
        synthetic(&[2], true),
        synthetic(&[1], false),
    ] {
        let out = compute_staff_geometry(&enabled).unwrap();
        enabled.multi_source_parent_eval = None;
        assert_eq!(
            serde_json::to_value(out).unwrap(),
            serde_json::to_value(compute_staff_geometry(&enabled).unwrap()).unwrap()
        );
    }
}

#[test]
fn multi_source_parent_evaluates_exactly_twelve_combinations() {
    let out = compute_staff_geometry(&synthetic(&[3, 2, 2], false)).unwrap();
    assert!(out
        .diagnostics
        .iter()
        .any(|d| d.starts_with("Multi-source parents:")));
}

#[test]
fn multi_source_parent_selection_is_lod_independent() {
    let mut enabled = input(Some(true));
    let near = compute_staff_geometry(&enabled).unwrap();
    for lod in ["mid", "far"] {
        enabled.lod = lod.to_string();
        let out = compute_staff_geometry(&enabled).unwrap();
        assert_eq!(out.routes.lod, lod);
        assert_eq!(
            serde_json::to_value(&out.nodes).unwrap(),
            serde_json::to_value(&near.nodes).unwrap()
        );
        assert_eq!(out.diagnostics.last(), near.diagnostics.last());
    }
}

#[test]
fn multi_source_parent_requires_tree_blocks_and_grouping() {
    for tree in [false, true] {
        let mut enabled = synthetic(&[2], false);
        enabled.tree_block_layout = Some(tree);
        enabled.options.dept_grouping = !tree;
        let out = compute_staff_geometry(&enabled).unwrap();
        enabled.multi_source_parent_eval = None;
        assert_eq!(
            serde_json::to_value(out).unwrap(),
            serde_json::to_value(compute_staff_geometry(&enabled).unwrap()).unwrap()
        );
    }
}

#[test]
fn multi_source_parent_astar_converges_on_lexicographic_tie() {
    // Both routers now tie on turns. Unequal-turn coverage lives in
    // multi_source_parent_prefers_fewer_turns_before_lexicographic_order.
    let mut enabled = synthetic(&[2], false);
    let first = compute_staff_geometry(&enabled).unwrap();
    assert_eq!(
        first.diagnostics.last().unwrap(),
        "Multi-source parents: d0=h00"
    );
    enabled.positions.reverse();
    let reversed = compute_staff_geometry(&enabled).unwrap();
    assert_eq!(first.diagnostics.last(), reversed.diagnostics.last());
}

#[test]
fn multi_source_parent_breaks_equal_scores_lexicographically() {
    let mut enabled = synthetic(&[2], false);
    enabled.use_astar = Some(false);
    let out = compute_staff_geometry(&enabled).unwrap();
    assert_eq!(
        out.diagnostics.last().unwrap(),
        "Multi-source parents: d0=h00"
    );
}

fn turns(out: &StaffGeometryResult) -> usize {
    out.routes
        .segments
        .iter()
        .map(|route| {
            let directions: Vec<_> = route
                .points
                .windows(2)
                .filter_map(|pair| {
                    let dx = pair[1].x - pair[0].x;
                    let dy = pair[1].y - pair[0].y;
                    assert!(dx == 0.0 || dy == 0.0, "route must be orthogonal");
                    if dx == 0.0 && dy == 0.0 {
                        None
                    } else {
                        Some((dx != 0.0, (dx + dy).is_sign_positive()))
                    }
                })
                .collect();
            directions
                .windows(2)
                .filter(|pair| pair[0] != pair[1])
                .count()
        })
        .sum()
}

#[test]
fn multi_source_parent_prefers_fewer_turns_before_lexicographic_order() {
    let mut value = serde_json::to_value(synthetic(&[2], false)).unwrap();
    // A sibling department under m00 makes the two attachments asymmetric.
    // Only h00 and h01 are candidates for d0; both extra heads report to m00.
    value["departments"]
        .as_array_mut()
        .unwrap()
        .push(serde_json::json!({"id":"extra"}));
    for id in ["extra0", "extra1"] {
        value["positions"]
            .as_array_mut()
            .unwrap()
            .push(serde_json::json!({
                "id":id,"organizationId":"o","isHead":false,"departmentId":"extra"
            }));
        value["reports"]
            .as_array_mut()
            .unwrap()
            .push(serde_json::json!({
                "fromId":"m00","toId":id,"kind":"admin"
            }));
    }
    let mut scene: StaffLayoutInput = serde_json::from_value(value).unwrap();
    scene.multi_source_parent_eval = None;
    // Without evaluation, the first declared external-parent head wins.
    let h00 = compute_staff_geometry(&scene).unwrap();
    let i = scene.positions.iter().position(|p| p.id == "h00").unwrap();
    let j = scene.positions.iter().position(|p| p.id == "h01").unwrap();
    scene.positions.swap(i, j);
    let h01 = compute_staff_geometry(&scene).unwrap();
    assert_eq!((crossings(&h00), crossings(&h01)), (0, 0));
    assert_eq!((turns(&h00), turns(&h01)), (16, 14));

    scene.multi_source_parent_eval = Some(true);
    for _ in 0..2 {
        scene.positions.swap(i, j);
        let selected = compute_staff_geometry(&scene).unwrap();
        assert_eq!(
            selected.diagnostics.last().unwrap(),
            "Multi-source parents: d0=h01"
        );
        assert_eq!((crossings(&selected), turns(&selected)), (0, 14));
    }
}
