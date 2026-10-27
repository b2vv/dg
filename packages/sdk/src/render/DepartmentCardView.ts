import { Container, Graphics, Text } from 'pixi.js';
import type { DiagramDepartment } from '../data/types.js';
import { defaultNodeTheme, type NodeTheme, type DepartmentCardStyle } from './types.js';
import { unionBoxes } from './staffZoneBounds.js';
import { paintDashedFrame } from './dashedStroke.js';
import { formatDepartmentPositionsBadge } from './departmentPositionsBadge.js';

/** Mockup's `.dn` row gap between the department name and its badge. */
const BADGE_GAP = 8;

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
    options?: {
      padding?: number;
      minMembers?: number;
      nodeTheme?: Pick<NodeTheme, 'fonts'>;
      /**
       * Positions the department establishes — rendered as the «N поз.» badge.
       *
       * Passed in rather than read off `members`: the frame is fitted to the
       * boxes the layout produced, which shrink when a head collapses, and the
       * badge must not. See {@link countDepartmentPositions}.
       */
      positionsCount?: number;
    },
  ): DepartmentCardView | null {
    const nodeTheme = options?.nodeTheme ?? defaultNodeTheme;
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
        fontFamily: nodeTheme.fonts?.sans ?? 'system-ui, sans-serif',
      },
    });
    const labelPad = Math.min(16, padding);
    const labelY = bounds.y + (labelRow ? 4 : 6);
    const badgeText = formatDepartmentPositionsBadge(options?.positionsCount ?? 0);
    const badge = badgeText
      ? new Text({
          text: badgeText,
          style: {
            fill: style.badgeColor ?? style.labelColor,
            fontSize: style.badgeFontSize ?? style.labelFontSize - 2,
            fontFamily: nodeTheme.fonts?.mono ?? 'ui-monospace, monospace',
          },
        })
      : null;
    // Name and badge read as one right-aligned group, as the mockup's header row
    // does: shifting the name left by the badge keeps the pair against the edge.
    const groupWidth = badge ? label.width + BADGE_GAP + badge.width : label.width;
    label.position.set(bounds.x + bounds.width - groupWidth - labelPad, labelY);
    view.addChild(label);
    if (badge) {
      badge.position.set(
        label.x + label.width + BADGE_GAP,
        labelY + Math.max(0, (label.height - badge.height) / 2),
      );
      view.addChild(badge);
    }
    return view;
  }
}
