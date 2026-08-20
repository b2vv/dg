import type { DiagramData } from '../../data/types.js';
import { layoutStaffOrgBlock } from './orgBlockLayout.js';
import {
  DEFAULT_STAFF_LAYOUT_OPTIONS,
  StaffLayoutError,
  type StaffCanvasResult,
  type StaffLayoutOptions,
  type StaffNodeBox,
  type StaffOrgCard,
  type StaffTierBand,
} from './types.js';

export interface StaffCanvasInput {
  organizations: DiagramData['organizations'];
  positions: DiagramData['positions'];
  reports: DiagramData['reportLines'];
  groups: DiagramData['groups'];
  departments: DiagramData['departments'];
  persons: DiagramData['persons'];
}

/**
 * Leadership-only for managing org (tier 1): isHead or parentless in that org.
 * Full staff for current (tier 2). Tier 3 = org cards for children.
 */
export async function layoutStaffCanvas(
  data: StaffCanvasInput,
  currentOrgId: string,
  options: StaffLayoutOptions = {},
): Promise<StaffCanvasResult> {
  const opts = { ...DEFAULT_STAFF_LAYOUT_OPTIONS, ...options };
  const current = data.organizations.find((o) => o.id === currentOrgId);
  if (!current) {
    throw new StaffLayoutError(`Unknown currentOrgId: ${currentOrgId}`);
  }

  const diagnostics: string[] = [];
  const tiers: StaffTierBand[] = [];
  const positionNodes: StaffNodeBox[] = [];
  const edges: StaffCanvasResult['edges'] = [];
  const orgCards: StaffOrgCard[] = [];

  let cursorY = opts.margin;

  // Tier 1 — managing org leadership only
  const managingId = current.parentOrgId;
  if (managingId && data.organizations.some((o) => o.id === managingId)) {
    const mgrPositions = data.positions.filter((p) => p.organizationId === managingId);
    const leadership = mgrPositions.filter((p) => p.isHead === true);

    if (leadership.length === 1) {
      const block = await layoutStaffOrgBlock(leadership, data.reports, managingId, options);
      const nodes = block.nodes.map((n) => ({
        ...n,
        y: n.y + cursorY,
        tier: 1 as const,
      }));
      positionNodes.push(...nodes);
      edges.push(...block.edges);
      diagnostics.push(...block.diagnostics);
      const height = Math.max(block.height, opts.orgCardHeight);
      tiers.push({
        tier: 1,
        kind: 'staff-block',
        y: cursorY,
        height,
        organizationId: managingId,
      });
      cursorY += height + opts.tierGap;
    } else if (leadership.length > 1) {
      diagnostics.push(`Tier1 skipped: multiple isHead in managing org ${managingId}`);
    }
  }

  // Tier 2 — current org full staff
  const tier2 = await layoutStaffOrgBlock(
    data.positions,
    data.reports,
    currentOrgId,
    options,
  );
  const t2nodes = tier2.nodes.map((n) => ({
    ...n,
    y: n.y + cursorY,
    tier: 2 as const,
  }));
  positionNodes.push(...t2nodes);
  edges.push(...tier2.edges);
  diagnostics.push(...tier2.diagnostics);
  const t2height = Math.max(tier2.height, opts.nodeHeight + opts.margin * 2);
  tiers.push({
    tier: 2,
    kind: 'staff-block',
    y: cursorY,
    height: t2height,
    organizationId: currentOrgId,
  });
  cursorY += t2height + opts.tierGap;

  // Cross-tier: if current head reports to tier1 position (matrix/admin across orgs) — decorative only when from different org
  // v1: skip auto cross edges unless report connects ids already in positionNodes

  // Tier 3 — subordinate org cards
  const children = data.organizations.filter((o) => o.parentOrgId === currentOrgId);
  const cards: StaffOrgCard[] = [];
  let cardX = opts.margin;
  const cardY = cursorY;
  for (const child of children) {
    const count = data.positions.filter((p) => p.organizationId === child.id).length;
    cards.push({
      orgId: child.id,
      name: child.name,
      x: cardX,
      y: cardY,
      width: opts.orgCardWidth,
      height: opts.orgCardHeight,
      positionCount: count,
    });
    cardX += opts.orgCardWidth + opts.horizontalGap;
  }
  orgCards.push(...cards);
  const t3height = children.length > 0 ? opts.orgCardHeight + opts.margin : 0;
  if (children.length > 0) {
    tiers.push({
      tier: 3,
      kind: 'org-cards',
      y: cardY,
      height: t3height,
      cards,
    });
    cursorY += t3height + opts.margin;
  }

  const width = Math.max(
    opts.margin * 2,
    ...positionNodes.map((n) => n.x + n.width),
    ...orgCards.map((c) => c.x + c.width),
    tier2.width,
  );

  return {
    currentOrgId,
    tiers,
    positionNodes,
    edges,
    orgCards,
    width: width + opts.margin,
    height: cursorY,
    diagnostics,
  };
}
