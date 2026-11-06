//! Alpha staff-layout — окрема версія бібліотеки під порт алгоритму мокапа
//! (`~/Downloads/mock3/shps-links.js` `layout()`). Ізольована від `staff_layout.rs`:
//! це база, від якої розвивається alpha-напрям (рішення власника 2026-11-01).
//!
//! Алгоритм (переклад, не копія третього-сторонього коду): дворівневий tidy-tree.
//! 1. Усередині департаменту — bottom-up ширина піддерева (сума ширин дітей + сиблінг-gap
//!    SG, clamp до ширини картки), top-down центрування над піддеревом, `y = DPt + рівень·(CH+LV)`.
//! 2. Між деп-блоками (і singleton-блоками no-dept посад) — той самий патерн із ОКРЕМИМИ gap:
//!    гориз BG, верт BV. LV (внутр-рівень) і BV (між-блок) розчеплені.
//!
//! Gap-формули виводяться з `pad`/`lane` (ev = парне округлення):
//!   SG=max(24,2p+2l+8) · LV=max(56,2p+4l) · DP=max(28,p+2l+14) · DPt=HD+24 ·
//!   BG=max(44,2p+3l) · BV=max(96,2p+8l).

use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::{BTreeSet, BinaryHeap, HashMap, HashSet};

#[cfg(feature = "ts-export")]
use ts_rs::TS;

use crate::types::{StaffDepartmentInput, StaffEdgeInput, StaffPositionInput};

/// Парне округлення (мокап `ev`).
fn ev(n: f32) -> f32 {
    (n / 2.0).round() * 2.0
}

/// Режим маршрутизації ліній зв'язку.
/// `Astar` — порт `route()`/`astar()` з мокапа (обходить картки й чужі рамки, 0 перетинів).
/// `Simple` — примітивний елбоу card→card (для порівняння; очікувано гірший — протикає рамки).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
#[serde(rename_all = "lowercase")]
pub enum StaffTidyRouting {
    Simple,
    #[default]
    Astar,
}

/// Налаштування alpha-розкладки. `pad`/`lane` керують усіма gap через формули мокапа;
/// розміри картки/шапки приходять від DG (seat 300×112), не з мокапа (236×118).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffTidyParams {
    #[serde(default = "default_pad")]
    pub pad: f32,
    #[serde(default = "default_lane")]
    pub lane: f32,
    #[serde(rename = "cardWidth", default = "default_card_width")]
    pub card_width: f32,
    #[serde(rename = "cardHeight", default = "default_card_height")]
    pub card_height: f32,
    #[serde(rename = "headerHeight", default = "default_header_height")]
    pub header_height: f32,
    #[serde(default)]
    pub routing: StaffTidyRouting,
}

fn default_pad() -> f32 {
    8.0
}
fn default_lane() -> f32 {
    8.0
}
fn default_card_width() -> f32 {
    236.0
}
fn default_card_height() -> f32 {
    118.0
}
fn default_header_height() -> f32 {
    34.0
}

impl Default for StaffTidyParams {
    fn default() -> Self {
        Self {
            pad: default_pad(),
            lane: default_lane(),
            card_width: default_card_width(),
            card_height: default_card_height(),
            header_height: default_header_height(),
            routing: StaffTidyRouting::default(),
        }
    }
}

/// Вхід alpha-розкладки. Батьківство береться з admin-ребер (перше admin-ребро на дитину =
/// первинний батько, як `p.p` у мокапі; `p2` — вторинне, ігнорується для розміщення блоків).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffTidyInput {
    pub positions: Vec<StaffPositionInput>,
    pub reports: Vec<StaffEdgeInput>,
    pub departments: Vec<StaffDepartmentInput>,
    #[serde(default)]
    pub params: StaffTidyParams,
}

/// Картка посади у світових координатах.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffTidyNode {
    pub id: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// Рамка департаменту у світових координатах (включно з внутрішнім padding і шапкою).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffTidyFrame {
    #[serde(rename = "departmentId")]
    pub department_id: String,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// Точка ламаної лінії зв'язку у світових координатах.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffTidyPoint {
    pub x: f32,
    pub y: f32,
}

/// Лінія підпорядкування parent→child. Геометрія рахується тут, у калькуляційному
/// шарі (ADR-0002), не в рендер-адаптері. `kind`: "int" (той самий департамент),
/// "cross" (різні департаменти), "ext" (батько без департаменту). `ends_on_dept_top`:
/// лінія докається на ВЕРХ рамки департаменту (рендер малює вхідну крапку `.ent`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffTidyEdge {
    #[serde(rename = "fromId")]
    pub from_id: String,
    #[serde(rename = "toId")]
    pub to_id: String,
    pub kind: String,
    #[serde(rename = "endsOnDeptTop")]
    pub ends_on_dept_top: bool,
    pub points: Vec<StaffTidyPoint>,
}

/// Результат alpha-розкладки.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "ts-export", derive(TS))]
#[cfg_attr(
    feature = "ts-export",
    ts(export, export_to = "../../sdk/src/wasm/generated/rust-types.ts")
)]
pub struct StaffTidyResult {
    pub nodes: Vec<StaffTidyNode>,
    pub frames: Vec<StaffTidyFrame>,
    pub edges: Vec<StaffTidyEdge>,
    pub width: f32,
    pub height: f32,
}

/// bottom-up ширина піддерева всередині департаменту (мокап `sw`).
fn subtree_width(
    id: &str,
    dept_kids: &HashMap<String, Vec<String>>,
    cw: f32,
    sg: f32,
    out: &mut HashMap<String, f32>,
) -> f32 {
    let kids = dept_kids.get(id).map(|v| v.as_slice()).unwrap_or(&[]);
    let s: f32 = kids
        .iter()
        .map(|c| subtree_width(c, dept_kids, cw, sg, out))
        .sum::<f32>()
        + sg * kids.len().saturating_sub(1) as f32;
    let val = cw.max(s);
    out.insert(id.to_string(), val);
    val
}

/// Глибина піддерева (мокап `dep`): кількість рівнів.
fn subtree_depth(id: &str, dept_kids: &HashMap<String, Vec<String>>) -> usize {
    let kids = dept_kids.get(id).map(|v| v.as_slice()).unwrap_or(&[]);
    1 + kids
        .iter()
        .map(|c| subtree_depth(c, dept_kids))
        .max()
        .unwrap_or(0)
}

/// top-down центрування над піддеревом; пише rel-координати (мокап внутрішній `place`).
#[allow(clippy::too_many_arguments)]
fn place_within(
    id: &str,
    x0: f32,
    level: usize,
    dept_kids: &HashMap<String, Vec<String>>,
    w: &HashMap<String, f32>,
    cw: f32,
    sg: f32,
    dpt: f32,
    ch: f32,
    lv: f32,
    rel: &mut HashMap<String, (f32, f32)>,
) {
    let kids = dept_kids.get(id).map(|v| v.as_slice()).unwrap_or(&[]);
    let wid = w[id];
    let tot: f32 =
        kids.iter().map(|c| w[c]).sum::<f32>() + sg * kids.len().saturating_sub(1) as f32;
    rel.insert(
        id.to_string(),
        (x0 + (wid - cw) / 2.0, dpt + level as f32 * (ch + lv)),
    );
    let mut x = x0 + (wid - tot) / 2.0;
    for c in kids {
        place_within(c, x, level + 1, dept_kids, w, cw, sg, dpt, ch, lv, rel);
        x += w[c] + sg;
    }
}

/// bottom-up ширина піддерева блоків (мокап `bw`).
fn block_subtree_width(
    id: &str,
    block_kids: &HashMap<String, Vec<String>>,
    block_w: &HashMap<String, f32>,
    bg: f32,
    out: &mut HashMap<String, f32>,
) -> f32 {
    let kids = block_kids.get(id).map(|v| v.as_slice()).unwrap_or(&[]);
    let s: f32 = kids
        .iter()
        .map(|c| block_subtree_width(c, block_kids, block_w, bg, out))
        .sum::<f32>()
        + bg * kids.len().saturating_sub(1) as f32;
    let val = block_w[id].max(s);
    out.insert(id.to_string(), val);
    val
}

/// top-down розміщення блоків; діти на `y + h + BV` (мокап зовнішній `place`).
#[allow(clippy::too_many_arguments)]
fn place_block(
    id: &str,
    x0: f32,
    y: f32,
    block_kids: &HashMap<String, Vec<String>>,
    block_bw: &HashMap<String, f32>,
    block_w: &HashMap<String, f32>,
    block_h: &HashMap<String, f32>,
    bg: f32,
    bv: f32,
    bx: &mut HashMap<String, f32>,
    by: &mut HashMap<String, f32>,
) {
    let bwid = block_bw[id];
    bx.insert(id.to_string(), (x0 + (bwid - block_w[id]) / 2.0).round());
    by.insert(id.to_string(), y);
    let kids = block_kids.get(id).map(|v| v.as_slice()).unwrap_or(&[]);
    let tot: f32 =
        kids.iter().map(|c| block_bw[c]).sum::<f32>() + bg * kids.len().saturating_sub(1) as f32;
    let mut x = x0 + (bwid - tot) / 2.0;
    for c in kids {
        place_block(
            c,
            x,
            y + block_h[id] + bv,
            block_kids,
            block_bw,
            block_w,
            block_h,
            bg,
            bv,
            bx,
            by,
        );
        x += block_bw[c] + bg;
    }
}

// ======================================================================
// Маршрутизатор ліній зв'язку — переказ `route()`/`astar()`/`stats()` з
// `shps-links.js` (third-party; реалізація Rust-ідіомами, не копія). Усе —
// f64 всередині, детермінований (BTreeSet-ключі + повний Ord у черзі).
// ======================================================================

/// Рамка департаменту для роутера (f64 світові координати + голова).
struct DeptRect {
    id: String,
    x1: f64,
    y1: f64,
    x2: f64,
    y2: f64,
    head: String,
}

/// Повний вхід роутера (owned, щоб уникнути lifetime-складнощів у одноразовому розрахунку).
struct RouteInput {
    cards: HashMap<String, (f64, f64)>,
    cw: f64,
    ch: f64,
    depts: Vec<DeptRect>,
    dept_by_id: HashMap<String, usize>,
    dept_of: HashMap<String, Option<String>>,
    primary_parent: HashMap<String, String>,
    sec_parents: Vec<(String, String)>,
    block_of: HashMap<String, String>,
    block_parent: HashMap<String, Option<String>>,
    block_roots: HashMap<String, Vec<String>>,
    pos_order: Vec<String>,
    lv: f64,
    bv: f64,
    pad: f64,
    lane: f64,
    w: f64,
    h: f64,
}

#[derive(Clone, Copy, PartialEq)]
enum EKind {
    Int,
    Cross,
    Ext,
}

impl EKind {
    fn as_str(self) -> &'static str {
        match self {
            EKind::Int => "int",
            EKind::Cross => "cross",
            EKind::Ext => "ext",
        }
    }
}

/// Внутрішнє ребро під час маршрутизації.
struct REdge {
    m: String,
    c: String,
    kind: EKind,
    sec: bool,
    by: Option<f64>,
    pts: Vec<(f64, f64)>,
    fail: bool,
    ends_top: bool,
}

/// Канонічний цілий ключ координати (усі кратні 0.5) — детермінований дедуп/порядок.
fn key2(v: f64) -> i64 {
    (v * 2.0).round() as i64
}

/// Перетин осеспрямованого сегмента з прямокутником (мокап `hit`).
/// Сегмент вертикальний, якщо x1≈x2; інакше горизонтальний.
fn seg_hits(s: (f64, f64, f64, f64), r: (f64, f64, f64, f64)) -> bool {
    let (sx1, sy1, sx2, sy2) = s;
    let (rx1, ry1, rx2, ry2) = r;
    if (sx1 - sx2).abs() < 1e-9 {
        sx1 > rx1 && sx1 < rx2 && sy1.max(ry1) < sy2.min(ry2)
    } else {
        sy1 > ry1 && sy1 < ry2 && sx1.max(rx1) < sx2.min(rx2)
    }
}

/// Нормалізація сегмента з двох точок у (x1≤x2, y1≤y2).
fn seg_norm(a: (f64, f64), b: (f64, f64)) -> (f64, f64, f64, f64) {
    (a.0.min(b.0), a.1.min(b.1), a.0.max(b.0), a.1.max(b.1))
}

/// Спрощення ламаної: прибрати дублі та колінеарні проміжні точки (мокап `simp`).
fn simp(p: &[(f64, f64)]) -> Vec<(f64, f64)> {
    let mut o: Vec<(f64, f64)> = Vec::with_capacity(p.len());
    for &q in p {
        if let Some(&l) = o.last() {
            if (l.0 - q.0).abs() < 1e-9 && (l.1 - q.1).abs() < 1e-9 {
                continue;
            }
            if o.len() > 1 {
                let a = o[o.len() - 2];
                if ((a.0 - l.0).abs() < 1e-9 && (l.0 - q.0).abs() < 1e-9)
                    || ((a.1 - l.1).abs() < 1e-9 && (l.1 - q.1).abs() < 1e-9)
                {
                    let last = o.len() - 1;
                    o[last] = q;
                    continue;
                }
            }
        }
        o.push(q);
    }
    o
}

/// Чи дозволено сегмент біля рамки департаменту `d` з роллю (A=джерело, B=ціль, None=чужий).
/// Переказ `deptOK`. Пороги 14/12/38 — факти з мокапа.
fn dept_ok(s: (f64, f64, f64, f64), d: &DeptRect, role: Option<char>) -> bool {
    let (x1, y1, x2, y2) = s;
    let v = (x1 - x2).abs() < 1e-9;
    let in_x = v && x1 > d.x1 + 14.0 && x1 < d.x2 - 14.0;
    let hb = d.y1 + 38.0;
    if role == Some('B') && in_x && y1 < hb && y2 <= d.y2 - 12.0 {
        return true;
    }
    if !seg_hits(s, (d.x1 - 14.0, d.y1 - 14.0, d.x2 + 14.0, d.y2 + 14.0)) {
        return true;
    }
    if role.is_none() {
        return false;
    }
    if seg_hits(s, (d.x1, d.y1, d.x2, hb)) {
        return false;
    }
    if x1 >= d.x1 + 12.0 && x2 <= d.x2 - 12.0 && y1 >= d.y1 + 12.0 && y2 <= d.y2 - 12.0 {
        return true;
    }
    role == Some('A') && in_x && y1 >= hb && y2 > d.y2 - 12.0
}

/// Ціль докінгу ребра на дитину `c` (мокап `tgt`). SX=28 — вторинний зсув.
/// Повертає (x, y, ends_on_dept_top).
fn edge_target(l: &RouteInput, c: &str, sec: bool) -> (f64, f64, bool) {
    let (cx, cy) = l.cards[c];
    if sec {
        return (cx + l.cw / 2.0 + 28.0, cy, false);
    }
    if let Some(Some(dep)) = l.dept_of.get(c) {
        if let Some(&di) = l.dept_by_id.get(dep) {
            if l.depts[di].head == c {
                return (cx + l.cw / 2.0, l.depts[di].y1, true);
            }
        }
    }
    (cx + l.cw / 2.0, cy, false)
}

fn dept_of<'a>(l: &'a RouteInput, id: &str) -> Option<&'a str> {
    l.dept_of.get(id).and_then(|o| o.as_deref())
}

/// Класифікація ребра batько→дитина: int/cross/ext (мокап).
fn classify(l: &RouteInput, m: &str, c: &str) -> EKind {
    let md = dept_of(l, m);
    let cd = dept_of(l, c);
    if md.is_some() && md == cd {
        EKind::Int
    } else if md.is_some() && cd.is_some() {
        EKind::Cross
    } else {
        EKind::Ext
    }
}

/// Розбивка на `det` (прямий елбоу) і `ast` (A*), з класифікацією (мокап edge-loop).
fn build_edges(l: &RouteInput) -> (Vec<REdge>, Vec<REdge>) {
    let mut det = Vec::new();
    let mut ast = Vec::new();
    for c in &l.pos_order {
        if !l.cards.contains_key(c) {
            continue;
        }
        if let Some(m) = l.primary_parent.get(c) {
            if !l.cards.contains_key(m) {
                continue;
            }
            let kind = classify(l, m, c);
            let mut by = None;
            if kind == EKind::Int {
                by = Some(l.cards[m].1 + l.ch + l.lv / 2.0);
            } else if dept_of(l, m).is_none() {
                let cb = &l.block_of[c];
                let mb = &l.block_of[m];
                let parent_ok =
                    l.block_parent.get(cb).and_then(|o| o.as_deref()) == Some(mb.as_str());
                let root_ok = l
                    .block_roots
                    .get(cb)
                    .map(|r| r.iter().any(|x| x == c))
                    .unwrap_or(false);
                if parent_ok && root_ok {
                    by = Some(l.cards[m].1 + l.ch + l.bv / 2.0);
                }
            }
            let e = REdge {
                m: m.clone(),
                c: c.clone(),
                kind,
                sec: false,
                by,
                pts: Vec::new(),
                fail: false,
                ends_top: false,
            };
            if by.is_some() {
                det.push(e);
            } else {
                ast.push(e);
            }
        }
    }
    for (c, m) in &l.sec_parents {
        if !l.cards.contains_key(c) || !l.cards.contains_key(m) {
            continue;
        }
        let kind = if dept_of(l, m).is_some() && dept_of(l, c).is_some() {
            EKind::Cross
        } else {
            EKind::Ext
        };
        ast.push(REdge {
            m: m.clone(),
            c: c.clone(),
            kind,
            sec: true,
            by: None,
            pts: Vec::new(),
            fail: false,
            ends_top: false,
        });
    }
    (det, ast)
}

/// Картка-перешкода для сітки.
struct PCard {
    id: String,
    cx: f64,
    raw: (f64, f64, f64, f64),
    padded: (f64, f64, f64, f64),
}

/// Сітка маршрутизації.
struct Grid {
    xs: Vec<f64>,
    ys: Vec<f64>,
    xi: HashMap<i64, usize>,
    yi: HashMap<i64, usize>,
    nx: usize,
    ny: usize,
    mh: Vec<bool>,
    mv: Vec<bool>,
    pc: Vec<PCard>,
}

/// Додати межі + мідпойнти з lane-offset у набір координат (мокап `wall`).
fn wall(set: &mut BTreeSet<i64>, arr: &[f64], lane: f64) {
    let mut w: Vec<i64> = arr.iter().map(|&v| key2(v)).collect();
    w.sort_unstable();
    w.dedup();
    for &k in &w {
        set.insert(k);
    }
    for i in 1..w.len() {
        let a = w[i - 1] as f64 / 2.0;
        let b = w[i] as f64 / 2.0;
        if b - a < 2.0 {
            continue;
        }
        let m = (a + b) / 2.0;
        set.insert(key2(m));
        if m - lane > a + 1.0 {
            set.insert(key2(m - lane));
        }
        if m + lane < b - 1.0 {
            set.insert(key2(m + lane));
        }
    }
}

fn build_grid(l: &RouteInput, det: &[REdge]) -> Grid {
    let mut cr: Vec<(String, f64, f64)> = l
        .cards
        .iter()
        .map(|(id, &(x, y))| (id.clone(), x, y))
        .collect();
    cr.sort_by(|a, b| a.0.cmp(&b.0));

    let mut wx = vec![0.0, l.w];
    let mut wy = vec![0.0, l.h];
    for (_, x, y) in &cr {
        wx.push(x - l.pad);
        wx.push(x + l.cw + l.pad);
        wy.push(y - l.pad);
        wy.push(y + l.ch + l.pad);
    }
    for d in &l.depts {
        wx.extend([
            d.x1,
            d.x2,
            d.x1 - 14.0,
            d.x2 + 14.0,
            d.x1 + 12.0,
            d.x2 - 12.0,
        ]);
        wy.extend([
            d.y1,
            d.y2,
            d.y1 + 38.0,
            d.y2 + 14.0,
            d.y2 - 12.0,
            d.y1 - 14.0,
        ]);
    }
    let mut xset = BTreeSet::new();
    let mut yset = BTreeSet::new();
    wall(&mut xset, &wx, l.lane);
    wall(&mut yset, &wy, l.lane);
    for (_, x, y) in &cr {
        xset.insert(key2(x + l.cw / 2.0));
        xset.insert(key2(x + l.cw / 2.0 + 28.0));
        yset.insert(key2(*y));
        yset.insert(key2(y + l.ch));
    }
    for d in &l.depts {
        yset.insert(key2(d.y1));
    }
    for e in det {
        if let Some(by) = e.by {
            yset.insert(key2(by));
        }
    }

    let xs: Vec<f64> = xset.iter().map(|&k| k as f64 / 2.0).collect();
    let ys: Vec<f64> = yset.iter().map(|&k| k as f64 / 2.0).collect();
    let xi: HashMap<i64, usize> = xset.iter().enumerate().map(|(i, &k)| (k, i)).collect();
    let yi: HashMap<i64, usize> = yset.iter().enumerate().map(|(i, &k)| (k, i)).collect();
    let nx = xs.len();
    let ny = ys.len();

    let pc: Vec<PCard> = cr
        .iter()
        .map(|(id, x, y)| PCard {
            id: id.clone(),
            cx: x + l.cw / 2.0,
            raw: (*x, *y, x + l.cw, y + l.ch),
            padded: (x - l.pad, y - l.pad, x + l.cw + l.pad, y + l.ch + l.pad),
        })
        .collect();

    let mut mh = vec![false; nx.saturating_sub(1) * ny];
    let mut mv = vec![false; nx * ny.saturating_sub(1)];
    for j in 0..ny {
        for i in 0..nx.saturating_sub(1) {
            let sg = (xs[i], ys[j], xs[i + 1], ys[j]);
            if pc.iter().any(|c| seg_hits(sg, c.padded)) {
                mh[j * (nx - 1) + i] = true;
            }
        }
    }
    for j in 0..ny.saturating_sub(1) {
        for i in 0..nx {
            let sg = (xs[i], ys[j], xs[i], ys[j + 1]);
            if pc.iter().any(|c| seg_hits(sg, c.padded)) {
                mv[j * nx + i] = true;
            }
        }
    }

    Grid {
        xs,
        ys,
        xi,
        yi,
        nx,
        ny,
        mh,
        mv,
        pc,
    }
}

/// Зайнятість доріжок/вузлів ребрами (ключ — інтернований id батька-джерела).
#[derive(Default)]
struct Occ {
    nh: HashMap<usize, Vec<u32>>,
    nv: HashMap<usize, Vec<u32>>,
    eh: HashMap<usize, Vec<u32>>,
    ev: HashMap<usize, Vec<u32>>,
}

fn occ_edit(occ: &mut Occ, grid: &Grid, pts: &[(f64, f64)], mkey: u32, add: bool) {
    let nx = grid.nx;
    let push_rem = |map: &mut HashMap<usize, Vec<u32>>, k: usize| {
        if add {
            map.entry(k).or_default().push(mkey);
        } else if let Some(v) = map.get_mut(&k) {
            if let Some(pos) = v.iter().position(|&x| x == mkey) {
                v.remove(pos);
            }
        }
    };
    for w in pts.windows(2) {
        let (x1, y1, x2, y2) = seg_norm(w[0], w[1]);
        if (x1 - x2).abs() < 1e-9 {
            let (Some(&i), Some(&j1), Some(&j2)) = (
                grid.xi.get(&key2(x1)),
                grid.yi.get(&key2(y1)),
                grid.yi.get(&key2(y2)),
            ) else {
                continue;
            };
            for j in j1..=j2 {
                push_rem(&mut occ.nv, j * nx + i);
                if j < j2 {
                    push_rem(&mut occ.ev, j * nx + i);
                }
            }
        } else {
            let (Some(&j), Some(&i1), Some(&i2)) = (
                grid.yi.get(&key2(y1)),
                grid.xi.get(&key2(x1)),
                grid.xi.get(&key2(x2)),
            ) else {
                continue;
            };
            for i in i1..=i2 {
                push_rem(&mut occ.nh, j * nx + i);
                if i < i2 {
                    push_rem(&mut occ.eh, j * (nx - 1) + i);
                }
            }
        }
    }
}

/// Чи прохідне ребро сітки (i,j,гориз) для поточного ребра (мокап `ok`).
#[allow(clippy::too_many_arguments)]
fn seg_usable(
    grid: &Grid,
    l: &RouteInput,
    i: usize,
    j: usize,
    h: bool,
    m_id: &str,
    c_id: &str,
    a: &Option<String>,
    b: &Option<String>,
) -> bool {
    let sg = if h {
        (grid.xs[i], grid.ys[j], grid.xs[i + 1], grid.ys[j])
    } else {
        (grid.xs[i], grid.ys[j], grid.xs[i], grid.ys[j + 1])
    };
    let masked = if h {
        grid.mh[j * (grid.nx - 1) + i]
    } else {
        grid.mv[j * grid.nx + i]
    };
    let mut r = true;
    if masked {
        r = !grid.pc.iter().any(|c| {
            let ex = c.id == m_id || c.id == c_id;
            let use_raw =
                ex && !h && ((sg.0 - c.cx).abs() < 1e-6 || (sg.0 - (c.cx + 28.0)).abs() < 1e-6);
            seg_hits(sg, if use_raw { c.raw } else { c.padded })
        });
    }
    if r {
        r = l.depts.iter().all(|d| {
            let role = if a.as_deref() == Some(d.id.as_str()) {
                Some('A')
            } else if b.as_deref() == Some(d.id.as_str()) {
                Some('B')
            } else {
                None
            };
            dept_ok(sg, d, role)
        });
    }
    r
}

/// Елемент черги пріоритетів A*: мін за (f, g, k) — повний детермінований порядок.
struct HeapItem {
    f: f64,
    g: f64,
    k: usize,
}
impl PartialEq for HeapItem {
    fn eq(&self, o: &Self) -> bool {
        self.f == o.f && self.g == o.g && self.k == o.k
    }
}
impl Eq for HeapItem {}
impl Ord for HeapItem {
    fn cmp(&self, o: &Self) -> Ordering {
        // BinaryHeap — max-heap; інвертуємо, щоб верхівка = мінімум (f, потім g, потім k).
        o.f.partial_cmp(&self.f)
            .unwrap_or(Ordering::Equal)
            .then(o.g.partial_cmp(&self.g).unwrap_or(Ordering::Equal))
            .then(o.k.cmp(&self.k))
    }
}
impl PartialOrd for HeapItem {
    fn partial_cmp(&self, o: &Self) -> Option<Ordering> {
        Some(self.cmp(o))
    }
}

/// A*-маршрут одного ребра (мокап `astar`). Повертає (точки, fail).
fn astar(grid: &Grid, l: &RouteInput, occ: &Occ, mkey: u32, e: &REdge) -> (Vec<(f64, f64)>, bool) {
    let mc = l.cards[&e.m];
    let a_dept = dept_of(l, &e.m)
        .filter(|d| l.dept_by_id.contains_key(*d))
        .map(|s| s.to_string());
    let b_dept = dept_of(l, &e.c)
        .filter(|d| l.dept_by_id.contains_key(*d))
        .map(|s| s.to_string());
    let s = (mc.0 + l.cw / 2.0, mc.1 + l.ch);
    let t = edge_target(l, &e.c, e.sec);
    let fallback = || {
        let my = (s.1 + t.1) / 2.0;
        vec![s, (s.0, my), (t.0, my), (t.0, t.1)]
    };
    let (Some(&si), Some(&sj), Some(&ti), Some(&tj)) = (
        grid.xi.get(&key2(s.0)),
        grid.yi.get(&key2(s.1)),
        grid.xi.get(&key2(t.0)),
        grid.yi.get(&key2(t.1)),
    ) else {
        return (fallback(), true);
    };

    let nx = grid.nx;
    let ny = grid.ny;
    let n = nx * ny;
    let mut g = vec![f64::INFINITY; n * 3];
    let mut pv = vec![-1i64; n * 3];
    let mut cache: HashMap<(bool, usize, usize), bool> = HashMap::new();
    let hz = |i: usize, j: usize| (grid.xs[i] - t.0).abs() + (grid.ys[j] - t.1).abs();

    let st = (sj * nx + si) * 3;
    g[st] = 0.0;
    let mut heap = BinaryHeap::new();
    heap.push(HeapItem {
        f: hz(si, sj),
        g: 0.0,
        k: st,
    });
    let mut goal: i64 = -1;
    let mut it = 0u32;
    while let Some(item) = heap.pop() {
        it += 1;
        if it > 250_000 {
            break;
        }
        let k = item.k;
        let dir = k % 3;
        let nidx = (k - dir) / 3;
        let i = nidx % nx;
        let j = (nidx - i) / nx;
        if item.g > g[k] + 1e-6 {
            continue;
        }
        if i == ti && j == tj && dir == 2 {
            goal = k as i64;
            break;
        }
        for (di, dj) in [(1i64, 0i64), (-1, 0), (0, 1), (0, -1)] {
            let ni = i as i64 + di;
            let nj = j as i64 + dj;
            if ni < 0 || nj < 0 || ni >= nx as i64 || nj >= ny as i64 {
                continue;
            }
            let (ni, nj) = (ni as usize, nj as usize);
            if dir == 0 && dj != 1 {
                continue;
            }
            if ni == ti && nj == tj && dj != 1 {
                continue;
            }
            let h = dj == 0;
            let ei = if h { i.min(ni) } else { i };
            let ej = if h { j } else { j.min(nj) };
            let okv = *cache
                .entry((h, ei, ej))
                .or_insert_with(|| seg_usable(grid, l, ei, ej, h, &e.m, &e.c, &a_dept, &b_dept));
            if !okv {
                continue;
            }
            let nd = if h { 1usize } else { 2usize };
            let nn = nj * nx + ni;
            let len = if h {
                (grid.xs[ni] - grid.xs[i]).abs()
            } else {
                (grid.ys[nj] - grid.ys[j]).abs()
            };
            let ea = if h {
                occ.eh.get(&(ej * (nx - 1) + ei))
            } else {
                occ.ev.get(&(ej * nx + ei))
            };
            let own = ea.map(|v| v.contains(&mkey)).unwrap_or(false);
            let foreign_e = ea.map(|v| v.iter().any(|&x| x != mkey)).unwrap_or(false);
            let fo_nv = occ
                .nv
                .get(&nn)
                .map(|v| v.iter().any(|&x| x != mkey))
                .unwrap_or(false);
            let fo_nh = occ
                .nh
                .get(&nn)
                .map(|v| v.iter().any(|&x| x != mkey))
                .unwrap_or(false);
            let mut c = len * (if own { 0.15 } else { 1.0 });
            if foreign_e {
                c += 6000.0;
            }
            if fo_nv || fo_nh {
                c += 4000.0;
            }
            if dir != 0 && nd != dir {
                c += 30.0;
            }
            let nk = nn * 3 + nd;
            let ng = g[k] + c;
            if ng < g[nk] {
                g[nk] = ng;
                pv[nk] = k as i64;
                heap.push(HeapItem {
                    f: ng + hz(ni, nj),
                    g: ng,
                    k: nk,
                });
            }
        }
    }

    if goal < 0 {
        return (simp(&fallback()), true);
    }
    let mut pts = Vec::new();
    let mut k = goal;
    while k >= 0 {
        let ku = k as usize;
        let nidx = (ku - ku % 3) / 3;
        let i = nidx % nx;
        let j = (nidx - i) / nx;
        pts.push((grid.xs[i], grid.ys[j]));
        k = pv[ku];
    }
    pts.reverse();
    (simp(&pts), false)
}

/// Проекція REdge для stats (щоб працювати і на внутрішніх, і на результатних ребрах).
struct EdgeView<'a> {
    m: &'a str,
    c: &'a str,
    pts: &'a [(f64, f64)],
}

/// Метрики якості розкладки ліній (мокап `stats`): перетини, накладання, через картки,
/// ближче pad, через чужі департаменти; `bad` — індекси ребер для repair-пасів.
fn stats_core(
    edges: &[EdgeView],
    cards: &HashMap<String, (f64, f64)>,
    cw: f64,
    ch: f64,
    depts: &[DeptRect],
    dept_of_map: &HashMap<String, Option<String>>,
    pad: f64,
) -> (usize, usize, usize, usize, usize, HashSet<usize>) {
    struct Sg {
        x1: f64,
        y1: f64,
        x2: f64,
        y2: f64,
        ei: usize,
    }
    let mut segs: Vec<Sg> = Vec::new();
    for (ei, e) in edges.iter().enumerate() {
        for w in e.pts.windows(2) {
            let (x1, y1, x2, y2) = seg_norm(w[0], w[1]);
            segs.push(Sg { x1, y1, x2, y2, ei });
        }
    }
    let mut cross = 0;
    let mut over = 0;
    let mut card = 0;
    let mut near = 0;
    let mut dept = 0;
    let mut bad: HashSet<usize> = HashSet::new();
    for a in 0..segs.len() {
        for b in (a + 1)..segs.len() {
            let (p, q) = (&segs[a], &segs[b]);
            if edges[p.ei].m == edges[q.ei].m {
                continue;
            }
            let pv = (p.x1 - p.x2).abs() < 1e-9;
            let qv = (q.x1 - q.x2).abs() < 1e-9;
            if pv != qv {
                let (vseg, hseg) = if pv { (p, q) } else { (q, p) };
                let touch_end = (vseg.x1 == hseg.x1 || vseg.x1 == hseg.x2)
                    && (hseg.y1 == vseg.y1 || hseg.y1 == vseg.y2);
                if vseg.x1 >= hseg.x1
                    && vseg.x1 <= hseg.x2
                    && hseg.y1 >= vseg.y1
                    && hseg.y1 <= vseg.y2
                    && !touch_end
                {
                    cross += 1;
                    bad.insert(p.ei);
                    bad.insert(q.ei);
                }
            } else if (pv && (p.x1 - q.x1).abs() < 1e-9 && p.y1.max(q.y1) < p.y2.min(q.y2))
                || (!pv && (p.y1 - q.y1).abs() < 1e-9 && p.x1.max(q.x1) < p.x2.min(q.x2))
            {
                over += 1;
                bad.insert(p.ei);
                bad.insert(q.ei);
            }
        }
    }
    for sg in &segs {
        let s = (sg.x1, sg.y1, sg.x2, sg.y2);
        for (id, &(x, y)) in cards {
            if id == edges[sg.ei].m || id == edges[sg.ei].c {
                continue;
            }
            let r = (x, y, x + cw, y + ch);
            if seg_hits(s, r) {
                card += 1;
                bad.insert(sg.ei);
            } else if seg_hits(
                s,
                (
                    r.0 - (pad - 0.5),
                    r.1 - (pad - 0.5),
                    r.2 + (pad - 0.5),
                    r.3 + (pad - 0.5),
                ),
            ) {
                near += 1;
                bad.insert(sg.ei);
            }
        }
    }
    for sg in &segs {
        let s = (sg.x1, sg.y1, sg.x2, sg.y2);
        let ma = dept_of_map.get(edges[sg.ei].m).and_then(|o| o.as_deref());
        let mb = dept_of_map.get(edges[sg.ei].c).and_then(|o| o.as_deref());
        for d in depts {
            if Some(d.id.as_str()) == ma || Some(d.id.as_str()) == mb {
                continue;
            }
            if seg_hits(s, (d.x1, d.y1, d.x2, d.y2)) {
                dept += 1;
                bad.insert(sg.ei);
            }
        }
    }
    (cross, over, card, near, dept, bad)
}

/// Простий елбоу card→card (варіант Simple): низ-центр батька → шина midY → верх дитини.
fn route_simple(l: &RouteInput) -> Vec<StaffTidyEdge> {
    let mut out: Vec<StaffTidyEdge> = Vec::new();
    for c in &l.pos_order {
        let Some(m) = l.primary_parent.get(c) else {
            continue;
        };
        let (Some(&(px, py)), Some(&(cx, cy))) = (l.cards.get(m), l.cards.get(c)) else {
            continue;
        };
        let pcx = px + l.cw / 2.0;
        let ccx = cx + l.cw / 2.0;
        let y1 = py + l.ch;
        let pts = if (pcx - ccx).abs() < 0.5 {
            vec![(pcx, y1), (ccx, cy)]
        } else {
            let mid = ((y1 + cy) / 2.0).round();
            vec![(pcx, y1), (pcx, mid), (ccx, mid), (ccx, cy)]
        };
        out.push(StaffTidyEdge {
            from_id: m.clone(),
            to_id: c.clone(),
            kind: classify(l, m, c).as_str().to_string(),
            ends_on_dept_top: false,
            points: pts
                .iter()
                .map(|&(x, y)| StaffTidyPoint {
                    x: x as f32,
                    y: y as f32,
                })
                .collect(),
        });
    }
    out.sort_by(|a, b| a.from_id.cmp(&b.from_id).then(a.to_id.cmp(&b.to_id)));
    out
}

/// A*-маршрутизація (варіант Astar, дефолт): докінг на рамки, обхід карток/чужих рамок,
/// repair-паси до усунення bad-ребер (мокап `route`). 0 перетинів — ціль.
fn route_astar(l: &RouteInput) -> Vec<StaffTidyEdge> {
    let (mut det, mut ast) = build_edges(l);

    for e in det.iter_mut() {
        let m = l.cards[&e.m];
        let mcx = m.0 + l.cw / 2.0;
        let mbot = m.1 + l.ch;
        let by = e.by.unwrap();
        let (tx, ty, edt) = edge_target(l, &e.c, false);
        e.pts = simp(&[(mcx, mbot), (mcx, by), (tx, by), (tx, ty)]);
        e.ends_top = edt;
    }

    let grid = build_grid(l, &det);

    // Інтернування id батька-джерела у u32 для occ.
    let mut ids: Vec<&String> = l.cards.keys().collect();
    ids.sort();
    let cid: HashMap<String, u32> = ids
        .iter()
        .enumerate()
        .map(|(i, s)| ((*s).clone(), i as u32))
        .collect();

    let mut occ = Occ::default();
    for e in &det {
        occ_edit(&mut occ, &grid, &e.pts, cid[&e.m], true);
    }

    ast.sort_by(|a, b| {
        (a.sec as u8)
            .cmp(&(b.sec as u8))
            .then(
                l.cards[&a.m]
                    .1
                    .partial_cmp(&l.cards[&b.m].1)
                    .unwrap_or(Ordering::Equal),
            )
            .then(
                l.cards[&a.m]
                    .0
                    .partial_cmp(&l.cards[&b.m].0)
                    .unwrap_or(Ordering::Equal),
            )
            .then(a.c.cmp(&b.c))
    });
    for e in ast.iter_mut() {
        let mkey = cid[&e.m];
        let (pts, failed) = astar(&grid, l, &occ, mkey, e);
        e.pts = pts;
        e.fail = failed;
        e.ends_top = edge_target(l, &e.c, e.sec).2;
        occ_edit(&mut occ, &grid, &e.pts, mkey, true);
    }

    for pass in 0..4 {
        let bad = {
            let views: Vec<EdgeView> = det
                .iter()
                .chain(ast.iter())
                .map(|e| EdgeView {
                    m: &e.m,
                    c: &e.c,
                    pts: &e.pts,
                })
                .collect();
            let (_, _, _, _, _, bad) =
                stats_core(&views, &l.cards, l.cw, l.ch, &l.depts, &l.dept_of, l.pad);
            bad
        };
        if bad.is_empty() {
            break;
        }
        let det_n = det.len();
        let mut bad_ast: Vec<usize> = (0..ast.len())
            .filter(|&ai| bad.contains(&(det_n + ai)))
            .collect();
        if pass % 2 == 1 {
            bad_ast.reverse();
        }
        for ai in bad_ast {
            let mkey = cid[&ast[ai].m];
            let old = ast[ai].pts.clone();
            occ_edit(&mut occ, &grid, &old, mkey, false);
            ast[ai].fail = false;
            let (pts, failed) = astar(&grid, l, &occ, mkey, &ast[ai]);
            occ_edit(&mut occ, &grid, &pts, mkey, true);
            ast[ai].pts = pts;
            ast[ai].fail = failed;
        }
    }

    let mut out: Vec<StaffTidyEdge> = det
        .iter()
        .chain(ast.iter())
        .map(|e| StaffTidyEdge {
            from_id: e.m.clone(),
            to_id: e.c.clone(),
            kind: e.kind.as_str().to_string(),
            ends_on_dept_top: e.ends_top,
            points: e
                .pts
                .iter()
                .map(|&(x, y)| StaffTidyPoint {
                    x: x as f32,
                    y: y as f32,
                })
                .collect(),
        })
        .collect();
    out.sort_by(|a, b| a.from_id.cmp(&b.from_id).then(a.to_id.cmp(&b.to_id)));
    out
}

/// Stats на результаті (для тестів-гейтів): рахує cross/card з готового StaffTidyResult.
#[cfg(test)]
fn tidy_stats(
    input: &StaffTidyInput,
    result: &StaffTidyResult,
) -> (usize, usize, usize, usize, usize) {
    let cards: HashMap<String, (f64, f64)> = result
        .nodes
        .iter()
        .map(|n| (n.id.clone(), (n.x as f64, n.y as f64)))
        .collect();
    let cw = input.params.card_width as f64;
    let ch = input.params.card_height as f64;
    let depts: Vec<DeptRect> = result
        .frames
        .iter()
        .map(|f| DeptRect {
            id: f.department_id.clone(),
            x1: f.x as f64,
            y1: f.y as f64,
            x2: (f.x + f.width) as f64,
            y2: (f.y + f.height) as f64,
            head: String::new(),
        })
        .collect();
    let dept_of_map: HashMap<String, Option<String>> = input
        .positions
        .iter()
        .map(|p| (p.id.clone(), p.department_id.clone()))
        .collect();
    let pts_owned: Vec<Vec<(f64, f64)>> = result
        .edges
        .iter()
        .map(|e| e.points.iter().map(|p| (p.x as f64, p.y as f64)).collect())
        .collect();
    let views: Vec<EdgeView> = result
        .edges
        .iter()
        .zip(pts_owned.iter())
        .map(|(e, pts)| EdgeView {
            m: &e.from_id,
            c: &e.to_id,
            pts,
        })
        .collect();
    let (cross, over, card, near, dept, _) = stats_core(
        &views,
        &cards,
        cw,
        ch,
        &depts,
        &dept_of_map,
        input.params.pad as f64,
    );
    (cross, over, card, near, dept)
}

/// Alpha staff-геометрія за алгоритмом мокапа. Детермінований вивід (ноди/рамки сортовані за id).
pub fn compute_staff_tidy_layout(input: &StaffTidyInput) -> Result<StaffTidyResult, String> {
    let p = &input.params;
    let (pad, lane) = (p.pad, p.lane);
    let cw = p.card_width;
    let ch = p.card_height;
    let hd = p.header_height;

    let sg = ev(f32::max(24.0, 2.0 * pad + 2.0 * lane + 8.0));
    let lv = ev(f32::max(56.0, 2.0 * pad + 4.0 * lane));
    let dp = ev(f32::max(28.0, pad + 2.0 * lane + 14.0));
    let dpt = hd + 24.0;
    let bg = ev(f32::max(44.0, 2.0 * pad + 3.0 * lane));
    let bv = ev(f32::max(96.0, 2.0 * pad + 8.0 * lane));

    // Декларативний порядок посад (еквівалент POS-індексу мокапа для tie-break).
    let order: HashMap<&str, usize> = input
        .positions
        .iter()
        .enumerate()
        .map(|(i, pos)| (pos.id.as_str(), i))
        .collect();
    let dept_of: HashMap<&str, Option<&str>> = input
        .positions
        .iter()
        .map(|pos| (pos.id.as_str(), pos.department_id.as_deref()))
        .collect();

    // Первинний батько = перше admin-ребро на дитину; діти в декларативному порядку посад.
    let mut parent: HashMap<&str, &str> = HashMap::new();
    for e in &input.reports {
        if e.kind != "admin" {
            continue;
        }
        parent.entry(e.to_id.as_str()).or_insert(e.from_id.as_str());
    }
    let mut kids: HashMap<&str, Vec<&str>> = HashMap::new();
    for pos in &input.positions {
        if let Some(par) = parent.get(pos.id.as_str()) {
            kids.entry(*par).or_default().push(pos.id.as_str());
        }
    }

    // Департаменти зліва направо: (order ?? 0, id) — як TS compareDepartments.
    let mut depts: Vec<&StaffDepartmentInput> = input.departments.iter().collect();
    depts.sort_by(|a, b| {
        a.order
            .unwrap_or(0.0)
            .partial_cmp(&b.order.unwrap_or(0.0))
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| a.id.cmp(&b.id))
    });

    // Блоки у детермінованому порядку: спершу департаменти, далі singleton-посади.
    let mut block_order: Vec<String> = Vec::new();
    let mut block_w: HashMap<String, f32> = HashMap::new();
    let mut block_h: HashMap<String, f32> = HashMap::new();
    let mut block_rel: HashMap<String, HashMap<String, (f32, f32)>> = HashMap::new();
    let mut block_head: HashMap<String, String> = HashMap::new();
    let mut block_roots: HashMap<String, Vec<String>> = HashMap::new();
    let mut block_dept: HashMap<String, Option<String>> = HashMap::new();

    for d in &depts {
        // Члени департаменту в декларативному порядку посад.
        let members: Vec<&str> = input
            .positions
            .iter()
            .filter(|pos| pos.department_id.as_deref() == Some(d.id.as_str()))
            .map(|pos| pos.id.as_str())
            .collect();
        if members.is_empty() {
            continue;
        }
        let member_set: std::collections::HashSet<&str> = members.iter().copied().collect();
        // Корені департаменту: без батька або батько поза департаментом.
        let roots: Vec<&str> = members
            .iter()
            .copied()
            .filter(|id| match parent.get(id) {
                None => true,
                Some(par) => !member_set.contains(par),
            })
            .collect();
        // Діти, обмежені членами департаменту (декларативний порядок).
        let mut dept_kids: HashMap<String, Vec<String>> = HashMap::new();
        for id in &members {
            let within: Vec<String> = kids
                .get(id)
                .map(|v| {
                    v.iter()
                        .filter(|c| member_set.contains(*c))
                        .map(|c| c.to_string())
                        .collect()
                })
                .unwrap_or_default();
            dept_kids.insert(id.to_string(), within);
        }

        let mut w: HashMap<String, f32> = HashMap::new();
        for r in &roots {
            subtree_width(r, &dept_kids, cw, sg, &mut w);
        }
        let depth = roots
            .iter()
            .map(|r| subtree_depth(r, &dept_kids))
            .max()
            .unwrap_or(1);
        let mut rel: HashMap<String, (f32, f32)> = HashMap::new();
        let mut x = dp;
        for r in &roots {
            place_within(r, x, 0, &dept_kids, &w, cw, sg, dpt, ch, lv, &mut rel);
            x += w[*r] + sg;
        }
        let width = x - sg + dp;
        let height = dpt + depth as f32 * ch + (depth as f32 - 1.0) * lv + dp;

        block_order.push(d.id.clone());
        block_w.insert(d.id.clone(), width);
        block_h.insert(d.id.clone(), height);
        block_rel.insert(d.id.clone(), rel);
        block_head.insert(d.id.clone(), roots[0].to_string());
        block_roots.insert(d.id.clone(), roots.iter().map(|r| r.to_string()).collect());
        block_dept.insert(d.id.clone(), Some(d.id.clone()));
    }

    // Singleton-блоки — кожна видима no-dept посада (декларативний порядок).
    for pos in &input.positions {
        if dept_of.get(pos.id.as_str()).copied().flatten().is_none() {
            let bid = format!("p:{}", pos.id);
            let mut rel = HashMap::new();
            rel.insert(pos.id.clone(), (0.0, 0.0));
            block_order.push(bid.clone());
            block_w.insert(bid.clone(), cw);
            block_h.insert(bid.clone(), ch);
            block_rel.insert(bid.clone(), rel);
            block_head.insert(bid.clone(), pos.id.clone());
            block_roots.insert(bid.clone(), vec![pos.id.clone()]);
            block_dept.insert(bid.clone(), None);
        }
    }

    // blockOf(id): блок департаменту посади, якщо є; інакше singleton-блок p:id.
    let block_of = |id: &str| -> String {
        match dept_of.get(id).copied().flatten() {
            Some(dep_id) if block_w.contains_key(dep_id) => dep_id.to_string(),
            _ => format!("p:{id}"),
        }
    };

    // src/parent кожного блоку: за батьком голови блоку.
    let mut block_src: HashMap<String, Option<String>> = HashMap::new();
    let mut block_parent: HashMap<String, Option<String>> = HashMap::new();
    for b in &block_order {
        let head = &block_head[b];
        let src = parent.get(head.as_str()).map(|s| s.to_string());
        let par = src.as_ref().map(|s| block_of(s));
        block_src.insert(b.clone(), src);
        block_parent.insert(b.clone(), par);
    }

    // kids блоку: усі блоки з parent==b, сортовані за x точки входу (src) у батьку, далі head-order.
    let mut block_kids: HashMap<String, Vec<String>> = HashMap::new();
    for b in &block_order {
        let mut children: Vec<String> = block_order
            .iter()
            .filter(|c| block_parent[*c].as_deref() == Some(b.as_str()))
            .cloned()
            .collect();
        children.sort_by(|a, c| {
            let ax = block_src[a]
                .as_ref()
                .and_then(|s| block_rel[b].get(s))
                .map(|r| r.0)
                .unwrap_or(0.0);
            let cx = block_src[c]
                .as_ref()
                .and_then(|s| block_rel[b].get(s))
                .map(|r| r.0)
                .unwrap_or(0.0);
            ax.partial_cmp(&cx)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| {
                    let ao = order.get(block_head[a].as_str()).copied().unwrap_or(0);
                    let co = order.get(block_head[c].as_str()).copied().unwrap_or(0);
                    ao.cmp(&co)
                })
        });
        block_kids.insert(b.clone(), children);
    }

    // Між-блокова розкладка: корені (без parent) зліва направо від (56, 72).
    let mut block_bw: HashMap<String, f32> = HashMap::new();
    let mut bx: HashMap<String, f32> = HashMap::new();
    let mut by: HashMap<String, f32> = HashMap::new();
    let mut x = 56.0_f32;
    for r in &block_order {
        if block_parent[r].is_some() {
            continue;
        }
        block_subtree_width(r, &block_kids, &block_w, bg, &mut block_bw);
        place_block(
            r,
            x,
            72.0,
            &block_kids,
            &block_bw,
            &block_w,
            &block_h,
            bg,
            bv,
            &mut bx,
            &mut by,
        );
        x += block_bw[r] + bg;
    }

    // Світові координати карток і рамок.
    let mut nodes: Vec<StaffTidyNode> = Vec::new();
    // Координати ноди за id — для побудови ліній зв'язку (card-to-card елбоу).
    let mut coords: HashMap<String, (f32, f32)> = HashMap::new();
    for b in &block_order {
        let (Some(&ox), Some(&oy)) = (bx.get(b), by.get(b)) else {
            continue;
        };
        for (id, (rx, ry)) in &block_rel[b] {
            let (x, y) = ((ox + rx).round(), (oy + ry).round());
            coords.insert(id.clone(), (x, y));
            nodes.push(StaffTidyNode {
                id: id.clone(),
                x,
                y,
                width: cw,
                height: ch,
            });
        }
    }
    nodes.sort_by(|a, b| a.id.cmp(&b.id));

    // Рамки департаментів (будуємо ДО ліній — роутер докає ребра на їхній верх).
    let mut frames: Vec<StaffTidyFrame> = Vec::new();
    for b in &block_order {
        if block_dept[b].is_none() {
            continue;
        }
        let (Some(&ox), Some(&oy)) = (bx.get(b), by.get(b)) else {
            continue;
        };
        frames.push(StaffTidyFrame {
            department_id: b.clone(),
            x: ox,
            y: oy,
            width: block_w[b],
            height: block_h[b],
        });
    }
    frames.sort_by(|a, b| a.department_id.cmp(&b.department_id));

    let scene_w = bx
        .iter()
        .map(|(id, &ox)| ox + block_w[id])
        .fold(0.0_f32, f32::max)
        + 56.0;
    let scene_h = by
        .iter()
        .map(|(id, &oy)| oy + block_h[id])
        .fold(0.0_f32, f32::max)
        + 56.0;

    // ---- Вхід маршрутизатора ліній (owned f64, детермінований) ----
    let mut dept_rects: Vec<DeptRect> = Vec::new();
    let mut dept_by_id: HashMap<String, usize> = HashMap::new();
    for b in &block_order {
        if block_dept[b].is_none() {
            continue;
        }
        let (Some(&ox), Some(&oy)) = (bx.get(b), by.get(b)) else {
            continue;
        };
        dept_by_id.insert(b.clone(), dept_rects.len());
        dept_rects.push(DeptRect {
            id: b.clone(),
            x1: ox as f64,
            y1: oy as f64,
            x2: (ox + block_w[b]) as f64,
            y2: (oy + block_h[b]) as f64,
            head: block_head[b].clone(),
        });
    }

    // Усі admin-батьки на дитину в порядку оголошення: [0]=первинний, решта=вторинні (p2…).
    let mut admin_parents: HashMap<&str, Vec<&str>> = HashMap::new();
    for e in &input.reports {
        if e.kind != "admin" || e.from_id == e.to_id {
            continue;
        }
        let v = admin_parents.entry(e.to_id.as_str()).or_default();
        if !v.contains(&e.from_id.as_str()) {
            v.push(e.from_id.as_str());
        }
    }
    let mut sec_parents: Vec<(String, String)> = Vec::new();
    for pos in &input.positions {
        if let Some(v) = admin_parents.get(pos.id.as_str()) {
            for m in v.iter().skip(1) {
                sec_parents.push((pos.id.clone(), m.to_string()));
            }
        }
    }

    let route_input = RouteInput {
        cards: coords
            .iter()
            .map(|(id, &(x, y))| (id.clone(), (x as f64, y as f64)))
            .collect(),
        cw: cw as f64,
        ch: ch as f64,
        depts: dept_rects,
        dept_by_id,
        dept_of: input
            .positions
            .iter()
            .map(|pos| (pos.id.clone(), pos.department_id.clone()))
            .collect(),
        primary_parent: parent
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect(),
        sec_parents,
        block_of: input
            .positions
            .iter()
            .map(|pos| (pos.id.clone(), block_of(pos.id.as_str())))
            .collect(),
        block_parent: block_parent.clone(),
        block_roots: block_roots.clone(),
        pos_order: input.positions.iter().map(|p| p.id.clone()).collect(),
        lv: lv as f64,
        bv: bv as f64,
        pad: pad as f64,
        lane: lane as f64,
        w: scene_w as f64,
        h: scene_h as f64,
    };

    let edges = match p.routing {
        StaffTidyRouting::Simple => route_simple(&route_input),
        StaffTidyRouting::Astar => route_astar(&route_input),
    };

    Ok(StaffTidyResult {
        nodes,
        frames,
        edges,
        width: scene_w,
        height: scene_h,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pos(id: &str, dept: Option<&str>) -> StaffPositionInput {
        StaffPositionInput {
            id: id.to_string(),
            organization_id: "o".to_string(),
            is_head: false,
            department_id: dept.map(|d| d.to_string()),
            order: None,
        }
    }
    fn admin(from: &str, to: &str) -> StaffEdgeInput {
        StaffEdgeInput {
            from_id: from.to_string(),
            to_id: to.to_string(),
            kind: "admin".to_string(),
        }
    }
    fn dept(id: &str) -> StaffDepartmentInput {
        StaffDepartmentInput {
            id: id.to_string(),
            order: None,
        }
    }

    fn sample() -> StaffTidyInput {
        StaffTidyInput {
            positions: vec![
                pos("ceo", None),
                pos("asst", None),
                pos("cfo", Some("fin")),
                pos("acc", Some("fin")),
            ],
            reports: vec![
                admin("ceo", "asst"),
                admin("ceo", "cfo"),
                admin("cfo", "acc"),
            ],
            departments: vec![dept("fin")],
            params: StaffTidyParams::default(),
        }
    }

    #[test]
    fn places_all_nodes_and_dept_frame() {
        let out = compute_staff_tidy_layout(&sample()).unwrap();
        assert_eq!(out.nodes.len(), 4, "усі 4 посади розміщені");
        assert_eq!(out.frames.len(), 1, "одна рамка департаменту (fin)");
        assert_eq!(out.frames[0].department_id, "fin");
        // Рамка охоплює cfo/acc із внутрішнім padding: ширина/висота > картки.
        assert!(out.frames[0].width > 236.0 && out.frames[0].height > 118.0);
    }

    #[test]
    fn within_dept_uses_lv_between_levels() {
        // cfo→acc — один департамент: вертикальний крок = CH + LV (118 + 56 = 174).
        let out = compute_staff_tidy_layout(&sample()).unwrap();
        let cfo = out.nodes.iter().find(|n| n.id == "cfo").unwrap();
        let acc = out.nodes.iter().find(|n| n.id == "acc").unwrap();
        assert_eq!(acc.y - cfo.y, 118.0 + 56.0);
    }

    #[test]
    fn between_blocks_uses_bv_not_lv() {
        // ceo(singleton) → asst(singleton): між-блок верт-крок = CH + BV (118 + 96 = 214),
        // а НЕ LV — підтверджує розчеплення LV≠BV алгоритму мокапа.
        let out = compute_staff_tidy_layout(&sample()).unwrap();
        let ceo = out.nodes.iter().find(|n| n.id == "ceo").unwrap();
        let asst = out.nodes.iter().find(|n| n.id == "asst").unwrap();
        assert_eq!(asst.y - ceo.y, 118.0 + 96.0);
    }

    #[test]
    fn emits_parent_child_edges() {
        // 3 admin-ребра → 3 лінії; кожна починається на низу батька й кінчається
        // на верху дитини (card-to-card елбоу).
        let out = compute_staff_tidy_layout(&sample()).unwrap();
        assert_eq!(out.edges.len(), 3, "по лінії на кожне parent→child");
        let cfo = out.nodes.iter().find(|n| n.id == "cfo").unwrap();
        let acc = out.nodes.iter().find(|n| n.id == "acc").unwrap();
        let e = out
            .edges
            .iter()
            .find(|e| e.from_id == "cfo" && e.to_id == "acc")
            .expect("ребро cfo→acc");
        let first = e.points.first().unwrap();
        let last = e.points.last().unwrap();
        assert_eq!(first.y, cfo.y + cfo.height, "старт — низ батька");
        assert_eq!(last.y, acc.y, "кінець — верх дитини");
    }

    #[test]
    fn output_is_deterministic() {
        let inp = sample();
        let a = serde_json::to_string(&compute_staff_tidy_layout(&inp).unwrap()).unwrap();
        let b = serde_json::to_string(&compute_staff_tidy_layout(&inp).unwrap()).unwrap();
        assert_eq!(a, b);
    }

    /// Повна сцена мокапа (`shps-links.js` POS/DEPTS) з мокап-параметрами (236×118, pad8/lane8).
    fn mock3_scene() -> StaffTidyInput {
        // (id, primary-parent, dept)
        let rows: &[(&str, Option<&str>, Option<&str>)] = &[
            ("ceo", None, None),
            ("asst", Some("ceo"), None),
            ("cfo", Some("ceo"), Some("fin")),
            ("acc", Some("cfo"), Some("fin")),
            ("fan", Some("cfo"), Some("fin")),
            ("bk", Some("acc"), Some("fin")),
            ("bz", Some("acc"), Some("fin")),
            ("bp", Some("acc"), Some("fin")),
            ("trs", Some("cfo"), Some("fin")),
            ("csh", Some("trs"), Some("fin")),
            ("pay", Some("trs"), Some("fin")),
            ("fa2", Some("fan"), Some("fin")),
            ("fa3", Some("fan"), Some("fin")),
            ("eco", Some("cfo"), Some("fin")),
            ("pln", Some("eco"), Some("fin")),
            ("ctl", Some("cfo"), Some("fin")),
            ("aud", Some("acc"), None),
            ("cco", Some("ceo"), Some("sal")),
            ("s1", Some("cco"), Some("sal")),
            ("s2", Some("cco"), Some("sal")),
            ("cto", Some("ceo"), Some("dev")),
            ("tlb", Some("cto"), Some("dev")),
            ("tlf", Some("cto"), Some("dev")),
            ("d1", Some("tlb"), Some("dev")),
            ("d2", Some("tlb"), Some("dev")),
            ("ah", Some("cfo"), Some("ana")),
            ("da", Some("ah"), Some("ana")), // вторинний батько ceo — нижче
            ("bi", Some("cto"), Some("ana")),
            ("qh", Some("tlb"), Some("qa")),
            ("q1", Some("qh"), Some("qa")),
            ("q2", Some("qh"), Some("qa")),
            ("hrd", Some("ceo"), Some("hr")),
            ("rec", Some("hrd"), Some("hr")),
            ("trn", Some("hrd"), Some("hr")),
            ("hrb", Some("hrd"), Some("hr")),
            ("rc2", Some("rec"), Some("hr")),
            ("lgl", Some("ceo"), Some("leg")),
            ("lw1", Some("lgl"), Some("leg")),
            ("lw2", Some("lgl"), Some("leg")),
            ("cmo", Some("cco"), Some("mkt")),
            ("smm", Some("cmo"), Some("mkt")),
            ("brd", Some("cmo"), Some("mkt")),
            ("mka", Some("cmo"), Some("mkt")),
            ("lgh", Some("cco"), Some("lgs")),
            ("wh", Some("lgh"), Some("lgs")),
            ("dsp", Some("lgh"), Some("lgs")),
            ("wk", Some("wh"), Some("lgs")),
            ("sch", Some("ceo"), Some("sec")),
            ("ib", Some("cto"), Some("sec")),
            ("grd", Some("sch"), Some("sec")),
        ];
        let dept_ids = [
            "fin", "sal", "dev", "ana", "qa", "hr", "leg", "mkt", "lgs", "sec",
        ];
        let positions: Vec<StaffPositionInput> =
            rows.iter().map(|(id, _, d)| pos(id, *d)).collect();
        let mut reports: Vec<StaffEdgeInput> = rows
            .iter()
            .filter_map(|(id, p, _)| p.map(|par| admin(par, id)))
            .collect();
        reports.push(admin("ceo", "da")); // вторинне admin-ребро (p2) — як у мокапі
        let departments: Vec<StaffDepartmentInput> = dept_ids
            .iter()
            .enumerate()
            .map(|(i, id)| StaffDepartmentInput {
                id: id.to_string(),
                order: Some(i as f64),
            })
            .collect();
        StaffTidyInput {
            positions,
            reports,
            departments,
            params: StaffTidyParams {
                pad: 8.0,
                lane: 8.0,
                card_width: 236.0,
                card_height: 118.0,
                header_height: 34.0,
                routing: StaffTidyRouting::Astar,
            },
        }
    }

    #[test]
    fn mock3_astar_zero_crossings_and_card_hits() {
        // Гейт вірності порту: на повній сцені мокап-роутер дає 0 перетинів ліній
        // і 0 ліній крізь чужі картки (саме це гарантує `shps-links.js`).
        let input = mock3_scene();
        let out = compute_staff_tidy_layout(&input).unwrap();
        let (cross, over, card, near, dept) = tidy_stats(&input, &out);
        assert_eq!(
            cross, 0,
            "перетини лінія-лінія: {cross} (over={over} near={near} dept={dept})"
        );
        assert_eq!(card, 0, "ліній крізь чужі картки: {card}");
        assert_eq!(over, 0, "overlapping lines: {over}");
        assert_eq!(near, 0, "lines below minimum clearance: {near}");
        assert_eq!(dept, 0, "department violations: {dept}");
    }

    /// Manual native measurement for coverage §8.4 (≤50 ms / 500 positions).
    /// The loose debug ceiling catches catastrophic regressions, not budget compliance.
    #[test]
    #[ignore = "wall-clock measurement; run explicitly with --ignored --nocapture"]
    fn staff_astar_500_positions_wall_clock() {
        use std::time::{Duration, Instant};

        let mut input = StaffTidyInput {
            positions: vec![pos("ceo", None)],
            reports: Vec::new(),
            departments: Vec::new(),
            params: mock3_scene().params,
        };
        // Central staff plus ten departments, each with four teams of eleven staff.
        for i in 0..9 {
            let id = format!("central-{i}");
            input.positions.push(pos(&id, None));
            input.reports.push(admin("ceo", &id));
        }
        for d in 0..10 {
            let department = format!("department-{d}");
            let head = format!("head-{d}");
            input.departments.push(dept(&department));
            input.positions.push(pos(&head, Some(&department)));
            input.reports.push(admin("ceo", &head));
            for t in 0..4 {
                let lead = format!("lead-{d}-{t}");
                input.positions.push(pos(&lead, Some(&department)));
                input.reports.push(admin(&head, &lead));
                for m in 0..11 {
                    let member = format!("member-{d}-{t}-{m}");
                    input.positions.push(pos(&member, Some(&department)));
                    input.reports.push(admin(&lead, &member));
                }
            }
        }
        assert_eq!(input.positions.len(), 500);
        assert_eq!(input.reports.len(), 499);
        assert_eq!(input.params.routing, StaffTidyRouting::Astar);

        let start = Instant::now();
        let result = compute_staff_tidy_layout(&input);
        let elapsed = start.elapsed();
        let budget_ms = 50.0;
        let ceiling = Duration::from_secs(60);
        println!(
            "A* 500 positions / 10 departments / 499 reports: {:.3} ms; \
             §8.4 budget {budget_ms} ms ({:.2}× budget); regression ceiling {} ms; debug={}",
            elapsed.as_secs_f64() * 1000.0,
            elapsed.as_secs_f64() * 1000.0 / budget_ms,
            ceiling.as_millis(),
            cfg!(debug_assertions),
        );
        let out = result.unwrap();
        assert_eq!(out.nodes.len(), 500);
        assert_eq!(out.frames.len(), 10);
        assert_eq!(out.edges.len(), 499);
        assert!(elapsed < ceiling, "A* 500-position regression: {elapsed:?}");
    }

    #[test]
    fn mock3_astar_deterministic() {
        let input = mock3_scene();
        let a = serde_json::to_string(&compute_staff_tidy_layout(&input).unwrap()).unwrap();
        let b = serde_json::to_string(&compute_staff_tidy_layout(&input).unwrap()).unwrap();
        assert_eq!(a, b, "два прогони A* → ідентичний вивід");
    }
}
