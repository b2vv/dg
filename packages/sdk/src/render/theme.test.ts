import { describe, expect, it } from 'vitest';
import { getOrgSymbolUrl, resolveTheme } from './theme.js';
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
