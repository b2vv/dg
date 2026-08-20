import { Container, Graphics, Text } from 'pixi.js';
import type { DiagramPerson, DiagramPosition } from '../data/types.js';
import type { LodLevel } from './lod.js';
import type { PersonNodeStyle } from './types.js';

export class PersonNodeView extends Container {
  private readonly card = new Graphics();
  private readonly nameText: Text;
  private readonly titleText: Text;
  private readonly badge: Graphics;
  private readonly badgeLabel: Text;
  readonly lod: LodLevel;

  private constructor(style: PersonNodeStyle, lod: LodLevel) {
    super();
    this.lod = lod;
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

    this.addChild(this.card, this.nameText, this.titleText, this.badge, this.badgeLabel);
  }

  static create(
    person: DiagramPerson | undefined,
    position: DiagramPosition,
    style: PersonNodeStyle,
    lod: LodLevel = 'near',
  ): PersonNodeView {
    const view = new PersonNodeView(style, lod);
    view.drawCard(style, lod);
    view.updateContent(person, position, style, lod);
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
}
