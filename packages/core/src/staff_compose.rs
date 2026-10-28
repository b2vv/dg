//! R4: композиція ярусів staff-геометрії (ЯК, T126).
//!
//! Переносить вертикальну композицію з `canvasLayout.ts::layoutStaffCanvas` (TS) у Rust:
//! стек ярусів по `cursor_y` з резервом `zone_label_band` + смуга-namespace на ярус.
//! **x/width смуг — НЕ тут:** єдине джерело меж обгорток = R5 (`staffZoneBounds`),
//! яке читають live (Pixi/React) і SVG. R4 лишає `StaffNamespace.x/width = 0` — заповнить R5.

use crate::types::{StaffNamespace, StaffNodeGeo, StaffOrgCardGeo};

/// Один розкладений staff-block ярус — вхід композиції. Члени у ЛОКАЛЬНИХ координатах
/// (y від ~0), як приходять із row-tree. `min_height` — поверх висоти ярусу (подає
/// викликач: ярус-2 = node_height + 2·margin; ярус-1 = org_card_height). `tier`/
/// `organization_id` — ідентичність смуги.
pub struct TierBlock {
    pub tier: u8,
    pub head_id: Option<String>,
    pub organization_id: Option<String>,
    pub members: Vec<StaffNodeGeo>,
    pub block_height: f32,
    pub min_height: f32,
}

/// Результат композиції: вузли у світових координатах + смуги-namespace + низ контенту.
pub struct ComposeResult {
    pub nodes: Vec<StaffNodeGeo>,
    pub namespaces: Vec<StaffNamespace>,
    pub content_bottom: f32,
}

/// Стек staff-block ярусів зверху вниз (оракул: `canvasLayout.ts:80-131`).
/// Кожен ярус: `shift = cursor_y + zone_label_band`, члени зсуваються на `shift`;
/// смуга `y = cursor_y`, `height = max(block_height, min_height) + zone_label_band`;
/// `cursor_y += height + tier_gap`. `x`/`width` смуги = 0 (R5 заповнює).
pub fn compose_tiers(
    blocks: &[TierBlock],
    margin: f32,
    tier_gap: f32,
    zone_label_band: f32,
) -> ComposeResult {
    let mut nodes: Vec<StaffNodeGeo> = Vec::new();
    let mut namespaces: Vec<StaffNamespace> = Vec::new();
    let mut cursor_y = margin;
    for block in blocks {
        // Смуга-мітка резервує верхню стрічку; контент стартує під нею (T94).
        let shift = cursor_y + zone_label_band;
        for member in &block.members {
            nodes.push(StaffNodeGeo {
                y: member.y + shift,
                tier: block.tier,
                ..member.clone()
            });
        }
        let height = block.block_height.max(block.min_height) + zone_label_band;
        namespaces.push(StaffNamespace {
            tier: block.tier,
            kind: "staff-block".to_string(),
            organization_id: block.organization_id.clone(),
            // x/width — єдине джерело меж = R5 (staffZoneBounds); тут 0.
            x: 0.0,
            y: cursor_y,
            width: 0.0,
            height,
        });
        cursor_y += height + tier_gap;
    }
    // Оракул canvasLayout.ts:139-154: вісь голів, зсув лише вправо.
    let head_center = |tier| {
        let head_id = blocks.iter().find(|b| b.tier == tier)?.head_id.as_deref()?;
        nodes
            .iter()
            .find(|n| n.tier == tier && n.id == head_id)
            .map(|n| n.x + n.width / 2.0)
    };
    if let (Some(mgr), Some(cur)) = (head_center(1), head_center(2)) {
        let dx = cur - mgr;
        if dx > 0.0 {
            for node in &mut nodes {
                if node.tier == 1 {
                    node.x += dx;
                }
            }
        }
    }
    ComposeResult {
        nodes,
        namespaces,
        content_bottom: cursor_y,
    }
}

/// Дочірня організація та її необов'язковий розкладений staff-блок.
pub struct OrgCardInput {
    pub org_id: String,
    pub expanded_block: Option<ExpandedBlock>,
}

/// Геометрія розгорнутого блоку в локальних координатах.
pub struct ExpandedBlock {
    pub members: Vec<StaffNodeGeo>,
    pub width: f32,
    pub height: f32,
}

/// Геометричні опції ярусу карток (оракул canvasLayout.ts:174-231).
pub struct OrgCardOptions {
    pub margin: f32,
    pub horizontal_gap: f32,
    pub vertical_gap: f32,
    pub org_card_width: f32,
    pub org_card_height: f32,
}

/// Світова геометрія ярусу 3; межі namespace залишаються для R5.
pub struct OrgCardsResult {
    pub nodes: Vec<StaffNodeGeo>,
    pub cards: Vec<StaffOrgCardGeo>,
    pub namespace: Option<StaffNamespace>,
    pub content_bottom: f32,
}

/// Картки дітей та expand-in-place (оракул canvasLayout.ts:173-232).
pub fn compose_org_cards(
    card_y: f32,
    children: &[OrgCardInput],
    options: &OrgCardOptions,
) -> OrgCardsResult {
    let mut card_x = options.margin;
    let mut tier3_content_height: f32 = 0.0;
    let mut nodes = Vec::new();
    let mut cards = Vec::new();
    for child in children {
        let mut column_width = options.org_card_width;
        let mut column_height = options.org_card_height;
        if let Some(block) = &child.expanded_block {
            let origin_y = card_y + options.org_card_height + options.vertical_gap;
            for member in &block.members {
                nodes.push(StaffNodeGeo {
                    x: member.x + card_x,
                    y: member.y + origin_y,
                    tier: 3,
                    ..member.clone()
                });
            }
            column_width = options.org_card_width.max(block.width);
            column_height = options.org_card_height
                + if block.height > 0.0 {
                    options.vertical_gap + block.height
                } else {
                    0.0
                };
        }
        cards.push(StaffOrgCardGeo {
            org_id: child.org_id.clone(),
            x: card_x,
            y: card_y,
            width: options.org_card_width,
            height: options.org_card_height,
        });
        card_x += column_width + options.horizontal_gap;
        tier3_content_height = tier3_content_height.max(column_height);
    }
    let namespace = if children.is_empty() {
        None
    } else {
        Some(StaffNamespace {
            tier: 3,
            kind: "org-cards".to_string(),
            organization_id: None,
            x: 0.0,
            y: card_y,
            width: 0.0,
            height: tier3_content_height + options.margin,
        })
    };
    let content_bottom = namespace
        .as_ref()
        .map_or(card_y, |ns| card_y + ns.height + options.margin);
    OrgCardsResult {
        nodes,
        cards,
        namespace,
        content_bottom,
    }
}

/// Розміри канви; height дорівнює фінальному cursor композиції.
#[derive(Debug, PartialEq)]
pub struct CanvasDimensions {
    pub width: f32,
    pub height: f32,
}

/// Оракул canvasLayout.ts:262-276: найбільший правий край плюс зовнішній margin.
pub fn canvas_dimensions(
    nodes: &[StaffNodeGeo],
    cards: &[StaffOrgCardGeo],
    tier2_width: f32,
    margin: f32,
    content_bottom: f32,
) -> CanvasDimensions {
    let width = nodes
        .iter()
        .map(|n| n.x + n.width)
        .chain(cards.iter().map(|c| c.x + c.width))
        .fold((margin * 2.0).max(tier2_width), f32::max);
    CanvasDimensions {
        width: width + margin,
        height: content_bottom,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn node(id: &str, x: f32, y: f32, width: f32, height: f32) -> StaffNodeGeo {
        StaffNodeGeo {
            id: id.to_string(),
            organization_id: "org".to_string(),
            x,
            y,
            width,
            height,
            tier: 0,
            role: None,
            depth: None,
            department_id: None,
            part_index: None,
        }
    }

    // Зріз 1 (R4): стек двох staff-block ярусів. Оракул canvasLayout.ts:80-131.
    // margin=32, tier_gap=36, zone_label_band=10.
    //  ярус A (tier1, min_h=64):  shift=32+10=42 → node.y=42; height=max(156,64)+10=166;
    //                             namespace{tier1, y=32, h=166}; cursor=32+166+36=234.
    //  ярус B (tier2, min_h=220): shift=234+10=244 → node.y=244; height=max(156,220)+10=230;
    //                             namespace{tier2, y=234, h=230}; cursor=234+230+36=500.
    // x/width смуг = 0 (R5 заповнює межі).
    #[test]
    fn stacks_two_staff_block_tiers_with_band_reservation() {
        let blocks = vec![
            TierBlock {
                tier: 1,
                head_id: None,
                organization_id: Some("mgr".to_string()),
                members: vec![node("a1", 0.0, 0.0, 136.0, 156.0)],
                block_height: 156.0,
                min_height: 64.0,
            },
            TierBlock {
                tier: 2,
                head_id: None,
                organization_id: Some("cur".to_string()),
                members: vec![node("b1", 0.0, 0.0, 136.0, 156.0)],
                block_height: 156.0,
                min_height: 220.0,
            },
        ];
        let result = compose_tiers(&blocks, 32.0, 36.0, 10.0);

        let a1 = result.nodes.iter().find(|n| n.id == "a1").expect("a1");
        let b1 = result.nodes.iter().find(|n| n.id == "b1").expect("b1");
        assert_eq!(a1.tier, blocks[0].tier);
        assert_eq!(b1.tier, blocks[1].tier);
        assert_eq!(a1.y, 42.0);
        assert_eq!(b1.y, 244.0);

        assert_eq!(result.namespaces.len(), 2);
        let ns_a = &result.namespaces[0];
        let ns_b = &result.namespaces[1];
        assert_eq!((ns_a.tier, ns_a.kind.as_str()), (1, "staff-block"));
        assert_eq!(ns_a.organization_id.as_deref(), Some("mgr"));
        assert_eq!((ns_a.y, ns_a.height), (32.0, 166.0));
        assert_eq!((ns_a.x, ns_a.width), (0.0, 0.0)); // R5 заповнить
        assert_eq!((ns_b.tier, ns_b.y, ns_b.height), (2, 234.0, 230.0));

        assert_eq!(result.content_bottom, 500.0);
    }

    // Оракул canvasLayout.ts:139-154: центри 100 та 300 → dx=200 для ВСЬОГО tier 1.
    #[test]
    fn recenters_all_managing_nodes_right_returns_expected() {
        let blocks = axis_blocks(32.0, 200.0);
        let result = compose_tiers(&blocks, 32.0, 36.0, 10.0);
        assert_eq!(
            result.nodes.iter().map(|n| n.x).collect::<Vec<_>>(),
            vec![232.0, 388.0, 200.0]
        );
        assert_eq!(
            result.nodes.iter().map(|n| n.tier).collect::<Vec<_>>(),
            vec![1, 1, 2]
        );
        assert_eq!(result.nodes[0].y, 42.0);
        assert_eq!(result.nodes[2].y, 244.0);
        for ns in &result.namespaces {
            assert_eq!((ns.x, ns.width), (0.0, 0.0));
        }
    }

    // Оракул canvasLayout.ts:148-154: dx=0 та dx<0 не змінюють ліве розміщення.
    #[test]
    fn nonpositive_axis_shift_keeps_nodes_anchored() {
        for mgr_x in [232.0, 300.0] {
            let result = compose_tiers(&axis_blocks(mgr_x, 200.0), 32.0, 36.0, 10.0);
            assert_eq!(
                result.nodes.iter().map(|n| n.x).collect::<Vec<_>>(),
                vec![mgr_x, 188.0, 200.0]
            );
        }
    }

    fn axis_blocks(mgr_x: f32, cur_x: f32) -> Vec<TierBlock> {
        vec![
            TierBlock {
                tier: 1,
                head_id: Some("mgr-head".into()),
                organization_id: Some("mgr".into()),
                members: vec![
                    node("mgr-head", mgr_x, 0.0, 136.0, 156.0),
                    node("mgr-report", 188.0, 20.0, 136.0, 156.0),
                ],
                block_height: 156.0,
                min_height: 64.0,
            },
            TierBlock {
                tier: 2,
                head_id: Some("cur-head".into()),
                organization_id: Some("cur".into()),
                members: vec![node("cur-head", cur_x, 0.0, 200.0, 156.0)],
                block_height: 156.0,
                min_height: 220.0,
            },
        ]
    }

    fn card_options() -> OrgCardOptions {
        OrgCardOptions {
            margin: 32.0,
            horizontal_gap: 20.0,
            vertical_gap: 28.0,
            org_card_width: 200.0,
            org_card_height: 64.0,
        }
    }

    // Оракул canvasLayout.ts:174-231: колонки 320 та 200; expand origin=(32,592).
    // Висота колонки 248, смуги 280; cursor=812. R5 не рахується.
    #[test]
    fn org_cards_with_expanded_child_returns_expected() {
        let children = vec![
            OrgCardInput {
                org_id: "expanded".into(),
                expanded_block: Some(ExpandedBlock {
                    members: vec![node("child", 12.0, 7.0, 136.0, 156.0)],
                    width: 320.0,
                    height: 156.0,
                }),
            },
            OrgCardInput {
                org_id: "collapsed".into(),
                expanded_block: None,
            },
        ];
        let result = compose_org_cards(500.0, &children, &card_options());
        assert_eq!(result.cards.len(), 2);
        let a = &result.cards[0];
        let b = &result.cards[1];
        assert_eq!(
            (a.org_id.as_str(), a.x, a.y, a.width, a.height),
            ("expanded", 32.0, 500.0, 200.0, 64.0)
        );
        assert_eq!(
            (b.org_id.as_str(), b.x, b.y, b.width, b.height),
            ("collapsed", 372.0, 500.0, 200.0, 64.0)
        );
        assert_eq!(result.nodes.len(), 1);
        let n = &result.nodes[0];
        assert_eq!(
            (n.id.as_str(), n.x, n.y, n.width, n.height, n.tier),
            ("child", 44.0, 599.0, 136.0, 156.0, 3)
        );
        let ns = result.namespace.expect("смуга ярусу 3");
        assert_eq!(
            (ns.tier, ns.kind.as_str(), ns.organization_id),
            (3, "org-cards", None)
        );
        assert_eq!((ns.x, ns.y, ns.width, ns.height), (0.0, 500.0, 0.0, 280.0));
        assert_eq!(result.content_bottom, 812.0);
    }

    // Оракул canvasLayout.ts:222-232: без дітей немає смуги й додаткового margin.
    #[test]
    fn org_cards_empty_children_keep_cursor() {
        let result = compose_org_cards(500.0, &[], &card_options());
        assert!(result.nodes.is_empty());
        assert!(result.cards.is_empty());
        assert!(result.namespace.is_none());
        assert_eq!(result.content_bottom, 500.0);
    }

    // Оракул canvasLayout.ts:203-204: вузький порожній expand не додає vertical_gap.
    #[test]
    fn org_cards_empty_expansion_keeps_card_column_size() {
        let children = vec![
            OrgCardInput {
                org_id: "empty".into(),
                expanded_block: Some(ExpandedBlock {
                    members: vec![],
                    width: 100.0,
                    height: 0.0,
                }),
            },
            OrgCardInput {
                org_id: "next".into(),
                expanded_block: None,
            },
        ];
        let result = compose_org_cards(500.0, &children, &card_options());
        assert_eq!(result.cards.len(), 2);
        assert_eq!(result.cards[1].x, 252.0);
        assert!(result.nodes.is_empty());
        assert_eq!(result.namespace.expect("смуга").height, 96.0);
        assert_eq!(result.content_bottom, 628.0);
    }

    // Оракул canvasLayout.ts:262-276: кожне джерело max мусить окремо визначати ширину.
    #[test]
    fn canvas_dimensions_right_extents_returns_expected() {
        let nodes = vec![
            node("left", 32.0, 42.0, 136.0, 156.0),
            node("right", 400.0, 244.0, 136.0, 156.0),
        ];
        let cards = vec![StaffOrgCardGeo {
            org_id: "child".into(),
            x: 600.0,
            y: 500.0,
            width: 200.0,
            height: 64.0,
        }];
        for (ns, cs, tier2_width, expected_width) in [
            (nodes.as_slice(), cards.as_slice(), 900.0, 932.0),
            (nodes.as_slice(), cards.as_slice(), 300.0, 832.0),
            (nodes.as_slice(), &[][..], 300.0, 568.0),
        ] {
            assert_eq!(
                canvas_dimensions(ns, cs, tier2_width, 32.0, 812.0),
                CanvasDimensions {
                    width: expected_width,
                    height: 812.0
                }
            );
        }
    }

    // Оракул canvasLayout.ts:263,275-276: порожня сцена → 2·margin+margin, cursor незмінний.
    #[test]
    fn canvas_dimensions_empty_uses_margin_floor() {
        assert_eq!(
            canvas_dimensions(&[], &[], 0.0, 32.0, 500.0),
            CanvasDimensions {
                width: 96.0,
                height: 500.0
            }
        );
    }
}
