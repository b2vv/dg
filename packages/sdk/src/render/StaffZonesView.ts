import { Container, Graphics, Text } from 'pixi.js';
import type { StaffTierBand } from '../layout/staff/types.js';
import { defaultNodeTheme, type NodeTheme, type StaffZoneStyle } from './types.js';
import { worldBoundsForTier, type WorldRect } from './staffZoneBounds.js';
import type { StaffNodeBox, StaffOrgCard } from '../layout/staff/types.js';
import { paintDashedFrame } from './dashedStroke.js';
import {
  CURRENT_ORG_CHIP_LABEL,
  currentOrgChipAccent,
  resolveZoneBandStyle,
} from './staffZoneAccent.js';
import { estimateTextWidth } from './orgCardChrome.js';

/** Mockup `.on` row gap between the zone name and its chip. */
const CHIP_GAP = 10;
/** Mockup `.org.cur>.on i` — padding 3px 8px, radius 5. */
const CHIP_PAD_X = 8;
const CHIP_PAD_Y = 3;
const CHIP_RADIUS = 5;

type CurrentAccent = NonNullable<StaffZoneStyle['currentAccent']>;

/**
 * The «Поточна організація» chip — a bordered pill holding its own label.
 *
 * Returns its size alongside the container instead of letting the caller read
 * `chip.width`: a `Container`'s bounds are measured, and measuring needs a
 * canvas that worker and test hosts do not have, so the pill states the size it
 * was built to. The label width comes from {@link estimateTextWidth} for the
 * same reason.
 */
function buildCurrentOrgChip(
  accent: CurrentAccent & { chipBorder: number },
  style: StaffZoneStyle,
  nodeTheme: Pick<NodeTheme, 'fonts'>,
): { view: Container; width: number; height: number } {
  const chip = new Container();
  const fontSize = Math.max(9, style.labelFontSize - 3);
  const text = new Text({
    text: CURRENT_ORG_CHIP_LABEL,
    style: {
      fill: accent.chipTextColor ?? style.labelColor,
      fontSize,
      fontFamily: nodeTheme.fonts?.sans ?? 'system-ui, sans-serif',
      fontWeight: '600',
    },
  });
  const width = estimateTextWidth(CURRENT_ORG_CHIP_LABEL, fontSize) + CHIP_PAD_X * 2;
  const height = fontSize + CHIP_PAD_Y * 2;
  const frame = new Graphics();
  frame.roundRect(0, 0, width, height, CHIP_RADIUS);
  if (accent.chipFill !== undefined) {
    frame.fill({ color: accent.chipFill, alpha: accent.chipFillAlpha ?? 1 });
  }
  frame.stroke({ width: 1, color: accent.chipBorder });
  chip.addChild(frame);
  text.position.set(CHIP_PAD_X, CHIP_PAD_Y);
  chip.addChild(text);
  return { view: chip, width, height };
}

export interface StaffZonePaintInput {
  nodeTheme?: Pick<NodeTheme, 'fonts'>;
  tiers: readonly StaffTierBand[];
  positionNodes: readonly StaffNodeBox[];
  orgCards: readonly StaffOrgCard[];
  style: StaffZoneStyle;
  margin: number;
  canvasWidth: number;
  /** Department wrapper overhang past the seats (contour wash / dept card). */
  contentPadding?: number;
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
      nodeTheme = defaultNodeTheme,
      tiers,
      positionNodes,
      orgCards,
      style,
      margin,
      canvasWidth,
      contentPadding = 0,
      includeOrgCardsBand = false,
    } = input;

    for (const tier of tiers) {
      if (tier.kind === 'org-cards' && !includeOrgCardsBand) continue;
      if (tier.kind === 'staff-block' || tier.kind === 'org-cards') {
        const bounds: WorldRect =
          tier.x !== undefined && tier.width !== undefined
            ? { x: tier.x, y: tier.y, width: tier.width, height: tier.height }
            : worldBoundsForTier(tier, positionNodes, orgCards, {
                margin,
                canvasWidth,
                contentPadding,
              });

        // The current organization's band paints from its own resolved style,
        // so the accent is a style decision rather than a branch in paint.
        const bandStyle = resolveZoneBandStyle(style, tier.role);

        const g = new Graphics();
        g.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, bandStyle.borderRadius);
        g.fill({ color: bandStyle.fill, alpha: bandStyle.fillAlpha });
        if (bandStyle.dashed) {
          paintDashedFrame(view, bounds, {
            color: bandStyle.stroke,
            width: bandStyle.strokeWidth,
            borderRadius: bandStyle.borderRadius,
          });
        } else {
          g.stroke({ width: bandStyle.strokeWidth, color: bandStyle.stroke });
        }
        view.addChild(g);

        const label = tier.label;
        if (label) {
          const text = new Text({
            text: label,
            style: {
              fill: bandStyle.labelColor,
              fontSize: bandStyle.labelFontSize,
              fontFamily: nodeTheme.fonts?.sans ?? 'system-ui, sans-serif',
            },
          });
          const pad = bandStyle.labelPadding ?? 8;
          const accent = currentOrgChipAccent(style, tier.role);
          const chip = accent ? buildCurrentOrgChip(accent, bandStyle, nodeTheme) : null;
          // Name and chip read as one row (mockup `.on`, gap 10), so a
          // right-aligned label makes room for the chip instead of overlapping.
          const rowWidth = chip ? text.width + CHIP_GAP + chip.width : text.width;
          const labelY = bounds.y + pad;
          const tx =
            bandStyle.labelAlign === 'right'
              ? bounds.x + bounds.width - rowWidth - pad
              : bounds.x + pad;
          text.position.set(tx, labelY);
          view.addChild(text);
          if (chip) {
            chip.view.position.set(
              tx + text.width + CHIP_GAP,
              labelY + Math.max(0, (bandStyle.labelFontSize - chip.height) / 2),
            );
            view.addChild(chip.view);
          }
        }
      }
    }
    return view;
  }

}
