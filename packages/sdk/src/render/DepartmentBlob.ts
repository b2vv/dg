import { Container, Graphics, Text } from 'pixi.js';
import { parseSvgPath } from './svgPath.js';
import { simplifyPolyline, type LodLevel } from './lod.js';
import type { DepartmentBlobStyle } from './types.js';

export class DepartmentBlobView extends Container {
  readonly label: string;
  readonly lod: LodLevel;
  private readonly shape = new Graphics();
  private readonly labelText: Text;
  private readonly countBadge: Text;

  constructor(label: string, lod: LodLevel = 'near') {
    super();
    this.label = label;
    this.lod = lod;
    this.labelText = new Text({
      text: label,
      style: { fill: 0x1e3a5f, fontSize: 14 },
    });
    this.countBadge = new Text({
      text: '',
      style: { fill: 0x1e3a5f, fontSize: 12, fontWeight: '600' },
    });
    this.addChild(this.shape, this.labelText, this.countBadge);
  }

  static fromPath(
    path: string,
    label: string,
    style: DepartmentBlobStyle,
    lod: LodLevel = 'near',
    personCount?: number,
  ): DepartmentBlobView {
    const view = new DepartmentBlobView(label, lod);
    view.redraw(path, style, lod, personCount);
    return view;
  }

  redraw(
    path: string,
    style: DepartmentBlobStyle,
    lod: LodLevel = this.lod,
    personCount?: number,
  ): void {
    this.shape.clear();
    this.labelText.style.fill = style.labelColor;
    this.labelText.style.fontSize = lod === 'far' ? 11 : style.labelFontSize;

    const parsed = parseSvgPath(path);
    if (!parsed || parsed.points.length < 2) {
      if (path.trim()) {
        console.warn('[DepartmentBlob] invalid or empty SVG path');
      }
      return;
    }

    const pts = simplifyPolyline(parsed.points, lod);
    this.shape.moveTo(pts[0]!.x, pts[0]!.y);
    for (let i = 1; i < pts.length; i += 1) {
      this.shape.lineTo(pts[i]!.x, pts[i]!.y);
    }
    if (parsed.closed) {
      this.shape.closePath();
    }
    this.shape.fill({ color: style.fill, alpha: style.fillAlpha });
    this.shape.stroke({
      color: style.stroke,
      width: lod === 'far' ? Math.max(1, style.strokeWidth - 1) : style.strokeWidth,
    });

    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;

    if (lod === 'far') {
      this.labelText.visible = false;
      this.countBadge.visible = typeof personCount === 'number';
      if (typeof personCount === 'number') {
        this.countBadge.text = String(personCount);
        this.countBadge.anchor.set(0.5, 0.5);
        this.countBadge.position.set(cx, cy);
        this.countBadge.style.fill = style.labelColor;
      }
      return;
    }

    this.countBadge.visible = false;
    this.labelText.visible = true;
    this.labelText.text = this.label;
    this.labelText.anchor.set(0.5, 0.5);
    this.labelText.position.set(cx, cy);
  }
}
