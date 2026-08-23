import { Graphics, Text } from 'pixi.js';
import type { DiagramPosition } from '../data/types.js';
import { formatOrgPeriodLabel } from './formatPeriodLabel.js';
import { formatPositionCountsBadge } from './orgCardChrome.js';
import type { PersonNodeStyle } from './types.js';

export const GOJS_ROW_AVATAR = 28;
export const GOJS_ROW_AVATAR_R = 6;
export const GOJS_ROW_PAD = 8;
export const GOJS_COUNT_BAR_H = 24;
export const GOJS_TIMELINE_GAP = 4;

export interface GojsRowAvatar {
  x: number;
  y: number;
  size: number;
  radius: number;
  cx: number;
  cy: number;
}

export function gojsRowAvatarRect(style: PersonNodeStyle, cardY = 0): GojsRowAvatar {
  const size = GOJS_ROW_AVATAR;
  const x = GOJS_ROW_PAD;
  const y = cardY + (style.height - size) / 2;
  return { x, y, size, radius: GOJS_ROW_AVATAR_R, cx: x + size / 2, cy: y + size / 2 };
}

export function gojsRowTextX(avatar: GojsRowAvatar): number {
  return avatar.x + avatar.size + GOJS_ROW_PAD;
}

export function resolveGojsRowTimeline(position: DiagramPosition): string | undefined {
  const explicit = position.timeline?.trim();
  if (explicit) return explicit;
  return formatOrgPeriodLabel(position);
}

export function paintGojsRowCard(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: number,
  stroke: number,
  width: number,
  dashed: boolean,
): void {
  g.clear();
  g.roundRect(x, y, w, h, r);
  g.fill({ color: fill });
  if (dashed) {
    drawDashedRoundRect(g, x, y, w, h, r, stroke, width, 5, 3);
  } else {
    g.stroke({ color: stroke, width });
  }
}

/** @deprecated use paintGojsRowCard */
export function strokeCardBorder(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: number,
  width: number,
  dashed: boolean,
): void {
  g.clear();
  g.roundRect(x, y, w, h, r);
  if (dashed) {
    drawDashedRoundRect(g, x, y, w, h, r, color, width, 5, 3);
  } else {
    g.stroke({ color, width });
  }
}

function drawDashedRoundRect(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: number,
  width: number,
  dash: number,
  gap: number,
): void {
  const pts = flattenRoundRect(x, y, w, h, r);
  drawDashedPolyline(g, pts, color, width, dash, gap);
}

function flattenRoundRect(x: number, y: number, w: number, h: number, r: number): Array<{ x: number; y: number }> {
  const rr = Math.min(r, w / 2, h / 2);
  return [
    { x: x + rr, y },
    { x: x + w - rr, y },
    { x: x + w, y: y + rr },
    { x: x + w, y: y + h - rr },
    { x: x + w - rr, y: y + h },
    { x: x + rr, y: y + h },
    { x, y: y + h - rr },
    { x, y: y + rr },
    { x: x + rr, y },
  ];
}

function drawDashedPolyline(
  g: Graphics,
  points: Array<{ x: number; y: number }>,
  color: number,
  width: number,
  dash: number,
  gap: number,
): void {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) continue;
    const ux = dx / len;
    const uy = dy / len;
    let t = 0;
    let draw = true;
    while (t < len) {
      const seg = Math.min(draw ? dash : gap, len - t);
      if (draw) {
        g.moveTo(a.x + ux * t, a.y + uy * t);
        g.lineTo(a.x + ux * (t + seg), a.y + uy * (t + seg));
      }
      t += seg;
      draw = !draw;
    }
  }
  g.stroke({ color, width });
}

export function paintAvatarTile(g: Graphics, avatar: GojsRowAvatar, fill: number): void {
  g.clear();
  g.roundRect(avatar.x, avatar.y, avatar.size, avatar.size, avatar.radius);
  g.fill({ color: fill });
}

export function paintPendingHourglass(g: Graphics, x: number, y: number, size: number, fill: number): void {
  g.clear();
  const s = size;
  g.moveTo(x, y);
  g.lineTo(x + s, y);
  g.lineTo(x + s / 2, y + s / 2);
  g.lineTo(x + s, y + s);
  g.lineTo(x, y + s);
  g.lineTo(x + s / 2, y + s / 2);
  g.closePath();
  g.fill({ color: fill });
}

export interface GojsTimelineLayout {
  visible: boolean;
  chipX: number;
  chipY: number;
  chipW: number;
  chipH: number;
  cardYOffset: number;
}

export function layoutGojsTimeline(
  position: DiagramPosition,
  style: PersonNodeStyle,
  label: Text,
): GojsTimelineLayout {
  const text = resolveGojsRowTimeline(position);
  if (!text) {
    return { visible: false, chipX: 0, chipY: 0, chipW: 0, chipH: 0, cardYOffset: 0 };
  }
  const fs = style.timelineFontSize ?? 12;
  label.text = text;
  label.style.fontSize = fs;
  label.style.fill = style.timelineTextColor ?? style.titleColor;
  label.anchor.set(0, 0.5);
  const dotR = 3.5;
  const padX = 8;
  const padY = 3;
  const estW = Math.min(style.width - 4, Math.max(48, text.length * fs * 0.55 + padX * 2 + dotR * 2 + 6));
  const chipH = fs + padY * 2;
  const chipY = -(chipH + GOJS_TIMELINE_GAP);
  return {
    visible: true,
    chipX: 0,
    chipY,
    chipW: estW,
    chipH,
    cardYOffset: 0,
  };
}

export function paintGojsTimelineChip(
  chip: Graphics,
  dot: Graphics,
  layout: GojsTimelineLayout,
  style: PersonNodeStyle,
): void {
  chip.clear();
  dot.clear();
  if (!layout.visible) return;
  const { chipX, chipY, chipW, chipH } = layout;
  chip.roundRect(chipX, chipY, chipW, chipH, 4);
  chip.fill({ color: style.timelineChipFill ?? style.periodChipBackground ?? 0x334155 });
  chip.stroke({ color: style.timelineChipStroke ?? style.border, width: 1 });
  const dotR = 3.5;
  dot.circle(chipX + 8 + dotR, chipY + chipH / 2, dotR);
  dot.fill({ color: style.timelineDotColor ?? 0x4ade80 });
}

export interface GojsCountBarLayout {
  visible: boolean;
  y: number;
  text: string;
}

export function layoutGojsCountBar(position: DiagramPosition, style: PersonNodeStyle): GojsCountBarLayout {
  const text = formatPositionCountsBadge(position);
  if (!text) return { visible: false, y: style.height, text: '' };
  return { visible: true, y: style.height, text };
}

export function paintGojsCountBar(
  bar: Graphics,
  label: Text,
  expander: Graphics,
  layout: GojsCountBarLayout,
  style: PersonNodeStyle,
  cardWidth: number,
): void {
  bar.clear();
  expander.clear();
  if (!layout.visible) {
    label.visible = false;
    return;
  }
  const fs = style.countsBadgeFontSize ?? 11;
  label.text = layout.text;
  label.style.fontSize = fs;
  label.style.fill = style.countsBadgeTextColor ?? style.titleColor;
  label.anchor.set(0.5, 0.5);
  label.visible = true;

  const y = layout.y;
  bar.roundRect(0, y, cardWidth, GOJS_COUNT_BAR_H, 4);
  bar.fill({ color: style.countsBarFill ?? style.periodChipBackground ?? 0x334155 });
  bar.stroke({ color: style.border, width: 1 });
  label.position.set(cardWidth / 2, y + GOJS_COUNT_BAR_H / 2);

  const brand = style.brandColor ?? 0x2563eb;
  const r = 8;
  const cx = cardWidth - 10;
  const cy = y + GOJS_COUNT_BAR_H / 2;
  expander.circle(cx, cy, r);
  expander.fill({ color: brand });
}
