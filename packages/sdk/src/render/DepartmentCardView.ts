import { Container, Graphics, Text } from 'pixi.js';
import type { DiagramDepartment } from '../data/types.js';
import type { DepartmentCardStyle } from './types.js';
import { unionBoxes } from './staffZoneBounds.js';

export interface DeptMemberBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Rectangular department chrome (T64) — alternative to DepartmentBlob.
 */
export class DepartmentCardView extends Container {
  static fromMembers(
    dept: DiagramDepartment,
    members: readonly DeptMemberBox[],
    style: DepartmentCardStyle,
    options?: { padding?: number; minMembers?: number },
  ): DepartmentCardView | null {
    const minMembers = options?.minMembers ?? 1;
    if (members.length < minMembers) return null;
    const padding = options?.padding ?? 8;
    const bounds = unionBoxes(members, padding);
    if (!bounds) return null;

    const view = new DepartmentCardView();
    view.eventMode = 'none';
    const g = new Graphics();
    g.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, style.borderRadius);
    g.fill({ color: style.fill, alpha: style.fillAlpha });
    g.stroke({ width: style.strokeWidth, color: style.stroke });
    view.addChild(g);

    const label = new Text({
      text: dept.name,
      style: {
        fill: style.labelColor,
        fontSize: style.labelFontSize,
        fontFamily: 'system-ui, sans-serif',
      },
    });
    label.position.set(bounds.x + bounds.width - label.width - 8, bounds.y + 6);
    view.addChild(label);
    return view;
  }
}

/** B8a: dashed rectangle around a world AABB (matrix/grid frame). */
export function paintDashedFrame(
  host: Container,
  rect: { x: number; y: number; width: number; height: number },
  color: number,
  width = 1,
): void {
  const g = new Graphics();
  g.eventMode = 'none';
  const dash = 6;
  const gap = 4;
  const segments: Array<[number, number, number, number]> = [
    [rect.x, rect.y, rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y, rect.x + rect.width, rect.y + rect.height],
    [rect.x + rect.width, rect.y + rect.height, rect.x, rect.y + rect.height],
    [rect.x, rect.y + rect.height, rect.x, rect.y],
  ];
  for (const [x0, y0, x1, y1] of segments) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    let t = 0;
    let draw = true;
    while (t < len) {
      const seg = Math.min(draw ? dash : gap, len - t);
      if (draw) {
        g.moveTo(x0 + ux * t, y0 + uy * t);
        g.lineTo(x0 + ux * (t + seg), y0 + uy * (t + seg));
      }
      t += seg;
      draw = !draw;
    }
  }
  g.stroke({ width, color });
  host.addChild(g);
}
