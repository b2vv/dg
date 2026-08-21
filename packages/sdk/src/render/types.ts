export type ThemeMode = 'light' | 'dark' | 'auto';

export interface DepartmentBlobStyle {
  fill: number;
  fillAlpha: number;
  stroke: number;
  strokeWidth: number;
  labelColor: number;
  labelFontSize: number;
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
}

export interface NodeTheme {
  organization: OrganizationNodeStyle;
  department: DepartmentBlobStyle;
  person: PersonNodeStyle;
}

export interface RenderConfig {
  cellWidth: number;
  cellHeight: number;
  paddingCells: number;
  smoothIterations: number;
  /** Contour own-cell merge radius (Manhattan); default 1.5 */
  magnetRadius: number;
}

/**
 * Option A geometry: card nearly fills the grid cell so contour blocks
 * read as frames around people (small equal inset, not a 10–20px “moat”).
 */
export const PERSON_CARD_WIDTH = 136;
export const PERSON_CARD_HEIGHT = 156;
export const GRID_CELL_WIDTH = 140;
export const GRID_CELL_HEIGHT = 160;

export const defaultNodeTheme: NodeTheme = {
  department: {
    fill: 0xdbeafe,
    fillAlpha: 0.42,
    stroke: 0x60a5fa,
    strokeWidth: 1.25,
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
  },
};

/** Dark canvas node palette (page chrome uses CSS vars separately). */
export const darkNodeTheme: NodeTheme = {
  department: {
    fill: 0x1e3a5f,
    fillAlpha: 0.45,
    stroke: 0x93c5fd,
    strokeWidth: 1.25,
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
  },
};

export const defaultRenderConfig: RenderConfig = {
  cellWidth: GRID_CELL_WIDTH,
  cellHeight: GRID_CELL_HEIGHT,
  paddingCells: 0,
  /** 0 = orthogonal corners; higher Chaikin = softer “macaroni”. */
  smoothIterations: 0,
  magnetRadius: 1.5,
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
    };
  }
  return {
    organization: { ...base.organization, ...partial.organization },
    department: { ...base.department, ...partial.department },
    person: { ...base.person, ...partial.person },
  };
}
