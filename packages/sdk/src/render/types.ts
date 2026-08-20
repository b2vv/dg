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

export const defaultNodeTheme: NodeTheme = {
  department: {
    fill: 0xe8f4fc,
    fillAlpha: 0.85,
    stroke: 0x3b82f6,
    strokeWidth: 2,
    labelColor: 0x1e3a5f,
    labelFontSize: 14,
  },
  person: {
    width: 120,
    height: 150,
    background: 0xffffff,
    border: 0xcbd5e1,
    borderWidth: 1,
    borderRadius: 8,
    nameColor: 0x0f172a,
    titleColor: 0x64748b,
    nameFontSize: 13,
    titleFontSize: 11,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    avatarColor: 0x94a3b8,
  },
  organization: {
    width: 220,
    height: 72,
    background: 0xf1f5f9,
    border: 0x64748b,
    borderWidth: 2,
    borderRadius: 12,
    nameColor: 0x0f172a,
    groupColor: 0x475569,
    nameFontSize: 14,
    groupFontSize: 11,
    symbolSize: 40,
  },
};

/** Dark canvas node palette (page chrome uses CSS vars separately). */
export const darkNodeTheme: NodeTheme = {
  department: {
    fill: 0x1e3a5f,
    fillAlpha: 0.72,
    stroke: 0x60a5fa,
    strokeWidth: 2,
    labelColor: 0xbfdbfe,
    labelFontSize: 14,
  },
  person: {
    width: 120,
    height: 150,
    background: 0x1e293b,
    border: 0x475569,
    borderWidth: 1,
    borderRadius: 8,
    nameColor: 0xf1f5f9,
    titleColor: 0x94a3b8,
    nameFontSize: 13,
    titleFontSize: 11,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    avatarColor: 0x64748b,
  },
  organization: {
    width: 220,
    height: 72,
    background: 0x1e293b,
    border: 0x64748b,
    borderWidth: 2,
    borderRadius: 12,
    nameColor: 0xf1f5f9,
    groupColor: 0x94a3b8,
    nameFontSize: 14,
    groupFontSize: 11,
    symbolSize: 40,
  },
};

export const defaultRenderConfig: RenderConfig = {
  cellWidth: 100,
  cellHeight: 80,
  paddingCells: 0,
  smoothIterations: 2,
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
