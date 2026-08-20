import { Container, Graphics } from 'pixi.js';
import { parseSvgPath } from './svgPath.js';
import type { OrgLayoutEdge } from '../layout/types.js';

/** Draw orthogonal SVG paths for org layout edges */
export class OrgEdgesView extends Container {
  private readonly graphics = new Graphics();

  constructor() {
    super();
    this.addChild(this.graphics);
  }

  static fromEdges(edges: OrgLayoutEdge[], stroke = 0x94a3b8, width = 2): OrgEdgesView {
    const view = new OrgEdgesView();
    view.redraw(edges, stroke, width);
    return view;
  }

  redraw(edges: OrgLayoutEdge[], stroke = 0x94a3b8, width = 2): void {
    this.graphics.clear();
    for (const edge of edges) {
      const parsed = parseSvgPath(edge.path);
      if (!parsed || parsed.points.length < 2) continue;
      const pts = parsed.points;
      this.graphics.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        this.graphics.lineTo(pts[i].x, pts[i].y);
      }
      this.graphics.stroke({ color: stroke, width });
    }
  }
}
