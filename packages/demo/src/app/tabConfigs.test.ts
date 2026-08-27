import { describe, expect, it } from '@rstest/core';
import { emptyDiagramData } from '@org-hierarchy/sdk';
import { buildTabConfig, type TabConfigDeps } from './tabConfigs.js';
import { captionForTab } from './captions.js';
import { TAB_META, isDemoTab, type DemoTab } from './tabs.js';

const deps = (): TabConfigDeps => ({
  theme: 'light',
  contourControls: { paddingCells: 1, smoothIterations: 2 },
  flatOrgsData: emptyDiagramData(),
  scaleOrgsWindow: () => {
    throw new Error('scale-100k window should only be built for its own tab');
  },
  scaleStaffWindow: () => {
    throw new Error('staff-1m window should only be built for its own tab');
  },
});

const ALL_TABS = Object.keys(TAB_META) as DemoTab[];
const WINDOWED: DemoTab[] = ['scale-100k', 'staff-1m'];

describe('buildTabConfig', () => {
  it('success: every tab yields data without touching the other tabs’ windows', () => {
    for (const tab of ALL_TABS.filter((t) => !WINDOWED.includes(t))) {
      const config = buildTabConfig(tab, deps());
      expect(config.data, tab).toBeTruthy();
      expect(config.render?.paddingCells, tab).toBe(1);
    }
  });

  it('success: the windowed tabs pull their window lazily, once', () => {
    let built = 0;
    const window = { data: emptyDiagramData() } as never;
    const config = buildTabConfig('staff-1m', {
      ...deps(),
      scaleStaffWindow: () => {
        built += 1;
        return window;
      },
    });
    expect(built).toBe(1);
    expect(config.staffCurrentOrgId).toBe('current-org');
  });

  it('success: the contour sliders reach the tabs that declare them', () => {
    for (const tab of ALL_TABS.filter((t) => TAB_META[t].contourControls && !WINDOWED.includes(t))) {
      const config = buildTabConfig(tab, {
        ...deps(),
        contourControls: { paddingCells: 4, smoothIterations: 6 },
      });
      expect(config.render?.paddingCells, tab).toBe(4);
      expect(config.render?.smoothIterations, tab).toBe(6);
    }
  });

  it('failure: an unknown tab throws instead of silently shipping another scene', () => {
    // The markup is the only source of tab ids, so `isDemoTab` guards the click
    // and this throw is the backstop for a tab added to the union but not here.
    expect(() => buildTabConfig('no-such-tab' as DemoTab, deps())).toThrow(/unknown tab/);
    expect(isDemoTab('no-such-tab')).toBe(false);
    expect(isDemoTab(undefined)).toBe(false);
    expect(isDemoTab('variant-b')).toBe(true);
  });
});

describe('captionForTab', () => {
  it('success: the 1M caption reports the live window, not the total alone', () => {
    const text = captionForTab('staff-1m', {
      windowSize: 2_000,
      total: 1_000_000,
      composition: { groups: 3, simpleOrgs: 2, current: 500 },
    } as never);
    expect(text).toContain((1_000_000).toLocaleString('uk-UA'));
    expect(text).toContain('3 groups');
  });

  it('failure: no window yet, and tabs without a caption, degrade quietly', () => {
    expect(captionForTab('staff-1m', null)).toBe('1M staff · windowed');
    expect(captionForTab('mapper', null)).toBeNull();
  });
});
