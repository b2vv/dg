import { Container, Graphics } from 'pixi.js';
import {
  buildStaffEdgeSegments,
  type StaffEdgeBox,
  type StaffEdgeLink,
  type StaffEdgePoint,
} from '../layout/staffEdgeGeometry.js';
import {
  arrowHeadTriangle,
  drawEdgeEndDots,
  shortenPolylineForArrow,
  traceRoundedPolyline,
} from './staffEdgeArrows.js';
import type { EdgeStyle } from './types.js';

const ARROW_SIZE = 7;

const STROKE_LIGHT: Record<StaffEdgeLink['kind'], { color: number; width: number; dash?: number[] }> = {
  admin: { color: 0x334155, width: 2.25 },
  'cross-tier': { color: 0x334155, width: 2.25 },
  matrix: { color: 0x94a3b8, width: 1.5, dash: [6, 4] },
  dotted: { color: 0xa8a29e, width: 1.5, dash: [2, 4] },
};

const STROKE_DARK: Record<StaffEdgeLink['kind'], { color: number; width: number; dash?: number[] }> = {
  admin: { color: 0xe2e8f0, width: 2.25 },
  'cross-tier': { color: 0xe2e8f0, width: 2.25 },
  matrix: { color: 0x64748b, width: 1.5, dash: [6, 4] },
  dotted: { color: 0xa8a29e, width: 1.5, dash: [2, 4] },
};

type StaffEdgeStrokeTable = Record<
  StaffEdgeLink['kind'],
  { color: number; width: number; dash?: number[] }
>;

/** Per-kind stroke table; a host {@link EdgeStyle} repaints/resizes every kind. */
export function staffEdgeStrokes(
  theme: 'light' | 'dark',
  edge?: EdgeStyle,
): StaffEdgeStrokeTable {
  const base = theme === 'dark' ? STROKE_DARK : STROKE_LIGHT;
  if (edge?.color === undefined && edge?.width === undefined) return base;
  const apply = (s: { color: number; width: number; dash?: number[] }) => ({
    ...s,
    color: edge.color ?? s.color,
    width: edge.width ?? s.width,
  });
  return {
    admin: apply(base.admin),
    'cross-tier': apply(base['cross-tier']),
    matrix: apply(base.matrix),
    dotted: apply(base.dotted),
  };
}

/** Theme + host edge overrides for one staff-edge repaint. */
export interface StaffEdgePaint {
  theme?: 'light' | 'dark';
  edge?: EdgeStyle;
}

/** Report lines between staff position boxes (admin solid; matrix/dotted dashed). */
export class StaffEdgesView extends Container {
  private readonly graphics = new Graphics();

  constructor() {
    super();
    this.addChild(this.graphics);
  }

  static fromLayout(
    edges: StaffEdgeLink[],
    boxes: StaffEdgeBox[],
    paint: StaffEdgePaint = {},
  ): StaffEdgesView {
    const view = new StaffEdgesView();
    view.redraw(edges, boxes, paint);
    return view;
  }

  redraw(edges: StaffEdgeLink[], boxes: StaffEdgeBox[], paint: StaffEdgePaint = {}): void {
    this.graphics.clear();
    const { theme = 'light', edge } = paint;
    const stroke = staffEdgeStrokes(theme, edge);
    const dotted = edge?.terminator === 'dot';
    const dotRadius = edge?.dotRadius ?? 2.5;
    const radius = edge?.cornerRadius ?? 0;
    const segments = buildStaffEdgeSegments(edges, boxes);
    for (const seg of segments) {
      const style = stroke[seg.kind] ?? stroke.admin;
      const withArrow = !dotted && (seg.kind === 'admin' || seg.kind === 'cross-tier');
      if (style.dash) {
        drawDashedPolyline(this.graphics, seg.points, style.dash);
        this.graphics.stroke({ color: style.color, width: style.width });
        if (dotted) drawEdgeEndDots(this.graphics, seg.points, style.color, dotRadius);
        continue;
      }
      const pts = seg.points;
      if (pts.length < 2) continue;
      const drawPts = withArrow ? shortenPolylineForArrow(pts, ARROW_SIZE) : pts;
      traceRoundedPolyline(this.graphics, drawPts, radius);
      this.graphics.stroke({ color: style.color, width: style.width, join: 'round', cap: 'round' });
      if (withArrow) {
        drawArrowHead(this.graphics, pts, style.color);
      } else if (dotted) {
        drawEdgeEndDots(this.graphics, pts, style.color, dotRadius);
      }
    }
  }
}

function drawArrowHead(g: Graphics, points: StaffEdgePoint[], color: number): void {
  const a = points[points.length - 2]!;
  const b = points[points.length - 1]!;
  const tri = arrowHeadTriangle(a, b, ARROW_SIZE);
  if (!tri) return;
  g.moveTo(tri[0].x, tri[0].y);
  g.lineTo(tri[1].x, tri[1].y);
  g.lineTo(tri[2].x, tri[2].y);
  g.closePath();
  g.fill({ color });
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
