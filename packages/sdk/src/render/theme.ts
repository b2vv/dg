import type { DiagramOrganization } from '../data/types.js';
import type { ThemeMode } from './types.js';

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export function getOrgSymbolUrl(
  org: DiagramOrganization,
  theme: 'light' | 'dark',
): string | undefined {
  if (theme === 'dark') {
    return org.symbolUrlDark ?? org.symbolUrl ?? org.symbolUrlLight;
  }
  return org.symbolUrlLight ?? org.symbolUrl ?? org.symbolUrlDark;
}
