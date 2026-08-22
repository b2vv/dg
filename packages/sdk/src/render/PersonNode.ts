import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type { DiagramPerson, DiagramPosition } from '../data/types.js';
import type { LodLevel } from './lod.js';
import { loadNodeTexture } from './nodeMedia.js';
import { avatarColorFromName, personInitials } from './personInitials.js';
import type { PersonNodeStyle } from './types.js';
import { attachMenuButton, attachIconButton, activateChromePointer, hitChromePointer, type ContextMenuPointer } from './nodeCardChrome.js';
import type { FederatedPointerEvent } from 'pixi.js';

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

    this.photoSprite.visible = false;
    this.photoMask.visible = false;
    this.hoverRing.visible = false;
    this.chromeControls.eventMode = 'static';
    this.chromeControls.sortableChildren = true;
    this.chromeControls.zIndex = 10;
    this.sortableChildren = true;
    this.addChild(
      this.shadow,
      this.card,
      this.photoSprite,
      this.photoMask,
      this.initialsText,
      this.nameText,
      this.titleText,
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
    view.updateContent(person, position, style, lod);
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

  private applyChrome(
    style: PersonNodeStyle,
    lod: LodLevel,
    options: PersonNodeOptions,
  ): void {
    this.chromeControls.removeChildren();
    if (lod === 'far') return;
    const h = lod === 'mid' ? Math.min(style.height, Math.max(56, style.height * 0.48)) : style.height;
    const y0 = lod === 'mid' ? (style.height - h) / 2 : 0;
    let x = 4;
    // Top-left ⋮ — keeps top-right free for temp (T) badge.
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
    this.card.clear();
    this.shadow.clear();

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
    this.card.roundRect(0, y0, width, h, borderRadius);
    this.card.fill({ color: style.background });
    this.card.stroke({ color: style.border, width: style.borderWidth });

    if (lod === 'near') {
      const r = Math.min(width, height) * 0.155;
      this.card.circle(width / 2, height * 0.26, r);
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
  ): void {
    if (lod === 'far') {
      this.nameText.visible = false;
      this.titleText.visible = false;
      this.initialsText.visible = false;
      this.badge.visible = false;
      this.badgeLabel.visible = false;
      return;
    }

    const pad = Math.max(6, style.width * 0.06);
    const maxTextW = Math.max(24, style.width - pad * 2);
    const name = person?.fullName ?? '—';
    this.nameText.visible = true;
    this.nameText.text = name;
    this.nameText.style.fontSize = style.nameFontSize;
    this.nameText.style.fill = style.nameColor;
    truncatePixiText(this.nameText, maxTextW);
    if (lod === 'mid') {
      const h = Math.min(style.height, Math.max(56, style.height * 0.48));
      const y0 = (style.height - h) / 2;
      this.nameText.position.set(pad, y0 + h * 0.35);
    } else {
      this.nameText.position.set(pad, style.height * 0.48);
    }

    if (lod === 'mid') {
      this.titleText.visible = false;
      this.initialsText.visible = false;
    } else {
      this.titleText.visible = true;
      this.titleText.text = position.title;
      this.titleText.style.fontSize = style.titleFontSize;
      this.titleText.style.fill = style.titleColor;
      truncatePixiText(this.titleText, maxTextW);
      this.titleText.position.set(pad, style.height * 0.64);

      const initials = personInitials(person?.fullName);
      this.initialsText.text = initials;
      this.initialsText.style.fontSize = Math.max(11, Math.min(style.width, style.height) * 0.09);
      this.initialsText.position.set(style.width / 2, style.height * 0.26);
      this.initialsText.visible = true;
    }

    const showBadge = position.isTemporary;
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
    const cx = style.width / 2;
    const cy = style.height * 0.26;
    const r = Math.min(style.width, style.height) * 0.155;
    const size = r * 2;

    this.photoSprite.texture = texture;
    this.photoSprite.width = size;
    this.photoSprite.height = size;
    this.photoSprite.anchor.set(0.5);
    this.photoSprite.position.set(cx, cy);
    this.photoSprite.visible = true;

    this.photoMask.clear();
    this.photoMask.circle(cx, cy, r);
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
