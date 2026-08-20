use serde::{Deserialize, Serialize};

#[cfg(feature = "ts-export")]
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts"))]
pub struct OrgFlatInput {
    pub id: String,
    #[serde(rename = "parentOrgId")]
    pub parent_org_id: Option<String>,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts"))]
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
#[cfg_attr(feature = "ts-export", ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts"))]
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

fn default_type() -> String {
    "custom".into()
}

fn default_status() -> String {
    "vacant".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts"))]
pub struct LayoutOptions {
    pub direction: String,
    pub node_width: f32,
    pub node_height: f32,
    pub horizontal_gap: f32,
    pub vertical_gap: f32,
    pub margin: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts"))]
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
#[cfg_attr(feature = "ts-export", ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts"))]
pub struct LayoutEdge {
    #[serde(rename = "fromId")]
    pub from_id: String,
    #[serde(rename = "toId")]
    pub to_id: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts"))]
pub struct LayoutResult {
    pub nodes: Vec<LayoutNode>,
    pub edges: Vec<LayoutEdge>,
    pub width: f32,
    pub height: f32,
    pub direction: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts"))]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(feature = "ts-export", ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts"))]
pub struct TreeStats {
    pub total_nodes: u32,
    pub max_depth: u32,
    pub vacant_count: u32,
}

// --- Dept contour (magnetism) ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContourPositionInput {
    pub id: String,
    #[serde(rename = "departmentId")]
    pub department_id: String,
    pub col: i32,
    pub row: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContourMagnetConfig {
    /// Max Manhattan distance between own cells in one component (SPEC default 1.5).
    #[serde(default = "default_magnet_radius")]
    pub magnet_radius: f32,
    #[serde(default = "default_padding_cells")]
    pub padding_cells: i32,
    #[serde(default = "default_corridor_cells")]
    pub corridor_cells: i32,
    #[serde(default = "default_cell_width")]
    pub cell_width: f32,
    #[serde(default = "default_cell_height")]
    pub cell_height: f32,
    #[serde(default = "default_smooth_iterations")]
    pub smooth_iterations: u32,
    /// Prefer notch/corridor around foreign (documented; flood already enforces G2/G5).
    #[serde(default = "default_prefer_notch")]
    pub prefer_notch: bool,
}

fn default_magnet_radius() -> f32 {
    1.5
}
fn default_padding_cells() -> i32 {
    0
}
fn default_corridor_cells() -> i32 {
    0
}
fn default_cell_width() -> f32 {
    100.0
}
fn default_cell_height() -> f32 {
    80.0
}
fn default_smooth_iterations() -> u32 {
    2
}
fn default_prefer_notch() -> bool {
    true
}

impl Default for ContourMagnetConfig {
    fn default() -> Self {
        Self {
            magnet_radius: 1.5,
            padding_cells: 0,
            corridor_cells: 0,
            cell_width: 100.0,
            cell_height: 80.0,
            smooth_iterations: 2,
            prefer_notch: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContourPoint {
    pub x: f32,
    pub y: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeptContourResult {
    #[serde(rename = "departmentId")]
    pub department_id: String,
    pub points: Vec<ContourPoint>,
    pub path: String,
    #[serde(rename = "cornerCount")]
    pub corner_count: u32,
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
