import { describe, expect, it } from '@rstest/core';
import type { DiagramData } from '../data/types.js';
import { buildStaffLayoutOptions, resolveStaffCurrentOrgId } from './staffLayoutInputs.js';
import { defaultRenderConfig, mergeTheme } from './types.js';

// These pin the two subtle invariants the split T2b lift depends on: the
// orchestrator and the renderer build staff layout inputs through this one
// place, so if the field assembly or the computed-vs-override zone band drifted
// here, their pre-computed canvas and geometry would silently disagree. No
// integration test exercises the `staff.layout.zoneLabelBand` override, so the
// band invariant can only fail here.

const theme = mergeTheme();

describe('buildStaffLayoutOptions (split T2b)', () => {
  it('assembles options from theme + config — the shape renderer and facade must share', () => {
    const { options } = buildStaffLayoutOptions(theme, defaultRenderConfig, 'light', undefined);
    expect(options.nodeWidth).toBe(theme.person.width);
    expect(options.nodeHeight).toBe(theme.person.height);
    expect(options.refCellWidth).toBe(defaultRenderConfig.cellWidth);
    expect(options.refCellHeight).toBe(defaultRenderConfig.cellHeight);
    expect(options.deptGrouping).toBe(defaultRenderConfig.staffEdgeRouter === 'v2');
  });

  it('zone band is 0 without chrome and a positive computed value with it', () => {
    expect(
      buildStaffLayoutOptions(theme, defaultRenderConfig, 'light', undefined).zoneLabelBand,
    ).toBe(0);
    const chrome = { ...defaultRenderConfig, staffZoneChrome: true };
    expect(buildStaffLayoutOptions(theme, chrome, 'light', undefined).zoneLabelBand).toBeGreaterThan(
      0,
    );
  });

  it('returns the COMPUTED band apart from an options override (renderer paints the computed one, layout uses the override)', () => {
    const chrome = { ...defaultRenderConfig, staffZoneChrome: true };
    const staff = { layout: { zoneLabelBand: 999 } };
    const { options, zoneLabelBand } = buildStaffLayoutOptions(theme, chrome, 'light', staff);
    // `...staff.layout` overrides the band inside the options the layout consumes…
    expect(options.zoneLabelBand).toBe(999);
    // …but the returned band is the computed one — what the renderer records on
    // `lastZoneLabelBand` and reserves the label strip with. The two differ only
    // when a caller overrides through `staff.layout`, which is exactly the case
    // no integration test covers.
    expect(zoneLabelBand).not.toBe(999);
    expect(zoneLabelBand).toBeGreaterThan(0);
  });
});

describe('resolveStaffCurrentOrgId (split T2b)', () => {
  const orgsOf = (ids: string[]): DiagramData =>
    ({
      organizations: ids.map((id) => ({
        id,
        name: id,
        groupIds: [],
        collapsed: false,
        matrixOrder: 0,
      })),
      groups: [],
      departments: [],
      persons: [],
      positions: [],
      reportLines: [],
      orgLinks: [],
    }) as DiagramData;

  it('keeps an explicit id when it is a real org', () => {
    expect(resolveStaffCurrentOrgId(orgsOf(['a', 'b']), 'b')).toBe('b');
  });

  it('falls back to the grid (null) for an explicit id that is not a real org — it does NOT infer another', () => {
    // The divergence from svgExport the spec warns about: an invalid explicit id
    // means the bare grid, not a silently inferred different focus org.
    expect(resolveStaffCurrentOrgId(orgsOf(['a']), 'ghost')).toBeNull();
  });

  it('infers a single org when none is explicit', () => {
    expect(resolveStaffCurrentOrgId(orgsOf(['only']), undefined)).toBe('only');
  });
});
