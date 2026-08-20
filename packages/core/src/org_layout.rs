use crate::hierarchy::build_from_flat;
use crate::layout::compute_tree_layout;
use crate::org_tree::{extract_subtree, validate_org_hierarchy, OrgTreeError};
use crate::types::{
    FlatNodeInput, LayoutOptions, OrgFlatInput, OrgRowTreeLayoutResult,
};

pub fn compute_org_row_tree_layout(
    organizations: Vec<OrgFlatInput>,
    expanded_root_id: &str,
    opts: &LayoutOptions,
) -> Result<OrgRowTreeLayoutResult, OrgTreeError> {
    validate_org_hierarchy(&organizations)?;
    let subtree = extract_subtree(&organizations, expanded_root_id)?;

    let flat: Vec<FlatNodeInput> = subtree
        .iter()
        .map(|o| FlatNodeInput {
            id: o.id.clone(),
            parent_id: if o.id == expanded_root_id {
                None
            } else {
                o.parent_org_id.clone()
            },
            label: o.name.clone(),
            node_type: Some("organization".into()),
            position: None,
            person: None,
            department: None,
            status: None,
        })
        .collect();

    let root = build_from_flat(flat)
        .map_err(|e| OrgTreeError::UnknownOrg(format!("{expanded_root_id}: {e}")))?;

    let layout = compute_tree_layout(&root, opts);
    Ok(OrgRowTreeLayoutResult {
        mode: "row-tree".into(),
        nodes: layout.nodes,
        edges: layout.edges,
        width: layout.width,
        height: layout.height,
        direction: layout.direction,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::LayoutOptions;

    fn org(id: &str, parent: Option<&str>, name: &str) -> OrgFlatInput {
        OrgFlatInput {
            id: id.into(),
            parent_org_id: parent.map(str::to_string),
            name: name.into(),
        }
    }

    fn default_opts() -> LayoutOptions {
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
    fn layout_success_depth_monotonic() {
        let orgs = vec![
            org("r", None, "Root"),
            org("c1", Some("r"), "C1"),
            org("c2", Some("c1"), "C2"),
        ];
        let result = compute_org_row_tree_layout(orgs, "r", &default_opts()).unwrap();
        assert_eq!(result.mode, "row-tree");
        assert_eq!(result.nodes.len(), 3);

        let depths: Vec<u32> = result.nodes.iter().map(|n| n.depth).collect();
        assert!(depths.contains(&0));
        assert!(depths.contains(&2));
    }

    #[test]
    fn layout_failure_unknown_root() {
        let orgs = vec![org("a", None, "A")];
        let err = compute_org_row_tree_layout(orgs, "missing", &default_opts()).unwrap_err();
        assert!(matches!(err, OrgTreeError::UnknownOrg(_)));
    }
}
