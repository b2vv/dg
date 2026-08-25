import type { NodeTheme } from '@org-hierarchy/sdk';

/**
 * Figma «Casiopeya» dark tokens (2026-08 frames 1264:7906 «посади» /
 * 1264:8121 «організації»). Hex mirrors the Figma variables:
 * bg/primary #121212 · bg/secondary #222222 · bg/tertiary #303030 ·
 * text/primary #ffffff · text/secondary #a6a6a6 · accent/primary #e8490f.
 */
export const MOCKUP_FIGMA_STYLES = {
  /** Canvas surface — bg/secondary behind the dashed zones. */
  canvasBackground: 0x222222,
  /** Connectors: 1px grey elbows, rounded corners, round dot at each port. */
  edge: {
    color: 0xa6a6a6,
    width: 1,
    cornerRadius: 8,
    terminator: 'dot',
    dotRadius: 2.67,
  },
  organization: {
    // Frame 1264:8121 — 234×110 card, 16px body inset, symbol row 49px.
    width: 234,
    height: 110,
    background: 0x121212,
    border: 0x303030,
    borderWidth: 1,
    borderRadius: 12,
    nameColor: 0xffffff,
    groupColor: 0xa6a6a6,
    nameFontSize: 14,
    groupFontSize: 12,
    symbolSize: 49,
    symbolWidth: 116,
    symbolHeight: 49,
    orgCardLayout: 'gojs-vertical',
    bodyPaddingX: 16,
    bodyPaddingY: 16,
    nameRowHeight: 17,
    symbolRowGap: 12,
    hidePeriodOnCard: true,
    hideMenuChrome: true,
    tempMarkerStyle: 'hourglass',
    brandColor: 0xe8490f,
    periodColor: 0xa6a6a6,
    metaColor: 0xa6a6a6,
    metaFontSize: 12,
    badgeColor: 0xe8490f,
    badgeTextColor: 0xffffff,
    // `N [M]` sits top-right of the body, no chip background.
    countsBadgeBackground: 0x121212,
    countsBadgeTextColor: 0xa6a6a6,
    countsBadgeFontSize: 14,
  },
  person: {
    // Frame 1264:7906 — chrome-less seat: 40×40 tile + title/name column.
    width: 248,
    height: 44,
    background: 0x121212,
    backgroundAlpha: 0,
    border: 0x303030,
    borderWidth: 0,
    borderRadius: 8,
    nameColor: 0xe8490f,
    titleColor: 0xffffff,
    nameFontSize: 14,
    titleFontSize: 16,
    badgeColor: 0xe8490f,
    badgeTextColor: 0xffffff,
    avatarColor: 0x5e5a57,
    avatarPlaceholderColor: 0x121212,
    periodChipBackground: 0x222222,
    periodChipTextColor: 0xffffff,
    periodChipFontSize: 14,
    vacantLabelColor: 0xa6a6a6,
    // Both permanent and acting names are accent/primary; ⏳ marks acting.
    temporaryNameColor: 0xe8490f,
    permanentNameColor: 0xe8490f,
    tempMarkerStyle: 'hourglass',
    hidePeriodOnCard: true,
    hideVacantLabel: true,
    personLayout: 'figma-row',
  },
  staffZone: {
    // Tier band + sibling-org frame: #191f26 fill, dashed #3d5067.
    fill: 0x191f26,
    fillAlpha: 1,
    stroke: 0x3d5067,
    strokeWidth: 1,
    borderRadius: 12,
    labelColor: 0xa6a6a6,
    labelFontSize: 14,
    labelAlign: 'right',
    labelPadding: 16,
    dashed: true,
  },
  departmentCard: {
    // Department block inside a tier: #242f3d fill, dashed #3d5067.
    fill: 0x242f3d,
    fillAlpha: 1,
    stroke: 0x3d5067,
    strokeWidth: 1,
    borderRadius: 8,
    labelColor: 0xa6a6a6,
    labelFontSize: 14,
    padding: 16,
    labelRow: true,
    dashed: true,
  },
} satisfies Partial<NodeTheme>;

/**
 * Magnetic variant of the Figma tokens: departments are painted as magnetic
 * contours (pre-T64 default) instead of rectangular cards, and the staff zone
 * is a solid block rather than a dashed frame.
 */
export const MOCKUP_MAGNETIC_STYLES = {
  ...MOCKUP_FIGMA_STYLES,
  /** Department contour — same palette as the Figma dept card. */
  department: {
    fill: 0x242f3d,
    fillAlpha: 1,
    stroke: 0x3d5067,
    strokeWidth: 1,
    labelColor: 0xa6a6a6,
    labelFontSize: 14,
    labelAlign: 'right',
  },
  /** Organization block: solid #191f26 rectangle, foreign nodes stay outside. */
  staffZone: {
    ...MOCKUP_FIGMA_STYLES.staffZone,
    dashed: false,
  },
} satisfies Partial<NodeTheme>;

/** Dark GoJS-production styles (cassiopeia-admin-ui gamma). */
export const MOCKUP_GOJS_STYLES = {
  organization: {
    width: 220,
    height: 121,
    background: 0x1e293b,
    border: 0x475569,
    borderWidth: 1.5,
    borderRadius: 10,
    nameColor: 0xf1f5f9,
    groupColor: 0xcbd5e1,
    nameFontSize: 14,
    groupFontSize: 11,
    symbolSize: 80,
    symbolWidth: 80,
    symbolHeight: 56,
    noCaptionSymbolWidth: 109,
    noCaptionSymbolHeight: 76,
    orgCardLayout: 'gojs-vertical',
    hidePeriodOnCard: true,
    tempMarkerStyle: 'hourglass',
    hideMenuChrome: true,
    gojsTreeExpander: true,
    brandColor: 0x2563eb,
    periodColor: 0x4ade80,
    metaColor: 0x94a3b8,
    metaFontSize: 11,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    countsBadgeBackground: 0x334155,
    countsBadgeTextColor: 0xe2e8f0,
    countsBadgeFontSize: 13,
  },
  person: {
    width: 200,
    height: 98,
    cardRowHeight: 56,
    background: 0x1e293b,
    border: 0x475569,
    borderWidth: 1.5,
    borderRadius: 10,
    nameColor: 0xf1f5f9,
    titleColor: 0xcbd5e1,
    nameFontSize: 13,
    titleFontSize: 11,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    avatarColor: 0x64748b,
    avatarPlaceholderColor: 0x475569,
    periodChipBackground: 0x334155,
    periodChipTextColor: 0xcbd5e1,
    periodChipFontSize: 12,
    timelineDotColor: 0x4ade80,
    vacantLabelColor: 0x94a3b8,
    temporaryNameColor: 0xea580c,
    permanentNameColor: 0xf1f5f9,
    brandColor: 0x2563eb,
    pendingColor: 0xf59e0b,
    detachedBorderColor: 0x64748b,
    countBarBackground: 0x334155,
    countBarTextColor: 0xe2e8f0,
    countBarFontSize: 11,
    personLayout: 'gojs-row',
  },
  staffZone: {
    fill: 0x191f26,
    fillAlpha: 0.92,
    stroke: 0x475569,
    strokeWidth: 1,
    borderRadius: 6,
    labelColor: 0xe2e8f0,
    labelFontSize: 12,
    labelAlign: 'right',
    dashed: false,
  },
  departmentCard: {
    fill: 0x242f3d,
    fillAlpha: 0.95,
    stroke: 0x3d5067,
    strokeWidth: 1,
    borderRadius: 8,
    labelColor: 0xcbd5e1,
    labelFontSize: 12,
  },
} satisfies Partial<NodeTheme>;

/** @deprecated Use MOCKUP_FIGMA_STYLES */
export const MOCKUP_DARK_STYLES = MOCKUP_FIGMA_STYLES;
