export type StaffCoordMode = 'hybrid' | 'tree' | 'matrix' | 'strict';

export class StaffLayoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaffLayoutError';
  }
}

export interface StaffLayoutOptions {
  staffCoordMode?: StaffCoordMode;
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalGap?: number;
  verticalGap?: number;
  margin?: number;
  refCellWidth?: number;
  refCellHeight?: number;
  /** Gap between vertical tier bands */
  tierGap?: number;
  /** Org card size in tier 3 */
  orgCardWidth?: number;
  orgCardHeight?: number;
  /**
   * Tier-3 orgs whose staff is laid out under the card (expand-in-place).
   * Only direct children of the current org are honored.
   */
  expandedOrgIds?: readonly string[];
  /** Cap simultaneous expands (default 1). */
  maxExpandedOrgCards?: number;
}

export const DEFAULT_STAFF_LAYOUT_OPTIONS: Required<
  Omit<StaffLayoutOptions, 'expandedOrgIds'>
> & { expandedOrgIds: readonly string[] } = {
  staffCoordMode: 'hybrid',
  nodeWidth: 136,
  nodeHeight: 156,
  horizontalGap: 20,
  verticalGap: 28,
  margin: 32,
  refCellWidth: 140,
  refCellHeight: 160,
  tierGap: 36,
  orgCardWidth: 200,
  orgCardHeight: 64,
  expandedOrgIds: [],
  maxExpandedOrgCards: 1,
};

export interface StaffNodeBox {
  id: string;
  organizationId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth?: number;
  tier?: 1 | 2 | 3;
  role?: 'anchor' | 'floating' | 'tree' | 'matrix';
}

export interface StaffOrgBlockResult {
  organizationId: string;
  mode: 'matrix' | 'tree' | 'hybrid';
  nodes: StaffNodeBox[];
  edges: Array<{ fromId: string; toId: string; kind: 'admin' | 'matrix' | 'dotted' }>;
  width: number;
  height: number;
  diagnostics: string[];
}

export interface StaffOrgCard {
  orgId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  positionCount: number;
  /** True when staff is expanded under this card. */
  expanded?: boolean;
}

export interface StaffTierBand {
  tier: 1 | 2 | 3;
  kind: 'staff-block' | 'org-cards';
  y: number;
  height: number;
  organizationId?: string;
  cards?: StaffOrgCard[];
}

export interface StaffCanvasResult {
  currentOrgId: string;
  tiers: StaffTierBand[];
  positionNodes: StaffNodeBox[];
  edges: Array<{ fromId: string; toId: string; kind: 'admin' | 'matrix' | 'dotted' | 'cross-tier' }>;
  orgCards: StaffOrgCard[];
  width: number;
  height: number;
  diagnostics: string[];
}
