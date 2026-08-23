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
  options: { margin: number; minWidth?: number; canvasWidth?: number },
): WorldRect {
  const pad = Math.max(0, options.margin / 2);
  const minWidth = options.minWidth ?? 0;

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
      y: tier.y,
      width: Math.max(minWidth, maxX - minX + pad * 2),
      height: tier.height,
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
    y: tier.y,
    width: Math.max(minWidth, maxX - minX + pad * 2),
    height: tier.height,
  };
}

/** Fill x/width/label on staff-block bands for renderer/SVG. */
export function enrichStaffTierBands(
  tiers: readonly StaffTierBand[],
  positionNodes: readonly StaffNodeBox[],
  orgCards: readonly StaffOrgCard[],
  organizations: readonly DiagramOrganization[],
  options: { margin: number; canvasWidth: number },
): StaffTierBand[] {
  const orgName = new Map(organizations.map((o) => [o.id, o.name]));
  return tiers.map((tier) => {
    const bounds = worldBoundsForTier(tier, positionNodes, orgCards, {
      margin: options.margin,
      canvasWidth: options.canvasWidth,
    });
    const label =
      tier.label ??
      (tier.organizationId ? orgName.get(tier.organizationId) : undefined) ??
      (tier.kind === 'org-cards' ? undefined : tier.organizationId);
    return {
      ...tier,
      x: bounds.x,
      width: bounds.width,
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
