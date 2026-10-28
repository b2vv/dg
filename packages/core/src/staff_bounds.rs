//! R5: межі обгорток (namespace bounds) staff-геометрії (ЯК, T126).
//!
//! Порт `staffZoneBounds.ts::worldBoundsForTier` (TS-оракул) у Rust — **чистий продюсер**.
//! Заповнює `x`/`width`/`y`/`height` смуг-namespace, які R4 (`compose_tiers`) лишив нулями.
//!
//! **padding і labelBand — ВХОДИ (`BoundsOptions`), не константи** (рішення Dg22): «дві правди»
//! меж — це args-розходження верхнього шару (live `departmentWrapperPadding`+`zoneLabelBand` vs
//! SVG `contourButtonGroupMargin`). Якби padding запікся тут константою — відтворив би дві правди
//! в новому місці. Зведення обох споживачів на цей вихід + уніфікація аргументів — на R7 (H3/A2).

use crate::types::{StaffNamespace, StaffNodeGeo, StaffOrgCardGeo};

/// Прямокутник у світовій системі координат (аналог TS `WorldRect`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct WorldRect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// Входи обчислення меж. Усі — параметри виклику (TS→Rust), не константи модуля.
/// `margin` — зовнішній відступ; `content_padding` — виступ обгортки (magnetic contour / dept-card)
/// за межі сидінь; `label_band` — смуга під власну назву зони (T94); `canvas_width`/`min_width` —
/// фолбек ширини для порожнього ярусу.
#[derive(Debug, Clone, Copy)]
pub struct BoundsOptions {
    pub margin: f32,
    pub min_width: f32,
    pub canvas_width: f32,
    pub content_padding: f32,
    pub label_band: f32,
}

/// Вертикальні межі: content-hug (як горизонтальні). Порожній набір `ys` → сирі межі смуги
/// (`fallback_y`/`fallback_height`); інакше `y = top - pad - label_band`,
/// `height = bottom - top + 2·pad + label_band`. Оракул: `staffZoneBounds.ts:50-55`.
fn vertical(
    ys: &[f32],
    pad: f32,
    label_band: f32,
    fallback_y: f32,
    fallback_height: f32,
) -> (f32, f32) {
    if ys.is_empty() {
        return (fallback_y, fallback_height);
    }
    let top = ys.iter().copied().fold(f32::INFINITY, f32::min);
    let bottom = ys.iter().copied().fold(f32::NEG_INFINITY, f32::max);
    (
        top - pad - label_band,
        bottom - top + pad * 2.0 + label_band,
    )
}

/// Межі однієї смуги-namespace. Порт `worldBoundsForTier`. `ns.y`/`ns.height` — фолбек
/// порожнього ярусу (R4 їх уже проштампував). Оракул: `staffZoneBounds.ts:15-110`.
pub fn namespace_bounds(
    ns: &StaffNamespace,
    nodes: &[StaffNodeGeo],
    cards: &[StaffOrgCardGeo],
    opts: &BoundsOptions,
) -> WorldRect {
    let pad = opts.margin.max(0.0) / 2.0 + opts.content_padding.max(0.0);
    let label_band = opts.label_band.max(0.0);
    let min_width = opts.min_width.max(0.0);
    let empty_width = min_width.max(opts.canvas_width - opts.margin * 2.0);

    if ns.kind == "org-cards" {
        let tier3: Vec<&StaffNodeGeo> = nodes.iter().filter(|n| n.tier == 3).collect();
        let mut xs: Vec<f32> = Vec::new();
        let mut ys: Vec<f32> = Vec::new();
        for c in cards {
            xs.push(c.x);
            xs.push(c.x + c.width);
            ys.push(c.y);
            ys.push(c.y + c.height);
        }
        for n in &tier3 {
            xs.push(n.x);
            xs.push(n.x + n.width);
            ys.push(n.y);
            ys.push(n.y + n.height);
        }
        if xs.is_empty() {
            return WorldRect {
                x: opts.margin,
                y: ns.y,
                width: empty_width,
                height: ns.height,
            };
        }
        let min_x = xs.iter().copied().fold(f32::INFINITY, f32::min);
        let max_x = xs.iter().copied().fold(f32::NEG_INFINITY, f32::max);
        let (y, height) = vertical(&ys, pad, label_band, ns.y, ns.height);
        return WorldRect {
            x: min_x - pad,
            y,
            width: min_width.max(max_x - min_x + pad * 2.0),
            height,
        };
    }

    // staff-block: вузли цього ярусу (і орг, якщо смуга її називає).
    let org = ns.organization_id.as_ref();
    let matched: Vec<&StaffNodeGeo> = nodes
        .iter()
        .filter(|n| n.tier == ns.tier && (org.is_none() || Some(&n.organization_id) == org))
        .collect();
    if matched.is_empty() {
        return WorldRect {
            x: opts.margin,
            y: ns.y,
            width: empty_width,
            height: ns.height,
        };
    }
    let min_x = matched.iter().map(|n| n.x).fold(f32::INFINITY, f32::min);
    let max_x = matched
        .iter()
        .map(|n| n.x + n.width)
        .fold(f32::NEG_INFINITY, f32::max);
    let ys: Vec<f32> = matched.iter().flat_map(|n| [n.y, n.y + n.height]).collect();
    let (y, height) = vertical(&ys, pad, label_band, ns.y, ns.height);
    WorldRect {
        x: min_x - pad,
        y,
        width: min_width.max(max_x - min_x + pad * 2.0),
        height,
    }
}

/// Заповнює `x`/`width`/`y`/`height` кожної смуги-namespace з її меж (порт `enrichStaffTierBands`
/// у частині геометрії; label/role — TS-адаптер, не тут). Повертає нові смуги.
pub fn enrich_namespaces(
    namespaces: &[StaffNamespace],
    nodes: &[StaffNodeGeo],
    cards: &[StaffOrgCardGeo],
    opts: &BoundsOptions,
) -> Vec<StaffNamespace> {
    namespaces
        .iter()
        .map(|ns| {
            let b = namespace_bounds(ns, nodes, cards, opts);
            StaffNamespace {
                x: b.x,
                y: b.y,
                width: b.width,
                height: b.height,
                ..ns.clone()
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ns(tier: u8, kind: &str, org: Option<&str>, y: f32, height: f32) -> StaffNamespace {
        StaffNamespace {
            tier,
            kind: kind.to_string(),
            organization_id: org.map(str::to_string),
            x: 0.0,
            y,
            width: 0.0,
            height,
        }
    }

    fn node(id: &str, org: &str, x: f32, y: f32, tier: u8) -> StaffNodeGeo {
        StaffNodeGeo {
            id: id.to_string(),
            organization_id: org.to_string(),
            x,
            y,
            width: 100.0,
            height: 50.0,
            tier,
            role: None,
            depth: None,
            department_id: None,
            part_index: None,
        }
    }

    fn opts(margin: f32) -> BoundsOptions {
        BoundsOptions {
            margin,
            min_width: 0.0,
            canvas_width: 0.0,
            content_padding: 0.0,
            label_band: 0.0,
        }
    }

    // Оракул: staffZoneBounds.test.ts:20-38.
    #[test]
    fn staff_block_bounds_union_nodes_for_org_and_tier() {
        let band = ns(2, "staff-block", Some("org1"), 40.0, 200.0);
        let nodes = [
            node("a", "org1", 10.0, 50.0, 2),
            node("b", "org1", 130.0, 60.0, 2),
        ];
        let r = namespace_bounds(&band, &nodes, &[], &opts(32.0));
        assert_eq!(r.y, 50.0 - 16.0);
        assert_eq!(r.height, 60.0 + 50.0 - 50.0 + 32.0);
        assert_eq!(r.x, 10.0 - 16.0);
        assert_eq!(r.width, 130.0 + 100.0 - 10.0 + 32.0);
    }

    // Оракул: staffZoneBounds.test.ts:40-55 — labelBand розширює лише верх.
    #[test]
    fn label_band_widens_only_the_top() {
        let band = ns(2, "staff-block", Some("org1"), 40.0, 200.0);
        let nodes = [node("a", "org1", 10.0, 50.0, 2)];
        let plain = namespace_bounds(&band, &nodes, &[], &opts(32.0));
        let banded = namespace_bounds(
            &band,
            &nodes,
            &[],
            &BoundsOptions {
                label_band: 30.0,
                ..opts(32.0)
            },
        );
        assert_eq!(banded.y, plain.y - 30.0);
        assert_eq!(banded.height, plain.height + 30.0);
        assert_eq!(banded.x, plain.x);
        assert_eq!(banded.width, plain.width);
    }

    // Оракул: staffZoneBounds.test.ts:118-128 — порожні вузли → сирі y/height + canvas-фолбек.
    #[test]
    fn empty_nodes_fall_back_to_band_and_canvas_width() {
        let band = ns(1, "staff-block", Some("missing"), 12.0, 64.0);
        let r = namespace_bounds(
            &band,
            &[],
            &[],
            &BoundsOptions {
                canvas_width: 200.0,
                ..opts(10.0)
            },
        );
        assert_eq!(
            r,
            WorldRect {
                x: 10.0,
                y: 12.0,
                width: 180.0,
                height: 64.0
            }
        );
    }

    // Оракул: staffZoneBounds.test.ts:138-143 — contentPadding виступ з обох боків.
    #[test]
    fn content_padding_grows_block_by_overhang_both_sides() {
        let band = ns(2, "staff-block", Some("o1"), 0.0, 200.0);
        let nodes = [
            node("a", "o1", 100.0, 20.0, 2),
            node("b", "o1", 300.0, 20.0, 2),
        ];
        let bare = namespace_bounds(&band, &nodes, &[], &opts(40.0));
        let wrapped = namespace_bounds(
            &band,
            &nodes,
            &[],
            &BoundsOptions {
                content_padding: 12.0,
                ..opts(40.0)
            },
        );
        assert_eq!(bare.x - wrapped.x, 12.0);
        assert_eq!(wrapped.width - bare.width, 24.0);
    }

    // Оракул: staffZoneBounds.test.ts:145-148 — contentPadding=0 == без нього.
    #[test]
    fn content_padding_zero_equals_bare() {
        let band = ns(2, "staff-block", Some("o1"), 0.0, 200.0);
        let nodes = [
            node("a", "o1", 100.0, 20.0, 2),
            node("b", "o1", 300.0, 20.0, 2),
        ];
        let bare = namespace_bounds(&band, &nodes, &[], &opts(40.0));
        let zero = namespace_bounds(
            &band,
            &nodes,
            &[],
            &BoundsOptions {
                content_padding: 0.0,
                ..opts(40.0)
            },
        );
        assert_eq!(zero, bare);
    }

    // Оракул: staffZoneBounds.ts:57-88 — org-cards union карток + вузлів ярусу-3.
    #[test]
    fn org_cards_union_cards_and_tier3_nodes() {
        let band = ns(3, "org-cards", None, 500.0, 120.0);
        let cards = [StaffOrgCardGeo {
            org_id: "o1".to_string(),
            x: 100.0,
            y: 500.0,
            width: 200.0,
            height: 80.0,
        }];
        // вузол ярусу-3 праворуч від картки розширює union; вузол ярусу-2 — ігнорується.
        let nodes = [
            node("t3", "o1", 320.0, 600.0, 3),
            node("t2", "o1", 0.0, 0.0, 2),
        ];
        let r = namespace_bounds(&band, &nodes, &cards, &opts(32.0));
        // xs: 100,300 (card) + 320,420 (t3) → min 100, max 420. pad=16.
        assert_eq!(r.x, 100.0 - 16.0);
        assert_eq!(r.width, 420.0 - 100.0 + 32.0);
        // ys: 500,580 (card) + 600,650 (t3) → top 500, bottom 650.
        assert_eq!(r.y, 500.0 - 16.0);
        assert_eq!(r.height, 650.0 - 500.0 + 32.0);
    }

    // org-cards без карток і без вузлів ярусу-3 → canvas-фолбек (сирі y/height).
    #[test]
    fn org_cards_empty_falls_back_to_canvas_width() {
        let band = ns(3, "org-cards", None, 500.0, 120.0);
        let nodes = [node("t2", "o1", 0.0, 0.0, 2)];
        let r = namespace_bounds(
            &band,
            &nodes,
            &[],
            &BoundsOptions {
                canvas_width: 400.0,
                ..opts(20.0)
            },
        );
        assert_eq!(
            r,
            WorldRect {
                x: 20.0,
                y: 500.0,
                width: 360.0,
                height: 120.0
            }
        );
    }

    // enrich_namespaces заповнює x/width (>0) і зберігає ідентичність смуги.
    #[test]
    fn enrich_fills_geometry_and_keeps_identity() {
        let bands = [ns(2, "staff-block", Some("org1"), 0.0, 100.0)];
        let nodes = [node("a", "org1", 0.0, 0.0, 2)];
        let out = enrich_namespaces(
            &bands,
            &nodes,
            &[],
            &BoundsOptions {
                canvas_width: 400.0,
                ..opts(8.0)
            },
        );
        assert_eq!(out.len(), 1);
        assert!(out[0].width > 0.0);
        assert_eq!(out[0].tier, 2);
        assert_eq!(out[0].organization_id.as_deref(), Some("org1"));
        // непорожній ярус → межі з контенту, не сирий фолбек.
        assert_eq!(out[0].x, 0.0 - 4.0);
    }
}
