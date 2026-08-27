import { describe, expect, it } from '@rstest/core';
import {
  isFullBleedIntrinsic,
  orgCardAabb,
  resolveOrgSymbolLayout,
  verticalBodyMetrics,
  ORG_SYMBOL_PAD,
} from './orgSymbolBox.js';
import { defaultNodeTheme } from './types.js';

const style = defaultNodeTheme.organization;
const org = {
  id: 'o1',
  name: 'Short',
  groupIds: [],
  fullName: 'Official Full Name',
};

describe('orgSymbolBox', () => {
  it('detects ~400×200 display-canvas as full-bleed intrinsic', () => {
    expect(isFullBleedIntrinsic(400, 200)).toBe(true);
    expect(isFullBleedIntrinsic(396, 198)).toBe(true);
    expect(isFullBleedIntrinsic(36, 36)).toBe(false);
    expect(isFullBleedIntrinsic(200, 400)).toBe(false);
  });

  it('caption mode: SYMBOL_W × SYMBOL_H when showShortName !== false', () => {
    const layout = resolveOrgSymbolLayout(org, style, {
      hasSymbol: true,
      textureWidth: 64,
      textureHeight: 64,
    });
    expect(layout.mode).toBe('caption');
    expect(layout.box.width).toBe(style.symbolSize);
    expect(layout.box.height).toBe(style.symbolSize);
    expect(layout.box.padding).toBe(ORG_SYMBOL_PAD);
    expect(layout.showNameText).toBe(true);
    expect(layout.displayName).toBe('Short');
  });

  it('no-caption mode: FULL_W × FULL_H when showShortName === false', () => {
    const layout = resolveOrgSymbolLayout(
      { ...org, showShortName: false },
      style,
      { hasSymbol: true, textureWidth: 64, textureHeight: 64 },
    );
    expect(layout.mode).toBe('no-caption');
    expect(layout.box.width).toBeGreaterThan(style.symbolSize);
    expect(layout.box.height).toBeGreaterThanOrEqual(style.symbolSize);
    expect(layout.box.height).toBe(style.height - ORG_SYMBOL_PAD * 2);
    expect(layout.showNameText).toBe(false);
    expect(layout.box.padding).toBe(ORG_SYMBOL_PAD);
  });

  it('full-bleed: NODE_W × NODE_H, padding 0 for ~400×200 texture', () => {
    const layout = resolveOrgSymbolLayout(org, style, {
      hasSymbol: true,
      textureWidth: 400,
      textureHeight: 200,
    });
    expect(layout.mode).toBe('full-bleed');
    expect(layout.box).toEqual({
      x: 0,
      y: 0,
      width: style.width,
      height: style.height,
      padding: 0,
    });
    expect(layout.showNameText).toBe(false);
  });

  it('E2: card AABB stays fixed across caption / no-caption / full-bleed', () => {
    const aabb = orgCardAabb(style);
    const modes = [
      resolveOrgSymbolLayout(org, style, {
        hasSymbol: true,
        textureWidth: 36,
        textureHeight: 36,
      }),
      resolveOrgSymbolLayout(
        { ...org, showShortName: false },
        style,
        { hasSymbol: true, textureWidth: 36, textureHeight: 36 },
      ),
      resolveOrgSymbolLayout(org, style, {
        hasSymbol: true,
        textureWidth: 400,
        textureHeight: 200,
      }),
    ];
    for (const m of modes) {
      expect(aabb).toEqual({ width: style.width, height: style.height });
      expect(m.box.width).toBeLessThanOrEqual(aabb.width);
      expect(m.box.height).toBeLessThanOrEqual(aabb.height);
    }
  });

  it('E3: no symbol → displayName prefers fullName', () => {
    const layout = resolveOrgSymbolLayout(org, style, { hasSymbol: false });
    expect(layout.showNameText).toBe(true);
    expect(layout.displayName).toBe('Official Full Name');
  });

  it('E3: no symbol and no fullName → falls back to name', () => {
    const layout = resolveOrgSymbolLayout(
      { id: 'o2', name: 'OnlyName', groupIds: [] },
      style,
      { hasSymbol: false },
    );
    expect(layout.displayName).toBe('OnlyName');
  });
});

/** Figma «організації» card (frame 1264:8121): 234×110, 16px inset, 17px name row. */
describe('vertical body metrics overrides', () => {
  const figmaOrgStyle = {
    ...defaultNodeTheme.organization,
    width: 234,
    height: 110,
    symbolWidth: 116,
    symbolHeight: 49,
    orgCardLayout: 'gojs-vertical' as const,
    bodyPaddingX: 16,
    bodyPaddingY: 16,
    nameRowHeight: 17,
    symbolRowGap: 12,
  };

  it('falls back to GoJS defaults when unset', () => {
    const metrics = verticalBodyMetrics(defaultNodeTheme.organization);
    expect(metrics).toEqual({ padX: 14, padY: 10, nameRowHeight: 20, symbolRowGap: 6 });
  });

  it('places the symbol row under the name row using style overrides', () => {
    const layout = resolveOrgSymbolLayout(org, figmaOrgStyle, {
      hasSymbol: true,
      textureWidth: 120,
      textureHeight: 120,
    });
    expect(layout.box.y).toBe(16 + 17 + 12);
    expect(layout.box.height).toBe(49);
    expect(layout.vertical?.nameY).toBe(16);
    expect(layout.vertical?.nameMaxWidth).toBe(234 - 16 * 2);
    // Card bottom inset stays 16px: 45 + 49 + 16 = 110.
    expect(layout.box.y + layout.box.height + 16).toBe(110);
  });
});
