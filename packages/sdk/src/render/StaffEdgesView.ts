import { Container, Graphics } from 'pixi.js';
import {
  buildStaffEdgeSegments,
  type StaffEdgeBox,
  type StaffEdgeLink,
  type StaffEdgePoint,
} from './staffEdgeGeometry.js';

const STROKE_LIGHT: Record<StaffEdgeLink['kind'], { color: number; width: number; dash?: number[] }> = {
  admin: { color: 0x64748b, width: 1.75 },
  'cross-tier': { color: 0x64748b, width: 1.75 },
  matrix: { color: 0x94a3b8, width: 1.35, dash: [6, 4] },
  dotted: { color: 0xa8a29e, width: 1.35, dash: [2, 4] },
};

const STROKE_DARK: Record<StaffEdgeLink['kind'], { color: number; width: number; dash?: number[] }> = {
  admin: { color: 0x94a3b8, width: 1.75 },
  'cross-tier': { color: 0x94a3b8, width: 1.75 },
  matrix: { color: 0x64748b, width: 1.35, dash: [6, 4] },
  dotted: { color: 0xa8a29e, width: 1.35, dash: [2, 4] },
};

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
    theme: 'light' | 'dark' = 'light',
  ): StaffEdgesView {
    const view = new StaffEdgesView();
    view.redraw(edges, boxes, theme);
    return view;
  }

  redraw(
    edges: StaffEdgeLink[],
    boxes: StaffEdgeBox[],
    theme: 'light' | 'dark' = 'light',
  ): void {
    this.graphics.clear();
    const stroke = theme === 'dark' ? STROKE_DARK : STROKE_LIGHT;
    const segments = buildStaffEdgeSegments(edges, boxes);
    for (const seg of segments) {
      const style = stroke[seg.kind] ?? stroke.admin;
      if (style.dash) {
        drawDashedPolyline(this.graphics, seg.points, style.dash);
      } else {
        const pts = seg.points;
        if (pts.length < 2) continue;
        this.graphics.moveTo(pts[0]!.x, pts[0]!.y);
        for (let i = 1; i < pts.length; i += 1) {
          this.graphics.lineTo(pts[i]!.x, pts[i]!.y);
        }
      }
      this.graphics.stroke({ color: style.color, width: style.width });
    }
  }
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
