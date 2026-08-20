import { Container, Graphics, Text } from 'pixi.js';
import type { DiagramGroup, DiagramOrganization } from '../data/types.js';
import { getOrgSymbolUrl } from './theme.js';
import type { OrganizationNodeStyle } from './types.js';

export class OrganizationNodeView extends Container {
  readonly resolvedSymbolUrl: string | undefined;
  private readonly card = new Graphics();
  private readonly nameText: Text;
  private readonly groupText: Text;

  private constructor(
    org: DiagramOrganization,
    group: DiagramGroup | undefined,
    theme: 'light' | 'dark',
    style: OrganizationNodeStyle,
  ) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.resolvedSymbolUrl = getOrgSymbolUrl(org, theme);

    this.nameText = new Text({
      text: org.name,
      style: { fill: style.nameColor, fontSize: style.nameFontSize, fontWeight: '600' },
    });
    this.groupText = new Text({
      text: group?.name ?? '',
      style: { fill: style.groupColor, fontSize: style.groupFontSize },
    });

    this.addChild(this.card, this.nameText, this.groupText);
    this.drawCard(style);
    this.layoutTexts(style);
  }

  static create(
    org: DiagramOrganization,
    group: DiagramGroup | undefined,
    theme: 'light' | 'dark',
    style: OrganizationNodeStyle,
  ): OrganizationNodeView {
    return new OrganizationNodeView(org, group, theme, style);
  }

  findText(text: string): Text | undefined {
    for (const child of this.children) {
      if (child instanceof Text && child.text === text) return child;
    }
    return undefined;
  }

  private drawCard(style: OrganizationNodeStyle): void {
    const { width, height, borderRadius } = style;
    this.card.clear();
    this.card.roundRect(0, 0, width, height, borderRadius);
    this.card.fill({ color: style.background });
    this.card.stroke({ color: style.border, width: style.borderWidth });

    this.card.roundRect(8, (height - style.symbolSize) / 2, style.symbolSize, style.symbolSize, 6);
    this.card.fill({ color: 0xdbeafe });

    this.hitArea = { contains: (x, y) => x >= 0 && y >= 0 && x <= width && y <= height };
  }

  private layoutTexts(style: OrganizationNodeStyle): void {
    const textX = 8 + style.symbolSize + 10;
    this.nameText.position.set(textX, 14);
    this.groupText.position.set(textX, 38);
  }
}
