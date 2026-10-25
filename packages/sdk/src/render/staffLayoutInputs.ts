// Shared inputs for the staff-canvas layout, used by BOTH the Pixi renderer
// (DiagramRenderer.renderStaffCanvas) and the orchestrator (OrgHierarchyDiagram,
// which pre-computes the layout since split T2b). They live here, in one place,
// so the two call sites cannot drift: if the facade assembled `staffOpts` or
// resolved `currentOrgId` even slightly differently from the renderer, the
// pre-computed canvas and the renderer's own geometry (drag grid / insets) would
// be built from different options and silently disagree.
import type { DiagramData } from '../data/types.js';
import type { StaffLayoutOptions } from '../layout/staff/types.js';
import type { RenderOptions } from './DiagramRenderer.js';
import { inferStaffCurrentOrgId } from './inferStaffCurrentOrgId.js';
import type { NodeTheme, RenderConfig, StaffZoneStyle } from './types.js';

/**
 * The zone style the staff canvas paints with. Resolved through this rather than
 * read off `theme.staffZone` directly: a theme can leave `staffZone` undefined
 * and still paint zones (the painter has per-mode defaults), and reading the raw
 * field gave a band of zero on exactly the tab the collision was reported on.
 */
export function resolveStaffZoneStyle(theme: NodeTheme, mode: 'light' | 'dark'): StaffZoneStyle {
  if (theme.staffZone) return theme.staffZone;
  if (mode === 'dark') {
    return {
      fill: 0x191f26,
      fillAlpha: 0.95,
      stroke: 0x3d5067,
      strokeWidth: 1,
      borderRadius: 12,
      labelColor: 0xf1f5f9,
      labelFontSize: 14,
      labelAlign: 'right',
    };
  }
  return {
    fill: 0xf1f5f9,
    fillAlpha: 0.95,
    stroke: 0xcbd5e1,
    strokeWidth: 1,
    borderRadius: 12,
    labelColor: 0x0f172a,
    labelFontSize: 14,
    labelAlign: 'right',
  };
}

/**
 * The org the staff canvas focuses on, or `null` when there is none and the
 * renderer should fall back to the bare cell grid. Mirrors exactly the decision
 * `renderStaff` made inline before T2b: an explicit id wins, else one is
 * inferred, and either way it must be a real org — otherwise `layoutStaffCanvas`
 * would throw where the renderer meant to draw a grid.
 */
export function resolveStaffCurrentOrgId(
  data: DiagramData,
  explicit: string | undefined,
): string | null {
  const id = explicit ?? inferStaffCurrentOrgId(data);
  return id && data.organizations.some((o) => o.id === id) ? id : null;
}

/**
 * Assemble the staff layout options. Returns the computed `zoneLabelBand`
 * separately from the options because the renderer records the *computed* band
 * on `lastZoneLabelBand` — which is the band before `staff.layout` is spread in,
 * and the two can differ when a caller overrides `zoneLabelBand` through
 * `staff.layout`.
 */
export function buildStaffLayoutOptions(
  theme: NodeTheme,
  config: RenderConfig,
  resolvedTheme: 'light' | 'dark',
  staff: RenderOptions['staff'],
): { options: StaffLayoutOptions; zoneLabelBand: number } {
  // Only the renderer knows the label's font size, so the strip the zone name
  // needs is computed here and reserved by the layout (T94). Just the label's
  // own strip — the department wrapper's padding is already in the zone's
  // `contentPadding`, so adding it here would count it twice.
  const zoneLabelBand = config.staffZoneChrome
    ? (() => {
        const zone = resolveStaffZoneStyle(theme, resolvedTheme);
        return (zone.labelPadding ?? 8) + zone.labelFontSize + 6;
      })()
    : 0;
  const options: StaffLayoutOptions = {
    // Keep staff boxes on the same pitch as contour cells.
    nodeWidth: theme.person.width,
    nodeHeight: theme.person.height,
    refCellWidth: config.cellWidth,
    refCellHeight: config.cellHeight,
    zoneLabelBand,
    ...staff?.layout,
    deptGrouping: config.staffEdgeRouter === 'v2',
    expandedOrgIds: staff?.expandedOrgIds ?? staff?.layout?.expandedOrgIds,
  };
  return { options, zoneLabelBand };
}
