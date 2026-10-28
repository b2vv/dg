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
    /// Per-node layout width; falls back to `LayoutOptions.node_width` when absent.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub width: Option<f32>,
    /// Per-node layout height; falls back to `LayoutOptions.node_height` when absent.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub height: Option<f32>,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub width: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub height: Option<f32>,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub width: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub height: Option<f32>,
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

// ─────────────────────────────────────────────────────────────────────────────
// T126 R1 — контракт staff-геометрії (форма, БЕЗ логіки лейауту).
//
// Межа Rust/TS: work/reports/staff-rust-geometry/_r1-boundary.md.
// Rust рахує координати/межі/namespaces/маршрути в одній системі координат
// (ADR-0002, O-38); TS-адаптер подає входи й збагачує label/role/name (не геометрію).
// Логіка пакування/композиції/маршрутів — R3/R4/R6; тут лише типи для контракту й
// перегенерації rust-types.ts. Рядкові поля (kind/role/port/lod) — String із
// переліком дозволених значень у докстрингу, як наявні `direction`/`node_type`.
// ─────────────────────────────────────────────────────────────────────────────

/// Числові метрики лейауту (підмножина `StaffLayoutOptions`, що є суто геометрією).
/// `content_padding`/`zone_label_band` — значення; їхня похідна з theme/config
/// лишається TS-адаптером (_r1-boundary.md §2c).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffLayoutMetrics {
    #[serde(rename = "nodeWidth")]
    pub node_width: f32,
    #[serde(rename = "nodeHeight")]
    pub node_height: f32,
    #[serde(rename = "refCellWidth")]
    pub ref_cell_width: f32,
    #[serde(rename = "refCellHeight")]
    pub ref_cell_height: f32,
    #[serde(rename = "horizontalGap")]
    pub horizontal_gap: f32,
    #[serde(rename = "verticalGap")]
    pub vertical_gap: f32,
    pub margin: f32,
    #[serde(rename = "tierGap")]
    pub tier_gap: f32,
    #[serde(rename = "orgCardWidth")]
    pub org_card_width: f32,
    #[serde(rename = "orgCardHeight")]
    pub org_card_height: f32,
    #[serde(rename = "zoneLabelBand")]
    pub zone_label_band: f32,
    #[serde(rename = "contentPadding")]
    pub content_padding: f32,
    #[serde(rename = "deptGrouping")]
    pub dept_grouping: bool,
}

impl StaffLayoutMetrics {
    /// Відхиляє NaN/Inf/недопустимий знак — Rust-лейаут не має рахувати на `NaN`.
    pub fn validate(&self) -> Result<(), String> {
        validate_layout_metric("node_width", self.node_width as f64, false)?;
        validate_layout_metric("node_height", self.node_height as f64, false)?;
        validate_layout_metric("ref_cell_width", self.ref_cell_width as f64, false)?;
        validate_layout_metric("ref_cell_height", self.ref_cell_height as f64, false)?;
        validate_layout_metric("horizontal_gap", self.horizontal_gap as f64, true)?;
        validate_layout_metric("vertical_gap", self.vertical_gap as f64, true)?;
        validate_layout_metric("margin", self.margin as f64, true)?;
        validate_layout_metric("tier_gap", self.tier_gap as f64, true)?;
        validate_layout_metric("org_card_width", self.org_card_width as f64, false)?;
        validate_layout_metric("org_card_height", self.org_card_height as f64, false)?;
        validate_layout_metric("zone_label_band", self.zone_label_band as f64, true)?;
        validate_layout_metric("content_padding", self.content_padding as f64, true)?;
        Ok(())
    }
}

/// DOM-виміряний розмір картки посади (O-16, content-driven). Механізм подачі/кешу
/// — R2; фолбек — `StaffLayoutMetrics.node_width/height`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffNodeSize {
    pub id: String,
    pub width: f32,
    pub height: f32,
}

/// Посада — вхід у staff-лейаут (членство в орг-блоці/відділі/ярусі).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffPositionInput {
    pub id: String,
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    #[serde(rename = "isHead", default)]
    pub is_head: bool,
    #[serde(rename = "departmentId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub department_id: Option<String>,
}

/// Ребро підпорядкування. `kind`: "admin" | "matrix" | "dotted" | "cross-tier".
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffEdgeInput {
    #[serde(rename = "fromId")]
    pub from_id: String,
    #[serde(rename = "toId")]
    pub to_id: String,
    pub kind: String,
}

/// Організація — вхід (current + managing-parent для ярусів 1/2). `name`/`role`
/// переходять для TS-збагачення namespace-ів, не для геометрії.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffOrgInput {
    pub id: String,
    #[serde(rename = "parentOrgId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub parent_org_id: Option<String>,
}

/// Відділ — вхід для пакування й magnetic-розрізу (O-38, O-48 п.5).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffDepartmentInput {
    pub id: String,
}

/// Оголошений нодою порт докування лінка (ADR-0002). `port`: "center" | "avatar".
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffEdgePortInput {
    pub id: String,
    pub port: String,
}

/// Повний вхід staff-геометрії. `lod`: "near" | "mid" | "far" (вхід; Rust віддає
/// маршрути для переданого lod — _r1-boundary.md §2e).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffLayoutInput {
    #[serde(rename = "currentOrgId")]
    pub current_org_id: String,
    pub positions: Vec<StaffPositionInput>,
    pub reports: Vec<StaffEdgeInput>,
    pub organizations: Vec<StaffOrgInput>,
    pub departments: Vec<StaffDepartmentInput>,
    #[serde(rename = "nodeSizes", default)]
    pub node_sizes: Vec<StaffNodeSize>,
    pub options: StaffLayoutMetrics,
    #[serde(rename = "edgePorts", default)]
    pub edge_ports: Vec<StaffEdgePortInput>,
    #[serde(rename = "expandedOrgIds", default)]
    pub expanded_org_ids: Vec<String>,
    pub lod: String,
}

/// Координати посади у світовій системі. `tier`: 1|2|3. `role`:
/// "anchor"|"floating"|"tree"|"matrix"|"detached"|"external" (роль лейауту).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffNodeGeo {
    pub id: String,
    #[serde(rename = "organizationId")]
    pub organization_id: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub tier: u8,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub role: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub depth: Option<u32>,
    /// Відділ, якому належить картка (вхідна умова B5-маршруту до не-головної картки).
    #[serde(rename = "departmentId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub department_id: Option<String>,
    /// Частина розрізаного відділу (magnetic, B5); узгоджено з `StaffDepartmentFrameGeo.partIndex`.
    #[serde(rename = "partIndex")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub part_index: Option<u32>,
}

/// Геометрія картки організації (ярус 3). name/positionCount/expanded — TS, не тут.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffOrgCardGeo {
    #[serde(rename = "orgId")]
    pub org_id: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// Межі рамки відділу (dept-wrapper) — **єдине Rust-джерело** для live+SVG (R5),
/// усуває подвійний padding (ADR §13: live `departmentWrapperPadding` vs SVG
/// `contourButtonGroupMargin`). `partIndex` присутній, коли відділ розрізано
/// magnetic-групуванням (B5): одна рамка на частину зі спільним `departmentId`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffDepartmentFrameGeo {
    #[serde(rename = "departmentId")]
    pub department_id: String,
    #[serde(rename = "partIndex")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub part_index: Option<u32>,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// Іменована область (було `tiers`/`StaffTierBand`). Межі x/y/width/height
/// **завжди присутні** — смуги ярусів (не рамки відділів: ті — `StaffDepartmentFrameGeo`).
/// label/role — TS-адаптер. `kind`: "staff-block" | "org-cards".
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffNamespace {
    pub tier: u8,
    pub kind: String,
    #[serde(rename = "organizationId")]
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub organization_id: Option<String>,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// Ребро у виході (без шляху — шлях у `StaffEdgeRoute`). `kind` як у вході + "cross-tier".
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffEdge {
    #[serde(rename = "fromId")]
    pub from_id: String,
    #[serde(rename = "toId")]
    pub to_id: String,
    pub kind: String,
}

/// Точка ортогонального маршруту.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffRoutePoint {
    pub x: f32,
    pub y: f32,
}

/// Повний ортогональний маршрут лінка (O-48 п.3: повні маршрути, не лише порти).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffEdgeRoute {
    #[serde(rename = "fromId")]
    pub from_id: String,
    #[serde(rename = "toId")]
    pub to_id: String,
    pub kind: String,
    pub points: Vec<StaffRoutePoint>,
    /// §12-маркер залишку (R6-4a): `Some(true)` — маршрут після обходу ВСЕ ЩЕ пенетрує чужу рамку
    /// (обхід локально недосяжний; хост малює видимий маркер, не тихе прийняття). Відсутній, коли
    /// чисто. Адитивне поле — не ламає наявних споживачів (перша зміна контракту після R6-1).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[cfg_attr(feature = "ts-export", ts(optional))]
    pub marked: Option<bool>,
}

/// Маршрути для одного LOD (`lod`: "near"|"mid"|"far").
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffRouteSet {
    pub lod: String,
    pub segments: Vec<StaffEdgeRoute>,
}

/// Єдиний вихід staff-геометрії (замінює `StaffCanvasResult`; `tiers`→`namespaces`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffGeometryResult {
    #[serde(rename = "currentOrgId")]
    pub current_org_id: String,
    pub nodes: Vec<StaffNodeGeo>,
    #[serde(rename = "orgCards")]
    pub org_cards: Vec<StaffOrgCardGeo>,
    pub namespaces: Vec<StaffNamespace>,
    #[serde(rename = "departmentFrames")]
    pub department_frames: Vec<StaffDepartmentFrameGeo>,
    pub edges: Vec<StaffEdge>,
    pub routes: StaffRouteSet,
    pub width: f32,
    pub height: f32,
    pub diagnostics: Vec<String>,
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
        // T126 R1 staff-geometry contract
        StaffLayoutMetrics::export().expect("StaffLayoutMetrics");
        StaffNodeSize::export().expect("StaffNodeSize");
        StaffPositionInput::export().expect("StaffPositionInput");
        StaffEdgeInput::export().expect("StaffEdgeInput");
        StaffOrgInput::export().expect("StaffOrgInput");
        StaffDepartmentInput::export().expect("StaffDepartmentInput");
        StaffEdgePortInput::export().expect("StaffEdgePortInput");
        StaffLayoutInput::export().expect("StaffLayoutInput");
        StaffNodeGeo::export().expect("StaffNodeGeo");
        StaffOrgCardGeo::export().expect("StaffOrgCardGeo");
        StaffNamespace::export().expect("StaffNamespace");
        StaffDepartmentFrameGeo::export().expect("StaffDepartmentFrameGeo");
        StaffEdge::export().expect("StaffEdge");
        StaffRoutePoint::export().expect("StaffRoutePoint");
        StaffEdgeRoute::export().expect("StaffEdgeRoute");
        StaffRouteSet::export().expect("StaffRouteSet");
        StaffGeometryResult::export().expect("StaffGeometryResult");
    }
}

#[cfg(test)]
mod staff_contract_tests {
    use super::*;

    fn valid_metrics() -> StaffLayoutMetrics {
        StaffLayoutMetrics {
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

    #[test]
    fn metrics_validate_accepts_defaults() {
        assert!(valid_metrics().validate().is_ok());
    }

    #[test]
    fn metrics_validate_rejects_nan_size() {
        let mut m = valid_metrics();
        m.node_width = f32::NAN;
        assert!(m.validate().is_err());
    }

    #[test]
    fn metrics_validate_rejects_nonpositive_size() {
        let mut m = valid_metrics();
        m.node_height = 0.0;
        assert!(m.validate().is_err());
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
