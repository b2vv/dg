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

    // T102 блок Б. Дві причини, чому тут ні рекурсії, ні фільтра по `items`:
    //
    // 1. **Глибина.** Рекурсивна побудова зривала стек, і вимір показав, що саме
    //    вона — стеля всього конвеєра: `build` наодинці вмирав на тій самій
    //    глибині, що й повна розкладка (12 343 нативно), тобто `tidy_tree` і
    //    рекурсивний `Drop` до неї не дотягувались (`examples/depth_probe.rs`).
    // 2. **Вартість.** Попередня версія фільтрувала **весь** `items` на кожен
    //    вузол — O(n²). Індекс нижче будується раз.
    let mut children_by_parent: HashMap<&str, Vec<&FlatNodeInput>> = HashMap::new();
    for item in &items {
        if let Some(parent) = item.parent_id.as_deref() {
            children_by_parent.entry(parent).or_default().push(item);
        }
    }

    let root_id = roots[0].id.as_str();

    // Прохід 1 — preorder ітеративно, лише щоб дістати порядок.
    let mut order: Vec<&FlatNodeInput> = Vec::with_capacity(items.len());
    let mut stack: Vec<&FlatNodeInput> = vec![roots[0]];
    while let Some(node) = stack.pop() {
        order.push(node);
        if let Some(kids) = children_by_parent.get(node.id.as_str()) {
            stack.extend(kids.iter().copied());
        }
    }

    // Прохід 2 — назад по preorder: діти завжди зустрічаються після батька, тож
    // у зворотному порядку кожен вузол збирається з уже готових дітей.
    let mut built: HashMap<&str, HierarchyNode> = HashMap::with_capacity(order.len());
    for input in order.iter().rev() {
        let children: Vec<HierarchyNode> = children_by_parent
            .get(input.id.as_str())
            .map(|kids| {
                kids.iter()
                    .filter_map(|c| built.remove(c.id.as_str()))
                    .collect()
            })
            .unwrap_or_default();

        let status = input.status.clone().unwrap_or_else(|| {
            if input.person.is_some() {
                "filled".into()
            } else {
                "vacant".into()
            }
        });

        built.insert(
            input.id.as_str(),
            HierarchyNode {
                id: input.id.clone(),
                label: input.label.clone(),
                node_type: input.node_type.clone().unwrap_or_else(|| "custom".into()),
                position: input.position.clone(),
                person: input.person.clone(),
                department: input.department.clone(),
                status,
                children,
            },
        );
    }

    built
        .remove(root_id)
        .ok_or_else(|| format!("Корінь {root_id} не зібрано"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn chain(depth: usize) -> Vec<FlatNodeInput> {
        (0..depth)
            .map(|i| FlatNodeInput {
                id: format!("n-{i}"),
                parent_id: if i == 0 {
                    None
                } else {
                    Some(format!("n-{}", i - 1))
                },
                label: format!("N{i}"),
                node_type: None,
                position: None,
                person: None,
                department: None,
                status: None,
            })
            .collect()
    }

    /// T102 блок Б, критерій B2. Ця глибина зривала стек до того, як побудова
    /// стала ітеративною: вимір показав стелю 12 343 (`examples/depth_probe.rs`),
    /// і вона була стелею **всього** конвеєра, а не лише цієї функції.
    ///
    /// ⚠️ Зрив стека в Rust не є `panic` — процес вмирає, і тест не «падає», а
    /// забирає з собою всю сюїту. Тому регресія тут виглядатиме як мертвий
    /// прогін `cargo test`, а не як червоний рядок.
    #[test]
    fn build_from_flat_handles_a_chain_that_used_to_blow_the_stack() {
        let root = build_from_flat(chain(20_000)).expect("20k chain builds");

        // Глибина рахується ітеративно — інакше сам тест зірвав би стек, який
        // перевіряє.
        let mut depth = 1;
        let mut node = &root;
        while let Some(child) = node.children.first() {
            depth += 1;
            node = child;
        }
        assert_eq!(depth, 20_000);
        assert_eq!(root.id, "n-0");
    }

    #[test]
    fn build_from_flat_keeps_sibling_order() {
        let mut items = chain(1);
        for i in 0..3 {
            items.push(FlatNodeInput {
                id: format!("c-{i}"),
                parent_id: Some("n-0".into()),
                label: format!("C{i}"),
                node_type: None,
                position: None,
                person: None,
                department: None,
                status: None,
            });
        }
        let root = build_from_flat(items).expect("builds");
        let ids: Vec<&str> = root.children.iter().map(|c| c.id.as_str()).collect();
        assert_eq!(ids, ["c-0", "c-1", "c-2"]);
    }

    #[test]
    fn build_from_flat_defaults_status_from_person() {
        let mut items = chain(1);
        items[0].person = Some("Alice".into());
        let root = build_from_flat(items).expect("builds");
        assert_eq!(root.status, "filled");
    }
}
