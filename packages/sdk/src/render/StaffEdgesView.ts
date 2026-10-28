import { Container, Graphics } from 'pixi.js';
import {
  type StaffEdgePoint,
  type StaffEdgeSegment,
} from '../layout/staffEdgeGeometry.js';
import {
  arrowHeadTriangle,
  drawEdgeEndDots,
  shortenPolylineForArrow,
  traceRoundedPolyline,
} from './staffEdgeArrows.js';
import type { EdgeStyle } from './types.js';
import { staffEdgeStrokes } from './staffEdgeStrokes.js';

export { staffEdgeStrokes } from './staffEdgeStrokes.js';

const ARROW_SIZE = 7;
/** §12 placeholder for residual routing crossings. */
const MARKED_COLOR = 0xdc2626;

/** Theme + host edge overrides for one staff-edge repaint. */
export interface StaffEdgePaint {
  theme?: 'light' | 'dark';
  edge?: EdgeStyle;
}

export interface EdgeHighlight {
  accentKeys: ReadonlySet<string>;
  dim: boolean;
}

/** Report lines between staff position boxes (admin solid; lead-org/matrix/dotted dashed). */
export class StaffEdgesView extends Container {
  private readonly graphics = new Graphics();
  private lastSegments: StaffEdgeSegment[] = [];
  private paint: StaffEdgePaint = {};
  private markedKeys: ReadonlySet<string> | undefined;

  constructor() {
    super();
    this.addChild(this.graphics);
  }

  static fromLayout(
    segments: StaffEdgeSegment[],
    paint: StaffEdgePaint = {},
    markedKeys?: ReadonlySet<string>,
  ): StaffEdgesView {
    const view = new StaffEdgesView();
    view.redraw(segments, paint, markedKeys);
    return view;
  }

  // Pure painter: the routed segments are computed once by the single seam
  // (`resolveStaffRouting`, T126 R6-6) and handed in; the view never re-routes.
  redraw(
    segments: StaffEdgeSegment[],
    paint: StaffEdgePaint = {},
    markedKeys?: ReadonlySet<string>,
  ): void {
    this.lastSegments = segments;
    this.paint = paint;
    this.markedKeys = markedKeys;
    this.applyHighlight({ accentKeys: new Set(), dim: false });
  }

  applyHighlight({ accentKeys, dim }: EdgeHighlight): void {
    this.graphics.clear();
    const { theme = 'light', edge } = this.paint;
    const stroke = staffEdgeStrokes(theme, edge);
    const dotted = edge?.terminator === 'dot';
    const dotRadius = edge?.dotRadius ?? 2.5;
    const radius = edge?.cornerRadius ?? 0;
    for (const seg of this.lastSegments) {
      const baseStyle = stroke[seg.kind] ?? stroke.admin;
      const key = `${seg.fromId}\u0000${seg.toId}`;
      const markedStyle = this.markedKeys?.has(key)
        ? { ...baseStyle, color: MARKED_COLOR, width: baseStyle.width + 0.75 }
        : baseStyle;
      const accented = seg.kind === 'admin' && accentKeys.has(key);
      const style = accented
        ? { ...markedStyle, color: edge?.accentColor ?? 0xe5491d, width: edge?.accentWidth ?? 2 }
        : markedStyle;
      const alpha = dim && !accented ? (edge?.dimAlpha ?? 0.40) : 1;
      const withArrow = !dotted && seg.kind === 'admin';
      if (style.dash) {
        drawDashedPolyline(this.graphics, seg.points, style.dash);
        this.graphics.stroke({ color: style.color, width: style.width, alpha });
        if (dotted) drawEdgeEndDots(this.graphics, seg.points, style.color, dotRadius, alpha);
        continue;
      }
      const pts = seg.points;
      if (pts.length < 2) continue;
      const drawPts = withArrow ? shortenPolylineForArrow(pts, ARROW_SIZE) : pts;
      traceRoundedPolyline(this.graphics, drawPts, radius);
      this.graphics.stroke({ color: style.color, width: style.width, alpha, join: 'round', cap: 'round' });
      if (withArrow) {
        drawArrowHead(this.graphics, pts, style.color, alpha);
      } else if (dotted) {
        drawEdgeEndDots(this.graphics, pts, style.color, dotRadius, alpha);
      }
    }
  }
}

function drawArrowHead(g: Graphics, points: StaffEdgePoint[], color: number, alpha: number): void {
  const a = points[points.length - 2]!;
  const b = points[points.length - 1]!;
  const tri = arrowHeadTriangle(a, b, ARROW_SIZE);
  if (!tri) return;
  g.moveTo(tri[0].x, tri[0].y);
  g.lineTo(tri[1].x, tri[1].y);
  g.lineTo(tri[2].x, tri[2].y);
  g.closePath();
  g.fill({ color, alpha });
}

function drawDashedPolyline(g: Graphics, points: StaffEdgePoint[], pattern: number[]): void {
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    drawDashed(g, a.x, a.y, b.x, b.y, pattern);
  }
}

function drawDashed(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pattern: number[],
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return;
  const ux = dx / len;
  const uy = dy / len;
  let dist = 0;
  let draw = true;
  let pi = 0;
  let cx = x1;
  let cy = y1;
  while (dist < len) {
    const step = Math.min(pattern[pi % pattern.length]!, len - dist);
    const nx = cx + ux * step;
    const ny = cy + uy * step;
    if (draw) {
      g.moveTo(cx, cy);
      g.lineTo(nx, ny);
    }
    cx = nx;
    cy = ny;
    dist += step;
    draw = !draw;
    pi += 1;
  }
}
