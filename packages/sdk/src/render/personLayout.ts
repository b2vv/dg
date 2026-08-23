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

/** GoJS landscape row — 28×28 avatar left. */
export function gojsRowAvatar(style: PersonNodeStyle): PersonAvatarSlot {
  const r = 14;
  const cx = 10 + r;
  return { cx, cy: style.height / 2, r };
}

export function gojsRowTextX(avatar: PersonAvatarSlot): number {
  return avatar.cx + avatar.r + 8;
}

/** GoJS / Variant B portrait — photo top-center, name + title below. */
export function gojsPortraitAvatar(style: PersonNodeStyle): PersonAvatarSlot {
  const r = Math.min(style.width * 0.19, 30);
  return { cx: style.width / 2, cy: 36, r };
}

export function avatarForLayout(
  layout: ResolvedPersonLayout,
  style: PersonNodeStyle,
): PersonAvatarSlot {
  if (layout === 'figma-row') return figmaRowAvatar(style);
  if (layout === 'gojs-row') return gojsRowAvatar(style);
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
