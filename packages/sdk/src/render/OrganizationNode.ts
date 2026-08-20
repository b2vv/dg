import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type { DiagramGroup, DiagramOrganization } from '../data/types.js';
import { loadNodeTexture } from './nodeMedia.js';
import { getOrgSymbolUrl } from './theme.js';
import type { LodLevel } from './lod.js';
import type { OrganizationNodeStyle } from './types.js';

export class OrganizationNodeView extends Container {
  readonly resolvedSymbolUrl: string | undefined;
  readonly lod: LodLevel;
  /** Settles when optional symbol load finishes (or immediately if none). */
  readonly mediaReady: Promise<void>;
  private readonly card = new Graphics();
  private readonly nameText: Text;
  private readonly groupText: Text;
  private readonly symbolSprite = new Sprite();

  private constructor(
    org: DiagramOrganization,
    group: DiagramGroup | undefined,
    theme: 'light' | 'dark',
    style: OrganizationNodeStyle,
    lod: LodLevel,
    mediaReady: Promise<void>,
  ) {
    super();
    this.lod = lod;
    this.mediaReady = mediaReady;
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

    this.symbolSprite.visible = false;
    this.addChild(this.card, this.symbolSprite, this.nameText, this.groupText);
    this.drawCard(style, lod);
    this.layoutTexts(style, lod);
  }

  static create(
    org: DiagramOrganization,
    group: DiagramGroup | undefined,
    theme: 'light' | 'dark',
    style: OrganizationNodeStyle,
    lod: LodLevel = 'near',
  ): OrganizationNodeView {
    let resolveMedia!: () => void;
    const mediaReady = new Promise<void>((resolve) => {
      resolveMedia = resolve;
    });
    const view = new OrganizationNodeView(org, group, theme, style, lod, mediaReady);
    void view.applySymbol(style, lod).finally(resolveMedia);
    return view;
  }

  findText(text: string): Text | undefined {
    for (const child of this.children) {
      if (child instanceof Text && child.visible && child.text === text) return child;
    }
    return undefined;
  }

  hasSymbolSprite(): boolean {
    return this.symbolSprite.visible;
  }

  private drawCard(style: OrganizationNodeStyle, lod: LodLevel): void {
    const { width, height, borderRadius } = style;
    this.card.clear();

    if (lod === 'far') {
      const size = Math.min(style.symbolSize, 36);
      this.card.roundRect(0, (height - size) / 2, size, size, 6);
      this.card.fill({ color: style.background });
      this.card.stroke({ color: style.border, width: style.borderWidth });
      this.hitArea = {
        contains: (x, y) => x >= 0 && y >= 0 && x <= width && y <= height,
      };
      return;
    }

    this.card.roundRect(0, 0, width, height, borderRadius);
    this.card.fill({ color: style.background });
    this.card.stroke({ color: style.border, width: style.borderWidth });

    this.card.roundRect(8, (height - style.symbolSize) / 2, style.symbolSize, style.symbolSize, 6);
    this.card.fill({ color: 0xdbeafe });

    this.hitArea = { contains: (x, y) => x >= 0 && y >= 0 && x <= width && y <= height };
  }

  private layoutTexts(style: OrganizationNodeStyle, lod: LodLevel): void {
    if (lod === 'far') {
      this.nameText.visible = false;
      this.groupText.visible = false;
      return;
    }
    this.nameText.visible = true;
    this.groupText.visible = lod === 'near' && this.groupText.text.length > 0;
    const textX = 8 + style.symbolSize + 10;
    this.nameText.position.set(textX, lod === 'mid' ? 24 : 14);
    this.groupText.position.set(textX, 38);
  }

  private async applySymbol(style: OrganizationNodeStyle, lod: LodLevel): Promise<void> {
    const url = this.resolvedSymbolUrl;
    if (!url?.trim()) {
      this.symbolSprite.visible = false;
      return;
    }

    const texture = await loadNodeTexture(url);
    if (!texture || this.destroyed) {
      this.symbolSprite.visible = false;
      return;
    }
    this.showSymbol(texture, style, lod);
  }

  private showSymbol(texture: Texture, style: OrganizationNodeStyle, lod: LodLevel): void {
    const size =
      lod === 'far' ? Math.min(style.symbolSize, 36) : style.symbolSize;
    const y =
      lod === 'far' ? (style.height - size) / 2 : (style.height - style.symbolSize) / 2;

    this.symbolSprite.texture = texture;
    this.symbolSprite.width = size;
    this.symbolSprite.height = size;
    this.symbolSprite.position.set(lod === 'far' ? 0 : 8, y);
    this.symbolSprite.visible = true;
  }
}
