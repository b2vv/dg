mod hierarchy;
mod layout;
mod types;

use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::{from_value, to_value};

pub use hierarchy::build_from_flat;
pub use layout::compute_tree_layout;
pub use types::*;

/// Побудувати ієрархію з плоского JSON-масиву [{id, parentId?, label, ...}]
#[wasm_bindgen(js_name = buildFromFlat)]
pub fn wasm_build_from_flat(items: JsValue) -> Result<JsValue, JsValue> {
    let flat: Vec<FlatNodeInput> = from_value(items)
        .map_err(|e| JsValue::from_str(&format!("parse error: {e}")))?;
    let root = build_from_flat(flat).map_err(|e| JsValue::from_str(&e))?;
    to_value(&root).map_err(|e| JsValue::from_str(&format!("serialize error: {e}")))
}

/// Розрахувати layout для дерева (повертає LayoutResult)
#[wasm_bindgen(js_name = computeLayout)]
pub fn wasm_compute_layout(
    root: JsValue,
    direction: Option<String>,
    node_width: Option<f64>,
    node_height: Option<f64>,
    h_gap: Option<f64>,
    v_gap: Option<f64>,
    margin: Option<f64>,
) -> Result<JsValue, JsValue> {
    let node: HierarchyNode = from_value(root)
        .map_err(|e| JsValue::from_str(&format!("parse error: {e}")))?;

    let opts = LayoutOptions {
        direction: direction.unwrap_or_else(|| "vertical".into()),
        node_width: node_width.unwrap_or(200.0) as f32,
        node_height: node_height.unwrap_or(72.0) as f32,
        horizontal_gap: h_gap.unwrap_or(40.0) as f32,
        vertical_gap: v_gap.unwrap_or(60.0) as f32,
        margin: margin.unwrap_or(24.0) as f32,
    };

    let result = compute_tree_layout(&node, &opts);
    to_value(&result).map_err(|e| JsValue::from_str(&format!("serialize error: {e}")))
}

/// Статистика дерева
#[wasm_bindgen(js_name = treeStats)]
pub fn wasm_tree_stats(root: JsValue) -> Result<JsValue, JsValue> {
    let node: HierarchyNode = from_value(root)
        .map_err(|e| JsValue::from_str(&format!("parse error: {e}")))?;
    let stats = TreeStats {
        total_nodes: count_nodes(&node),
        max_depth: max_depth(&node, 0),
        vacant_count: count_vacant(&node),
    };
    to_value(&stats).map_err(|e| JsValue::from_str(&format!("serialize error: {e}")))
}

fn count_nodes(n: &HierarchyNode) -> u32 {
    1 + n.children.iter().map(count_nodes).sum::<u32>()
}

fn max_depth(n: &HierarchyNode, d: u32) -> u32 {
    if n.children.is_empty() {
        return d;
    }
    n.children.iter().map(|c| max_depth(c, d + 1)).max().unwrap_or(d)
}

fn count_vacant(n: &HierarchyNode) -> u32 {
    let self_v = if n.status == "vacant" { 1 } else { 0 };
    self_v + n.children.iter().map(count_vacant).sum::<u32>()
}

#[wasm_bindgen(start)]
pub fn init() {}

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
}
