import { describe, expect, it } from 'vitest';
import {
  isFullBleedIntrinsic,
  orgCardAabb,
  resolveOrgSymbolLayout,
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
