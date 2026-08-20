import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type { DiagramPerson, DiagramPosition } from '../data/types.js';
import type { LodLevel } from './lod.js';
import { loadNodeTexture } from './nodeMedia.js';
import type { PersonNodeStyle } from './types.js';

export class PersonNodeView extends Container {
  private readonly card = new Graphics();
  private readonly nameText: Text;
  private readonly titleText: Text;
  private readonly badge: Graphics;
  private readonly badgeLabel: Text;
  private readonly photoSprite = new Sprite();
  private readonly photoMask = new Graphics();
  readonly lod: LodLevel;
  /** Settles when optional photo load finishes (or immediately if none). */
  readonly mediaReady: Promise<void>;

  private constructor(style: PersonNodeStyle, lod: LodLevel, mediaReady: Promise<void>) {
    super();
    this.lod = lod;
    this.mediaReady = mediaReady;
    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.nameText = new Text({ text: '', style: { fill: style.nameColor, fontSize: style.nameFontSize } });
    this.titleText = new Text({
      text: '',
      style: { fill: style.titleColor, fontSize: style.titleFontSize },
    });
    this.badge = new Graphics();
    this.badgeLabel = new Text({
      text: 'T',
      style: { fill: style.badgeTextColor, fontSize: 9 },
    });

    this.photoSprite.visible = false;
    this.photoMask.visible = false;
    this.addChild(
      this.card,
      this.photoSprite,
      this.photoMask,
      this.nameText,
      this.titleText,
      this.badge,
      this.badgeLabel,
    );
  }

  static create(
    person: DiagramPerson | undefined,
    position: DiagramPosition,
    style: PersonNodeStyle,
    lod: LodLevel = 'near',
  ): PersonNodeView {
    let resolveMedia!: () => void;
    const mediaReady = new Promise<void>((resolve) => {
      resolveMedia = resolve;
    });
    const view = new PersonNodeView(style, lod, mediaReady);
    view.drawCard(style, lod);
    view.updateContent(person, position, style, lod);
    void view.applyPhoto(person?.photoUrl, style, lod).finally(resolveMedia);
    return view;
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

  private drawCard(style: PersonNodeStyle, lod: LodLevel): void {
    const { width, height, borderRadius } = style;
    this.card.clear();

    if (lod === 'far') {
      const r = 7;
      this.card.circle(width / 2, height / 2, r);
      this.card.fill({ color: style.avatarColor });
      this.card.stroke({ color: style.border, width: 1 });
      this.hitArea = { contains: (x, y) => x >= 0 && y >= 0 && x <= width && y <= height };
      return;
    }

    const h = lod === 'mid' ? Math.min(height, 72) : height;
    this.card.roundRect(0, 0, width, h, borderRadius);
    this.card.fill({ color: style.background });
    this.card.stroke({ color: style.border, width: style.borderWidth });

    if (lod === 'near') {
      this.card.circle(width / 2, 36, 24);
      this.card.fill({ color: style.avatarColor });
    }

    this.hitArea = { contains: (x, y) => x >= 0 && y >= 0 && x <= width && y <= h };
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
      this.badge.visible = false;
      this.badgeLabel.visible = false;
      return;
    }

    const name = person?.fullName ?? '—';
    this.nameText.visible = true;
    this.nameText.text = name;
    this.nameText.position.set(8, lod === 'mid' ? 12 : 68);

    if (lod === 'mid') {
      this.titleText.visible = false;
    } else {
      this.titleText.visible = true;
      this.titleText.text = position.title;
      this.titleText.position.set(8, 88);
    }

    const showBadge = position.isTemporary;
    this.badge.visible = showBadge;
    this.badgeLabel.visible = showBadge;
    if (showBadge) {
      this.badge.clear();
      this.badge.circle(style.width - 12, 12, 8);
      this.badge.fill({ color: style.badgeColor });
      this.badgeLabel.anchor.set(0.5);
      this.badgeLabel.position.set(style.width - 12, 12);
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
    this.showPhoto(texture, style);
  }

  private showPhoto(texture: Texture, style: PersonNodeStyle): void {
    const cx = style.width / 2;
    const cy = 36;
    const r = 24;
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
