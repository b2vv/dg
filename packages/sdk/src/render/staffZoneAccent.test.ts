import { describe, expect, it } from '@rstest/core';
import type { StaffZoneStyle } from './types.js';
import {
  CURRENT_ORG_CHIP_LABEL,
  currentOrgChipAccent,
  resolveZoneBandStyle,
} from './staffZoneAccent.js';

const base: StaffZoneStyle = {
  fill: 0x191f26,
  fillAlpha: 1,
  stroke: 0x45454c,
  strokeWidth: 1,
  borderRadius: 14,
  labelColor: 0xc2c2c6,
  labelFontSize: 15,
  labelAlign: 'left',
  dashed: true,
};

// ШПС mockup: `.org` is dashed #45454c, `.org.cur` turns solid #5a5a62 over its
// own darker fill. The orange there belongs to the chip, not to the frame.
const accent: StaffZoneStyle = {
  ...base,
  currentAccent: { stroke: 0x5a5a62, fill: 0x0f0f11, fillAlpha: 1, solid: true },
};

describe('resolveZoneBandStyle', () => {
  it('leaves a non-current band untouched', () => {
    expect(resolveZoneBandStyle(accent, undefined)).toEqual(accent);
    expect(resolveZoneBandStyle(accent, 'leading')).toEqual(accent);
  });

  it('turns the current band solid over its own fill', () => {
    const resolved = resolveZoneBandStyle(accent, 'current');
    expect(resolved.dashed).toBe(false);
    expect(resolved.stroke).toBe(0x5a5a62);
    expect(resolved.fill).toBe(0x0f0f11);
  });

  it('keeps the frame dashed when the accent does not ask for solid', () => {
    const dashedAccent: StaffZoneStyle = {
      ...base,
      currentAccent: { stroke: 0xe5491d },
    };
    const resolved = resolveZoneBandStyle(dashedAccent, 'current');
    expect(resolved.dashed).toBe(true);
    expect(resolved.stroke).toBe(0xe5491d);
  });

  it('is a no-op when the theme declares no accent', () => {
    expect(resolveZoneBandStyle(base, 'current')).toEqual(base);
  });

  it('never mutates the style it was given', () => {
    const before = structuredClone(accent);
    resolveZoneBandStyle(accent, 'current');
    expect(accent).toEqual(before);
  });
});

describe('currentOrgChipAccent', () => {
  const chipped: StaffZoneStyle = {
    ...base,
    currentAccent: { chipBorder: 0xe5491d, chipTextColor: 0xff8d68 },
  };

  it('chips the current band only', () => {
    expect(currentOrgChipAccent(chipped, 'current')?.chipBorder).toBe(0xe5491d);
    expect(currentOrgChipAccent(chipped, 'leading')).toBeUndefined();
    expect(currentOrgChipAccent(chipped, undefined)).toBeUndefined();
  });

  it('declines a chip the theme never described', () => {
    expect(currentOrgChipAccent(base, 'current')).toBeUndefined();
  });

  it('declines a borderless chip — the pill is its outline', () => {
    const borderless: StaffZoneStyle = { ...base, currentAccent: { stroke: 0x5a5a62 } };
    expect(currentOrgChipAccent(borderless, 'current')).toBeUndefined();
  });
});

describe('CURRENT_ORG_CHIP_LABEL', () => {
  it('is the mockup copy', () => {
    expect(CURRENT_ORG_CHIP_LABEL).toBe('Поточна організація');
  });
});
