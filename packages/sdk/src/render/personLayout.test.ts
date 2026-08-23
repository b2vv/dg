import { describe, expect, it } from 'vitest';
import {
  figmaRowAvatar,
  figmaRowTextX,
  gojsRowAvatar,
  GOJS_ROW_COUNT_BAR_H,
  GOJS_ROW_TIMELINE_H,
  gojsPortraitAvatar,
  isExplicitLayout,
  resolveGojsRowLayoutMetrics,
  resolvePersonLayout,
} from './personLayout.js';
import type { PersonNodeStyle } from './types.js';

function baseStyle(overrides: Partial<PersonNodeStyle> = {}): PersonNodeStyle {
  return {
    width: 136,
    height: 156,
    background: 0xffffff,
    border: 0xcbd5e1,
    borderWidth: 1,
    borderRadius: 8,
    nameColor: 0x0f172a,
    titleColor: 0x475569,
    nameFontSize: 12,
    titleFontSize: 11,
    badgeColor: 0xf59e0b,
    badgeTextColor: 0xffffff,
    avatarColor: 0x94a3b8,
    ...overrides,
  };
}

describe('resolvePersonLayout', () => {
  it('honours explicit figma-row', () => {
    expect(resolvePersonLayout(baseStyle({ personLayout: 'figma-row', width: 136, height: 156 }))).toBe(
      'figma-row',
    );
  });

  it('honours explicit gojs-row', () => {
    expect(resolvePersonLayout(baseStyle({ personLayout: 'gojs-row', width: 136, height: 156 }))).toBe(
      'gojs-row',
    );
  });

  it('honours explicit gojs-portrait', () => {
    expect(resolvePersonLayout(baseStyle({ personLayout: 'gojs-portrait', width: 248, height: 72 }))).toBe(
      'gojs-portrait',
    );
  });

  it('auto: landscape aspect → figma-row', () => {
    expect(resolvePersonLayout(baseStyle({ width: 248, height: 72 }))).toBe('figma-row');
  });

  it('auto: portrait aspect → gojs-portrait', () => {
    expect(resolvePersonLayout(baseStyle({ width: 136, height: 156 }))).toBe('gojs-portrait');
  });
});

describe('avatar slots', () => {
  it('figma row: photo left, vertically centered', () => {
    const style = baseStyle({ width: 248, height: 72 });
    const avatar = figmaRowAvatar(style);
    expect(avatar.cx).toBeLessThan(style.width / 2);
    expect(avatar.cy).toBe(style.height / 2);
    expect(figmaRowTextX(avatar)).toBeGreaterThan(avatar.cx + avatar.r);
  });

  it('gojs row: 28px avatar left', () => {
    const style = baseStyle({ width: 200, height: 56, personLayout: 'gojs-row' });
    const avatar = gojsRowAvatar(style);
    expect(avatar.r).toBe(14);
    expect(avatar.cx).toBeLessThan(style.width / 2);
    expect(avatar.cy).toBe(style.height / 2);
  });
});

describe('resolveGojsRowLayoutMetrics', () => {
  it('includes timeline and count bar offsets when data present', () => {
    const metrics = resolveGojsRowLayoutMetrics(
      {
        id: 'p1',
        organizationId: 'o1',
        periodStart: '2024-01-01',
        childrenCount: 1,
        allDescendantCount: 3,
      },
      baseStyle({ cardRowHeight: 56 }),
    );
    expect(metrics).toEqual({
      cardY: GOJS_ROW_TIMELINE_H,
      cardH: 56,
      timelineH: GOJS_ROW_TIMELINE_H,
      countBarH: GOJS_ROW_COUNT_BAR_H,
    });
  });

  it('omits chrome bands when period and counts absent', () => {
    expect(
      resolveGojsRowLayoutMetrics({ id: 'p1', organizationId: 'o1' }, baseStyle({ cardRowHeight: 56 })),
    ).toEqual({ cardY: 0, cardH: 56, timelineH: 0, countBarH: 0 });
  });
});

describe('isExplicitLayout', () => {
  it('returns true for figma-row, gojs-row, and gojs-portrait', () => {
    expect(isExplicitLayout('figma-row')).toBe(true);
    expect(isExplicitLayout('gojs-row')).toBe(true);
    expect(isExplicitLayout('gojs-portrait')).toBe(true);
  });

  it('returns false for auto or undefined', () => {
    expect(isExplicitLayout('auto')).toBe(false);
    expect(isExplicitLayout(undefined)).toBe(false);
  });
});
