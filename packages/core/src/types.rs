use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-export")]
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct OrgFlatInput {
    pub id: String,
    #[serde(rename = "parentOrgId")]
    pub parent_org_id: Option<String>,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct FlatNodeInput {
    pub id: String,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    pub label: String,
    #[serde(rename = "type")]
    pub node_type: Option<String>,
    pub position: Option<String>,
    pub person: Option<String>,
    pub department: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct HierarchyNode {
    pub id: String,
    pub label: String,
    #[serde(rename = "type", default = "default_type")]
    pub node_type: String,
    pub position: Option<String>,
    pub person: Option<String>,
    pub department: Option<String>,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default)]
    pub children: Vec<HierarchyNode>,
}

/// T102 блок Б: прибирання **ітеративне**.
///
/// Похідний `Drop` рекурсивний — кожен вузол дропає дітей, ті своїх, і на
/// глибокому ланцюгу це зриває стек **уже після** того, як побудова відпрацювала
/// без жодної проблеми. Вимір (`examples/depth_probe.rs`): з ітеративною
/// побудовою фаза `build` тримала понад 100 000, а `build_drop` вмирала на
/// 86 718 — тобто прибирання лишалось стелею саме собою.
///
/// ⚠️ У **тестовому** потоці (2 МіБ проти 8 МіБ головного) і в debug-збірці ця
/// стеля на порядок нижча: тест на ланцюг 20 000 вмирав саме тут, а не в
/// побудові, яку він мав перевіряти.
///
/// Прийом: дітей **виносять** зі структури до того, як вона дропнеться, тож
/// кожен вузол помирає вже без нащадків, а глибина живе в куповому векторі.
impl Drop for HierarchyNode {
    fn drop(&mut self) {
        let mut stack: Vec<HierarchyNode> = std::mem::take(&mut self.children);
        while let Some(mut node) = stack.pop() {
            stack.append(&mut node.children);
        }
    }
}

fn default_type() -> String {
    "custom".into()
}

fn default_status() -> String {
    "vacant".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct LayoutOptions {
    pub direction: String,
    pub node_width: f32,
    pub node_height: f32,
    pub horizontal_gap: f32,
    pub vertical_gap: f32,
    pub margin: f32,
}

/// Reject NaN/Inf so Ploeg cannot return `Ok` with `M NaN` paths.
pub fn validate_layout_metric(name: &str, value: f64, allow_zero: bool) -> Result<(), String> {
    if !value.is_finite() {
        return Err(format!("{name} must be a finite number"));
    }
    if allow_zero {
        if value < 0.0 {
            return Err(format!("{name} must be ≥ 0"));
        }
    } else if value <= 0.0 {
        return Err(format!("{name} must be greater than 0"));
    }
    Ok(())
}

/// `Some(NaN)` must not fall back to `default` — `unwrap_or` would skip NaN.
pub fn resolve_layout_metric(
    name: &str,
    value: Option<f64>,
    default: f64,
    allow_zero: bool,
) -> Result<f32, String> {
    let v = match value {
        Some(x) => x,
        None => default,
    };
    validate_layout_metric(name, v, allow_zero)?;
    Ok(v as f32)
}

impl LayoutOptions {
    pub fn validate(&self) -> Result<(), String> {
        validate_layout_metric("node_width", self.node_width as f64, false)?;
        validate_layout_metric("node_height", self.node_height as f64, false)?;
        validate_layout_metric("horizontal_gap", self.horizontal_gap as f64, true)?;
        validate_layout_metric("vertical_gap", self.vertical_gap as f64, true)?;
        validate_layout_metric("margin", self.margin as f64, true)?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct LayoutNode {
    pub id: String,
    pub label: String,
    #[serde(rename = "type")]
    pub node_type: String,
    pub position: Option<String>,
    pub person: Option<String>,
    pub department: Option<String>,
    pub status: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub depth: u32,
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
    #[serde(rename = "orgId")]
    pub org_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct LayoutEdge {
    #[serde(rename = "fromId")]
    pub from_id: String,
    #[serde(rename = "toId")]
    pub to_id: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct LayoutResult {
    pub nodes: Vec<LayoutNode>,
    pub edges: Vec<LayoutEdge>,
    pub width: f32,
    pub height: f32,
    pub direction: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct OrgRowTreeLayoutResult {
    pub mode: String,
    /// layout engine id, e.g. ploeg-layered-tidy (diagram-lib compatible)
    pub algorithm: String,
    pub nodes: Vec<LayoutNode>,
    pub edges: Vec<LayoutEdge>,
    pub width: f32,
    pub height: f32,
    pub direction: String,
}

#[cfg(all(test, feature = "ts-export"))]
mod ts_export {
    use super::*;
    use ts_rs::TS;

    #[test]
    fn export_rust_types() {
        OrgFlatInput::export().expect("OrgFlatInput");
        LayoutNode::export().expect("LayoutNode");
        LayoutEdge::export().expect("LayoutEdge");
        LayoutResult::export().expect("LayoutResult");
        OrgRowTreeLayoutResult::export().expect("OrgRowTreeLayoutResult");
        LayoutOptions::export().expect("LayoutOptions");
    }
}

#[cfg(test)]
mod layout_metric_tests {
    use super::*;

    #[test]
    fn some_nan_does_not_fall_back_to_default() {
        let err = resolve_layout_metric("node_width", Some(f64::NAN), 200.0, false).unwrap_err();
        assert!(err.contains("finite"));
    }

    #[test]
    fn layout_options_validate_rejects_nan() {
        let opts = LayoutOptions {
            direction: "vertical".into(),
            node_width: f32::NAN,
            node_height: 72.0,
            horizontal_gap: 40.0,
            vertical_gap: 60.0,
            margin: 24.0,
        };
        assert!(opts.validate().is_err());
    }
}
