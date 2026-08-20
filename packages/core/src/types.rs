use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
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
pub struct LayoutOptions {
    pub direction: String,
    pub node_width: f32,
    pub node_height: f32,
    pub horizontal_gap: f32,
    pub vertical_gap: f32,
    pub margin: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    #[serde(rename = "parentId")]
    pub parent_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutEdge {
    #[serde(rename = "fromId")]
    pub from_id: String,
    #[serde(rename = "toId")]
    pub to_id: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutResult {
    pub nodes: Vec<LayoutNode>,
    pub edges: Vec<LayoutEdge>,
    pub width: f32,
    pub height: f32,
    pub direction: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

impl Default for ContourMagnetConfig {
    fn default() -> Self {
        Self {
            padding_cells: 0,
            corridor_cells: 0,
            cell_width: 100.0,
            cell_height: 80.0,
            smooth_iterations: 2,
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
    pub corner_count: u32,
}
