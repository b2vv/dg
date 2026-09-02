mod contour;
mod hierarchy;
mod org_layout;
mod org_tree;
mod ploeg_layout;
mod types;

use serde_wasm_bindgen::{from_value, to_value};
use wasm_bindgen::prelude::*;

pub use contour::{compute_all_contours, compute_dept_contour};
pub use hierarchy::build_from_flat;
pub use org_layout::compute_org_row_tree_layout;
pub use org_tree::{extract_subtree, validate_org_hierarchy, OrgTreeError};
pub use types::*;

/// Row-tree layout для org: validate → subtree → Ploeg layered tidy
// Eight parameters because they *are* the TS↔WASM contract for this call.
// Collapsing them into one object changes the boundary the manifest calls out by
// name, so it is a decision with a pipeline, not a lint fix.
#[allow(clippy::too_many_arguments)]
#[wasm_bindgen(js_name = computeOrgRowTreeLayout)]
pub fn wasm_compute_org_row_tree_layout(
    organizations: JsValue,
    expanded_root_id: String,
    direction: Option<String>,
    node_width: Option<f64>,
    node_height: Option<f64>,
    h_gap: Option<f64>,
    v_gap: Option<f64>,
    margin: Option<f64>,
) -> Result<JsValue, JsValue> {
    let orgs: Vec<OrgFlatInput> =
        from_value(organizations).map_err(|e| JsValue::from_str(&format!("parse error: {e}")))?;

    let opts = LayoutOptions {
        direction: direction.unwrap_or_else(|| "vertical".into()),
        node_width: resolve_layout_metric("node_width", node_width, 200.0, false)
            .map_err(|e| JsValue::from_str(&e))?,
        node_height: resolve_layout_metric("node_height", node_height, 72.0, false)
            .map_err(|e| JsValue::from_str(&e))?,
        horizontal_gap: resolve_layout_metric("horizontal_gap", h_gap, 40.0, true)
            .map_err(|e| JsValue::from_str(&e))?,
        vertical_gap: resolve_layout_metric("vertical_gap", v_gap, 60.0, true)
            .map_err(|e| JsValue::from_str(&e))?,
        margin: resolve_layout_metric("margin", margin, 24.0, true)
            .map_err(|e| JsValue::from_str(&e))?,
    };

    let result = compute_org_row_tree_layout(orgs, &expanded_root_id, &opts)
        .map_err(|e| JsValue::from_str(&e.message()))?;
    to_value(&result).map_err(|e| JsValue::from_str(&format!("serialize error: {e}")))
}

#[wasm_bindgen(start)]
pub fn init() {}

/// Контур dept з правилами магнетизму (§4.6.1)
#[wasm_bindgen(js_name = computeDeptContour)]
pub fn wasm_compute_dept_contour(
    department_id: String,
    positions: JsValue,
    config: Option<JsValue>,
) -> Result<JsValue, JsValue> {
    let positions: Vec<ContourPositionInput> =
        from_value(positions).map_err(|e| JsValue::from_str(&format!("parse error: {e}")))?;
    let cfg: ContourMagnetConfig = config
        .map(from_value)
        .transpose()
        .map_err(|e| JsValue::from_str(&format!("config error: {e}")))?
        .unwrap_or_default();
    let result = compute_dept_contour(&department_id, &positions, &cfg)
        .map_err(|e| JsValue::from_str(&e))?;
    to_value(&result).map_err(|e| JsValue::from_str(&format!("serialize error: {e}")))
}

/// Контури для всіх dept у positions
#[wasm_bindgen(js_name = computeAllContours)]
pub fn wasm_compute_all_contours(
    positions: JsValue,
    config: Option<JsValue>,
) -> Result<JsValue, JsValue> {
    let positions: Vec<ContourPositionInput> =
        from_value(positions).map_err(|e| JsValue::from_str(&format!("parse error: {e}")))?;
    let cfg: ContourMagnetConfig = config
        .map(from_value)
        .transpose()
        .map_err(|e| JsValue::from_str(&format!("config error: {e}")))?
        .unwrap_or_default();
    let results = compute_all_contours(&positions, &cfg);
    to_value(&results).map_err(|e| JsValue::from_str(&format!("serialize error: {e}")))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flat_build_works() {
        let items = vec![
            FlatNodeInput {
                id: "1".into(),
                parent_id: None,
                label: "CEO".into(),
                node_type: None,
                position: None,
                person: Some("Alice".into()),
                department: None,
                status: None,
            },
            FlatNodeInput {
                id: "2".into(),
                parent_id: Some("1".into()),
                label: "CTO".into(),
                node_type: None,
                position: None,
                person: Some("Bob".into()),
                department: None,
                status: None,
            },
        ];
        let root = build_from_flat(items).unwrap();
        assert_eq!(root.children.len(), 1);
    }

    #[test]
    fn resolve_layout_metric_rejects_nan_instead_of_default() {
        let err = resolve_layout_metric("node_width", Some(f64::NAN), 200.0, false).unwrap_err();
        assert!(err.contains("finite"), "{err}");
    }

    #[test]
    fn resolve_layout_metric_none_uses_default() {
        assert_eq!(
            resolve_layout_metric("node_width", None, 200.0, false).unwrap(),
            200.0
        );
    }

    #[test]
    fn resolve_layout_metric_rejects_infinity() {
        let err =
            resolve_layout_metric("node_height", Some(f64::INFINITY), 72.0, false).unwrap_err();
        assert!(err.contains("finite"), "{err}");
    }
}
