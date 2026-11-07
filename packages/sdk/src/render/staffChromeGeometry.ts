// Pure geometry for the React near-view chrome (T129): world→screen for frames
// and line points, and the rounded SVG path for connector lines. No DOM, no React,
// no Pixi — just numbers, so it is unit-tested in SDK (the presentation lives in the
// demo backdrop, which is outside the gate suite). Kept next to `promoteMath`
// (`worldBoxToScreen`), whose origin convention this matches: `x * scale + viewport`.
import type { ViewportTransform } from './Viewport.js';
import type { DiagramData } from '../data/types.js';
import type { StaffLiveGeometry } from './staffLiveGeometry.js';

export interface ScreenPoint {
  x: number;
  y: number;
}

/** World point — distinct from {@link ScreenPoint}, which is already mapped to px. */
export interface WorldPoint {
  x: number;
  y: number;
}

/** World point → screen px, same origin as {@link worldBoxToScreen}. */
export function worldPointToScreen(x: number, y: number, v: ViewportTransform): ScreenPoint {
  return { x: x * v.scale + v.x, y: y * v.scale + v.y };
}

/**
 * SVG path data for an orthogonal polyline with rounded corners — the mockup
 * `pathD` behaviour (paraphrased from `shps-links.js`): each interior vertex is
 * replaced by a quadratic arc whose radius is clamped to half of the shorter of
 * the two adjacent segments, so a short chord never over-rounds. Straight runs
 * stay `L`. `radius` is in the SAME space as the points (pass screen-space radius
 * for screen-space points).
 */
export function roundedPathD(points: readonly ScreenPoint[], radius: number): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  if (points.length === 1) return `M${first.x} ${first.y}`;
  let d = `M${first.x} ${first.y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const c = points[i + 1]!;
    const l1 = Math.hypot(b.x - a.x, b.y - a.y);
    const l2 = Math.hypot(c.x - b.x, c.y - b.y);
    // Zero-length segment (duplicate vertex): no corner to round, no divide-by-zero.
    if (l1 === 0 || l2 === 0) {
      d += `L${b.x} ${b.y}`;
      continue;
    }
    const rr = Math.min(radius, l1 / 2, l2 / 2);
    const ux = (b.x - a.x) / l1;
    const uy = (b.y - a.y) / l1;
    const wx = (c.x - b.x) / l2;
    const wy = (c.y - b.y) / l2;
    d += `L${b.x - ux * rr} ${b.y - uy * rr}Q${b.x} ${b.y} ${b.x + wx * rr} ${b.y + wy * rr}`;
  }
  const last = points[points.length - 1]!;
  d += `L${last.x} ${last.y}`;
  return d;
}

// --- Б2: chrome geometry (frames/org/lines/boxes) in world coords -----------
// Moved from the demo backdrop so the host reads it from the SDK instead of
// recomputing it: the single geometry source (the same Rust mockup layout the
// renderer paints) feeds both the Pixi scene and the React near-view chrome.

export interface ChromeDeptFrame {
  departmentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  count: number;
}

export interface ChromeLine {
  fromId: string;
  toId: string;
  points: WorldPoint[];
  endsOnDeptTop: boolean;
}

export interface NodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Chrome geometry the host draws around the promoted seat cards: the current-org
 * frame, department frames, connector lines and per-seat boxes — all in WORLD
 * coords. The host applies one camera transform (see {@link PromoteBackdropProps.worldTransform})
 * and never maps a point itself. The search-hit marker (`foundId`) is deliberately
 * NOT here: which seat is "found" is host search state, not geometry.
 */
export interface StaffChromeGeometry {
  org: { x: number; y: number; width: number; height: number; name: string } | null;
  depts: ChromeDeptFrame[];
  lines: ChromeLine[];
  /** Seat boxes in world coords, keyed by position id (host rings the found one). */
  nodeBoxes: Record<string, NodeBox>;
}

/**
 * Padding the host asks the SDK to apply around the org AABB. Set once on the
 * diagram (not per call), so the org box in the getter, in the backdrop props and
 * in {@link computeStaffFit} is physically the same box. `x` pads left/right,
 * `top` pads the label row, `bottom` defaults to `x`. Styling numbers belong to
 * the host; applying them to the extent (which fit must respect) belongs here.
 */
export interface StaffChromePad {
  x: number;
  top: number;
  bottom?: number;
}

export const DEFAULT_STAFF_CHROME_PAD: StaffChromePad = { x: 20, top: 44 };

/**
 * Derive the chrome geometry from the live staff geometry + data. Org frame = the
 * AABB of every department frame and seat node, padded by `pad` (room for the org
 * label at the top). Dept name/count are joined from `data`.
 */
export function buildStaffChromeGeometry(
  live: StaffLiveGeometry,
  data: DiagramData,
  currentOrgId: string,
  pad: StaffChromePad,
): StaffChromeGeometry {
  const deptName = new Map(data.departments.map((d) => [d.id, d.name]));
  const countByDept = new Map<string, number>();
  for (const p of data.positions) {
    if (p.departmentId)
      countByDept.set(p.departmentId, (countByDept.get(p.departmentId) ?? 0) + 1);
  }

  const depts: ChromeDeptFrame[] = live.frames.map((f) => ({
    departmentId: f.departmentId,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    name: deptName.get(f.departmentId) ?? f.departmentId,
    count: countByDept.get(f.departmentId) ?? 0,
  }));

  const lines: ChromeLine[] = live.routes.map((r) => ({
    fromId: r.fromId,
    toId: r.toId,
    points: r.points.map((p) => ({ x: p.x, y: p.y })),
    endsOnDeptTop: r.endsOnDeptTop === true,
  }));

  // Org frame = AABB over frames + seat nodes, padded (top wider for the label).
  const boxes = [
    ...live.frames.map((f) => ({ x: f.x, y: f.y, r: f.x + f.width, b: f.y + f.height })),
    ...live.canvas.positionNodes.map((n) => ({
      x: n.x,
      y: n.y,
      r: n.x + n.width,
      b: n.y + n.height,
    })),
  ];
  let org: StaffChromeGeometry['org'] = null;
  if (boxes.length > 0) {
    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.r));
    const maxY = Math.max(...boxes.map((b) => b.b));
    // Pad is host styling, not geometry: a negative or NaN value is a host mistake
    // that must never shrink the box inside its own content or poison the numbers —
    // and must never throw, since this runs inside the render path. Clamp to ≥0.
    const nonNeg = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);
    const padX = nonNeg(pad.x);
    const padTop = nonNeg(pad.top);
    const bottom = nonNeg(pad.bottom ?? pad.x);
    org = {
      x: minX - padX,
      y: minY - padTop,
      width: maxX - minX + padX * 2,
      height: maxY - minY + padTop + bottom,
      name:
        data.organizations.find((o) => o.id === currentOrgId)?.name ??
        data.organizations.find((o) => o.role === 'current')?.name ??
        '',
    };
  }

  const nodeBoxes: Record<string, NodeBox> = {};
  for (const n of live.canvas.positionNodes) {
    nodeBoxes[n.id] = { x: n.x, y: n.y, width: n.width, height: n.height };
  }

  return { org, depts, lines, nodeBoxes };
}

export interface StaffFitOptions {
  padding?: number;
  minScale?: number;
  maxScale?: number;
  axis?: 'both' | 'width';
  align?: 'center' | 'top';
}

/**
 * Camera that frames the padded org box (mockup v3 `fit`). `axis:'width'` scales
 * from width only (fitting height too would drop a tall tree below the near-view
 * threshold where React cards give way to Pixi); `axis:'both'` takes the smaller
 * of the two fits. Scale is clamped to `[minScale, maxScale]`, centred
 * horizontally, and `align:'top'` pins the box top at `padding` (else centred
 * vertically). Pure — the camera move is applied by the caller.
 */
export function computeStaffFit(
  box: { x: number; y: number; width: number; height: number },
  screen: { width: number; height: number },
  opts: StaffFitOptions = {},
): { x: number; y: number; scale: number } {
  const padding = opts.padding ?? 48;
  const minScale = opts.minScale ?? 0.55;
  const maxScale = opts.maxScale ?? 1;
  const axis = opts.axis ?? 'width';
  const align = opts.align ?? 'top';

  const availW = Math.max(1, screen.width - padding * 2);
  const fitW = availW / Math.max(1, box.width);
  let scale = fitW;
  if (axis === 'both') {
    const availH = Math.max(1, screen.height - padding * 2);
    scale = Math.min(fitW, availH / Math.max(1, box.height));
  }
  scale = Math.min(maxScale, Math.max(minScale, scale));

  const x = (screen.width - box.width * scale) / 2 - box.x * scale;
  const y =
    align === 'top'
      ? padding - box.y * scale
      : (screen.height - box.height * scale) / 2 - box.y * scale;
  return { x, y, scale };
}
