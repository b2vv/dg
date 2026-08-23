import type { DiagramOrganization } from '../data/types.js';
import type { OrganizationNodeStyle } from './types.js';
import type { LodLevel } from './lod.js';

/** Inset around the symbol when not full-bleed. */
export const ORG_SYMBOL_PAD = 8;

/**
 * Caption-mode symbol box (SYMBOL_W × SYMBOL_H).
 * Matches `OrganizationNodeStyle.symbolSize` (default 36).
 */
export const ORG_SYMBOL_W = 36;
export const ORG_SYMBOL_H = 36;

export type OrgSymbolBoxMode = 'caption' | 'no-caption' | 'full-bleed';

export interface OrgSymbolBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Outer padding used for this mode (0 = full-bleed). */
  padding: number;
}

export interface OrgSymbolLayout {
  mode: OrgSymbolBoxMode;
  box: OrgSymbolBox;
  /**
   * Whether to paint the short-name caption beside the symbol.
   * False for no-caption / full-bleed; also false when there is no symbol
   * only if host set `showShortName: false` — but E3 still shows fullName/name
   * via {@link OrgSymbolLayout.showNameText}.
   */
  showShortName: boolean;
  /** True when the primary text line should be visible. */
  showNameText: boolean;
  /**
   * Primary label: `fullName` then `name` when no symbol (E3);
   * short `name` when caption mode with symbol.
   */
  displayName: string;
}

/**
 * Display-canvas symbols (~400×200, ~2:1) fill the card edge-to-edge.
 * Tolerant of small decoder variance.
 */
export function isFullBleedIntrinsic(width: number, height: number): boolean {
  if (!(width > 0) || !(height > 0)) return false;
  const aspect = width / height;
  const near400x200 =
    Math.abs(width - 400) <= 24 && Math.abs(height - 200) <= 16;
  const wideBanner = aspect >= 1.75 && aspect <= 2.25 && width >= 320;
  return near400x200 || wideBanner;
}

/**
 * Resolve symbol box mode inside a **fixed** card AABB (E2).
 * Node width/height come from layout/style and do not change with mode.
 */
export function resolveOrgSymbolLayout(
  org: DiagramOrganization,
  style: OrganizationNodeStyle,
  options: {
    lod?: LodLevel;
    /** Decoded texture size; when set, may promote to full-bleed. */
    textureWidth?: number;
    textureHeight?: number;
    /** True when a usable symbol texture is on the sprite. */
    hasSymbol?: boolean;
  } = {},
): OrgSymbolLayout {
  const lod = options.lod ?? 'near';
  const nodeW = style.width;
  const nodeH = style.height;
  const symbolW = style.symbolSize;
  const symbolH = style.symbolSize;
  const hasSymbol = options.hasSymbol === true;
  const wantCaption = org.showShortName !== false;

  if (lod === 'far') {
    const size = Math.min(symbolW, 36);
    return {
      mode: 'caption',
      box: { x: 0, y: (nodeH - size) / 2, width: size, height: size, padding: 0 },
      showShortName: false,
      showNameText: false,
      displayName: org.name,
    };
  }

  // E3: missing symbol → text fullName/name, never a diamond placeholder.
  if (!hasSymbol) {
    const pad = ORG_SYMBOL_PAD;
    return {
      mode: wantCaption ? 'caption' : 'no-caption',
      box: {
        x: pad,
        y: (nodeH - symbolH) / 2,
        width: symbolW,
        height: symbolH,
        padding: pad,
      },
      showShortName: wantCaption,
      showNameText: true,
      displayName: org.fullName?.trim() || org.name,
    };
  }

  const texW = options.textureWidth ?? 0;
  const texH = options.textureHeight ?? 0;
  if (isFullBleedIntrinsic(texW, texH)) {
    return {
      mode: 'full-bleed',
      box: { x: 0, y: 0, width: nodeW, height: nodeH, padding: 0 },
      showShortName: false,
      showNameText: false,
      displayName: org.name,
    };
  }

  if (!wantCaption) {
    // No caption: symbol takes the name-row area (FULL_W × FULL_H).
    const pad = ORG_SYMBOL_PAD;
    const fullH = Math.max(symbolH, nodeH - pad * 2);
    const fullW = Math.max(symbolW, Math.min(nodeW - pad * 2, Math.round(fullH * 1.5)));
    return {
      mode: 'no-caption',
      box: {
        x: pad,
        y: (nodeH - fullH) / 2,
        width: fullW,
        height: fullH,
        padding: pad,
      },
      showShortName: false,
      showNameText: false,
      displayName: org.name,
    };
  }

  // With caption: SYMBOL_W × SYMBOL_H
  const pad = ORG_SYMBOL_PAD;
  return {
    mode: 'caption',
    box: {
      x: pad,
      y: (nodeH - symbolH) / 2,
      width: symbolW,
      height: symbolH,
      padding: pad,
    },
    showShortName: true,
    showNameText: true,
    displayName: org.name,
  };
}

/** Card AABB from style — fixed for all symbol modes (E2 measurement). */
export function orgCardAabb(style: OrganizationNodeStyle): { width: number; height: number } {
  return { width: style.width, height: style.height };
}
