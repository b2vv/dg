import { Container, Graphics, Text } from 'pixi.js';
import type { DiagramDepartment } from '../data/types.js';
import type { DepartmentCardStyle } from './types.js';
import { unionBoxes } from './staffZoneBounds.js';
import { paintDashedFrame } from './dashedStroke.js';

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
    const padding = options?.padding ?? style.padding ?? 8;
    const base = unionBoxes(members, padding);
    if (!base) return null;
    // Figma dept block: the name owns a row above the seats instead of
    // floating over the top padding (opt-in — legacy chrome keeps the overlap).
    const labelRow = style.labelRow ? style.labelFontSize + 6 : 0;
    const bounds = {
      x: base.x,
      y: base.y - labelRow,
      width: base.width,
      height: base.height + labelRow,
    };

    const view = new DepartmentCardView();
    view.eventMode = 'none';
    const g = new Graphics();
    g.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, style.borderRadius);
    g.fill({ color: style.fill, alpha: style.fillAlpha });
    if (!style.dashed) {
      g.stroke({ width: style.strokeWidth, color: style.stroke });
    }
    view.addChild(g);
    if (style.dashed) {
      paintDashedFrame(view, bounds, {
        color: style.stroke,
        width: style.strokeWidth,
        borderRadius: style.borderRadius,
      });
    }

    const label = new Text({
      text: dept.name,
      style: {
        fill: style.labelColor,
        fontSize: style.labelFontSize,
        fontFamily: 'system-ui, sans-serif',
      },
    });
    const labelPad = Math.min(16, padding);
    label.position.set(
      bounds.x + bounds.width - label.width - labelPad,
      bounds.y + (labelRow ? 4 : 6),
    );
    view.addChild(label);
    return view;
  }
}
