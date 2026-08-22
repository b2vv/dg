export type ThemeMode = 'light' | 'dark' | 'auto';

export interface DepartmentBlobStyle {
  fill: number;
  fillAlpha: number;
  stroke: number;
  strokeWidth: number;
  labelColor: number;
  labelFontSize: number;
}

/** T64 — rectangular dept chrome (alternative to organic blob). */
export interface DepartmentCardStyle {
  fill: number;
  fillAlpha: number;
  stroke: number;
  strokeWidth: number;
  borderRadius: number;
  labelColor: number;
  labelFontSize: number;
}

/** T64 / B8 — named staff-block zone chrome. */
export interface StaffZoneStyle {
  fill: number;
  fillAlpha: number;
  stroke: number;
  strokeWidth: number;
  borderRadius: number;
  labelColor: number;
  labelFontSize: number;
  labelAlign: 'left' | 'right';
}

export interface PersonNodeStyle {
  width: number;
  height: number;
  background: number;
  border: number;
  borderWidth: number;
  borderRadius: number;
  nameColor: number;
  titleColor: number;
  nameFontSize: number;
  titleFontSize: number;
  badgeColor: number;
  badgeTextColor: number;
  avatarColor: number;
  periodChipBackground?: number;
  periodChipTextColor?: number;
  periodChipFontSize?: number;
  vacantLabelColor?: number;
}

export interface OrganizationNodeStyle {
  width: number;
  height: number;
  background: number;
  border: number;
  borderWidth: number;
  borderRadius: number;
  nameColor: number;
  groupColor: number;
  nameFontSize: number;
  groupFontSize: number;
  symbolSize: number;
  periodColor?: number;
  periodFontSize?: number;
  metaColor?: number;
  metaFontSize?: number;
}

export interface NodeTheme {
  organization: OrganizationNodeStyle;
  department: DepartmentBlobStyle;
  person: PersonNodeStyle;
  departmentCard?: DepartmentCardStyle;
  staffZone?: StaffZoneStyle;
}

export type DepartmentPaintStyle = 'blob' | 'card';

export interface RenderConfig {
  cellWidth: number;
  cellHeight: number;
  /** Відступ wash навколо union карток компоненти (px, paint layer). Не Rust flood / L/C. */
  paddingCells: number;
  smoothIterations: number;
  /** Contour own-cell merge radius (Manhattan); default 1.5 */
  magnetRadius: number;
  /**
   * Minimum positions in a department before its contour is painted.
   * Magnetism / membership still compute for every dept; paint only.
   * Use 2 on Variant B so a singleton CEO does not refill the IT notch.
   */
  minContourMembers: number;
  /** T64: paint StaffTierBand chrome (default false — opt-in). */
  staffZoneChrome?: boolean;
  /** T64: department paint mode (default blob). */
  departmentStyle?: DepartmentPaintStyle;
  /** T64 / B8a: dashed frame around grid union. */
  dashedGridFrame?: boolean;
}

/**
 * Option A geometry: card nearly fills the grid cell so contour blocks
 * read as frames around people (small equal inset, not a 10–20px “moat”).
 */
export const PERSON_CARD_WIDTH = 136;
export const PERSON_CARD_HEIGHT = 156;
export const GRID_CELL_WIDTH = 140;
export const GRID_CELL_HEIGHT = 160;

/**
 * Variant B demo: extra corridor between adjacent cells so report edges
 * are readable. Cards still nearly fill the ref cell (option A); contour
 * world transform stretches paths by pitch = cell + gap.
 */
export const VARIANT_B_HORIZONTAL_GAP = 24;
export const VARIANT_B_VERTICAL_GAP = 28;

/**
 * Variant B demo magnet radius: same-dept cells merge only when «поруч»
 * (Manhattan ≤ 1.5 → orthogonal neighbors). Top IT ↔ bottom IT gap is 2, so
 * they stay **separate** magnetic groups — not one forced C-blob.
 */
export const VARIANT_B_MAGNET_RADIUS = 1.5;

/** Clear border-to-border gap between adjacent Variant B cards (gap + 2×inset). */
export function variantBAdjacentEdgeClearance(): {
  horizontal: number;
  vertical: number;
} {
  const insetX = (GRID_CELL_WIDTH - PERSON_CARD_WIDTH) / 2;
  const insetY = (GRID_CELL_HEIGHT - PERSON_CARD_HEIGHT) / 2;
  return {
    horizontal: VARIANT_B_HORIZONTAL_GAP + insetX * 2,
    vertical: VARIANT_B_VERTICAL_GAP + insetY * 2,
  };
}

export const defaultNodeTheme: NodeTheme = {
  department: {
    fill: 0xdbeafe,
    fillAlpha: 0.28,
    stroke: 0x93c5fd,
    strokeWidth: 0.9,
    labelColor: 0x1e3a5f,
    labelFontSize: 12,
  },
  person: {
    width: PERSON_CARD_WIDTH,
    height: PERSON_CARD_HEIGHT,
    background: 0xffffff,
    border: 0xcbd5e1,
    borderWidth: 1.5,
    borderRadius: 10,
    nameColor: 0x0f172a,
    titleColor: 0x475569,
    nameFontSize: 12,
    titleFontSize: 11,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    avatarColor: 0x64748b,
  },
  organization: {
    width: 200,
    height: 64,
    background: 0xffffff,
    border: 0xcbd5e1,
    borderWidth: 1.5,
    borderRadius: 10,
    nameColor: 0x0f172a,
    groupColor: 0x475569,
    nameFontSize: 13,
    groupFontSize: 11,
    symbolSize: 36,
    periodColor: 0x15803d,
    periodFontSize: 10,
  },
};

/** Dark canvas node palette (page chrome uses CSS vars separately). */
export const darkNodeTheme: NodeTheme = {
  department: {
    fill: 0x1e3a5f,
    fillAlpha: 0.32,
    stroke: 0x93c5fd,
    strokeWidth: 0.9,
    labelColor: 0xbfdbfe,
    labelFontSize: 12,
  },
  person: {
    width: PERSON_CARD_WIDTH,
    height: PERSON_CARD_HEIGHT,
    background: 0x1e293b,
    border: 0x475569,
    borderWidth: 1.5,
    borderRadius: 10,
    nameColor: 0xf1f5f9,
    titleColor: 0xcbd5e1,
    nameFontSize: 12,
    titleFontSize: 11,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    avatarColor: 0x64748b,
  },
  organization: {
    width: 200,
    height: 64,
    background: 0x1e293b,
    border: 0x475569,
    borderWidth: 1.5,
    borderRadius: 10,
    nameColor: 0xf1f5f9,
    groupColor: 0xcbd5e1,
    nameFontSize: 13,
    groupFontSize: 11,
    symbolSize: 36,
    periodColor: 0x4ade80,
    periodFontSize: 10,
  },
};

export const defaultRenderConfig: RenderConfig = {
  cellWidth: GRID_CELL_WIDTH,
  cellHeight: GRID_CELL_HEIGHT,
  paddingCells: 0,
  /** 0 = orthogonal corners; higher Chaikin = softer “macaroni”. */
  smoothIterations: 0,
  magnetRadius: 1.5,
  minContourMembers: 1,
  staffZoneChrome: false,
  departmentStyle: 'blob',
  dashedGridFrame: false,
};

export function mergeTheme(
  partial?: Partial<NodeTheme>,
  base: NodeTheme = defaultNodeTheme,
): NodeTheme {
  if (!partial) {
    return {
      organization: { ...base.organization },
      department: { ...base.department },
      person: { ...base.person },
      departmentCard: base.departmentCard ? { ...base.departmentCard } : undefined,
      staffZone: base.staffZone ? { ...base.staffZone } : undefined,
    };
  }
  return {
    organization: { ...base.organization, ...partial.organization },
    department: { ...base.department, ...partial.department },
    person: { ...base.person, ...partial.person },
    departmentCard:
      base.departmentCard || partial.departmentCard
        ? {
            fill: 0x242f3d,
            fillAlpha: 1,
            stroke: 0x3d5067,
            strokeWidth: 1,
            borderRadius: 8,
            labelColor: 0xf1f5f9,
            labelFontSize: 14,
            ...base.departmentCard,
            ...partial.departmentCard,
          }
        : undefined,
    staffZone:
      base.staffZone || partial.staffZone
        ? {
            fill: 0x191f26,
            fillAlpha: 1,
            stroke: 0x3d5067,
            strokeWidth: 1,
            borderRadius: 12,
            labelColor: 0xf1f5f9,
            labelFontSize: 14,
            labelAlign: 'right' as const,
            ...base.staffZone,
            ...partial.staffZone,
          }
        : undefined,
  };
}
