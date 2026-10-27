import type { StaffZoneStyle } from './types.js';

/** ШПС mockup `.org.cur>.on i` — the chip that names the current organization. */
export const CURRENT_ORG_CHIP_LABEL = 'Поточна організація';

/**
 * Zone chrome for one band, with the current-organization accent folded in.
 *
 * Kept apart from the painter so the accent has a plain answer to test: the
 * painter then only ever draws the style it is handed, and «which band looks
 * different» stops being a branch buried in paint code.
 *
 * Returns the style unchanged — the same object — when there is no accent to
 * apply, so scenes that never declare one are provably untouched.
 */
/**
 * The chip accent this band should paint, or `undefined` for no chip.
 *
 * Separate from {@link resolveZoneBandStyle} because the two answer different
 * questions — how the frame looks, and whether a pill is added — and both need
 * to be decidable without a canvas: zone paint reads Pixi text metrics, which
 * only a browser host provides, so the decision is tested here and the painter
 * is left with a single `if`.
 *
 * A chip with no border colour is treated as no chip: the pill is its outline,
 * and one drawn without it would be loose text over the frame.
 */
export function currentOrgChipAccent(
  style: StaffZoneStyle,
  role: 'leading' | 'current' | undefined,
): (NonNullable<StaffZoneStyle['currentAccent']> & { chipBorder: number }) | undefined {
  const accent = style.currentAccent;
  if (role !== 'current' || !accent || accent.chipBorder === undefined) return undefined;
  return { ...accent, chipBorder: accent.chipBorder };
}

export function resolveZoneBandStyle(
  style: StaffZoneStyle,
  role: 'leading' | 'current' | undefined,
): StaffZoneStyle {
  const accent = style.currentAccent;
  if (role !== 'current' || !accent) return style;
  return {
    ...style,
    stroke: accent.stroke ?? style.stroke,
    fill: accent.fill ?? style.fill,
    fillAlpha: accent.fillAlpha ?? style.fillAlpha,
    // `solid` is the mockup's dashed→solid switch; silence about it leaves the
    // zone's own dash setting alone rather than quietly straightening it.
    dashed: accent.solid ? false : style.dashed,
  };
}
