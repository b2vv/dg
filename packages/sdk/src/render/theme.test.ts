import { describe, expect, it } from '@rstest/core';
import {
  canvasBackgroundForTheme,
  getInactiveOrgSymbolUrl,
  getOrgSymbolUrl,
  resolveNodeTheme,
  resolveTheme,
} from './theme.js';
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
