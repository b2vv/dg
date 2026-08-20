import { Container, Graphics, Text } from 'pixi.js';
import type { DiagramPerson, DiagramPosition } from '../data/types.js';
import type { PersonNodeStyle } from './types.js';

export class PersonNodeView extends Container {
  private readonly card = new Graphics();
  private readonly nameText: Text;
  private readonly titleText: Text;
  private readonly badge: Graphics;
  private readonly badgeLabel: Text;

  private constructor(style: PersonNodeStyle) {
    super();
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
  ): PersonNodeView {
    const view = new PersonNodeView(style);
    view.drawCard(style);
    view.updateContent(person, position, style);
    return view;
  }

  findText(text: string): Text | undefined {
    for (const child of this.children) {
      if (child instanceof Text && child.text === text) return child;
    }
    return undefined;
  }

  hasTempBadge(): boolean {
    return this.badge.visible;
  }

  private drawCard(style: PersonNodeStyle): void {
    const { width, height, borderRadius } = style;
    this.card.clear();
    this.card.roundRect(0, 0, width, height, borderRadius);
    this.card.fill({ color: style.background });
    this.card.stroke({ color: style.border, width: style.borderWidth });

    this.card.circle(width / 2, 36, 24);
    this.card.fill({ color: style.avatarColor });

    this.hitArea = { contains: (x, y) => x >= 0 && y >= 0 && x <= width && y <= height };
  }

  private updateContent(
    person: DiagramPerson | undefined,
    position: DiagramPosition,
    style: PersonNodeStyle,
  ): void {
    const name = person?.fullName ?? '—';
    this.nameText.text = name;
    this.titleText.text = position.title;

    this.nameText.position.set(8, 68);
    this.titleText.position.set(8, 88);

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
