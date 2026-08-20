import { describe, expect, it } from 'vitest';
import {
  canvasBackgroundForTheme,
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
});
