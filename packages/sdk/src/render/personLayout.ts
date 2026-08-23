import type { PersonCardLayout, PersonNodeStyle } from './types.js';

export type ResolvedPersonLayout = 'figma-row' | 'gojs-portrait';

export function resolvePersonLayout(style: PersonNodeStyle): ResolvedPersonLayout {
  if (style.personLayout === 'figma-row') return 'figma-row';
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

/** GoJS / Variant B portrait — photo top-center, name + title below. */
export function gojsPortraitAvatar(style: PersonNodeStyle): PersonAvatarSlot {
  const r = Math.min(style.width * 0.19, 30);
  return { cx: style.width / 2, cy: 36, r };
}

export function isExplicitLayout(layout: PersonCardLayout | undefined): boolean {
  return layout === 'figma-row' || layout === 'gojs-portrait';
}
