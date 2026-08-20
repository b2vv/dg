import type { DiagramOrganization } from '../data/types.js';
import {
  darkNodeTheme,
  defaultNodeTheme,
  mergeTheme,
  type NodeTheme,
  type ThemeMode,
} from './types.js';

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

/** Pixi clear color for the diagram surface. */
export function canvasBackgroundForTheme(theme: 'light' | 'dark'): number {
  return theme === 'dark' ? 0x0f172a : 0xf8fafc;
}

/** Org / person / department fills for the resolved theme (+ optional host overrides). */
export function resolveNodeTheme(
  theme: 'light' | 'dark',
  partial?: Partial<NodeTheme>,
): NodeTheme {
  const base = theme === 'dark' ? darkNodeTheme : defaultNodeTheme;
  return mergeTheme(partial, base);
}

export function orgEdgeColorForTheme(theme: 'light' | 'dark'): number {
  return theme === 'dark' ? 0x64748b : 0x94a3b8;
}

export function staffEdgeColorForTheme(theme: 'light' | 'dark'): number {
  return theme === 'dark' ? 0x94a3b8 : 0x64748b;
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
