import { Container, Graphics, Text } from 'pixi.js';
import { parseSvgPath } from './svgPath.js';
import { simplifyPolyline, type LodLevel } from './lod.js';
import type { DepartmentBlobStyle } from './types.js';

/**
 * Department membership blob: fill stays under cards; stroke Graphics is
 * painted separately (LayerManager.departmentStrokes above persons) so the
 * outline reads consistently in corridors without fighting card shadows.
 */
export class DepartmentBlobView extends Container {
  readonly label: string;
  readonly lod: LodLevel;
  /** World stroke path — hosted on `departmentStrokes` layer, not as a child. */
  readonly strokeGraphics = new Graphics();
  private readonly fillGraphics = new Graphics();
  private readonly labelText: Text;
  private readonly countBadge: Text;
  private lastPoints: { x: number; y: number }[] = [];

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
    this.addChild(this.fillGraphics, this.labelText, this.countBadge);
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

  static fromPoints(
    points: { x: number; y: number }[],
    label: string,
    style: DepartmentBlobStyle,
    lod: LodLevel = 'near',
    personCount?: number,
  ): DepartmentBlobView {
    const view = new DepartmentBlobView(label, lod);
    view.redrawPoints(points, style, lod, personCount);
    return view;
  }

  /** Last drawn ring (world px) — used as morph source. */
  getDrawnPoints(): readonly { x: number; y: number }[] {
    return this.lastPoints;
  }

  destroy(options?: boolean | { children?: boolean; texture?: boolean }): void {
    if (!this.strokeGraphics.destroyed) {
      this.strokeGraphics.destroy();
    }
    super.destroy(options);
  }

  redraw(
    path: string,
    style: DepartmentBlobStyle,
    lod: LodLevel = this.lod,
    personCount?: number,
  ): void {
    const parsed = parseSvgPath(path);
    if (!parsed || parsed.points.length < 2) {
      if (path.trim()) {
        console.warn('[DepartmentBlob] invalid or empty SVG path');
      }
      this.fillGraphics.clear();
      this.strokeGraphics.clear();
      this.lastPoints = [];
      return;
    }
    this.redrawPoints(parsed.points, style, lod, personCount, parsed.closed);
  }

  redrawPoints(
    points: { x: number; y: number }[],
    style: DepartmentBlobStyle,
    lod: LodLevel = this.lod,
    personCount?: number,
    closed = true,
  ): void {
    this.fillGraphics.clear();
    this.strokeGraphics.clear();
    this.labelText.style.fill = style.labelColor;
    this.labelText.style.fontSize = lod === 'far' ? 11 : style.labelFontSize;

    if (points.length < 2) {
      this.lastPoints = [];
      return;
    }

    const pts = simplifyPolyline(points, lod);
    this.lastPoints = pts.map((p) => ({ x: p.x, y: p.y }));

    traceRing(this.fillGraphics, pts, closed);
    this.fillGraphics.fill({ color: style.fill, alpha: style.fillAlpha });

    traceRing(this.strokeGraphics, pts, closed);
    this.strokeGraphics.stroke({
      color: style.stroke,
      width: lod === 'far' ? Math.max(0.75, style.strokeWidth) : style.strokeWidth,
      join: 'round',
      cap: 'round',
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
    if (style.labelAlign === 'right') {
      const pad = 8;
      const maxX = Math.max(...pts.map((p) => p.x));
      const minY = Math.min(...pts.map((p) => p.y));
      this.labelText.anchor.set(1, 0);
      this.labelText.position.set(maxX - pad, minY + pad);
      return;
    }
    this.labelText.anchor.set(0.5, 0.5);
    this.labelText.position.set(cx, cy);
  }
}

function traceRing(
  g: Graphics,
  pts: readonly { x: number; y: number }[],
  closed: boolean,
): void {
  g.moveTo(pts[0]!.x, pts[0]!.y);
  for (let i = 1; i < pts.length; i += 1) {
    g.lineTo(pts[i]!.x, pts[i]!.y);
  }
  if (closed) g.closePath();
}
