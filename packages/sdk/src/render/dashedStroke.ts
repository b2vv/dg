import { Container, Graphics } from 'pixi.js';

/**
 * Dashed geometry shared by every dashed outline on the canvas: staff zones,
 * department cards, the sibling frame and the vacant-seat card border.
 */

export interface DashedFrameOptions {
  /** Stroke color of the dashes. */
  color: number;
  /** Stroke width (default 1). */
  width?: number;
  /** Optional fill painted under the dashes. */
  fill?: number;
  fillAlpha?: number;
  /** Corner radius — the dashes follow it (default 0 = square corners). */
  borderRadius?: number;
  /** `[dash, gap]` in px (default `[6, 4]`). */
  dash?: readonly [number, number];
}

export interface RingPoint {
  x: number;
  y: number;
}

/** Perimeter of a rounded rect as a closed polyline (corners sampled as arcs). */
export function roundedRectRing(
  rect: { x: number; y: number; width: number; height: number },
  borderRadius: number,
  arcSteps = 6,
): RingPoint[] {
  const r = Math.max(0, Math.min(borderRadius, rect.width / 2, rect.height / 2));
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  if (r <= 0) {
    return [
      { x: rect.x, y: rect.y },
      { x: right, y: rect.y },
      { x: right, y: bottom },
      { x: rect.x, y: bottom },
    ];
  }
  const corners: Array<{ cx: number; cy: number; from: number }> = [
    { cx: right - r, cy: rect.y + r, from: -Math.PI / 2 }, // top-right
    { cx: right - r, cy: bottom - r, from: 0 }, // bottom-right
    { cx: rect.x + r, cy: bottom - r, from: Math.PI / 2 }, // bottom-left
    { cx: rect.x + r, cy: rect.y + r, from: Math.PI }, // top-left
  ];
  const points: RingPoint[] = [{ x: rect.x + r, y: rect.y }];
  for (const { cx, cy, from } of corners) {
    for (let i = 0; i <= arcSteps; i += 1) {
      const a = from + (Math.PI / 2) * (i / arcSteps);
      points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
  }
  return points;
}

/** B8a: dashed frame around a world AABB — honours `borderRadius`. */
export function paintDashedFrame(
  host: Container,
  rect: { x: number; y: number; width: number; height: number },
  options: DashedFrameOptions,
): void {
  const g = new Graphics();
  g.eventMode = 'none';
  const borderRadius = options.borderRadius ?? 0;
  if (options.fill !== undefined) {
    g.roundRect(rect.x, rect.y, rect.width, rect.height, borderRadius);
    g.fill({ color: options.fill, alpha: options.fillAlpha ?? 1 });
  }
  const [dash, gap] = options.dash ?? [6, 4];
  strokeDashedRing(g, roundedRectRing(rect, borderRadius), dash, gap);
  g.stroke({ width: options.width ?? 1, color: options.color });
  host.addChild(g);
}

/** Walk a closed ring, emitting alternating dash / gap chords. */
export function strokeDashedRing(g: Graphics, ring: RingPoint[], dash: number, gap: number): void {
  let draw = true;
  let carry = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const ux = dx / len;
    const uy = dy / len;
    let t = 0;
    while (t < len) {
      const want = (draw ? dash : gap) - carry;
      const seg = Math.min(want, len - t);
      if (draw) {
        g.moveTo(a.x + ux * t, a.y + uy * t);
        g.lineTo(a.x + ux * (t + seg), a.y + uy * (t + seg));
      }
      t += seg;
      if (seg >= want - 1e-6) {
        draw = !draw;
        carry = 0;
      } else {
        carry += seg;
      }
    }
  }
}
