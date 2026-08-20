import { Container, Graphics, Text } from 'pixi.js';
import { parseSvgPath } from './svgPath.js';
import type { DepartmentBlobStyle } from './types.js';

export class DepartmentBlobView extends Container {
  readonly label: string;
  private readonly shape = new Graphics();
  private readonly labelText: Text;

  constructor(label: string) {
    super();
    this.label = label;
    this.labelText = new Text({
      text: label,
      style: { fill: 0x1e3a5f, fontSize: 14 },
    });
    this.addChild(this.shape, this.labelText);
  }

  static fromPath(path: string, label: string, style: DepartmentBlobStyle): DepartmentBlobView {
    const view = new DepartmentBlobView(label);
    view.redraw(path, style);
    return view;
  }

  redraw(path: string, style: DepartmentBlobStyle): void {
    this.shape.clear();
    this.labelText.style.fill = style.labelColor;
    this.labelText.style.fontSize = style.labelFontSize;

    const parsed = parseSvgPath(path);
    if (!parsed || parsed.points.length < 2) {
      if (path.trim()) {
        console.warn('[DepartmentBlob] invalid or empty SVG path');
      }
      return;
    }

    const pts = parsed.points;
    this.shape.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) {
      this.shape.lineTo(pts[i].x, pts[i].y);
    }
    if (parsed.closed) {
      this.shape.closePath();
    }
    this.shape.fill({ color: style.fill, alpha: style.fillAlpha });
    this.shape.stroke({ color: style.stroke, width: style.strokeWidth });

    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    this.labelText.anchor.set(0.5, 0.5);
    this.labelText.position.set(cx, cy);
  }
}
