//! R3: пакування відділів і обгорток staff-геометрії (ЯК, T126).
//!
//! Рамка відділу = union AABB членів, розширений на `content_padding` з кожного боку —
//! **єдине Rust-джерело** для live+SVG (R5), усуває дві правди padding (ADR §13:
//! live `staffLiveGeometry.departmentWrapperPadding` vs SVG `svgExport` `contourButtonGroupMargin`).
//! `content_padding` подається як вхід (r1 §2c: TS рахує `contourButtonGroupMargin` ОДИН раз).

use crate::types::{StaffDepartmentFrameGeo, StaffNodeGeo};

/// Рамка одного (нерозрізаного) відділу з уже розкладених членів.
/// `None`, якщо членів немає (порожню рамку рахує окремий шлях B1 — наступний зріз).
pub fn department_frame(
    department_id: &str,
    members: &[StaffNodeGeo],
    content_padding: f32,
) -> Option<StaffDepartmentFrameGeo> {
    let first = members.first()?;
    let mut min_x = first.x;
    let mut min_y = first.y;
    let mut max_x = first.x + first.width;
    let mut max_y = first.y + first.height;
    for member in members {
        min_x = min_x.min(member.x);
        min_y = min_y.min(member.y);
        max_x = max_x.max(member.x + member.width);
        max_y = max_y.max(member.y + member.height);
    }
    let pad = content_padding;
    Some(StaffDepartmentFrameGeo {
        department_id: department_id.to_string(),
        part_index: None,
        x: min_x - pad,
        y: min_y - pad,
        width: (max_x - min_x) + pad * 2.0,
        height: (max_y - min_y) + pad * 2.0,
    })
}

/// Один відділ із уже розкладеними (локальні координати) членами — вхід пакування.
/// Члени приходять із row-tree (`compute_org_row_tree_layout`), пакування лише розставляє регіони.
pub struct DepartmentMembers {
    pub department_id: String,
    pub members: Vec<StaffNodeGeo>,
}

/// Результат пакування: вузли у світових координатах + рамка на кожен відділ.
pub struct StaffPackResult {
    pub nodes: Vec<StaffNodeGeo>,
    pub department_frames: Vec<StaffDepartmentFrameGeo>,
}

/// Розставляє відділи зліва направо. Розділення сусідніх bbox-регіонів =
/// `horizontal_gap + 2·content_padding` (I-T5, Читання A: краї рамок виходять
/// `horizontal_gap` один від одного). Перший регіон — у `(margin, margin)`.
pub fn pack_departments(
    departments: &[DepartmentMembers],
    horizontal_gap: f32,
    _vertical_gap: f32,
    content_padding: f32,
    margin: f32,
) -> StaffPackResult {
    let mut nodes: Vec<StaffNodeGeo> = Vec::new();
    let mut department_frames: Vec<StaffDepartmentFrameGeo> = Vec::new();
    // Розділення сусідніх bbox-регіонів (I-T5, Читання A).
    let region_gap = horizontal_gap + content_padding * 2.0;
    let mut cursor_x = margin;
    for dept in departments {
        let Some(first) = dept.members.first() else {
            continue; // порожній відділ — окремий шлях B1 (інший зріз)
        };
        let mut min_x = first.x;
        let mut min_y = first.y;
        let mut max_x = first.x + first.width;
        for member in &dept.members {
            min_x = min_x.min(member.x);
            min_y = min_y.min(member.y);
            max_x = max_x.max(member.x + member.width);
        }
        let dx = cursor_x - min_x;
        let dy = margin - min_y;
        let placed: Vec<StaffNodeGeo> = dept
            .members
            .iter()
            .map(|member| StaffNodeGeo {
                x: member.x + dx,
                y: member.y + dy,
                ..member.clone()
            })
            .collect();
        if let Some(frame) = department_frame(&dept.department_id, &placed, content_padding) {
            department_frames.push(frame);
        }
        nodes.extend(placed);
        cursor_x += (max_x - min_x) + region_gap;
    }
    StaffPackResult {
        nodes,
        department_frames,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::StaffNodeGeo;

    fn node(id: &str, x: f32, y: f32, width: f32, height: f32) -> StaffNodeGeo {
        StaffNodeGeo {
            id: id.to_string(),
            organization_id: "org".to_string(),
            x,
            y,
            width,
            height,
            tier: 1,
            role: None,
            depth: None,
            department_id: None,
            part_index: None,
        }
    }

    // Оракул: TS `contourButtonGroup.ts` рядки 60-63 — рамка = bbox ± margin.
    // margin = content_padding = 36; член bbox (100,200,136,156)
    // → frame (100−36, 200−36, 136+72, 156+72) = (64,164,208,228).
    #[test]
    fn single_member_frame_expands_bbox_by_padding() {
        let members = vec![node("p1", 100.0, 200.0, 136.0, 156.0)];
        let frame = department_frame("d1", &members, 36.0).expect("frame for non-empty dept");
        assert_eq!(frame.department_id, "d1");
        assert_eq!(frame.part_index, None);
        assert_eq!(frame.x, 64.0);
        assert_eq!(frame.y, 164.0);
        assert_eq!(frame.width, 208.0);
        assert_eq!(frame.height, 228.0);
    }

    // Два члени: union AABB (100..236 x, 200..420 y) ± 36 → (64,164,208,292).
    #[test]
    fn multi_member_frame_wraps_union_aabb() {
        let members = vec![
            node("p1", 100.0, 200.0, 136.0, 156.0),
            node("p2", 100.0, 264.0, 136.0, 156.0),
        ];
        let frame = department_frame("d1", &members, 36.0).expect("frame");
        // union: x 100..236, y 200..420 → bbox (100,200,136,220)
        assert_eq!(frame.x, 64.0);
        assert_eq!(frame.y, 164.0);
        assert_eq!(frame.width, 208.0);
        assert_eq!(frame.height, 292.0);
    }

    fn dept(id: &str, member_id: &str) -> DepartmentMembers {
        // Член у локальних координатах (0,0,136,156) — так приходить із row-tree.
        DepartmentMembers {
            department_id: id.to_string(),
            members: vec![node(member_id, 0.0, 0.0, 136.0, 156.0)],
        }
    }

    fn frame_of<'a>(r: &'a StaffPackResult, dept_id: &str) -> &'a StaffDepartmentFrameGeo {
        r.department_frames
            .iter()
            .find(|f| f.department_id == dept_id)
            .expect("frame for dept")
    }

    fn node_x(r: &StaffPackResult, id: &str) -> f32 {
        r.nodes.iter().find(|n| n.id == id).expect("node").x
    }

    // B4 / I-T5 (Читання A). margin=40, hGap=20, padding=36.
    // Відділ a у (40,40); розділення bbox = hGap+2·pad = 92 → b на x=40+136+92=268.
    // frame_a=(4,4,208,228), frame_b=(232,4,208,228); край-зазор = 232−212 = 20 = hGap.
    #[test]
    fn two_departments_frame_edge_gap_equals_horizontal_gap() {
        let departments = vec![dept("a", "a1"), dept("b", "b1")];
        let result = pack_departments(&departments, 20.0, 28.0, 36.0, 40.0);

        assert_eq!(node_x(&result, "a1"), 40.0);
        assert_eq!(node_x(&result, "b1"), 268.0);

        let frame_a = frame_of(&result, "a");
        let frame_b = frame_of(&result, "b");
        assert_eq!((frame_a.x, frame_a.width), (4.0, 208.0));
        assert_eq!((frame_b.x, frame_b.width), (232.0, 208.0));

        let edge_gap = frame_b.x - (frame_a.x + frame_a.width);
        assert_eq!(edge_gap, 20.0);
    }
}
