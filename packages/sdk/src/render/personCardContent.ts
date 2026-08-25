import type { Graphics, Text } from 'pixi.js';
import type { DiagramPerson, DiagramPosition } from '../data/types.js';
import type { LodLevel } from './lod.js';
import { personInitials } from './personInitials.js';
import { formatOrgPeriodLabel } from './formatPeriodLabel.js';
import { VACANT_POSITION_LABEL } from './orgCardChrome.js';
import type { PersonNodeStyle } from './types.js';
import {
  avatarForLayout,
  figmaRowAvatar,
  figmaRowTextX,
  figmaRowTextRows,
  gojsRowAvatar,
  gojsRowTextX,
  gojsPortraitAvatar,
  resolvePersonLayout,
  type GojsRowLayoutMetrics,
  type ResolvedPersonLayout,
} from './personLayout.js';

/**
 * Text and chip placement inside a person card. Split out of `PersonNodeView`
 * because the four layout variants share nothing but the display objects they
 * write into — which is exactly {@link PersonCardParts}.
 */

/** The display objects a content layout may write to. */
export interface PersonCardParts {
  nameText: Text;
  titleText: Text;
  initialsText: Text;
  periodChip: Graphics;
  periodChipLabel: Text;
  timelineDot: Graphics;
  pendingMarker: Graphics;
  pendingLabel: Text;
  countBar: Graphics;
  countBarLabel: Text;
  countExpander: Graphics;
}

export interface PersonContentArgs {
  person: DiagramPerson | undefined;
  position: DiagramPosition;
  style: PersonNodeStyle;
  vacant: boolean;
}

/** Row metrics plus the two optional labels the GoJS row can carry. */
export interface GojsRowLayout extends GojsRowLayoutMetrics {
  timelineLabel?: string;
  countsLabel?: string;
}

/** Only what the count-bar expander needs — avoids importing PersonNodeView. */
export interface PersonExpandChrome {
  expanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
}

export interface GojsRowContentArgs extends PersonContentArgs {
  gojs: GojsRowLayout;
  expand?: PersonExpandChrome;
}

export interface PeriodChipArgs {
  position: DiagramPosition;
  style: PersonNodeStyle;
  lod: LodLevel;
  pad: number;
  layout: ResolvedPersonLayout;
}

/** Ellipsize in place — Pixi has no text overflow. */
export function truncatePixiText(label: Text, maxWidth: number): void {
  const raw = label.text;
  if (!raw) return;
  const fontSize = Number(label.style.fontSize) || 12;
  const maxChars = Math.max(1, Math.floor(maxWidth / (fontSize * 0.58)));
  if (raw.length <= maxChars) return;
  label.text = `${raw.slice(0, Math.max(1, maxChars - 1))}…`;
}

/** GoJS row: avatar left, name/title stacked, timeline chip and count bar. */
export function layoutGojsRowContent(parts: PersonCardParts, args: GojsRowContentArgs): void {
  const { person, position, style, vacant, gojs, expand } = args;
  const { cardY, timelineLabel } = gojs;
  const avatar = gojsRowAvatar(style, cardY);
  const textX = gojsRowTextX(avatar);
  const maxTextW = Math.max(24, style.width - textX - 12);

  truncatePixiText(parts.nameText, maxTextW);
  parts.nameText.position.set(textX, cardY + 12);

  parts.titleText.visible = true;
  parts.titleText.text = vacant ? VACANT_POSITION_LABEL : position.title;
  parts.titleText.style.fontSize = style.titleFontSize;
  parts.titleText.style.fontWeight = '400';
  parts.titleText.style.fill = vacant
    ? (style.vacantLabelColor ?? style.titleColor)
    : style.titleColor;
  parts.titleText.anchor.set(0, 0);
  truncatePixiText(parts.titleText, maxTextW);
  parts.titleText.position.set(textX, cardY + 32);

  const initials = vacant ? '' : personInitials(person?.fullName);
  parts.initialsText.text = initials;
  parts.initialsText.style.fontSize = Math.max(10, (avatar.size ?? 28) * 0.38);
  parts.initialsText.position.set(avatar.cx, avatar.cy);
  parts.initialsText.visible = initials.length > 0;

  paintTimelineChip(parts, { style, timelineH: gojs.timelineH, label: timelineLabel });
  paintPendingMarker(parts, { style, pending: position.pending === true, cardY });
  paintCountBar(parts, { style, gojs, expand });
}

interface TimelineChipArgs {
  style: PersonNodeStyle;
  timelineH: number;
  label?: string;
}

/** GoJS row: period chip with a status dot, above the card. */
function paintTimelineChip(parts: PersonCardParts, args: TimelineChipArgs): void {
  const { style, timelineH, label } = args;
  const show = !!label;
  parts.periodChip.visible = show;
  parts.periodChipLabel.visible = show;
  parts.timelineDot.visible = show;
  if (!show || !label) return;

  const fs = style.periodChipFontSize ?? 12;
  parts.periodChipLabel.text = label;
  parts.periodChipLabel.style.fontSize = fs;
  parts.periodChipLabel.style.fill = style.periodChipTextColor ?? style.titleColor;
  parts.periodChipLabel.anchor.set(0, 0.5);
  truncatePixiText(parts.periodChipLabel, style.width - 24);

  const padX = 8;
  const padY = 3;
  const dotR = 3.5;
  const textW = label.length * fs * 0.58;
  const chipW = padX * 2 + dotR * 2 + 6 + textW;
  const chipH = fs + padY * 2;
  const by = (timelineH - chipH) / 2;
  parts.periodChip.clear();
  parts.periodChip.roundRect(0, by, chipW, chipH, 4);
  parts.periodChip.fill({ color: style.periodChipBackground ?? 0x334155 });
  parts.periodChip.stroke({ color: style.border, width: 1 });
  parts.timelineDot.clear();
  parts.timelineDot.circle(padX + dotR, by + chipH / 2, dotR);
  parts.timelineDot.fill({ color: style.timelineDotColor ?? 0x4ade80 });
  parts.periodChipLabel.position.set(padX + dotR * 2 + 6, by + chipH / 2);
}

interface PendingMarkerArgs {
  style: PersonNodeStyle;
  pending: boolean;
  cardY: number;
}

/** Pending hourglass — top-right of card (distinct from isKeyPosition name). */
function paintPendingMarker(parts: PersonCardParts, args: PendingMarkerArgs): void {
  const { style, pending, cardY } = args;
  parts.pendingMarker.visible = pending;
  parts.pendingLabel.visible = pending;
  if (!pending) return;
  const sz = 11;
  const px = style.width - sz - 4;
  const py = cardY + 4;
  parts.pendingMarker.clear();
  parts.pendingMarker.roundRect(px, py, sz, sz, 2);
  parts.pendingMarker.fill({ color: style.pendingColor ?? 0xf59e0b, alpha: 0.15 });
  parts.pendingLabel.position.set(px + 1, py - 1);
}

interface CountBarArgs {
  style: PersonNodeStyle;
  gojs: GojsRowLayout;
  expand?: PersonExpandChrome;
}

/** Subordinate counts under the card; its expander only lives if there are children. */
function paintCountBar(parts: PersonCardParts, args: CountBarArgs): void {
  const { style, gojs, expand } = args;
  const { cardY, cardH, countBarH, countsLabel } = gojs;
  const show = !!countsLabel;
  parts.countBar.visible = show;
  parts.countBarLabel.visible = show;
  parts.countExpander.visible = show;
  if (!show || !countsLabel) return;

  const barY = cardY + cardH;
  parts.countBar.clear();
  parts.countBar.roundRect(0, barY, style.width, countBarH, 4);
  parts.countBar.fill({ color: style.countBarBackground ?? style.background });
  parts.countBar.stroke({ color: style.border, width: 1 });
  parts.countBarLabel.text = countsLabel;
  parts.countBarLabel.anchor.set(0.5);
  parts.countBarLabel.position.set(style.width / 2, barY + countBarH / 2);

  const exR = 8;
  const exCx = style.width - 10;
  const exCy = barY + countBarH / 2;
  parts.countExpander.clear();
  parts.countExpander.circle(exCx, exCy, exR);
  parts.countExpander.fill({ color: style.brandColor ?? 0x2563eb });
  if (!expand?.hasChildren) return;

  parts.countExpander.eventMode = 'static';
  parts.countExpander.cursor = 'pointer';
  parts.countExpander.hitArea = {
    contains: (x, y) => {
      const dx = x - exCx;
      const dy = y - exCy;
      return dx * dx + dy * dy <= exR * exR;
    },
  };
  parts.countExpander.removeAllListeners();
  parts.countExpander.on('pointerdown', (e) => e.stopPropagation());
  parts.countExpander.on('pointertap', (e) => {
    e.stopPropagation();
    expand.onToggle();
  });
}

export function layoutFigmaRowContent(parts: PersonCardParts, args: PersonContentArgs): void {
const { person, position, style, vacant } = args;
  const avatar = figmaRowAvatar(style);
  const textX = figmaRowTextX(avatar);
  const pad = Math.max(6, style.width * 0.06);
  const maxTextW = Math.max(24, style.width - textX - pad - (position.isTemporary ? 22 : 0));

  parts.titleText.visible = true;
  parts.titleText.text = position.title;
  parts.titleText.style.fontSize = style.titleFontSize;
  parts.titleText.style.fontWeight = '400';
  parts.titleText.style.fill = style.titleColor;
  parts.titleText.anchor.set(0, 0);
  truncatePixiText(parts.titleText, maxTextW);

  // Figma seat: title + name stack centered against the 40px avatar tile.
  const rows = figmaRowTextRows(style, parts.nameText.visible);
  parts.titleText.position.set(textX, rows.titleY);

  truncatePixiText(parts.nameText, maxTextW);
  parts.nameText.position.set(textX, rows.nameY);

  const initials = vacant ? '' : personInitials(person?.fullName);
  parts.initialsText.text = initials;
  parts.initialsText.style.fontSize = Math.max(11, avatar.r * 0.65);
  parts.initialsText.position.set(avatar.cx, avatar.cy);
  parts.initialsText.visible = initials.length > 0;
}

/** GoJS portrait card: photo on top, name and title beneath. */
export function layoutGojsPortraitContent(
parts: PersonCardParts,
args: PersonContentArgs & { pad: number },
): void {
const { person, position, style, vacant, pad } = args;
  const maxTextW = Math.max(24, style.width - pad * 2);
  truncatePixiText(parts.nameText, maxTextW);
  parts.nameText.position.set(pad, 92);

  parts.titleText.visible = true;
  parts.titleText.text = position.title;
  parts.titleText.style.fontSize = style.titleFontSize;
  parts.titleText.style.fontWeight = '400';
  parts.titleText.style.fill = style.titleColor;
  parts.titleText.anchor.set(0, 0);
  truncatePixiText(parts.titleText, maxTextW);
  parts.titleText.position.set(pad, 112);

  const avatar = gojsPortraitAvatar(style);
  const initials = vacant ? '' : personInitials(person?.fullName);
  parts.initialsText.text = initials;
  parts.initialsText.style.fontSize = Math.max(12, avatar.r * 0.7);
  parts.initialsText.position.set(avatar.cx, avatar.cy);
  parts.initialsText.visible = initials.length > 0;

  if (vacant) {
    parts.titleText.visible = true;
    parts.titleText.text = VACANT_POSITION_LABEL;
    parts.titleText.style.fill = style.vacantLabelColor ?? style.titleColor;
    truncatePixiText(parts.titleText, maxTextW);
    parts.titleText.position.set(pad, 112);
    parts.nameText.anchor.set(0.5, 0);
    parts.nameText.position.set(style.width / 2, 92);
  }
}

/** Everything else, including mid LOD: name (and title) on the bare card. */
export function layoutCompactContent(
parts: PersonCardParts,
args: PersonContentArgs & { lod: LodLevel; pad: number },
): void {
const { person, position, style, vacant, lod, pad } = args;
  const maxTextW = Math.max(24, style.width - pad * 2);
  truncatePixiText(parts.nameText, maxTextW);
  if (lod === 'mid') {
    const h = Math.min(style.height, Math.max(56, style.height * 0.48));
    const y0 = (style.height - h) / 2;
    parts.nameText.position.set(pad, y0 + h * 0.35);
    parts.titleText.visible = false;
    parts.initialsText.visible = false;
  } else {
    const layout = resolvePersonLayout(style);
    if (layout === 'figma-row' || layout === 'gojs-row') {
      parts.titleText.visible = true;
      parts.titleText.text = vacant ? VACANT_POSITION_LABEL : position.title;
      parts.titleText.style.fontSize = style.titleFontSize;
      parts.titleText.style.fill = style.titleColor;
      truncatePixiText(parts.titleText, maxTextW);
      if (layout === 'figma-row') {
        parts.titleText.position.set(pad, style.height * 0.22);
        parts.nameText.position.set(pad, style.height * 0.52);
      } else {
        parts.nameText.position.set(pad, style.height * 0.22);
        parts.titleText.position.set(pad, style.height * 0.52);
      }
    } else {
      parts.nameText.position.set(pad, style.height * 0.48);
      parts.titleText.visible = true;
      parts.titleText.text = position.title;
      parts.titleText.style.fontSize = style.titleFontSize;
      parts.titleText.style.fill = style.titleColor;
      truncatePixiText(parts.titleText, maxTextW);
      parts.titleText.position.set(pad, style.height * 0.64);
    }
    const initials = vacant ? '' : personInitials(person?.fullName);
    parts.initialsText.text = initials;
    parts.initialsText.style.fontSize = Math.max(11, Math.min(style.width, style.height) * 0.09);
    const avatar = avatarForLayout(layout, style);
    parts.initialsText.position.set(avatar.cx, avatar.cy);
    parts.initialsText.visible = initials.length > 0;
  }
}

/** Period chip («з 01.2024») — placement depends on layout and LOD. */
export function layoutPeriodChip(parts: PersonCardParts, args: PeriodChipArgs): void {
const { position, style, lod, pad, layout } = args;
  const label = formatOrgPeriodLabel(position);
  const show = !!label;
  parts.periodChip.visible = show;
  parts.periodChipLabel.visible = show;
  parts.timelineDot.visible = false;
  if (!show || !label) return;

  const fs = style.periodChipFontSize ?? 9;
  parts.periodChipLabel.text = label;
  parts.periodChipLabel.style.fontSize = fs;
  parts.periodChipLabel.style.fill = style.periodChipTextColor ?? 0x15803d;
  parts.periodChipLabel.anchor.set(0.5);

  const maxChipW = Math.max(40, style.width - pad * 2);
  truncatePixiText(parts.periodChipLabel, maxChipW - 10);
  const chipText = parts.periodChipLabel.text;
  const estW = Math.min(maxChipW, Math.max(36, chipText.length * fs * 0.55 + 10));
  const estH = fs + 4;

  let cx: number;
  let cy: number;
  if (layout === 'figma-row' && lod === 'near') {
    cx = style.width - estW / 2 - (position.isTemporary ? 26 : 8);
    cy = 6 + estH / 2;
  } else if (layout === 'gojs-row' && lod === 'near') {
    return;
  } else if (lod === 'mid') {
    const h = Math.min(style.height, Math.max(56, style.height * 0.48));
    const y0 = (style.height - h) / 2;
    cx = style.width / 2;
    cy = y0 + 10 + estH / 2;
  } else {
    cx = style.width / 2;
    cy = layout === 'figma-row' ? 6 + estH / 2 : style.height * 0.72;
  }

  const bx = cx - estW / 2;
  const by = cy - estH / 2;
  parts.periodChip.clear();
  parts.periodChip.roundRect(bx, by, estW, estH, 4);
  parts.periodChip.fill({ color: style.periodChipBackground ?? 0xdcfce7 });
  parts.periodChipLabel.position.set(cx, cy);
}
