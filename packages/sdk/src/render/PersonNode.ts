import { Container, Graphics, Sprite, Text, type FederatedPointerEvent, type Texture } from 'pixi.js';
import type { DiagramPerson, DiagramPosition } from '../data/types.js';
import type { LodLevel } from './lod.js';
import { loadNodeTexture, type NodeTextureLoader } from '../media/nodeMedia.js';
import { avatarColorFromName } from './personInitials.js';
import { formatOrgPeriodLabel } from './formatPeriodLabel.js';
import {
  estimateTextWidth,
  formatPositionCountsBadge,
  VACANT_POSITION_LABEL,
} from './orgCardChrome.js';
import type { PersonNodeStyle } from './types.js';
import {
  attachMenuButton,
  attachIconButton,
  activateChromePointer,
  hitChromePointer,
  type ContextMenuPointer,
} from './nodeCardChrome.js';
import {
  avatarForLayout,
  figmaRowAvatar,
  FIGMA_ROW_AVATAR_RADIUS,
  FIGMA_ROW_AVATAR_SIZE,
  gojsRowAvatar,
  resolveGojsRowLayoutMetrics,
  resolvePersonLayout,
} from './personLayout.js';
import { personVisualLocalRect } from './personVisualGeometry.js';
import {
  layoutCompactContent,
  layoutFigmaRowContent,
  layoutGojsPortraitContent,
  layoutGojsRowContent,
  layoutPeriodChip,
  type GojsRowLayout,
  type PersonCardParts,
} from './personCardContent.js';
import { roundedRectRing, strokeDashedRing } from './dashedStroke.js';

/** Prefer ThemedMedia, then legacy photoUrl (T74). */
export function resolvePersonPhotoUrl(person: DiagramPerson | undefined): string | undefined {
  if (!person) return undefined;
  return (
    person.media?.fallback?.trim() ||
    person.media?.byTheme?.light?.trim() ||
    person.media?.byTheme?.dark?.trim() ||
    person.photoUrl?.trim() ||
    undefined
  );
}

export interface PersonNodeExpandChrome {
  expanded: boolean;
  hasChildren: boolean;
  onToggle: () => void;
}

export interface PersonNodeOptions {
  onContextMenu?: (pointer: ContextMenuPointer) => void;
  /** Position subtree expand (T66) — shown when hasChildren. */
  expand?: PersonNodeExpandChrome;
  /** T74: diagram media loader; falls back to module `loadNodeTexture`. */
  loadTexture?: NodeTextureLoader;
}

export class PersonNodeView extends Container {
  private readonly shadow = new Graphics();
  private readonly card = new Graphics();
  private readonly avatarTile = new Graphics();
  private readonly hoverRing = new Graphics();
  private readonly chromeControls = new Container();
  private readonly nameText: Text;
  private readonly titleText: Text;
  private readonly initialsText: Text;
  private readonly badge: Graphics;
  private readonly badgeLabel: Text;
  private readonly periodChip = new Graphics();
  private readonly periodChipLabel: Text;
  private readonly timelineDot = new Graphics();
  private readonly pendingMarker = new Graphics();
  private readonly pendingLabel: Text;
  private readonly countBar = new Graphics();
  private readonly countBarLabel: Text;
  private readonly countExpander = new Graphics();
  private readonly photoSprite = new Sprite();
  private readonly photoMask = new Graphics();
  readonly lod: LodLevel;
  readonly mediaReady: Promise<void>;
  readonly avatarFill: number;

  private gojsLayout: GojsRowLayout | null = null;
  /** The display objects the content layouts write into. */
  private readonly parts: PersonCardParts;
  private expandToggle: (() => void) | undefined;
  private loadTexture: NodeTextureLoader = loadNodeTexture;
  private mediaRevision: string | number | undefined;
  private photoUrl: string | undefined;
  private styleRef: PersonNodeStyle | null = null;

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
      style: { fill: 0xffffff, fontSize: 14, fontWeight: '600' },
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
        fontSize: style.periodChipFontSize ?? 12,
        fontWeight: '500',
        fontFamily: 'JetBrains Mono, monospace',
      },
    });
    this.countBarLabel = new Text({
      text: '',
      style: {
        fill: style.countBarTextColor ?? style.titleColor,
        fontSize: style.countBarFontSize ?? 11,
        fontWeight: '500',
        fontFamily: 'JetBrains Mono, monospace',
      },
    });
    this.pendingLabel = new Text({
      text: '⏳',
      style: { fontSize: 9 },
    });
    this.pendingLabel.visible = false;

    this.photoSprite.visible = false;
    this.photoMask.visible = false;
    this.hoverRing.visible = false;
    this.periodChip.visible = false;
    this.periodChipLabel.visible = false;
    this.timelineDot.visible = false;
    this.pendingMarker.visible = false;
    this.countBar.visible = false;
    this.countBarLabel.visible = false;
    this.countExpander.visible = false;
    this.avatarTile.visible = false;
    this.chromeControls.eventMode = 'static';
    this.chromeControls.sortableChildren = true;
    this.chromeControls.zIndex = 10;
    this.sortableChildren = true;
    this.addChild(
      this.shadow,
      this.countBar,
      this.countBarLabel,
      this.countExpander,
      this.card,
      this.avatarTile,
      this.photoSprite,
      this.photoMask,
      this.initialsText,
      this.periodChip,
      this.timelineDot,
      this.periodChipLabel,
      this.nameText,
      this.titleText,
      this.pendingMarker,
      this.pendingLabel,
      this.badge,
      this.badgeLabel,
      this.hoverRing,
      this.chromeControls,
    );

    this.parts = {
      nameText: this.nameText,
      titleText: this.titleText,
      initialsText: this.initialsText,
      periodChip: this.periodChip,
      periodChipLabel: this.periodChipLabel,
      timelineDot: this.timelineDot,
      pendingMarker: this.pendingMarker,
      pendingLabel: this.pendingLabel,
      countBar: this.countBar,
      countBarLabel: this.countBarLabel,
      countExpander: this.countExpander,
    };

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
    view.loadTexture = options.loadTexture ?? loadNodeTexture;
    view.mediaRevision = person?.media?.revision;
    view.photoUrl = resolvePersonPhotoUrl(person);
    view.styleRef = style;
    view.expandToggle = options.expand?.hasChildren ? options.expand.onToggle : undefined;
    view.updateContent(person, position, style, lod, options);
    view.applyChrome(style, lod, options);
    void view.applyPhoto(view.photoUrl, style, lod).finally(resolveMedia);
    return view;
  }

  /** Bound photo URL for MediaService invalidate matching (T74). */
  get resolvedPhotoUrl(): string | undefined {
    return this.photoUrl;
  }

  /** T74 M1: re-fetch photo after invalidate (point update). */
  reloadMedia(): Promise<void> {
    if (!this.styleRef) return Promise.resolve();
    return this.applyPhoto(this.photoUrl, this.styleRef, this.lod);
  }

  hasMenuButton(): boolean {
    return this.chromeControls.children.some((c) => c.label === 'person-menu');
  }

  hasExpandButton(): boolean {
    return (
      this.chromeControls.children.some((c) => c.label === 'person-expand') ||
      this.countExpander.visible
    );
  }

  hasCountBar(): boolean {
    return this.countBar.visible;
  }

  hasPendingMarker(): boolean {
    return this.pendingMarker.visible;
  }

  activateChromePointer(e: FederatedPointerEvent): boolean {
    if (this.chromeControls.children.length === 0) return false;
    return activateChromePointer(this.chromeControls, e);
  }

  isChromePointer(e: FederatedPointerEvent): boolean {
    return hitChromePointer(this.chromeControls, e);
  }

  private applyChrome(
    style: PersonNodeStyle,
    lod: LodLevel,
    options: PersonNodeOptions,
  ): void {
    this.chromeControls.removeChildren();
    if (lod === 'far') return;
    const layout = resolvePersonLayout(style);
    if (layout === 'gojs-row' || layout === 'figma-row') return;

    const visual = personVisualLocalRect(style.width, style.height, lod);
    let x = 4;
    if (options.onContextMenu) {
      const menu = attachMenuButton(this.chromeControls, style.width, visual.y + 4, options.onContextMenu, x);
      menu.label = 'person-menu';
      x += 28;
    }
    if (options.expand?.hasChildren) {
      const expand = attachIconButton(
        this.chromeControls,
        x,
        visual.y + 4,
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

  private resolveGojsRowLayout(position: DiagramPosition, style: PersonNodeStyle): GojsRowLayout {
    const metrics = resolveGojsRowLayoutMetrics(position, style);
    const timelineLabel = formatOrgPeriodLabel(position) ?? undefined;
    const countsLabel = formatPositionCountsBadge(position);
    return { ...metrics, timelineLabel, countsLabel };
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
    const layout = resolvePersonLayout(style);
    if (layout === 'gojs-row' && this.gojsLayout) {
      const { cardY, cardH, countBarH } = this.gojsLayout;
      const h = cardH + countBarH;
      this.hoverRing.roundRect(-2, cardY - 2, style.width + 4, h + 4, style.borderRadius + 2);
    } else {
      const visual = personVisualLocalRect(style.width, style.height, this.lod);
      this.hoverRing.roundRect(
        visual.x - 2,
        visual.y - 2,
        visual.width + 4,
        visual.height + 4,
        style.borderRadius + 2,
      );
    }
    this.hoverRing.stroke({ color: 0x2563eb, width: 2 });
    this.hoverRing.visible = true;
  }

  private drawCard(
    style: PersonNodeStyle,
    lod: LodLevel,
    position: DiagramPosition,
    cardY: number,
    cardH: number,
  ): void {
    const { width, borderRadius } = style;
    this.card.clear();
    this.shadow.clear();
    this.avatarTile.clear();

    if (lod === 'far') {
      const visual = personVisualLocalRect(width, style.height, 'far');
      const r = visual.width / 2;
      this.card.circle(visual.x + r, visual.y + r, r);
      this.card.fill({ color: this.avatarFill });
      this.card.stroke({ color: style.border, width: 1 });
      this.hitArea = hitAreaFromRect(visual);
      return;
    }

    const layout = resolvePersonLayout(style);
    const gojsRowNear = layout === 'gojs-row' && lod === 'near';
    if (!gojsRowNear) {
      const visual = personVisualLocalRect(width, style.height, lod);
      cardY = visual.y;
      cardH = visual.height;
    }

    let stroke = style.border;
    const detached = layout === 'gojs-row' && position.detached === true;
    if (layout === 'gojs-row') {
      if (position.isKeyPosition) stroke = style.brandColor ?? 0x2563eb;
      else if (detached) stroke = style.detachedBorderColor ?? style.titleColor;
    }

    const backgroundAlpha = style.backgroundAlpha ?? 1;
    if (backgroundAlpha > 0) {
      this.shadow.roundRect(2, cardY + 3, width, cardH, borderRadius);
      this.shadow.fill({ color: 0x0f172a, alpha: 0.1 });
      this.card.roundRect(0, cardY, width, cardH, borderRadius);
      this.card.fill({ color: style.background, alpha: backgroundAlpha });
      if (style.borderWidth > 0) {
        this.card.stroke({ color: stroke, width: style.borderWidth });
      }
    }
    if (detached) {
      this.strokeDashedRoundRect(0, cardY, width, cardH, stroke, style.borderWidth);
    }

    if (lod === 'near' && layout === 'gojs-row') {
      const avatar = gojsRowAvatar(style, cardY);
      const size = avatar.size ?? 28;
      const br = avatar.borderRadius ?? 6;
      const tileFill = style.avatarPlaceholderColor ?? style.border;
      this.avatarTile.roundRect(avatar.cx - size / 2, avatar.cy - size / 2, size, size, br);
      this.avatarTile.fill({ color: tileFill });
      this.avatarTile.visible = true;
    } else if (lod === 'near' && layout === 'figma-row') {
      // Figma seat: 40×40 rounded tile (bg/primary) instead of a photo circle.
      const avatar = figmaRowAvatar(style);
      const size = avatar.size ?? FIGMA_ROW_AVATAR_SIZE;
      const br = avatar.borderRadius ?? FIGMA_ROW_AVATAR_RADIUS;
      this.avatarTile.roundRect(avatar.cx - size / 2, avatar.cy - size / 2, size, size, br);
      this.avatarTile.fill({ color: style.avatarPlaceholderColor ?? this.avatarFill });
      this.avatarTile.visible = true;
    } else if (lod === 'near') {
      const avatar = avatarForLayout(layout, style, cardY);
      this.card.circle(avatar.cx, avatar.cy, avatar.r);
      this.card.fill({ color: this.avatarFill });
    }

    this.hitArea =
      gojsRowNear && this.gojsLayout
        ? hitAreaFromRect({
            x: 0,
            y: 0,
            width,
            height: this.gojsLayout.cardY + this.gojsLayout.cardH + this.gojsLayout.countBarH,
          })
        : hitAreaFromRect(personVisualLocalRect(width, style.height, lod));
  }

  /** Detached seat — [5,3] dashed overlay on card border. */
  /**
   * Vacant seats get a dashed border. Square corners on purpose — the dashes
   * are inset by half the stroke so they sit inside the card bounds, and the
   * card's own radius is drawn by the fill underneath.
   */
  private strokeDashedRoundRect(
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
    lineWidth: number,
  ): void {
    const inset = lineWidth / 2;
    const rect = { x: x + inset, y: y + inset, width: w - lineWidth, height: h - lineWidth };
    strokeDashedRing(this.card, roundedRectRing(rect, 0), 5, 3);
    this.card.stroke({ color, width: lineWidth });
  }

  private updateContent(
    person: DiagramPerson | undefined,
    position: DiagramPosition,
    style: PersonNodeStyle,
    lod: LodLevel,
    options: PersonNodeOptions = {},
  ): void {
    const layout = resolvePersonLayout(style);
    this.gojsLayout = layout === 'gojs-row' ? this.resolveGojsRowLayout(position, style) : null;

    if (lod === 'far') {
      this.nameText.visible = false;
      this.titleText.visible = false;
      this.initialsText.visible = false;
      this.badge.visible = false;
      this.badgeLabel.visible = false;
      this.periodChip.visible = false;
      this.periodChipLabel.visible = false;
      this.drawCard(style, lod, position, 0, style.height);
      return;
    }

    const vacant = position.status === 'vacant';
    const gojsRowNear = layout === 'gojs-row' && lod === 'near';
    let cardY = 0;
    let cardH = style.height;
    if (gojsRowNear) {
      cardY = this.gojsLayout?.cardY ?? 0;
      cardH = this.gojsLayout?.cardH ?? style.height;
    } else {
      const visual = personVisualLocalRect(style.width, style.height, lod);
      cardY = visual.y;
      cardH = visual.height;
    }

    this.drawCard(style, lod, position, cardY, cardH);

    const gojsRow = gojsRowNear;

    const hideVacantName = vacant && style.hideVacantLabel === true && !gojsRow;
    const name =
      vacant && gojsRow
        ? position.title
        : vacant
          ? VACANT_POSITION_LABEL
          : (person?.fullName ?? '—');

    let nameFill = style.permanentNameColor ?? style.nameColor;
    if (vacant && !gojsRow) {
      nameFill = style.vacantLabelColor ?? style.nameColor;
    } else if (vacant && gojsRow) {
      nameFill = style.titleColor;
    } else if (gojsRow && position.isKeyPosition) {
      nameFill = style.brandColor ?? style.nameColor;
    } else if (!gojsRow && position.isTemporary && style.temporaryNameColor !== undefined) {
      nameFill = style.temporaryNameColor;
    }

    this.nameText.visible = !hideVacantName;
    this.nameText.text = name;
    this.nameText.style.fontSize = style.nameFontSize;
    this.nameText.style.fontWeight = '600';
    this.nameText.style.fill = nameFill;
    this.nameText.anchor.set(0, 0);

    const content = { person, position, style, vacant };
    const pad = Math.max(6, style.width * 0.06);
    if (gojsRow) {
      layoutGojsRowContent(this.parts, {
        ...content,
        gojs: this.gojsLayout!,
        expand: options.expand,
      });
    } else if (layout === 'figma-row' && lod === 'near') {
      layoutFigmaRowContent(this.parts, content);
    } else if (layout === 'gojs-portrait' && lod === 'near') {
      layoutGojsPortraitContent(this.parts, { ...content, pad });
    } else {
      layoutCompactContent(this.parts, { ...content, lod, pad });
    }

    const hourglassTemp = style.tempMarkerStyle === 'hourglass';
    const showLegacyTempBadge = position.isTemporary && !gojsRow && !hourglassTemp;
    const showHourglass = position.isTemporary && hourglassTemp && this.nameText.visible;
    this.badge.visible = showLegacyTempBadge;
    this.badgeLabel.visible = showLegacyTempBadge || showHourglass;
    if (showLegacyTempBadge) {
      const br = Math.max(7, style.width * 0.06);
      this.badge.clear();
      this.badge.circle(style.width - br - 4, cardY + br + 4, br);
      this.badge.fill({ color: style.badgeColor });
      this.badgeLabel.text = 'T';
      this.badgeLabel.anchor.set(0.5);
      this.badgeLabel.style.fontSize = 9;
      this.badgeLabel.style.fill = style.badgeTextColor;
      this.badgeLabel.position.set(style.width - br - 4, cardY + br + 4);
    } else if (showHourglass) {
      // Figma seat: hourglass right after the person name (acting / temporary).
      this.badge.clear();
      this.badgeLabel.text = '⏳';
      this.badgeLabel.anchor.set(0, 0);
      this.badgeLabel.style.fontSize = style.nameFontSize;
      this.badgeLabel.style.fill = style.temporaryNameColor ?? style.nameColor;
      this.badgeLabel.position.set(
        this.nameText.position.x +
          estimateTextWidth(this.nameText.text, style.nameFontSize) +
          4,
        this.nameText.position.y,
      );
    }

    if (!gojsRow && style.hidePeriodOnCard !== true) {
      layoutPeriodChip(this.parts, { position, style, lod, pad, layout });
    } else if (!gojsRow) {
      this.periodChip.visible = false;
      this.periodChipLabel.visible = false;
    }
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

    const texture = await this.loadTexture(photoUrl, this.mediaRevision);
    if (!texture || this.destroyed) {
      this.hidePhoto();
      return;
    }
    if (photoUrl.startsWith('data:') && texture.width <= 2 && texture.height <= 2) {
      this.hidePhoto();
      return;
    }
    this.showPhoto(texture, style);
    this.initialsText.visible = false;
  }

  private showPhoto(texture: Texture, style: PersonNodeStyle): void {
    const layout = resolvePersonLayout(style);
    const cardY = layout === 'gojs-row' ? (this.gojsLayout?.cardY ?? 0) : 0;
    const avatar = avatarForLayout(layout, style, cardY);
    const size = layout === 'gojs-row' ? (avatar.size ?? 28) : avatar.r * 2;
    const br = layout === 'gojs-row' ? (avatar.borderRadius ?? 6) : avatar.r;

    this.photoSprite.texture = texture;
    this.photoSprite.width = size;
    this.photoSprite.height = size;
    if (layout === 'gojs-row') {
      this.photoSprite.anchor.set(0.5);
      this.photoSprite.position.set(avatar.cx, avatar.cy);
    } else {
      this.photoSprite.anchor.set(0.5);
      this.photoSprite.position.set(avatar.cx, avatar.cy);
    }
    this.photoSprite.visible = true;

    this.photoMask.clear();
    if (layout === 'gojs-row') {
      this.photoMask.roundRect(avatar.cx - size / 2, avatar.cy - size / 2, size, size, br);
    } else {
      this.photoMask.circle(avatar.cx, avatar.cy, avatar.r);
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

function hitAreaFromRect(rect: { x: number; y: number; width: number; height: number }) {
  return {
    contains: (x: number, y: number) =>
      x >= rect.x && y >= rect.y && x <= rect.x + rect.width && y <= rect.y + rect.height,
  };
}
