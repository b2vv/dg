//! R6-2: per-LOD геометрія едж-боксів staff (ЯК, T126).
//!
//! Порт `render/visualEdgeBox.ts` (visualPersonEdgeBox/visualOrgEdgeBox) +
//! `render/personVisualGeometry.ts` (personVisualLocalRect/mid-band/far-dot). Боксі, до яких
//! докуються маршрути, менші за layout-картку на mid/far — порти мусять слідувати.
//!
//! **Scope R6-2 = box-шар** (чисті функції + мапінг), оракул = BOX-паритет (±1px проти TS
//! `mapStaffEdgeBoxesForLod`), НЕ route-паритет (той R6-6). Threading hints у `staff_routes` +
//! маршрути до org-cards — R6-3 (перешкодам ці боксі й так потрібні).
//!
//! **theme/DATA-похідні hints — ВХОДИ** (gojs cardY/cardH/countBarH залежать від cardRowHeight +
//! наявності period-label/counts; figma tile — від edgePort/avatar). Чиста геометрія (mid-band,
//! far-dot, org-chip) залежить ЛИШЕ від w/h+lod → рахується тут. `symbol_size` = FIXED 36 (прод
//! завжди 36; НЕ theme-вхід — інакше паритет ламається для тем з symbolSize<36).

/// Прямокутник edge-геометрії. `obstacle` — зона, яку маршрут не має різати (figma-row: весь рядок);
/// вживається з R6-3, у R6-2 лише переноситься.
#[derive(Debug, Clone, PartialEq)]
pub struct EdgeRect {
    pub id: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub obstacle: Option<Rect>,
}

/// Проста AABB (для obstacle).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// Підказки візуального шаблону посади (резолвляться в TS із style/position). mid/far їх ІГНОРУЮТЬ.
#[derive(Debug, Clone)]
pub enum PersonEdgeHints {
    /// gojs-row: коротший AABB (картка+лічильник) замість повної клітинки.
    GojsRow {
        card_y: f32,
        card_h: f32,
        count_bar_h: f32,
    },
    /// figma-row: порт докується на tile-аватар; увесь рядок лишається перешкодою.
    FigmaRow {
        tile_x: f32,
        tile_y: f32,
        tile_size: f32,
    },
}

// Fixed layout-модель (personVisualGeometry.ts). НЕ theme.
const MID_BAND_MIN: f32 = 56.0; // personMidBandHeight floor (:13)
const MID_BAND_RATIO: f32 = 0.48; // (:13)
const FAR_DOT_MIN: f32 = 6.0; // personFarDotRadius floor (:18)
const FAR_DOT_RATIO: f32 = 0.18; // (:18)
const ORG_SYMBOL: f32 = 36.0; // visualOrgEdgeBox chip стеля+дефолт (:119,:124)

/// Висота mid-band посади (`personMidBandHeight`, :12-14): `min(h, max(56, h*0.48))`.
fn mid_band_height(height: f32) -> f32 {
    height.min(MID_BAND_MIN.max(height * MID_BAND_RATIO))
}

/// Радіус far-крапки (`personFarDotRadius`, :17-19): `max(6, min(w,h)*0.18)`.
fn far_dot_radius(width: f32, height: f32) -> f32 {
    FAR_DOT_MIN.max(width.min(height) * FAR_DOT_RATIO)
}

/// Локальний видимий прямокутник посади (`personVisualLocalRect`, :25-51) → зсунутий у світ.
fn person_visual_world_rect(id: &str, x: f32, y: f32, w: f32, h: f32, lod: &str) -> EdgeRect {
    // Дзеркалить personVisualLocalRect:30-50: near → повний; mid → band; else → far-крапка
    // (TS трактує все не-near/mid як far — вірність оракулу, ревʼю NB2).
    let (lx, ly, lw, lh) = match lod {
        "near" => (0.0, 0.0, w, h),
        "mid" => {
            let bh = mid_band_height(h);
            (0.0, (h - bh) / 2.0, w, bh)
        }
        _ => {
            let r = far_dot_radius(w, h);
            (w / 2.0 - r, h / 2.0 - r, r * 2.0, r * 2.0)
        }
    };
    EdgeRect {
        id: id.to_string(),
        x: x + lx,
        y: y + ly,
        width: lw,
        height: lh,
        obstacle: None,
    }
}

/// Edge-бокс посади на даному LOD (`visualPersonEdgeBox`, :25-49).
pub fn visual_person_edge_box(
    id: &str,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    lod: &str,
    hints: Option<&PersonEdgeHints>,
) -> EdgeRect {
    if lod == "near" {
        match hints {
            Some(PersonEdgeHints::GojsRow {
                card_y,
                card_h,
                count_bar_h,
            }) => {
                return EdgeRect {
                    id: id.to_string(),
                    x,
                    y: y + card_y,
                    width,
                    height: card_h + count_bar_h,
                    obstacle: None,
                };
            }
            Some(PersonEdgeHints::FigmaRow {
                tile_x,
                tile_y,
                tile_size,
            }) => {
                return EdgeRect {
                    id: id.to_string(),
                    x: x + tile_x,
                    y: y + tile_y,
                    width: *tile_size,
                    height: *tile_size,
                    obstacle: Some(Rect {
                        x,
                        y,
                        width,
                        height,
                    }),
                };
            }
            None => {}
        }
    }
    person_visual_world_rect(id, x, y, width, height, lod)
}

/// Edge-бокс картки організації (`visualOrgEdgeBox`, :116-132). far → symbol-chip
/// `min(36,w,h)`, центрований по вертикалі; near/mid — повний бокс.
pub fn visual_org_edge_box(
    id: &str,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    lod: &str,
) -> EdgeRect {
    if lod != "far" {
        return EdgeRect {
            id: id.to_string(),
            x,
            y,
            width,
            height,
            obstacle: None,
        };
    }
    let size = ORG_SYMBOL.min(width).min(height);
    EdgeRect {
        id: id.to_string(),
        x,
        y: y + (height - size) / 2.0,
        width: size,
        height: size,
        obstacle: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn approx(a: f32, b: f32) {
        assert!((a - b).abs() < 1e-4, "{a} != {b}");
    }

    // near + gojs-row: коротший AABB (visualEdgeBox.ts:27-35).
    #[test]
    fn near_gojs_row_shortens_aabb() {
        let h = PersonEdgeHints::GojsRow {
            card_y: 8.0,
            card_h: 40.0,
            count_bar_h: 12.0,
        };
        let r = visual_person_edge_box("p", 100.0, 200.0, 220.0, 72.0, "near", Some(&h));
        assert_eq!(
            r,
            EdgeRect {
                id: "p".into(),
                x: 100.0,
                y: 208.0,
                width: 220.0,
                height: 52.0,
                obstacle: None
            }
        );
    }

    // near + figma-row: tile-порт + obstacle = повний рядок (visualEdgeBox.ts:36-46).
    #[test]
    fn near_figma_row_docks_on_tile_with_row_obstacle() {
        let h = PersonEdgeHints::FigmaRow {
            tile_x: 12.0,
            tile_y: 16.0,
            tile_size: 40.0,
        };
        let r = visual_person_edge_box("p", 100.0, 200.0, 300.0, 72.0, "near", Some(&h));
        assert_eq!(r.x, 112.0);
        assert_eq!(r.y, 216.0);
        assert_eq!(r.width, 40.0);
        assert_eq!(r.height, 40.0);
        assert_eq!(
            r.obstacle,
            Some(Rect {
                x: 100.0,
                y: 200.0,
                width: 300.0,
                height: 72.0
            })
        );
    }

    // near без hints → повний бокс.
    #[test]
    fn near_without_hints_is_full_box() {
        let r = visual_person_edge_box("p", 10.0, 20.0, 220.0, 72.0, "near", None);
        assert_eq!(
            r,
            EdgeRect {
                id: "p".into(),
                x: 10.0,
                y: 20.0,
                width: 220.0,
                height: 72.0,
                obstacle: None
            }
        );
    }

    // mid: band min(h, max(56, h*0.48)), центр по вертикалі; hints ІГНОРУЮТЬСЯ.
    #[test]
    fn mid_collapses_to_band_ignoring_hints() {
        let h = PersonEdgeHints::GojsRow {
            card_y: 8.0,
            card_h: 40.0,
            count_bar_h: 12.0,
        };
        let r = visual_person_edge_box("p", 0.0, 0.0, 220.0, 200.0, "mid", Some(&h));
        let band = 200.0_f32.min(56.0_f32.max(200.0 * 0.48)); // 96
        approx(r.height, band);
        approx(r.y, (200.0 - band) / 2.0);
        approx(r.width, 220.0);
    }

    // far: крапка max(6, min(w,h)*0.18), центр.
    #[test]
    fn far_collapses_to_centered_dot() {
        let r = visual_person_edge_box("p", 0.0, 0.0, 220.0, 72.0, "far", None);
        let radius = 6.0_f32.max(72.0_f32.min(220.0) * 0.18); // 12.96
        approx(r.width, radius * 2.0);
        approx(r.height, radius * 2.0);
        approx(r.x, 110.0 - radius);
        approx(r.y, 36.0 - radius);
    }

    // NB1: малий вузол активує флор mid-band (56): h=80 → max(56, 38.4)=56, band=min(80,56)=56.
    #[test]
    fn mid_small_node_hits_band_floor() {
        let r = visual_person_edge_box("p", 0.0, 0.0, 220.0, 80.0, "mid", None);
        approx(r.height, 56.0);
        approx(r.y, (80.0 - 56.0) / 2.0); // 12
    }

    // NB1: малий вузол активує флор far-dot (6): w=h=20 → max(6, 3.6)=6, dot=12.
    #[test]
    fn far_small_node_hits_dot_floor() {
        let r = visual_person_edge_box("p", 0.0, 0.0, 20.0, 20.0, "far", None);
        approx(r.width, 12.0);
        approx(r.height, 12.0);
        approx(r.x, 10.0 - 6.0); // 4
        approx(r.y, 10.0 - 6.0);
    }

    // Невідомий lod трактується як far (вірність оракулу personVisualGeometry.ts:42, ревʼю NB2).
    #[test]
    fn unknown_lod_falls_back_to_far() {
        let unknown = visual_person_edge_box("p", 0.0, 0.0, 220.0, 72.0, "zoomy", None);
        let far = visual_person_edge_box("p", 0.0, 0.0, 220.0, 72.0, "far", None);
        assert_eq!(unknown, far);
    }

    // org far: chip min(36,w,h), центр по вертикалі.
    #[test]
    fn org_far_is_centered_symbol_chip() {
        let r = visual_org_edge_box("o", 100.0, 500.0, 200.0, 80.0, "far");
        assert_eq!(r.width, 36.0);
        assert_eq!(r.height, 36.0);
        assert_eq!(r.x, 100.0);
        approx(r.y, 500.0 + (80.0 - 36.0) / 2.0); // 522
    }

    // org far: chip обмежений меншим боком бокса, не 36.
    #[test]
    fn org_far_chip_clamped_to_small_box() {
        let r = visual_org_edge_box("o", 0.0, 0.0, 20.0, 80.0, "far");
        assert_eq!(r.width, 20.0);
        assert_eq!(r.height, 20.0);
    }

    // org near/mid → повний бокс.
    #[test]
    fn org_near_and_mid_are_full_box() {
        let full = EdgeRect {
            id: "o".into(),
            x: 1.0,
            y: 2.0,
            width: 200.0,
            height: 80.0,
            obstacle: None,
        };
        assert_eq!(
            visual_org_edge_box("o", 1.0, 2.0, 200.0, 80.0, "near"),
            full
        );
        assert_eq!(visual_org_edge_box("o", 1.0, 2.0, 200.0, 80.0, "mid"), full);
    }
}
