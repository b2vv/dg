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
}

export const DEFAULT_STAFF_LAYOUT_OPTIONS: Required<StaffLayoutOptions> = {
  staffCoordMode: 'hybrid',
  nodeWidth: 120,
  nodeHeight: 64,
  horizontalGap: 24,
  verticalGap: 32,
  margin: 24,
  refCellWidth: 120,
  refCellHeight: 64,
  tierGap: 48,
  orgCardWidth: 200,
  orgCardHeight: 72,
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
