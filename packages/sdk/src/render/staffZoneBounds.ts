import type { DiagramOrganization } from '../data/types.js';
import type { StaffNodeBox, StaffOrgCard, StaffTierBand } from '../layout/staff/types.js';

export interface WorldRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Derive paint bounds for a staff tier band from already-laid-out nodes/cards.
 * Height/Y come from the band; X/width from content union.
 */
export function worldBoundsForTier(
  tier: StaffTierBand,
  positionNodes: readonly StaffNodeBox[],
  orgCards: readonly StaffOrgCard[],
  options: {
    margin: number;
    minWidth?: number;
    canvasWidth?: number;
    /**
     * How far a department wrapper (magnetic contour or dept card) sticks out
     * past its seats. The org block has to sit around the wrappers, not around
     * the bare cards, or the wash touches — or crosses — the block frame.
     */
    contentPadding?: number;
    /**
     * Strip reserved above the content for the zone's own label (T94). The
     * layout leaves room for it in the tier flow; the zone paints into it.
     */
    labelBand?: number;
  },
): WorldRect {
  const pad = Math.max(0, options.margin / 2) + Math.max(0, options.contentPadding ?? 0);
  const minWidth = options.minWidth ?? 0;
  const labelBand = Math.max(0, options.labelBand ?? 0);

  /**
   * Vertical bounds hug the content, exactly as the horizontal ones do.
   *
   * They used to be taken raw from `tier.y` / `tier.height`, so the visible gap
   * between a zone's top edge and its first row was whatever the block layout
   * happened to leave — 96 px where seats are placed by the tree, 38 px where
   * they carry authored grid cells, 24 px elsewhere. Same idea to a reader,
   * three different pictures. Deriving y/height from the content gives one
   * padding everywhere, and the label band sits above it.
   */
  const vertical = (ys: number[]): { y: number; height: number } => {
    if (ys.length === 0) return { y: tier.y, height: tier.height };
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    return { y: top - pad - labelBand, height: bottom - top + pad * 2 + labelBand };
  };

  if (tier.kind === 'org-cards') {
    const cards = tier.cards ?? orgCards;
    const tier3 = positionNodes.filter((n) => n.tier === 3);
    const xs: number[] = [];
    for (const c of cards) {
      xs.push(c.x, c.x + c.width);
    }
    for (const n of tier3) {
      xs.push(n.x, n.x + n.width);
    }
    const ys: number[] = [];
    for (const c of cards) {
      ys.push(c.y, c.y + c.height);
    }
    for (const n of tier3) {
      ys.push(n.y, n.y + n.height);
    }
    if (xs.length === 0) {
      return {
        x: options.margin,
        y: tier.y,
        width: Math.max(minWidth, (options.canvasWidth ?? 0) - options.margin * 2),
        height: tier.height,
      };
    }
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    return {
      x: minX - pad,
      width: Math.max(minWidth, maxX - minX + pad * 2),
      ...vertical(ys),
    };
  }

  const orgId = tier.organizationId;
  const nodes = positionNodes.filter(
    (n) => n.tier === tier.tier && (!orgId || n.organizationId === orgId),
  );
  if (nodes.length === 0) {
    return {
      x: options.margin,
      y: tier.y,
      width: Math.max(minWidth, (options.canvasWidth ?? 0) - options.margin * 2),
      height: tier.height,
    };
  }
  const minX = Math.min(...nodes.map((n) => n.x));
  const maxX = Math.max(...nodes.map((n) => n.x + n.width));
  return {
    x: minX - pad,
    width: Math.max(minWidth, maxX - minX + pad * 2),
    ...vertical(nodes.flatMap((n) => [n.y, n.y + n.height])),
  };
}

/** Fill x/width/label on staff-block bands for renderer/SVG. */
export function enrichStaffTierBands(
  tiers: readonly StaffTierBand[],
  positionNodes: readonly StaffNodeBox[],
  orgCards: readonly StaffOrgCard[],
  organizations: readonly DiagramOrganization[],
  options: {
    margin: number;
    canvasWidth: number;
    contentPadding?: number;
    labelBand?: number;
  },
): StaffTierBand[] {
  const orgName = new Map(organizations.map((o) => [o.id, o.name]));
  return tiers.map((tier) => {
    const bounds = worldBoundsForTier(tier, positionNodes, orgCards, {
      margin: options.margin,
      canvasWidth: options.canvasWidth,
      contentPadding: options.contentPadding,
      labelBand: options.labelBand,
    });
    const label =
      tier.label ??
      (tier.organizationId ? orgName.get(tier.organizationId) : undefined) ??
      (tier.kind === 'org-cards' ? undefined : tier.organizationId);
    return {
      ...tier,
      x: bounds.x,
      width: bounds.width,
      // Carried through too: the painter takes y/height straight from the band
      // when x/width are set, so leaving these raw meant the content-derived
      // vertical bounds were computed and then thrown away.
      y: bounds.y,
      height: bounds.height,
      label,
    };
  });
}

export function unionBoxes(
  boxes: readonly { x: number; y: number; width: number; height: number }[],
  padding = 0,
): WorldRect | null {
  if (boxes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}
