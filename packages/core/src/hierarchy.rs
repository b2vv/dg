use std::collections::HashMap;

use crate::types::{FlatNodeInput, HierarchyNode};

pub fn build_from_flat(items: Vec<FlatNodeInput>) -> Result<HierarchyNode, String> {
    if items.is_empty() {
        return Err("Порожній список вузлів".into());
    }

    let roots: Vec<_> = items.iter().filter(|i| i.parent_id.is_none()).collect();
    if roots.len() != 1 {
        return Err(format!(
            "Очікується один кореневий вузол, знайдено: {}",
            roots.len()
        ));
    }

    let map: HashMap<&str, &FlatNodeInput> = items.iter().map(|i| (i.id.as_str(), i)).collect();

    fn build(id: &str, map: &HashMap<&str, &FlatNodeInput>, items: &[FlatNodeInput]) -> HierarchyNode {
        let input = map[id];
        let children: Vec<HierarchyNode> = items
            .iter()
            .filter(|i| i.parent_id.as_deref() == Some(id))
            .map(|c| build(&c.id, map, items))
            .collect();

        let status = input.status.clone().unwrap_or_else(|| {
            if input.person.is_some() {
                "filled".into()
            } else {
                "vacant".into()
            }
        });

        HierarchyNode {
            id: input.id.clone(),
            label: input.label.clone(),
            node_type: input.node_type.clone().unwrap_or_else(|| "custom".into()),
            position: input.position.clone(),
            person: input.person.clone(),
            department: input.department.clone(),
            status,
            children,
        }
    }

    Ok(build(roots[0].id.as_str(), &map, &items))
}
