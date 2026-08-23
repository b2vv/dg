import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type { DiagramPerson, DiagramPosition } from '../data/types.js';
import type { LodLevel } from './lod.js';
import { loadNodeTexture } from './nodeMedia.js';
import { avatarColorFromName, personInitials } from './personInitials.js';
import { formatOrgPeriodLabel } from './formatPeriodLabel.js';
import { VACANT_POSITION_LABEL } from './orgCardChrome.js';
import type { PersonNodeStyle } from './types.js';
import { attachMenuButton, attachIconButton, activateChromePointer, hitChromePointer, type ContextMenuPointer } from './nodeCardChrome.js';
import type { FederatedPointerEvent } from 'pixi.js';
import {
  avatarForLayout,
  figmaRowAvatar,
  figmaRowTextX,
  gojsRowAvatar,
  gojsRowTextX,
  gojsPortraitAvatar,
  resolvePersonLayout,
  type ResolvedPersonLayout,
} from './personLayout.js';
import {
  GOJS_ROW_PAD,
  gojsRowAvatarRect,
  gojsRowTextX as gojsRowTextXRect,
  layoutGojsCountBar,
  layoutGojsTimeline,
  paintAvatarTile,
  paintGojsCountBar,
  paintGojsTimelineChip,
  paintPendingHourglass,
  paintGojsRowCard,
} from './personGojsRow.js';

export interface PersonNodeExpandChrome {
  expanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
}

export interface PersonNodeOptions {
  onContextMenu?: (pointer: ContextMenuPointer) => void;
  /** Position subtree expand (T66) — shown when hasChildren. */
  expand?: PersonNodeExpandChrome;
}

export class PersonNodeView extends Container {
  private readonly shadow = new Graphics();
  private readonly card = new Graphics();
  private readonly hoverRing = new Graphics();
  private readonly chromeControls = new Container();
  private readonly nameText: Text;
  private readonly titleText: Text;
  private readonly initialsText: Text;
  private readonly badge: Graphics;
  private readonly badgeLabel: Text;
  private readonly periodChip = new Graphics();
  private readonly periodChipLabel: Text;
  private readonly avatarTile = new Graphics();
  private readonly timelineChip = new Graphics();
  private readonly timelineDot = new Graphics();
  private readonly timelineLabel: Text;
  private readonly countBar = new Graphics();
  private readonly countBarLabel: Text;
  private readonly countExpander = new Graphics();
  private readonly pendingHourglass = new Graphics();
  private readonly photoSprite = new Sprite();
  private readonly photoMask = new Graphics();
  readonly lod: LodLevel;
  /** Settles when optional photo load finishes (or immediately if none). */
  readonly mediaReady: Promise<void>;
  /** Resolved avatar disc fill (hashed from name when present). */
  readonly avatarFill: number;

  private constructor(
    style: PersonNodeStyle,
    lod: LodLevel,
    mediaReady: Promise<void>,
    avatarFill: number,
  ) {
    super();
    this.lod = lod;
    this.mediaReady = mediaReady;
    this.avatarFill = avatarFill;
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.nameText = new Text({ text: '', style: { fill: style.nameColor, fontSize: style.nameFontSize } });
    this.titleText = new Text({
      text: '',
      style: { fill: style.titleColor, fontSize: style.titleFontSize },
    });
    this.initialsText = new Text({
      text: '',
      style: {
        fill: 0xffffff,
        fontSize: 14,
        fontWeight: '600',
      },
    });
    this.initialsText.anchor.set(0.5);
    this.badge = new Graphics();
    this.badgeLabel = new Text({
      text: 'T',
      style: { fill: style.badgeTextColor, fontSize: 9, fontWeight: '700' },
    });
    this.periodChipLabel = new Text({
      text: '',
      style: {
        fill: style.periodChipTextColor ?? 0x15803d,
        fontSize: style.periodChipFontSize ?? 9,
        fontWeight: '600',
      },
    });
    this.timelineLabel = new Text({
      text: '',
      style: {
        fill: style.timelineTextColor ?? style.titleColor,
        fontSize: style.timelineFontSize ?? 12,
        fontWeight: '500',
        fontFamily: 'JetBrains Mono, monospace',
      },
    });
    this.countBarLabel = new Text({
      text: '',
      style: {
        fill: style.countsBadgeTextColor ?? style.titleColor,
        fontSize: style.countsBadgeFontSize ?? 11,
        fontWeight: '500',
        fontFamily: 'JetBrains Mono, monospace',
      },
    });

    this.photoSprite.visible = false;
    this.photoMask.visible = false;
    this.avatarTile.visible = false;
    this.timelineChip.visible = false;
    this.timelineDot.visible = false;
    this.timelineLabel.visible = false;
    this.countBar.visible = false;
    this.countBarLabel.visible = false;
    this.countExpander.visible = false;
    this.pendingHourglass.visible = false;
    this.hoverRing.visible = false;
    this.periodChip.visible = false;
    this.periodChipLabel.visible = false;
    this.chromeControls.eventMode = 'static';
    this.chromeControls.sortableChildren = true;
    this.chromeControls.zIndex = 10;
    this.sortableChildren = true;
    this.addChild(
      this.shadow,
      this.card,
      this.avatarTile,
      this.photoSprite,
      this.photoMask,
      this.initialsText,
      this.nameText,
      this.titleText,
      this.timelineChip,
      this.timelineDot,
      this.timelineLabel,
      this.countBar,
      this.countBarLabel,
      this.countExpander,
      this.pendingHourglass,
      this.periodChip,
      this.periodChipLabel,
      this.badge,
      this.badgeLabel,
      this.hoverRing,
      this.chromeControls,
    );

    this.on('pointerover', () => this.setHovered(true, style));
    this.on('pointerout', () => this.setHovered(false, style));
  }

  static create(
    person: DiagramPerson | undefined,
    position: DiagramPosition,
    style: PersonNodeStyle,
    lod: LodLevel = 'near',
    options: PersonNodeOptions = {},
  ): PersonNodeView {
    let resolveMedia!: () => void;
    const mediaReady = new Promise<void>((resolve) => {
      resolveMedia = resolve;
    });
    const avatarFill = avatarColorFromName(person?.fullName);
    const view = new PersonNodeView(style, lod, mediaReady, avatarFill);
    view.drawCard(style, lod);
    view.updateContent(person, position, style, lod, options);
    view.applyChrome(style, lod, options);
    void view.applyPhoto(person?.photoUrl, style, lod).finally(resolveMedia);
    return view;
  }

  hasMenuButton(): boolean {
    return this.chromeControls.children.some((c) => c.label === 'person-menu');
  }

  hasExpandButton(): boolean {
    return this.chromeControls.children.some((c) => c.label === 'person-expand');
  }

  activateChromePointer(e: FederatedPointerEvent): boolean {
    if (this.chromeControls.children.length === 0) return false;
    return activateChromePointer(this.chromeControls, e);
  }

  isChromePointer(e: FederatedPointerEvent): boolean {
    return hitChromePointer(this.chromeControls, e);
  }

  hasCountBar(): boolean {
    return this.countBar.visible;
  }

  hasTimelineChip(): boolean {
    return this.timelineChip.visible;
  }

  hasPendingHourglass(): boolean {
    return this.pendingHourglass.visible;
  }

  private applyChrome(
    style: PersonNodeStyle,
    lod: LodLevel,
    options: PersonNodeOptions,
  ): void {
    this.chromeControls.removeChildren();
    if (lod === 'far') return;
    const layout = resolvePersonLayout(style);
    if (layout === 'gojs-row') {
      // GoJS: context menu via right-click; expand lives in count bar.
      return;
    }
    const h = lod === 'mid' ? Math.min(style.height, Math.max(56, style.height * 0.48)) : style.height;
    const y0 = lod === 'mid' ? (style.height - h) / 2 : 0;
    let x = 4;
    if (options.onContextMenu) {
      const menu = attachMenuButton(this.chromeControls, style.width, y0 + 4, options.onContextMenu, x);
      menu.label = 'person-menu';
      x += 28;
    }
    if (options.expand?.hasChildren) {
      const expand = attachIconButton(
        this.chromeControls,
        x,
        y0 + 4,
        options.expand.expanded ? '▲' : '▼',
        options.expand.expanded ? 'Collapse reports' : 'Expand reports',
        options.expand.onToggle,
      );
      expand.label = 'person-expand';
    }
  }

  findText(text: string): Text | undefined {
    for (const child of this.children) {
      if (child instanceof Text && child.visible && child.text === text) return child;
    }
    return undefined;
  }

  hasTempBadge(): boolean {
    return this.badge.visible;
  }

  hasPeriodChip(): boolean {
    return this.periodChip.visible;
  }

  hasPhotoSprite(): boolean {
    return this.photoSprite.visible;
  }

  hasInitials(): boolean {
    return this.initialsText.visible && this.initialsText.text.length > 0;
  }

  private setHovered(on: boolean, style: PersonNodeStyle): void {
    if (this.lod === 'far') {
      this.hoverRing.visible = false;
      return;
    }
    this.hoverRing.clear();
    if (!on) {
      this.hoverRing.visible = false;
      return;
    }
    const h = this.lod === 'mid' ? Math.min(style.height, Math.max(56, style.height * 0.48)) : style.height;
    const y0 = this.lod === 'mid' ? (style.height - h) / 2 : 0;
    this.hoverRing.roundRect(-2, y0 - 2, style.width + 4, h + 4, style.borderRadius + 2);
    this.hoverRing.stroke({ color: 0x2563eb, width: 2 });
    this.hoverRing.visible = true;
  }

  private drawCard(style: PersonNodeStyle, lod: LodLevel): void {
    const { width, height, borderRadius } = style;
    const layout = resolvePersonLayout(style);
    this.card.clear();
    this.shadow.clear();
    this.avatarTile.visible = false;

    if (lod === 'far') {
      const r = Math.max(6, Math.min(width, height) * 0.18);
      this.card.circle(width / 2, height / 2, r);
      this.card.fill({ color: this.avatarFill });
      this.card.stroke({ color: style.border, width: 1 });
      this.hitArea = { contains: (x, y) => x >= 0 && y >= 0 && x <= width && y <= height };
      return;
    }

    const h = lod === 'mid' ? Math.min(height, Math.max(56, height * 0.48)) : height;
    const y0 = lod === 'mid' ? (height - h) / 2 : 0;
    this.shadow.roundRect(2, y0 + 3, width, h, borderRadius);
    this.shadow.fill({ color: 0x0f172a, alpha: 0.1 });

    if (layout === 'gojs-row' && lod === 'near') {
      this.card.roundRect(0, y0, width, h, borderRadius);
      this.card.fill({ color: style.background });
      // Stroke applied in updateContent (brand / detached).
    } else {
      this.card.roundRect(0, y0, width, h, borderRadius);
      this.card.fill({ color: style.background });
      this.card.stroke({ color: style.border, width: style.borderWidth });
    }

    if (lod === 'near' && layout !== 'gojs-row') {
      const avatar = avatarForLayout(layout, style);
      this.card.circle(avatar.cx, avatar.cy, avatar.r);
      this.card.fill({ color: this.avatarFill });
    }

    this.hitArea = {
      contains: (x, y) => x >= 0 && y >= y0 && x <= width && y <= y0 + h,
    };
  }

  private updateContent(
    person: DiagramPerson | undefined,
    position: DiagramPosition,
    style: PersonNodeStyle,
    lod: LodLevel,
    options: PersonNodeOptions = {},
  ): void {
    if (lod === 'far') {
      this.nameText.visible = false;
      this.titleText.visible = false;
      this.initialsText.visible = false;
      this.badge.visible = false;
      this.badgeLabel.visible = false;
      this.periodChip.visible = false;
      this.periodChipLabel.visible = false;
      return;
    }

    const layout = resolvePersonLayout(style);
    const row = (layout === 'figma-row' || layout === 'gojs-row') && lod === 'near';
    const pad = Math.max(6, style.width * 0.06);
    const vacant = position.status === 'vacant';
    const name =
      vacant && layout === 'gojs-row'
        ? position.title
        : vacant
          ? VACANT_POSITION_LABEL
          : (person?.fullName ?? '—');
    const nameFill =
      vacant && layout !== 'gojs-row'
        ? (style.vacantLabelColor ?? style.nameColor)
        : vacant
          ? style.titleColor
          : layout === 'gojs-row' && position.isKeyPosition
            ? (style.keyPositionNameColor ?? style.brandColor ?? style.nameColor)
            : position.isTemporary && layout !== 'gojs-row' && style.temporaryNameColor !== undefined
              ? style.temporaryNameColor
              : (style.permanentNameColor ?? style.nameColor);

    this.nameText.visible = true;
    this.nameText.text = name;
    this.nameText.style.fontSize = style.nameFontSize;
    this.nameText.style.fontWeight = layout === 'figma-row' ? '600' : '600';
    this.nameText.style.fill = nameFill;
    this.nameText.anchor.set(0, 0);

    if (row && layout === 'figma-row') {
      this.layoutFigmaRowContent(person, position, style, vacant, nameFill);
    } else if (row && layout === 'gojs-row') {
      this.layoutGojsRowContent(person, position, style, vacant, nameFill);
    } else if (layout === 'gojs-portrait' && lod === 'near') {
      this.layoutGojsPortraitContent(person, position, style, pad, vacant);
    } else {
      this.layoutCompactContent(person, position, style, lod, pad, vacant);
    }

    const showBadge = position.isTemporary && layout !== 'gojs-row';
    this.badge.visible = showBadge;
    this.badgeLabel.visible = showBadge;
    if (showBadge) {
      const br = Math.max(7, style.width * 0.06);
      this.badge.clear();
      this.badge.circle(style.width - br - 4, br + 4, br);
      this.badge.fill({ color: style.badgeColor });
      this.badgeLabel.text = 'T';
      this.badgeLabel.anchor.set(0.5);
      this.badgeLabel.position.set(style.width - br - 4, br + 4);
    }

    this.layoutPeriodChip(position, style, lod, pad, layout);
    if (layout === 'gojs-row' && lod === 'near') {
      this.layoutGojsRowChrome(position, style, options);
    }
  }

  /** GoJS row: timeline chip, count bar, pending hourglass, card stroke. */
  private layoutGojsRowChrome(
    position: DiagramPosition,
    style: PersonNodeStyle,
    options: PersonNodeOptions,
  ): void {
    const cardY = 0;
    const h = style.height;
    const brand = style.brandColor ?? 0x2563eb;
    const stroke =
      position.isKeyPosition
        ? brand
        : position.detached
          ? (style.detachedBorderColor ?? style.titleColor)
          : style.border;
    const dashed = !!position.detached && !position.isKeyPosition;
    paintGojsRowCard(
      this.card,
      0,
      cardY,
      style.width,
      h,
      style.borderRadius,
      style.background,
      stroke,
      style.borderWidth,
      dashed,
    );

    const avatar = gojsRowAvatarRect(style, cardY);
    const tileFill = style.avatarPlaceholderFill ?? style.avatarColor ?? 0x64748b;
    paintAvatarTile(this.avatarTile, avatar, tileFill);
    this.avatarTile.visible = true;

    const timeline = layoutGojsTimeline(position, style, this.timelineLabel);
    paintGojsTimelineChip(this.timelineChip, this.timelineDot, timeline, style);
    this.timelineChip.visible = timeline.visible;
    this.timelineDot.visible = timeline.visible;
    this.timelineLabel.visible = timeline.visible;
    if (timeline.visible) {
      this.timelineLabel.position.set(timeline.chipX + 8 + 7 + 6, timeline.chipY + timeline.chipH / 2);
    }

    const count = layoutGojsCountBar(position, style);
    paintGojsCountBar(this.countBar, this.countBarLabel, this.countExpander, count, style, style.width);
    this.countBar.visible = count.visible;
    this.countExpander.visible = count.visible;

    const showPending = position.pending === true;
    this.pendingHourglass.visible = showPending;
    if (showPending) {
      paintPendingHourglass(
        this.pendingHourglass,
        style.width - 15,
        cardY + 4,
        11,
        style.pendingColor ?? 0xf59e0b,
      );
    }

    if (count.visible && options.expand?.hasChildren) {
      this.countExpander.eventMode = 'static';
      this.countExpander.cursor = 'pointer';
      this.countExpander.removeAllListeners();
      this.countExpander.on('pointertap', (e) => {
        e.stopPropagation();
        options.expand!.onToggle();
      });
    }
  }

  /** GoJS row: name above title, left text column, 28px rounded-square avatar. */
  private layoutGojsRowContent(
    person: DiagramPerson | undefined,
    position: DiagramPosition,
    style: PersonNodeStyle,
    vacant: boolean,
    _nameFill: number,
  ): void {
    const avatar = gojsRowAvatarRect(style, 0);
    const textX = gojsRowTextXRect(avatar);
    const pad = GOJS_ROW_PAD;
    const maxTextW = Math.max(24, style.width - textX - pad - (position.pending ? 14 : 0));

    truncatePixiText(this.nameText, maxTextW);
    this.nameText.position.set(textX, 12);

    this.titleText.visible = true;
    this.titleText.text = vacant ? VACANT_POSITION_LABEL : position.title;
    this.titleText.style.fontSize = style.titleFontSize;
    this.titleText.style.fontWeight = '400';
    this.titleText.style.fill = vacant
      ? (style.vacantLabelColor ?? style.titleColor)
      : style.titleColor;
    this.titleText.anchor.set(0, 0);
    truncatePixiText(this.titleText, maxTextW);
    this.titleText.position.set(textX, 32);

    const initials = vacant ? '' : personInitials(person?.fullName);
    this.initialsText.text = initials;
    this.initialsText.style.fontSize = Math.max(10, avatar.size * 0.38);
    this.initialsText.position.set(avatar.cx, avatar.cy);
    this.initialsText.visible = initials.length > 0;
  }

  /** Figma row: title above name, left text column. */
  private layoutFigmaRowContent(
    person: DiagramPerson | undefined,
    position: DiagramPosition,
    style: PersonNodeStyle,
    vacant: boolean,
    _nameFill: number,
  ): void {
    const avatar = figmaRowAvatar(style);
    const textX = figmaRowTextX(avatar);
    const pad = Math.max(6, style.width * 0.06);
    const maxTextW = Math.max(24, style.width - textX - pad - (position.isTemporary ? 22 : 0));

    this.titleText.visible = true;
    this.titleText.text = position.title;
    this.titleText.style.fontSize = style.titleFontSize;
    this.titleText.style.fontWeight = '400';
    this.titleText.style.fill = style.titleColor;
    this.titleText.anchor.set(0, 0);
    truncatePixiText(this.titleText, maxTextW);
    this.titleText.position.set(textX, 14);

    truncatePixiText(this.nameText, maxTextW);
    this.nameText.position.set(textX, 34);

    const initials = vacant ? '' : personInitials(person?.fullName);
    this.initialsText.text = initials;
    this.initialsText.style.fontSize = Math.max(11, avatar.r * 0.65);
    this.initialsText.position.set(avatar.cx, avatar.cy);
    this.initialsText.visible = initials.length > 0;
  }

  /** GoJS portrait: centered photo, name + title stacked below period band. */
  private layoutGojsPortraitContent(
    person: DiagramPerson | undefined,
    position: DiagramPosition,
    style: PersonNodeStyle,
    pad: number,
    vacant: boolean,
  ): void {
    const maxTextW = Math.max(24, style.width - pad * 2);
    truncatePixiText(this.nameText, maxTextW);
    this.nameText.position.set(pad, 92);

    this.titleText.visible = true;
    this.titleText.text = position.title;
    this.titleText.style.fontSize = style.titleFontSize;
    this.titleText.style.fontWeight = '400';
    this.titleText.style.fill = style.titleColor;
    this.titleText.anchor.set(0, 0);
    truncatePixiText(this.titleText, maxTextW);
    this.titleText.position.set(pad, 112);

    const avatar = gojsPortraitAvatar(style);
    const initials = vacant ? '' : personInitials(person?.fullName);
    this.initialsText.text = initials;
    this.initialsText.style.fontSize = Math.max(12, avatar.r * 0.7);
    this.initialsText.position.set(avatar.cx, avatar.cy);
    this.initialsText.visible = initials.length > 0;

    if (vacant) {
      this.titleText.visible = true;
      this.titleText.text = VACANT_POSITION_LABEL;
      this.titleText.style.fill = style.vacantLabelColor ?? style.titleColor;
      truncatePixiText(this.titleText, maxTextW);
      this.titleText.position.set(pad, 112);
      this.nameText.anchor.set(0.5, 0);
      this.nameText.position.set(style.width / 2, 92);
    }
  }

  /** Mid/far compressed band — name (+ title for row). */
  private layoutCompactContent(
    person: DiagramPerson | undefined,
    position: DiagramPosition,
    style: PersonNodeStyle,
    lod: LodLevel,
    pad: number,
    vacant: boolean,
  ): void {
    const maxTextW = Math.max(24, style.width - pad * 2);
    truncatePixiText(this.nameText, maxTextW);
    if (lod === 'mid') {
      const h = Math.min(style.height, Math.max(56, style.height * 0.48));
      const y0 = (style.height - h) / 2;
      this.nameText.position.set(pad, y0 + h * 0.35);
      this.titleText.visible = false;
      this.initialsText.visible = false;
    } else {
      const layout = resolvePersonLayout(style);
      if (layout === 'figma-row' || layout === 'gojs-row') {
        this.titleText.visible = true;
        this.titleText.text = vacant ? VACANT_POSITION_LABEL : position.title;
        this.titleText.style.fontSize = style.titleFontSize;
        this.titleText.style.fill = style.titleColor;
        truncatePixiText(this.titleText, maxTextW);
        if (layout === 'figma-row') {
          this.titleText.position.set(pad, style.height * 0.22);
          this.nameText.position.set(pad, style.height * 0.52);
        } else {
          this.nameText.position.set(pad, style.height * 0.22);
          this.titleText.position.set(pad, style.height * 0.52);
        }
      } else {
        this.nameText.position.set(pad, style.height * 0.48);
        this.titleText.visible = true;
        this.titleText.text = position.title;
        this.titleText.style.fontSize = style.titleFontSize;
        this.titleText.style.fill = style.titleColor;
        truncatePixiText(this.titleText, maxTextW);
        this.titleText.position.set(pad, style.height * 0.64);
      }
      const initials = vacant ? '' : personInitials(person?.fullName);
      this.initialsText.text = initials;
      this.initialsText.style.fontSize = Math.max(11, Math.min(style.width, style.height) * 0.09);
      const avatar = avatarForLayout(layout, style);
      this.initialsText.position.set(avatar.cx, avatar.cy);
      this.initialsText.visible = initials.length > 0;
    }
  }

  /** E7: position period chip (shared formatter; not T68 org period line). */
  private layoutPeriodChip(
    position: DiagramPosition,
    style: PersonNodeStyle,
    lod: LodLevel,
    pad: number,
    layout: ResolvedPersonLayout,
  ): void {
    const label = formatOrgPeriodLabel(position);
    const show = !!label;
    this.periodChip.visible = show;
    this.periodChipLabel.visible = show;
    if (!show || !label) return;

    const fs = style.periodChipFontSize ?? 9;
    this.periodChipLabel.text = label;
    this.periodChipLabel.style.fontSize = fs;
    this.periodChipLabel.style.fill = style.periodChipTextColor ?? 0x15803d;
    this.periodChipLabel.anchor.set(0.5);

    const maxChipW = Math.max(40, style.width - pad * 2);
    truncatePixiText(this.periodChipLabel, maxChipW - 10);
    const chipText = this.periodChipLabel.text;
    const estW = Math.min(maxChipW, Math.max(36, chipText.length * fs * 0.55 + 10));
    const estH = fs + 4;

    let cx: number;
    let cy: number;
    if (layout === 'figma-row' && lod === 'near') {
      cx = style.width - estW / 2 - (position.isTemporary ? 26 : 8);
      cy = 6 + estH / 2;
    } else if (layout === 'gojs-row' && lod === 'near') {
      // Timeline chip replaces centered period chip on GoJS row seats.
      this.periodChip.visible = false;
      this.periodChipLabel.visible = false;
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
    this.periodChip.clear();
    this.periodChip.roundRect(bx, by, estW, estH, 4);
    this.periodChip.fill({ color: style.periodChipBackground ?? 0xdcfce7 });
    this.periodChipLabel.position.set(cx, cy);
  }

  private async applyPhoto(
    photoUrl: string | undefined,
    style: PersonNodeStyle,
    lod: LodLevel,
  ): Promise<void> {
    if (lod !== 'near' || !photoUrl?.trim()) {
      this.hidePhoto();
      return;
    }

    const texture = await loadNodeTexture(photoUrl);
    if (!texture || this.destroyed) {
      this.hidePhoto();
      return;
    }
    // Demo 1×1 data-URI placeholders stretch into solid color blobs — keep initials.
    if (
      photoUrl.startsWith('data:') &&
      texture.width <= 2 &&
      texture.height <= 2
    ) {
      this.hidePhoto();
      return;
    }
    this.showPhoto(texture, style);
    this.initialsText.visible = false;
  }

  private showPhoto(texture: Texture, style: PersonNodeStyle): void {
    const layout = resolvePersonLayout(style);
    const avatar = avatarForLayout(layout, style);
    const { cx, cy, r } = avatar;
    const size = r * 2;

    this.photoSprite.texture = texture;
    this.photoSprite.width = size;
    this.photoSprite.height = size;
    this.photoSprite.anchor.set(0.5);
    this.photoSprite.position.set(cx, cy);
    this.photoSprite.visible = true;

    this.photoMask.clear();
    if (layout === 'gojs-row') {
      const rect = gojsRowAvatarRect(style, 0);
      this.photoMask.roundRect(rect.x, rect.y, rect.size, rect.size, rect.radius);
      this.photoSprite.width = rect.size;
      this.photoSprite.height = rect.size;
      this.photoSprite.position.set(rect.cx, rect.cy);
    } else {
      this.photoMask.circle(cx, cy, r);
    }
    this.photoMask.fill({ color: 0xffffff });
    this.photoMask.visible = true;
    this.photoSprite.mask = this.photoMask;
  }

  private hidePhoto(): void {
    this.photoSprite.visible = false;
    this.photoSprite.mask = null;
    this.photoMask.visible = false;
  }
}

function truncatePixiText(label: Text, maxWidth: number): void {
  const raw = label.text;
  if (!raw) return;
  const fontSize = Number(label.style.fontSize) || 12;
  // Avoid CanvasTextMetrics in unit tests / headless — estimate glyph width.
  const maxChars = Math.max(1, Math.floor(maxWidth / (fontSize * 0.58)));
  if (raw.length <= maxChars) return;
  label.text = `${raw.slice(0, Math.max(1, maxChars - 1))}…`;
}
