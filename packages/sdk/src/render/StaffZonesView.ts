import { Container, Graphics, Text } from 'pixi.js';
import type { StaffTierBand } from '../layout/staff/types.js';
import type { StaffZoneStyle } from './types.js';
import { worldBoundsForTier, type WorldRect } from './staffZoneBounds.js';
import type { StaffNodeBox, StaffOrgCard } from '../layout/staff/types.js';
import { paintDashedFrame } from './DepartmentCardView.js';

export interface StaffZonePaintInput {
  tiers: readonly StaffTierBand[];
  positionNodes: readonly StaffNodeBox[];
  orgCards: readonly StaffOrgCard[];
  style: StaffZoneStyle;
  margin: number;
  canvasWidth: number;
  /** Paint org-cards band as well (lighter). Default: staff-block only. */
  includeOrgCardsBand?: boolean;
}

/**
 * Named display zones for staff tiers (T64 / B8). Paint-only; no layout.
 */
export class StaffZonesView extends Container {
  static fromCanvas(input: StaffZonePaintInput): StaffZonesView {
    const view = new StaffZonesView();
    view.eventMode = 'none';
    const {
      tiers,
      positionNodes,
      orgCards,
      style,
      margin,
      canvasWidth,
      includeOrgCardsBand = false,
    } = input;

    for (const tier of tiers) {
      if (tier.kind === 'org-cards' && !includeOrgCardsBand) continue;
      if (tier.kind === 'staff-block' || tier.kind === 'org-cards') {
        const bounds: WorldRect =
          tier.x !== undefined && tier.width !== undefined
            ? { x: tier.x, y: tier.y, width: tier.width, height: tier.height }
            : worldBoundsForTier(tier, positionNodes, orgCards, { margin, canvasWidth });

        const g = new Graphics();
        g.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, style.borderRadius);
        g.fill({ color: style.fill, alpha: style.fillAlpha });
        if (style.dashed) {
          paintDashedFrame(view, bounds, style.stroke, style.strokeWidth);
        } else {
          g.stroke({ width: style.strokeWidth, color: style.stroke });
        }
        view.addChild(g);

        const label = tier.label;
        if (label) {
          const text = new Text({
            text: label,
            style: {
              fill: style.labelColor,
              fontSize: style.labelFontSize,
              fontFamily: 'system-ui, sans-serif',
            },
          });
          const pad = 8;
          const tx =
            style.labelAlign === 'right'
              ? bounds.x + bounds.width - text.width - pad
              : bounds.x + pad;
          text.position.set(tx, bounds.y + pad);
          view.addChild(text);
        }
      }
    }
    return view;
  }
}
