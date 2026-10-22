import { describe, expect, it } from '@rstest/core';
import {
  canvasBackgroundForTheme,
  getInactiveOrgSymbolUrl,
  getOrgSymbolUrl,
  resolveNodeTheme,
  resolveTheme,
} from './theme.js';
import { defaultNodeTheme, mergeTheme } from './types.js';
import type { DiagramOrganization } from '../data/types.js';

describe('resolveTheme', () => {
  it('success: light and dark modes', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('success: auto uses matchMedia', () => {
    expect(resolveTheme('auto')).toBe('dark');
  });
});

describe('resolveNodeTheme', () => {
  it('success: dark palette uses light text on dark cards', () => {
    const dark = resolveNodeTheme('dark');
    expect(dark.person.background).toBe(0x1e293b);
    expect(dark.person.nameColor).toBe(0xf1f5f9);
    expect(dark.department.stroke).toBe(0x93c5fd);
  });

  it('success: light palette keeps white person cards', () => {
    const light = resolveNodeTheme('light');
    expect(light.person.background).toBe(0xffffff);
    expect(light.person.nameColor).toBe(0x0f172a);
    expect(light.person.titleColor).toBe(0x475569);
  });

  it('failure: partial override keeps other dark tokens', () => {
    const merged = resolveNodeTheme('dark', { person: { background: 0x111111 } });
    expect(merged.person.background).toBe(0x111111);
    expect(merged.person.nameColor).toBe(0xf1f5f9);
    expect(merged.organization.background).toBe(0x1e293b);
  });
});

describe('canvasBackgroundForTheme', () => {
  it('success: dark canvas is slate, light is near-white', () => {
    expect(canvasBackgroundForTheme('dark')).toBe(0x0f172a);
    expect(canvasBackgroundForTheme('light')).toBe(0xf8fafc);
  });

  it('host override: canvasBackground / edge survive the merge', () => {
    const merged = resolveNodeTheme('dark', {
      canvasBackground: 0x222222,
      edge: { color: 0xa6a6a6, width: 1, terminator: 'dot' },
    });
    expect(merged.canvasBackground).toBe(0x222222);
    expect(merged.edge).toEqual({ color: 0xa6a6a6, width: 1, terminator: 'dot' });
    // Unset stays undefined so the per-theme default applies.
    expect(resolveNodeTheme('dark').canvasBackground).toBeUndefined();
    expect(resolveNodeTheme('dark').edge).toBeUndefined();
  });
});

describe('getOrgSymbolUrl', () => {
  const org: DiagramOrganization = {
    id: '1',
    name: 'Org',
    groupIds: [],
    symbolUrl: '/default.svg',
    symbolUrlLight: '/light.svg',
    symbolUrlDark: '/dark.svg',
  };

  it('success: picks theme-specific symbol', () => {
    expect(getOrgSymbolUrl(org, 'light')).toBe('/light.svg');
    expect(getOrgSymbolUrl(org, 'dark')).toBe('/dark.svg');
  });

  it('failure: falls back to symbolUrl when theme variant missing', () => {
    const minimal: DiagramOrganization = {
      id: '2',
      name: 'Min',
      groupIds: [],
      symbolUrl: '/only.svg',
    };
    expect(getOrgSymbolUrl(minimal, 'dark')).toBe('/only.svg');
  });

  it('success: ThemedMedia wins over legacy symbolUrl*', () => {
    const withMedia: DiagramOrganization = {
      ...org,
      media: { byTheme: { light: '/m-light.svg', dark: '/m-dark.svg' } },
    };
    expect(getOrgSymbolUrl(withMedia, 'light')).toBe('/m-light.svg');
    expect(getOrgSymbolUrl(withMedia, 'dark')).toBe('/m-dark.svg');
  });
});

describe('getInactiveOrgSymbolUrl', () => {
  const org: DiagramOrganization = {
    id: '1',
    name: 'Org',
    groupIds: [],
    symbolUrlLight: '/light.svg',
    symbolUrlDark: '/dark.svg',
  };

  it('success: returns opposite theme when both URLs present', () => {
    expect(getInactiveOrgSymbolUrl(org, 'light')).toBe('/dark.svg');
    expect(getInactiveOrgSymbolUrl(org, 'dark')).toBe('/light.svg');
  });

  it('failure: undefined when either theme URL missing', () => {
    expect(
      getInactiveOrgSymbolUrl(
        { id: '2', name: 'X', groupIds: [], symbolUrlLight: '/light.svg' },
        'light',
      ),
    ).toBeUndefined();
  });
});

describe('theme overrides go one field at a time', () => {
  it('success: a single staffZone field overrides without restating the rest', () => {
    // A host wanting a left-aligned zone label had to supply all seven fields of
    // StaffZoneStyle, i.e. copy the SDK's defaults into their own code, where
    // they silently drift. The merge already handled a partial correctly; only
    // the type refused it.
    const theme = mergeTheme({
      staffZone: { labelAlign: 'left' },
    });
    expect(theme.staffZone?.labelAlign).toBe('left');
    // Everything else keeps the default rather than becoming undefined.
    expect(theme.staffZone?.labelFontSize).toBe(14);
    expect(theme.staffZone?.borderRadius).toBe(12);
  });

  it('success: the same holds for a nested person field', () => {
    const theme = mergeTheme({ person: { nameFontSize: 20 } });
    expect(theme.person.nameFontSize).toBe(20);
    expect(theme.person.width).toBe(defaultNodeTheme.person.width);
  });

  it('success: departmentCard takes a partial too', () => {
    const theme = mergeTheme({ departmentCard: { labelRow: true } });
    expect(theme.departmentCard?.labelRow).toBe(true);
    expect(theme.departmentCard?.borderRadius).toBe(8);
  });
});

describe('font theme layers', () => {
  it('success: layers default, base and partial font fields without mutation', () => {
    const base = { ...defaultNodeTheme, fonts: { sans: 'Base Sans', mono: 'Base Mono' } };
    const partial = { fonts: { mono: 'Host Mono' } };
    expect(mergeTheme(partial, base).fonts).toEqual({
      sans: 'Base Sans', mono: 'Host Mono', serif: 'Times New Roman, serif',
    });
    expect(base.fonts).toEqual({ sans: 'Base Sans', mono: 'Base Mono' });
    expect(partial.fonts).toEqual({ mono: 'Host Mono' });
    expect(mergeTheme(undefined, base).fonts).toEqual({
      sans: 'Base Sans', mono: 'Base Mono', serif: 'Times New Roman, serif',
    });
  });

  it('failure: absent base fonts and empty overrides retain defaults in both branches', () => {
    const base = { ...defaultNodeTheme, fonts: undefined };
    const expected = { sans: 'system-ui, sans-serif', mono: 'JetBrains Mono, monospace', serif: 'Times New Roman, serif' };
    expect(mergeTheme(undefined, base).fonts).toEqual(expected);
    expect(mergeTheme({ fonts: {} }, base).fonts).toEqual(expected);
    for (const mode of ['light', 'dark'] as const) {
      expect(resolveNodeTheme(mode).fonts).toEqual(expected);
      expect(resolveNodeTheme(mode, { fonts: { sans: 'Comic Sans MS' } }).fonts).toEqual({
        ...expected, sans: 'Comic Sans MS',
      });
    }
  });
});

describe('found-focus theme', () => {
  it('success: preserves base and partial scalars including zero', () => {
    const base = { ...defaultNodeTheme, foundDimAlpha: 0.25 };
    expect(mergeTheme(undefined, base).foundDimAlpha).toBe(0.25);
    expect(mergeTheme({}, base).foundDimAlpha).toBe(0.25);
    expect(mergeTheme({ foundDimAlpha: 0 }, base).foundDimAlpha).toBe(0);
    expect(mergeTheme({ edge: { accentColor: 0x00ff00, accentWidth: 3, dimAlpha: 0.2 } }).edge).toEqual({ accentColor: 0x00ff00, accentWidth: 3, dimAlpha: 0.2 });
  });
});
