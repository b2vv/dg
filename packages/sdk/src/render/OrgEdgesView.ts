import { Container, Graphics } from 'pixi.js';
import { parseSvgPath } from './svgPath.js';
import { drawEdgeEndDots, traceRoundedPolyline } from './staffEdgeArrows.js';
import type { OrgLayoutEdge } from '../layout/types.js';
import type { EdgeStyle } from './types.js';

const DEFAULT_ORG_EDGE: Required<Pick<EdgeStyle, 'color' | 'width'>> = {
  color: 0x94a3b8,
  width: 2,
};

/** Draw orthogonal SVG paths for org layout edges */
export class OrgEdgesView extends Container {
  private readonly graphics = new Graphics();

  constructor() {
    super();
    this.addChild(this.graphics);
  }

  static fromEdges(edges: OrgLayoutEdge[], edge: EdgeStyle = {}): OrgEdgesView {
    const view = new OrgEdgesView();
    view.redraw(edges, edge);
    return view;
  }

  redraw(edges: OrgLayoutEdge[], edge: EdgeStyle = {}): void {
    this.graphics.clear();
    const color = edge.color ?? DEFAULT_ORG_EDGE.color;
    const width = edge.width ?? DEFAULT_ORG_EDGE.width;
    const radius = edge.cornerRadius ?? 0;
    const dotRadius = edge.terminator === 'dot' ? (edge.dotRadius ?? 2.5) : 0;
    for (const e of edges) {
      const parsed = parseSvgPath(e.path);
      if (!parsed || parsed.points.length < 2) continue;
      traceRoundedPolyline(this.graphics, parsed.points, radius);
      this.graphics.stroke({ color, width, join: 'round', cap: 'round' });
      drawEdgeEndDots(this.graphics, parsed.points, color, dotRadius);
    }
  }
}
