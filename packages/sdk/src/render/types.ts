export type ThemeMode = 'light' | 'dark' | 'auto';

export interface DepartmentBlobStyle {
  fill: number;
  fillAlpha: number;
  stroke: number;
  strokeWidth: number;
  labelColor: number;
  labelFontSize: number;
  /**
   * `center` (default) puts the name on the blob centroid — fine for sparse
   * grids; `right` moves it to the ring's top-right corner so it never lands on
   * a seat (Figma dept header).
   */
  labelAlign?: 'center' | 'right';
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
  /** Figma staff: dashed dept outline (default solid). */
  dashed?: boolean;
  /** Inset between member cards and the card frame (default 8). */
  padding?: number;
  /** Reserve a row above the members for the label (Figma dept header). */
  labelRow?: boolean;
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
  /** Figma mockup: dashed zone outline (default solid). */
  dashed?: boolean;
  /** Label inset from the zone frame (default 8). */
  labelPadding?: number;
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
  /** When set, temporary seats use this name color (Figma orange). */
  temporaryNameColor?: number;
  /** Permanent / non-temp name color when temporaryNameColor is used. */
  permanentNameColor?: number;
  /** Brand accent (key position name, count-bar expander). */
  brandColor?: number;
  /** Muted avatar tile under photo (GoJS row). */
  avatarPlaceholderColor?: number;
  /** Timeline chip dot fill. */
  timelineDotColor?: number;
  /** Count bar under card (GoJS row). */
  countBarBackground?: number;
  countBarTextColor?: number;
  countBarFontSize?: number;
  /** Pending hourglass fill. */
  pendingColor?: number;
  /** Detached seat muted stroke. */
  detachedBorderColor?: number;
  /** Inner card height for gojs-row (excludes timeline + count bar). */
  cardRowHeight?: number;
  /**
   * Card fill alpha; `0` = chrome-less seat (Figma staff — avatar tile + text
   * only, no card frame). Default 1.
   */
  backgroundAlpha?: number;
  /** Hourglass glyph after the name vs «T» pill in the card corner. */
  tempMarkerStyle?: 'badge' | 'hourglass';
  /** Suppress the inline period chip (Figma shows the period in a popover). */
  hidePeriodOnCard?: boolean;
  /** Vacant seat renders the title only (no «(вакансія)» line). */
  hideVacantLabel?: boolean;
  /**
   * Seat chrome template. `auto` = infer from aspect (legacy).
   * `figma-row` = landscape Figma seat; `gojs-row` = GoJS landscape row;
   * `gojs-portrait` = GoJS / Variant B card.
   */
  personLayout?: PersonCardLayout;
}

/** Position seat visual template (T70 / mockup parity). */
export type PersonCardLayout = 'auto' | 'figma-row' | 'gojs-row' | 'gojs-portrait';

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
  /** Rectangular symbol width (10:7 GoJS); defaults to symbolSize. */
  symbolWidth?: number;
  /** Rectangular symbol height; defaults to symbolSize. */
  symbolHeight?: number;
  /** No-caption enlarged symbol width (GoJS FULL_W). */
  noCaptionSymbolWidth?: number;
  /** No-caption enlarged symbol height (GoJS FULL_H). */
  noCaptionSymbolHeight?: number;
  /** Vertical stack (symbol → name → unit code) vs legacy horizontal row. */
  orgCardLayout?: 'horizontal' | 'gojs-vertical';
  /** gojs-vertical body inset — left/right (default 14). */
  bodyPaddingX?: number;
  /** gojs-vertical body inset — top/bottom (default 10). */
  bodyPaddingY?: number;
  /** gojs-vertical name row height (default 20). */
  nameRowHeight?: number;
  /** gojs-vertical gap between name row and symbol (default 6). */
  symbolRowGap?: number;
  /** Suppress period line on the card (GoJS shows it on edges). */
  hidePeriodOnCard?: boolean;
  /** Hourglass on symbol vs «T» pill on card corner. */
  tempMarkerStyle?: 'badge' | 'hourglass';
  /** Brand accent (tree expander circle). */
  brandColor?: number;
  /** GoJS vertical cards: context menu via RMB only (no ⋮). */
  hideMenuChrome?: boolean;
  /** GoJS tree expander: brand circle bottom-right vs legacy top chip. */
  gojsTreeExpander?: boolean;
  periodColor?: number;
  periodFontSize?: number;
  /** E6 unit-code caption. */
  metaColor?: number;
  metaFontSize?: number;
  /** E4 temp «T» badge (PersonNode-style). */
  badgeColor?: number;
  badgeTextColor?: number;
  /** E5 `N [M]` counts pill. */
  countsBadgeBackground?: number;
  countsBadgeTextColor?: number;
  countsBadgeFontSize?: number;
}

/**
 * Connector paint shared by org + staff edges. The Figma «Casiopeya» frames use
 * 1px grey elbows with rounded corners and a round dot at each end instead of
 * the default arrowhead.
 */
export interface EdgeStyle {
  /** Stroke color for every edge kind. */
  color?: number;
  /** Stroke width; per-view default when unset. */
  width?: number;
  /** Elbow corner radius; 0 (default) keeps square corners. */
  cornerRadius?: number;
  /** Line ends: filled arrow at the target (default) or a dot at both ends. */
  terminator?: 'arrow' | 'dot';
  /** Dot radius when `terminator` is `dot`. */
  dotRadius?: number;
}

export interface NodeTheme {
  organization: OrganizationNodeStyle;
  department: DepartmentBlobStyle;
  person: PersonNodeStyle;
  departmentCard?: DepartmentCardStyle;
  staffZone?: StaffZoneStyle;
  /** Pixi clear color; falls back to {@link canvasBackgroundForTheme}. */
  canvasBackground?: number;
  /** Org + staff connector paint; falls back to the per-theme defaults. */
  edge?: EdgeStyle;
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
  /**
   * Paint dashed AABB around sibling org cards that share a parent
   * (Figma org mockup / B8c preview). Org-layout only.
   */
  orgSiblingGroupChrome?: boolean;
  /**
   * Sibling-frame flavour when {@link RenderConfig.orgSiblingGroupChrome} is on:
   * `zone` (default) = filled staff-zone chrome around any sibling group (Figma
   * frame 1264:8121); `outline` = thin outline around collapsed matrix siblings.
   */
  orgSiblingGroupStyle?: 'zone' | 'outline';
  /**
   * T70 E11: prefetch the inactive theme’s org symbol URL on mount.
   * Default false — avoids automatic cross-theme fetches of untrusted URLs
   * (security review). Opt in when both light/dark URLs are host-trusted.
   */
  prefetchInactiveOrgSymbol?: boolean;
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
    periodChipBackground: 0xdcfce7,
    periodChipTextColor: 0x15803d,
    periodChipFontSize: 9,
    vacantLabelColor: 0x64748b,
    personLayout: 'gojs-portrait',
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
    metaColor: 0x64748b,
    metaFontSize: 10,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    countsBadgeBackground: 0xf1f5f9,
    countsBadgeTextColor: 0x334155,
    countsBadgeFontSize: 9,
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
    periodChipBackground: 0x14532d,
    periodChipTextColor: 0x4ade80,
    periodChipFontSize: 9,
    vacantLabelColor: 0x94a3b8,
    personLayout: 'gojs-portrait',
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
    metaColor: 0x94a3b8,
    metaFontSize: 10,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    countsBadgeBackground: 0x334155,
    countsBadgeTextColor: 0xe2e8f0,
    countsBadgeFontSize: 9,
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
  orgSiblingGroupChrome: false,
  orgSiblingGroupStyle: 'zone',
  prefetchInactiveOrgSymbol: false,
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
      canvasBackground: base.canvasBackground,
      edge: base.edge ? { ...base.edge } : undefined,
    };
  }
  return {
    organization: { ...base.organization, ...partial.organization },
    department: { ...base.department, ...partial.department },
    person: { ...base.person, ...partial.person },
    canvasBackground: partial.canvasBackground ?? base.canvasBackground,
    edge: base.edge || partial.edge ? { ...base.edge, ...partial.edge } : undefined,
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
