import type { DiagramPosition } from '../data/types.js';
import { formatOrgPeriodLabel } from './formatPeriodLabel.js';
import { formatPositionCountsBadge } from './orgCardChrome.js';
import type { PersonCardLayout, PersonNodeStyle } from './types.js';

export type ResolvedPersonLayout = 'figma-row' | 'gojs-row' | 'gojs-portrait';

export function resolvePersonLayout(style: PersonNodeStyle): ResolvedPersonLayout {
  if (style.personLayout === 'figma-row') return 'figma-row';
  if (style.personLayout === 'gojs-row') return 'gojs-row';
  if (style.personLayout === 'gojs-portrait') return 'gojs-portrait';
  return style.width >= style.height * 1.4 ? 'figma-row' : 'gojs-portrait';
}

export interface PersonAvatarSlot {
  cx: number;
  cy: number;
  r: number;
  /** Square avatar side (GoJS row). */
  size?: number;
  borderRadius?: number;
}

/** Figma landscape seat — photo left, title + name stacked right. */
export function figmaRowAvatar(style: PersonNodeStyle): PersonAvatarSlot {
  const r = Math.min((style.height - 16) / 2, 28);
  const cx = 10 + r;
  return { cx, cy: style.height / 2, r };
}

export function figmaRowTextX(avatar: PersonAvatarSlot): number {
  return avatar.cx + avatar.r + 10;
}

/** Timeline chip band height (GoJS row). */
export const GOJS_ROW_TIMELINE_H = 18;
/** Count bar height under card (GoJS row). */
export const GOJS_ROW_COUNT_BAR_H = 24;

/** GoJS landscape row — 28×28 rounded-square avatar left. */
export function gojsRowAvatar(style: PersonNodeStyle, cardY = 0): PersonAvatarSlot {
  const size = 28;
  const cardH = style.cardRowHeight ?? 56;
  const cx = 8 + size / 2;
  return { cx, cy: cardY + cardH / 2, r: size / 2, size, borderRadius: 6 };
}

export function gojsRowTextX(avatar: PersonAvatarSlot): number {
  return avatar.cx + avatar.r + 8;
}

/** GoJS row stack: timeline chip + card + optional count bar (shared paint + edges). */
export interface GojsRowLayoutMetrics {
  cardY: number;
  cardH: number;
  timelineH: number;
  countBarH: number;
}

export function resolveGojsRowLayoutMetrics(
  position: DiagramPosition,
  style: Pick<PersonNodeStyle, 'cardRowHeight'>,
): GojsRowLayoutMetrics {
  const cardH = style.cardRowHeight ?? 56;
  const timelineLabel = formatOrgPeriodLabel(position) ?? undefined;
  const timelineH = timelineLabel ? GOJS_ROW_TIMELINE_H : 0;
  const countsLabel = formatPositionCountsBadge(position);
  const countBarH = countsLabel ? GOJS_ROW_COUNT_BAR_H : 0;
  return { cardY: timelineH, cardH, timelineH, countBarH };
}

/** GoJS / Variant B portrait — photo top-center, name + title below. */
export function gojsPortraitAvatar(style: PersonNodeStyle): PersonAvatarSlot {
  const r = Math.min(style.width * 0.19, 30);
  return { cx: style.width / 2, cy: 36, r };
}

export function avatarForLayout(
  layout: ResolvedPersonLayout,
  style: PersonNodeStyle,
  cardY = 0,
): PersonAvatarSlot {
  if (layout === 'figma-row') return figmaRowAvatar(style);
  if (layout === 'gojs-row') return gojsRowAvatar(style, cardY);
  return gojsPortraitAvatar(style);
}

export function textXForLayout(
  layout: ResolvedPersonLayout,
  avatar: PersonAvatarSlot,
): number {
  if (layout === 'figma-row') return figmaRowTextX(avatar);
  if (layout === 'gojs-row') return gojsRowTextX(avatar);
  return avatar.cx + avatar.r + 8;
}

export function isExplicitLayout(layout: PersonCardLayout | undefined): boolean {
  return layout === 'figma-row' || layout === 'gojs-row' || layout === 'gojs-portrait';
}
