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
    const r = style.borderRadius;
    g.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, r);
    g.fill({ color: style.fill, alpha: style.fillAlpha });
    // Mockup `.dn` «залита шапка»: a solid band over the reserved label row,
    // rounded at the frame's top corners only. The second rect squares off the
    // band's bottom (roundRect rounds all four corners); the rule divides it
    // from the body. Only with a solid frame — a dashed outline has no band.
    if (labelRow && style.labelBarFill != null && !style.dashed) {
      g.roundRect(bounds.x, bounds.y, bounds.width, labelRow, r);
      g.fill({ color: style.labelBarFill });
      g.rect(bounds.x, bounds.y + labelRow - r, bounds.width, r);
      g.fill({ color: style.labelBarFill });
      g.moveTo(bounds.x, bounds.y + labelRow).lineTo(bounds.x + bounds.width, bounds.y + labelRow);
      g.stroke({ width: style.strokeWidth, color: style.labelBarBorder ?? style.stroke });
    }
    if (!style.dashed) {
      g.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, r);
      g.stroke({ width: style.strokeWidth, color: style.stroke });
    }
    view.addChild(g);
    if (style.dashed) {
      paintDashedFrame(view, bounds, {
        color: style.stroke,
        width: style.strokeWidth,
        borderRadius: r,
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
    // Name then badge, left-aligned — the mockup `.dn` header row (flex-start,
    // name first) and the approved screenshots put the dept name at top-left.
    label.position.set(bounds.x + labelPad, labelY);
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
