import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type { DiagramGroup, DiagramOrganization } from '../data/types.js';
import { loadNodeTexture } from './nodeMedia.js';
import { getOrgSymbolUrl } from './theme.js';
import { fitContain } from './fitContain.js';
import type { LodLevel } from './lod.js';
import type { OrganizationNodeStyle } from './types.js';
import { attachMenuButton, activateChromePointer, hitChromePointer, pointerClientCoords, type ContextMenuPointer } from './nodeCardChrome.js';
import { mountOrgNodeChrome, type OrgNodeChrome } from './orgNodeChrome.js';
import type { FederatedPointerEvent } from 'pixi.js';

export interface OrganizationNodeOptions {
  chrome?: OrgNodeChrome;
  onContextMenu?: (pointer: ContextMenuPointer) => void;
}

export class OrganizationNodeView extends Container {
  readonly resolvedSymbolUrl: string | undefined;
  readonly lod: LodLevel;
  /** Settles when optional symbol load finishes (or immediately if none). */
  readonly mediaReady: Promise<void>;
  private readonly shadow = new Graphics();
  private readonly card = new Graphics();
  private readonly hoverRing = new Graphics();
  private readonly nameText: Text;
  private readonly groupText: Text;
  private readonly symbolSprite = new Sprite();
  private styleRef: OrganizationNodeStyle;

  private readonly chromeControls = new Container();

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
    this.styleRef = style;

    this.nameText = new Text({
      text: org.name,
      style: { fill: style.nameColor, fontSize: style.nameFontSize, fontWeight: '600' },
    });
    this.groupText = new Text({
      text: group?.name ?? '',
      style: { fill: style.groupColor, fontSize: style.groupFontSize },
    });

    this.symbolSprite.visible = false;
    this.hoverRing.visible = false;
    this.chromeControls.eventMode = 'static';
    this.chromeControls.sortableChildren = true;
    this.chromeControls.zIndex = 10;
    this.sortableChildren = true;
    this.addChild(this.shadow, this.card, this.symbolSprite, this.nameText, this.groupText, this.hoverRing, this.chromeControls);
    this.drawCard(style, lod);
    this.layoutTexts(style, lod);

    this.on('pointerover', () => this.setHovered(true));
    this.on('pointerout', () => this.setHovered(false));
  }

  static create(
    org: DiagramOrganization,
    group: DiagramGroup | undefined,
    theme: 'light' | 'dark',
    style: OrganizationNodeStyle,
    lod: LodLevel = 'near',
    options: OrganizationNodeOptions = {},
  ): OrganizationNodeView {
    let resolveMedia!: () => void;
    const mediaReady = new Promise<void>((resolve) => {
      resolveMedia = resolve;
    });
    const view = new OrganizationNodeView(org, group, theme, style, lod, mediaReady);
    view.applyChrome(style, lod, options);
    void view.applySymbol(style, lod).finally(resolveMedia);
    return view;
  }

  hasMenuButton(): boolean {
    return this.chromeControls.children.length > 0;
  }

  hasExpandControl(): boolean {
    return this.chromeControls.children.length > 1;
  }

  /** Route pointer to ⋮ / expand chrome when Pixi child hit-test misses. */
  activateChromePointer(e: FederatedPointerEvent): boolean {
    if (this.chromeControls.children.length === 0) return false;
    return activateChromePointer(this.chromeControls, e);
  }

  isChromePointer(e: FederatedPointerEvent): boolean {
    return hitChromePointer(this.chromeControls, e);
  }

  private applyChrome(
    style: OrganizationNodeStyle,
    lod: LodLevel,
    options: OrganizationNodeOptions,
  ): void {
    this.chromeControls.removeChildren();
    if (lod === 'far' || !options.onContextMenu) return;

    if (options.chrome) {
      mountOrgNodeChrome(this.chromeControls, style.width, options.chrome, options.onContextMenu);
      return;
    }

    attachMenuButton(this.chromeControls, style.width, 4, options.onContextMenu);
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
    this.shadow.clear();

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

    this.shadow.roundRect(2, 3, width, height, borderRadius);
    this.shadow.fill({ color: 0x0f172a, alpha: 0.1 });
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
    const hasGroup = lod === 'near' && this.groupText.text.length > 0;
    this.groupText.visible = hasGroup;
    const textX = 8 + style.symbolSize + 10;
    if (hasGroup) {
      const blockH = style.nameFontSize + 4 + style.groupFontSize;
      const top = (style.height - blockH) / 2;
      this.nameText.position.set(textX, top);
      this.groupText.position.set(textX, top + style.nameFontSize + 4);
    } else {
      const nameH = style.nameFontSize;
      this.nameText.position.set(textX, (style.height - nameH) / 2);
    }
  }

  private setHovered(on: boolean): void {
    if (this.lod === 'far') {
      this.hoverRing.visible = false;
      return;
    }
    this.hoverRing.clear();
    if (!on) {
      this.hoverRing.visible = false;
      return;
    }
    const s = this.styleRef;
    this.hoverRing.roundRect(-2, -2, s.width + 4, s.height + 4, s.borderRadius + 2);
    this.hoverRing.stroke({ color: 0x2563eb, width: 2 });
    this.hoverRing.visible = true;
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
    const maxSide =
      lod === 'far' ? Math.min(style.symbolSize, 36) : style.symbolSize;
    const boxY =
      lod === 'far' ? (style.height - maxSide) / 2 : (style.height - style.symbolSize) / 2;
    const boxX = lod === 'far' ? 0 : 8;

    const texW = texture.width || texture.source?.width || 0;
    const texH = texture.height || texture.source?.height || 0;
    const fitted = fitContain(texW, texH, maxSide, maxSide);

    this.symbolSprite.texture = texture;
    this.symbolSprite.width = fitted.width;
    this.symbolSprite.height = fitted.height;
    this.symbolSprite.position.set(boxX + fitted.offsetX, boxY + fitted.offsetY);
    this.symbolSprite.visible = true;
  }
}
