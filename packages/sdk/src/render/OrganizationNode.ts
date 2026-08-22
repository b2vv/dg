import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type { DiagramGroup, DiagramOrganization } from '../data/types.js';
import { loadNodeTexture } from './nodeMedia.js';
import { getOrgSymbolUrl } from './theme.js';
import { fitContain } from './fitContain.js';
import { formatOrgPeriodLabel } from './formatPeriodLabel.js';
import type { LodLevel } from './lod.js';
import type { OrganizationNodeStyle } from './types.js';
import {
  attachMenuButton,
  activateChromePointer,
  hitChromePointer,
  type ContextMenuPointer,
} from './nodeCardChrome.js';
import { mountOrgNodeChrome, type OrgNodeChrome } from './orgNodeChrome.js';
import type { FederatedPointerEvent } from 'pixi.js';
import {
  ORG_SYMBOL_PAD,
  resolveOrgSymbolLayout,
  type OrgSymbolBox,
  type OrgSymbolBoxMode,
  type OrgSymbolLayout,
} from './orgSymbolBox.js';

export interface OrganizationNodeOptions {
  chrome?: OrgNodeChrome;
  onContextMenu?: (pointer: ContextMenuPointer) => void;
}

export class OrganizationNodeView extends Container {
  readonly resolvedSymbolUrl: string | undefined;
  readonly lod: LodLevel;
  /** Settles when optional symbol load finishes (or immediately if none). */
  readonly mediaReady: Promise<void>;
  private readonly org: DiagramOrganization;
  private readonly shadow = new Graphics();
  private readonly card = new Graphics();
  private readonly hoverRing = new Graphics();
  private readonly nameText: Text;
  private readonly groupText: Text;
  private readonly periodText: Text;
  private readonly symbolSprite = new Sprite();
  private styleRef: OrganizationNodeStyle;
  private symbolLayout: OrgSymbolLayout;

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
    this.org = org;
    this.lod = lod;
    this.mediaReady = mediaReady;
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.resolvedSymbolUrl = getOrgSymbolUrl(org, theme);
    this.styleRef = style;
    this.symbolLayout = resolveOrgSymbolLayout(org, style, {
      lod,
      hasSymbol: false,
    });

    this.nameText = new Text({
      text: this.symbolLayout.displayName,
      style: { fill: style.nameColor, fontSize: style.nameFontSize, fontWeight: '600' },
    });
    this.groupText = new Text({
      text: group?.name ?? '',
      style: { fill: style.groupColor, fontSize: style.groupFontSize },
    });
    const periodLabel = formatOrgPeriodLabel(org) ?? '';
    this.periodText = new Text({
      text: periodLabel,
      style: {
        fill: style.periodColor ?? 0x15803d,
        fontSize: style.periodFontSize ?? 10,
        fontWeight: '500',
      },
    });

    this.symbolSprite.visible = false;
    this.hoverRing.visible = false;
    this.chromeControls.eventMode = 'static';
    this.chromeControls.sortableChildren = true;
    this.chromeControls.zIndex = 10;
    this.sortableChildren = true;
    this.addChild(
      this.shadow,
      this.card,
      this.symbolSprite,
      this.nameText,
      this.groupText,
      this.periodText,
      this.hoverRing,
      this.chromeControls,
    );
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

  /** Current symbol box mode (caption / no-caption / full-bleed). */
  get symbolBoxMode(): OrgSymbolBoxMode {
    return this.symbolLayout.mode;
  }

  /** Symbol max-box inside the fixed card AABB. */
  get symbolBox(): OrgSymbolBox {
    return this.symbolLayout.box;
  }

  /** Fixed card size from style (E2 — independent of caption / symbol). */
  get cardSize(): { width: number; height: number } {
    return { width: this.styleRef.width, height: this.styleRef.height };
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

  /** E3: decorative symbol placeholder must not appear without a real symbol. */
  hasSymbolPlaceholder(): boolean {
    return false;
  }

  hasPeriodLabel(): boolean {
    return this.periodText.visible && this.periodText.text.length > 0;
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

    // E3: no diamond / tint placeholder — only the card chrome. Symbol is the sprite.
    this.hitArea = { contains: (x, y) => x >= 0 && y >= 0 && x <= width && y <= height };
  }

  private layoutTexts(style: OrganizationNodeStyle, lod: LodLevel): void {
    if (lod === 'far') {
      this.nameText.visible = false;
      this.groupText.visible = false;
      this.periodText.visible = false;
      return;
    }

    const layout = this.symbolLayout;
    this.nameText.text = layout.displayName;
    this.nameText.visible = layout.showNameText;

    const hasGroup = lod === 'near' && this.groupText.text.length > 0;
    const hasPeriod = this.periodText.text.length > 0;
    // Full-bleed: keep period as an overlay when present (compose with T68).
    this.groupText.visible = hasGroup && layout.mode !== 'full-bleed';
    this.periodText.visible = hasPeriod;

    const box = layout.box;
    const textX =
      layout.mode === 'full-bleed' || !this.symbolSprite.visible
        ? ORG_SYMBOL_PAD
        : box.x + box.width + 10;
    const maxTextW = Math.max(24, style.width - textX - 10);

    if (this.nameText.visible) truncatePixiText(this.nameText, maxTextW);
    if (this.groupText.visible) truncatePixiText(this.groupText, maxTextW);
    if (this.periodText.visible) truncatePixiText(this.periodText, maxTextW);

    const periodFs = style.periodFontSize ?? 10;
    const lines: Array<{ text: Text; fontSize: number }> = [];
    if (this.nameText.visible) {
      lines.push({ text: this.nameText, fontSize: style.nameFontSize });
    }
    if (this.groupText.visible) {
      lines.push({ text: this.groupText, fontSize: style.groupFontSize });
    }
    if (this.periodText.visible) {
      lines.push({ text: this.periodText, fontSize: periodFs });
    }

    if (lines.length === 0) return;

    const gap = 3;
    const blockH =
      lines.reduce((sum, l) => sum + l.fontSize, 0) + gap * Math.max(0, lines.length - 1);

    if (layout.mode === 'full-bleed') {
      // Bottom-left overlay so the banner symbol stays readable.
      let y = style.height - blockH - 4;
      for (const line of lines) {
        line.text.position.set(textX, y);
        y += line.fontSize + gap;
      }
      return;
    }

    let y = (style.height - blockH) / 2;
    for (const line of lines) {
      line.text.position.set(textX, y);
      y += line.fontSize + gap;
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
      this.symbolLayout = resolveOrgSymbolLayout(this.org, style, {
        lod,
        hasSymbol: false,
      });
      this.layoutTexts(style, lod);
      return;
    }

    const texture = await loadNodeTexture(url);
    if (!texture || this.destroyed) {
      this.symbolSprite.visible = false;
      this.symbolLayout = resolveOrgSymbolLayout(this.org, style, {
        lod,
        hasSymbol: false,
      });
      this.layoutTexts(style, lod);
      return;
    }
    this.showSymbol(texture, style, lod);
  }

  private showSymbol(texture: Texture, style: OrganizationNodeStyle, lod: LodLevel): void {
    const texW = texture.width || texture.source?.width || 0;
    const texH = texture.height || texture.source?.height || 0;

    this.symbolLayout = resolveOrgSymbolLayout(this.org, style, {
      lod,
      hasSymbol: true,
      textureWidth: texW,
      textureHeight: texH,
    });

    const box = this.symbolLayout.box;
    const fitted = fitContain(texW, texH, box.width, box.height);

    this.symbolSprite.texture = texture;
    this.symbolSprite.width = fitted.width;
    this.symbolSprite.height = fitted.height;
    this.symbolSprite.position.set(box.x + fitted.offsetX, box.y + fitted.offsetY);
    this.symbolSprite.visible = true;

    this.layoutTexts(style, lod);
  }
}

function truncatePixiText(label: Text, maxWidth: number): void {
  const raw = label.text;
  if (!raw) return;
  const fontSize = Number(label.style.fontSize) || 12;
  const maxChars = Math.max(1, Math.floor(maxWidth / (fontSize * 0.55)));
  if (raw.length <= maxChars) return;
  label.text = `${raw.slice(0, Math.max(1, maxChars - 1))}…`;
}
