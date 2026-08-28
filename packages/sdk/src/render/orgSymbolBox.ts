import type { DiagramOrganization } from '../data/types.js';
import type { OrganizationNodeStyle } from './types.js';
import type { LodLevel } from './lod.js';

/** Inset around the symbol when not full-bleed (horizontal layout). */
export const ORG_SYMBOL_PAD = 8;

/** GoJS production symbol box (10:7). */
export const GOJS_SYMBOL_W = 80;
export const GOJS_SYMBOL_H = 56;
export const GOJS_NO_CAPTION_W = 109;
export const GOJS_NO_CAPTION_H = 76;

/** GoJS vertical card body margin (top, right, bottom, left). */
export const GOJS_BODY_MARGIN = { top: 10, right: 14, bottom: 10, left: 14 };
export const GOJS_NAME_ROW_H = 20;
export const GOJS_SYMBOL_ROW_GAP = 6;
export const GOJS_UNIT_ROW_GAP = 4;

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
  /** True when symbol area should show fullName fallback text (no texture). */
  showFullNameFallback: boolean;
  /**
   * Primary label: `fullName` then `name` when no symbol (E3);
   * short `name` when caption mode with symbol.
   */
  displayName: string;
  /** Full name for symbol-area fallback when symbol missing. */
  fullNameFallback: string;
  /** Vertical stack metrics (gojs-vertical only). */
  vertical?: {
    nameY: number;
    unitY: number;
    nameMaxWidth: number;
  };
}

function symbolDims(style: OrganizationNodeStyle): { w: number; h: number } {
  return {
    w: style.symbolWidth ?? style.symbolSize,
    h: style.symbolHeight ?? style.symbolSize,
  };
}

function isGojsVertical(style: OrganizationNodeStyle): boolean {
  return style.orgCardLayout === 'gojs-vertical';
}

/** Vertical card body metrics — GoJS defaults, overridable per style (Figma 2026-08). */
export function verticalBodyMetrics(style: OrganizationNodeStyle): {
  padX: number;
  padY: number;
  nameRowHeight: number;
  symbolRowGap: number;
} {
  return {
    padX: style.bodyPaddingX ?? GOJS_BODY_MARGIN.left,
    padY: style.bodyPaddingY ?? GOJS_BODY_MARGIN.top,
    nameRowHeight: style.nameRowHeight ?? GOJS_NAME_ROW_H,
    symbolRowGap: style.symbolRowGap ?? GOJS_SYMBOL_ROW_GAP,
  };
}

function fullNameOf(org: DiagramOrganization): string {
  return org.fullName?.trim() || org.name;
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

function verticalSymbolBox(
  nodeW: number,
  mode: OrgSymbolBoxMode,
  showName: boolean,
  style: OrganizationNodeStyle,
): OrgSymbolBox {
  if (mode === 'full-bleed') {
    return { x: 0, y: 0, width: nodeW, height: style.height, padding: 0 };
  }

  let symW: number;
  let symH: number;
  if (mode === 'no-caption') {
    symW = style.noCaptionSymbolWidth ?? GOJS_NO_CAPTION_W;
    symH = style.noCaptionSymbolHeight ?? GOJS_NO_CAPTION_H;
  } else {
    symW = style.symbolWidth ?? GOJS_SYMBOL_W;
    symH = style.symbolHeight ?? GOJS_SYMBOL_H;
  }

  const body = verticalBodyMetrics(style);
  const symbolY = showName
    ? body.padY + body.nameRowHeight + body.symbolRowGap
    : body.padY;
  return {
    x: (nodeW - symW) / 2,
    y: symbolY,
    width: symW,
    height: symH,
    padding: ORG_SYMBOL_PAD,
  };
}

function verticalMetrics(
  style: OrganizationNodeStyle,
  layout: Pick<OrgSymbolLayout, 'box'>,
): OrgSymbolLayout['vertical'] {
  const body = verticalBodyMetrics(style);
  const unitY = layout.box.y + layout.box.height + GOJS_UNIT_ROW_GAP;
  const nameMaxWidth = Math.max(24, style.width - body.padX * 2);
  return { nameY: body.padY, unitY, nameMaxWidth };
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
  const { w: symbolW, h: symbolH } = symbolDims(style);
  const vertical = isGojsVertical(style);
  const hasSymbol = options.hasSymbol === true;
  const wantCaption = org.showShortName !== false;
  const fallback = fullNameOf(org);

  if (lod === 'far') {
    const size = Math.min(symbolW, 36);
    return {
      mode: 'caption',
      box: { x: 0, y: (nodeH - size) / 2, width: size, height: size, padding: 0 },
      showShortName: false,
      showNameText: false,
      showFullNameFallback: false,
      displayName: org.name,
      fullNameFallback: fallback,
    };
  }

  /*
   * E3: missing symbol → the full name replaces the short name in the name row.
   *
   * The symbol area stays empty. It used to also draw `fullNameFallback`, but
   * that is the *same string* as `displayName` here, so the card rendered its
   * own name twice — and the copy inside the symbol box is only symbolW wide, so
   * it truncated to something like "Org…" that carries no information. One
   * readable label beats two unreadable ones.
   */
  if (!hasSymbol) {
    if (vertical) {
      const mode = wantCaption ? 'caption' : 'no-caption';
      const box = verticalSymbolBox(nodeW, mode, wantCaption, style);
      const layout: OrgSymbolLayout = {
        mode,
        box,
        showShortName: wantCaption,
        showNameText: true,
        showFullNameFallback: false,
        displayName: fallback,
        fullNameFallback: fallback,
      };
      layout.vertical = verticalMetrics(style, layout);
      return layout;
    }
    const pad = ORG_SYMBOL_PAD;
    const boxW = symbolW;
    const boxH = symbolH;
    const x = pad;
    const y = (nodeH - boxH) / 2;
    return {
      mode: wantCaption ? 'caption' : 'no-caption',
      box: { x, y, width: boxW, height: boxH, padding: pad },
      showShortName: wantCaption,
      showNameText: true,
      showFullNameFallback: false,
      displayName: fallback,
      fullNameFallback: fallback,
    };
  }

  const texW = options.textureWidth ?? 0;
  const texH = options.textureHeight ?? 0;
  if (isFullBleedIntrinsic(texW, texH)) {
    const layout: OrgSymbolLayout = {
      mode: 'full-bleed',
      box: { x: 0, y: 0, width: nodeW, height: nodeH, padding: 0 },
      showShortName: false,
      showNameText: false,
      showFullNameFallback: false,
      displayName: org.name,
      fullNameFallback: fallback,
    };
    if (vertical) layout.vertical = verticalMetrics(style, layout);
    return layout;
  }

  if (!wantCaption) {
    if (vertical) {
      const box = verticalSymbolBox(nodeW, 'no-caption', false, style);
      const layout: OrgSymbolLayout = {
        mode: 'no-caption',
        box,
        showShortName: false,
        showNameText: false,
        showFullNameFallback: false,
        displayName: org.name,
        fullNameFallback: fallback,
      };
      layout.vertical = verticalMetrics(style, layout);
      return layout;
    }
    const pad = ORG_SYMBOL_PAD;
    const fullW = Math.max(symbolW, Math.min(nodeW - pad * 2, Math.round(symbolH * 1.5)));
    const fullH = Math.max(symbolH, nodeH - pad * 2);
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
      showFullNameFallback: false,
      displayName: org.name,
      fullNameFallback: fallback,
    };
  }

  // With caption: SYMBOL_W × SYMBOL_H
  if (vertical) {
    const box = verticalSymbolBox(nodeW, 'caption', true, style);
    const layout: OrgSymbolLayout = {
      mode: 'caption',
      box,
      showShortName: true,
      showNameText: true,
      showFullNameFallback: false,
      displayName: org.name,
      fullNameFallback: fallback,
    };
    layout.vertical = verticalMetrics(style, layout);
    return layout;
  }

  const pad = ORG_SYMBOL_PAD;
  const topInset = (nodeH - symbolH) / 2;
  return {
    mode: 'caption',
    box: {
      x: pad,
      y: topInset,
      width: symbolW,
      height: symbolH,
      padding: pad,
    },
    showShortName: true,
    showNameText: true,
    showFullNameFallback: false,
    displayName: org.name,
    fullNameFallback: fallback,
  };
}

/** Card AABB from style — fixed for all symbol modes (E2 measurement). */
export function orgCardAabb(style: OrganizationNodeStyle): { width: number; height: number } {
  return { width: style.width, height: style.height };
}
