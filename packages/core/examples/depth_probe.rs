//! T102 блок Б, вимір B2 — **де саме стеля глибини**, наша рекурсія чи чужа.
//!
//! Зрив стека в Rust не ловиться: процес просто вмирає. Тому кожна фаза
//! запускається **окремим процесом** — інакше перша ж смерть сховала б решту.
//!
//! ```text
//! cargo run --release --example depth_probe -- <phase> <depth>
//! ```
//!
//! Фази й що вони відокремлюють:
//!
//! | phase        | що виконується                           | чия рекурсія в грі |
//! |--------------|------------------------------------------|--------------------|
//! | `build`      | `build_from_flat` + `mem::forget`         | **наша** (`hierarchy::build`) |
//! | `build_drop` | `build_from_flat`, дерево дропається      | наша + **рекурсивний `Drop`** |
//! | `full`       | `compute_org_row_tree_layout`             | усе, включно з `tidy_tree` |
//!
//! `mem::forget` у фазі `build` — навмисно: рекурсивний `Drop` `HierarchyNode`
//! сам по собі здатний зірвати стек, і без цього кроку неможливо сказати, що
//! саме впало — побудова чи прибирання.
//!
//! Вихід: `0` — фаза пройшла; смерть процесу — стеля нижча за задану глибину.

use org_hierarchy_core::{compute_org_row_tree_layout, LayoutOptions, OrgFlatInput};

fn chain(depth: usize) -> Vec<OrgFlatInput> {
    (0..depth)
        .map(|i| OrgFlatInput {
            id: format!("org-{i}"),
            parent_org_id: if i == 0 {
                None
            } else {
                Some(format!("org-{}", i - 1))
            },
            name: format!("Org {i}"),
        })
        .collect()
}

fn flat_of(orgs: &[OrgFlatInput]) -> Vec<org_hierarchy_core::FlatNodeInput> {
    orgs.iter()
        .map(|o| org_hierarchy_core::FlatNodeInput {
            id: o.id.clone(),
            parent_id: o.parent_org_id.clone(),
            label: o.name.clone(),
            node_type: Some("organization".into()),
            position: None,
            person: None,
            department: None,
            status: None,
        })
        .collect()
}

fn main() {
    let mut args = std::env::args().skip(1);
    let phase = args.next().expect("phase: build | build_drop | full");
    let depth: usize = args
        .next()
        .expect("depth")
        .parse()
        .expect("depth must be a number");

    let orgs = chain(depth);

    match phase.as_str() {
        "build" => {
            let node = org_hierarchy_core::build_from_flat(flat_of(&orgs)).expect("build");
            // Не дропаємо: інакше вимір змішав би побудову з рекурсивним Drop.
            std::mem::forget(node);
        }
        "build_drop" => {
            let node = org_hierarchy_core::build_from_flat(flat_of(&orgs)).expect("build");
            drop(node);
        }
        "full" => {
            let opts = LayoutOptions {
                direction: "vertical".into(),
                node_width: 200.0,
                node_height: 72.0,
                horizontal_gap: 40.0,
                vertical_gap: 60.0,
                margin: 24.0,
            };
            let res = compute_org_row_tree_layout(orgs, "org-0", &opts).expect("layout");
            // Друкуємо, щоб оптимізатор не викинув роботу цілком.
            println!("nodes={}", res.nodes.len());
        }
        other => panic!("unknown phase: {other}"),
    }

    eprintln!("ok {phase} {depth}");
}
