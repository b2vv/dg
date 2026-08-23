import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js';
import type { DiagramGroup, DiagramOrganization } from '../data/types.js';
import { loadNodeTexture, type NodeTextureLoader } from './nodeMedia.js';
import { getInactiveOrgSymbolUrl, getOrgSymbolUrl } from './theme.js';
import { fitContain } from './fitContain.js';
import { formatOrgPeriodLabel } from './formatPeriodLabel.js';
import { formatOrgCountsBadge } from './orgCardChrome.js';
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
  GOJS_BODY_MARGIN,
  resolveOrgSymbolLayout,
  type OrgSymbolBox,
  type OrgSymbolBoxMode,
  type OrgSymbolLayout,
} from './orgSymbolBox.js';

export interface OrganizationNodeOptions {
  chrome?: OrgNodeChrome;
  onContextMenu?: (pointer: ContextMenuPointer) => void;
  /** Opt-in E11 prefetch of inactive theme symbol (default false). */
  prefetchInactiveSymbol?: boolean;
  /** T74: diagram media loader; falls back to module `loadNodeTexture`. */
  loadTexture?: NodeTextureLoader;
}

export class OrganizationNodeView extends Container {
  readonly resolvedSymbolUrl: string | undefined;
  readonly lod: LodLevel;
  /** Settles when optional symbol load finishes (or immediately if none). */
  readonly mediaReady: Promise<void>;
  private readonly org: DiagramOrganization;
  private readonly theme: 'light' | 'dark';
  private readonly shadow = new Graphics();
  private readonly card = new Graphics();
  private readonly hoverRing = new Graphics();
  private readonly nameText: Text;
  private readonly fullNameFallbackText: Text;
  private readonly unitCodeText: Text;
  private readonly groupText: Text;
  private readonly periodText: Text;
  private readonly tempBadge = new Graphics();
  private readonly tempBadgeLabel: Text;
  private readonly countsBadgeLabel: Text;
  private readonly symbolSprite = new Sprite();
  private styleRef: OrganizationNodeStyle;
  private symbolLayout: OrgSymbolLayout;
  private loadTexture: NodeTextureLoader = loadNodeTexture;
  private mediaRevision: string | number | undefined;

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
    this.theme = theme;
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
      style: { fill: style.nameColor, fontSize: style.nameFontSize, fontWeight: '500' },
    });
    this.fullNameFallbackText = new Text({
      text: this.symbolLayout.fullNameFallback,
      style: {
        fill: style.nameColor,
        fontSize: style.nameFontSize - 1,
        fontWeight: '400',
        wordWrap: true,
        wordWrapWidth: 192,
        breakWords: true,
      },
    });
    this.unitCodeText = new Text({
      text: org.unitCode?.trim() ?? '',
      style: {
        fill: style.metaColor ?? style.groupColor,
        fontSize: style.metaFontSize ?? 11,
        fontFamily: 'Times New Roman, serif',
      },
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
    this.tempBadgeLabel = new Text({
      text: '⏳',
      style: {
        fill: style.badgeTextColor ?? 0xffffff,
        fontSize: 10,
        fontWeight: '700',
      },
    });
    this.countsBadgeLabel = new Text({
      text: '',
      style: {
        fill: style.countsBadgeTextColor ?? 0x334155,
        fontSize: style.countsBadgeFontSize ?? 13,
        fontWeight: '500',
        fontFamily: 'JetBrains Mono, monospace',
      },
    });

    this.symbolSprite.visible = false;
    this.hoverRing.visible = false;
    this.tempBadge.visible = false;
    this.tempBadgeLabel.visible = false;
    this.fullNameFallbackText.visible = false;
    this.countsBadgeLabel.visible = false;
    this.chromeControls.eventMode = 'static';
    this.chromeControls.sortableChildren = true;
    this.chromeControls.zIndex = 10;
    this.sortableChildren = true;
    this.addChild(
      this.shadow,
      this.card,
      this.symbolSprite,
      this.fullNameFallbackText,
      this.nameText,
      this.unitCodeText,
      this.groupText,
      this.periodText,
      this.tempBadge,
      this.tempBadgeLabel,
      this.countsBadgeLabel,
      this.hoverRing,
      this.chromeControls,
    );
    this.drawCard(style, lod);
    this.layoutChromeBadges(style, lod);
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
    view.loadTexture = options.loadTexture ?? loadNodeTexture;
    view.mediaRevision = org.media?.revision;
    view.applyChrome(style, lod, options);
    if (options.prefetchInactiveSymbol) {
      view.prefetchInactiveSymbol();
    }
    void view.applySymbol(style, lod).finally(resolveMedia);
    return view;
  }

  /** T74 M1: re-fetch symbol texture after invalidate (point update). */
  reloadMedia(): Promise<void> {
    return this.applySymbol(this.styleRef, this.lod);
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
    return this.chromeControls.children.some((c) => c.label === 'org-menu');
  }

  hasExpandControl(): boolean {
    if (this.chromeControls.children.some((c) => c.label === 'org-expand')) return true;
    return this.chromeControls.children.length > 1;
  }

  /** Route pointer to expand chrome when Pixi child hit-test misses. */
  activateChromePointer(e: FederatedPointerEvent): boolean {
    if (this.chromeControls.children.length === 0) return false;
    return activateChromePointer(this.chromeControls, e);
  }

  isChromePointer(e: FederatedPointerEvent): boolean {
    return hitChromePointer(this.chromeControls, e);
  }

  private isGojsVertical(style: OrganizationNodeStyle): boolean {
    return style.orgCardLayout === 'gojs-vertical';
  }

  private hideMenu(style: OrganizationNodeStyle): boolean {
    return style.hideMenuChrome === true || this.isGojsVertical(style);
  }

  private applyChrome(
    style: OrganizationNodeStyle,
    lod: LodLevel,
    options: OrganizationNodeOptions,
  ): void {
    this.chromeControls.removeChildren();
    if (lod === 'far') return;

    const gojsTree = this.isGojsVertical(style) && style.gojsTreeExpander !== false;

    if (options.chrome) {
      if (options.chrome.kind === 'staff-expand' && gojsTree) {
        return;
      }
      mountOrgNodeChrome(
        this.chromeControls,
        style.width,
        options.chrome,
        options.onContextMenu ?? (() => {}),
        {
          cardHeight: style.height,
          brandColor: style.brandColor ?? 0x2563eb,
          gojsTree: gojsTree && options.chrome.kind === 'tree',
        },
      );
      return;
    }

    if (!this.hideMenu(style) && options.onContextMenu) {
      const menu = attachMenuButton(this.chromeControls, style.width, 4, options.onContextMenu);
      menu.label = 'org-menu';
    }
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

  hasTempBadge(): boolean {
    return this.tempBadge.visible;
  }

  hasCountsBadge(): boolean {
    return this.countsBadgeLabel.visible;
  }

  hasUnitCode(): boolean {
    return this.unitCodeText.visible && this.unitCodeText.text.length > 0;
  }

  hasFullNameFallback(): boolean {
    return this.fullNameFallbackText.visible;
  }

  private drawCard(style: OrganizationNodeStyle, lod: LodLevel): void {
    const { width, height, borderRadius } = style;
    this.card.clear();
    this.shadow.clear();

    if (lod === 'far') {
      const size = Math.min(style.symbolSize, 36);
      const x = (width - size) / 2;
      const y = (height - size) / 2;
      this.card.roundRect(x, y, size, size, 6);
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

    this.hitArea = { contains: (x, y) => x >= 0 && y >= 0 && x <= width && y <= height };
  }

  private layoutChromeBadges(style: OrganizationNodeStyle, lod: LodLevel): void {
    if (lod === 'far') {
      this.tempBadge.visible = false;
      this.tempBadgeLabel.visible = false;
      this.countsBadgeLabel.visible = false;
      return;
    }

    const vertical = this.isGojsVertical(style);
    const hourglass = style.tempMarkerStyle === 'hourglass';
    const showTemp = !!this.org.isTemporary;
    this.tempBadge.visible = showTemp && hourglass && vertical;
    this.tempBadgeLabel.visible = showTemp && hourglass && vertical;

    if (showTemp && hourglass && vertical) {
      const box = this.symbolLayout.box;
      const marker = Math.max(10, Math.min(box.width, box.height) * 0.18);
      const x = box.x + 2;
      const y = box.y + 2;
      this.tempBadge.clear();
      this.tempBadgeLabel.text = '⏳';
      this.tempBadgeLabel.style.fontSize = marker;
      this.tempBadgeLabel.anchor.set(0, 0);
      this.tempBadgeLabel.position.set(x, y);
    } else if (showTemp && !hourglass) {
      const br = Math.max(7, style.width * 0.045);
      const cx = style.width - br - 4;
      const cy = br + 4;
      this.tempBadge.visible = true;
      this.tempBadgeLabel.visible = true;
      this.tempBadge.clear();
      this.tempBadge.circle(cx, cy, br);
      this.tempBadge.fill({ color: style.badgeColor ?? 0xf59e0b });
      this.tempBadgeLabel.text = 'T';
      this.tempBadgeLabel.anchor.set(0.5);
      this.tempBadgeLabel.style.fontSize = 9;
      this.tempBadgeLabel.position.set(cx, cy);
    }

    const counts = formatOrgCountsBadge(this.org);
    const showCounts = !!counts;
    this.countsBadgeLabel.visible = showCounts;
    if (showCounts && counts) {
      const fs = style.countsBadgeFontSize ?? 13;
      this.countsBadgeLabel.text = counts;
      this.countsBadgeLabel.style.fontSize = fs;
      this.countsBadgeLabel.style.fill = style.countsBadgeTextColor ?? 0x334155;
      if (vertical) {
        // Spot(1,0,-14,12) — top-right, no chip background.
        this.countsBadgeLabel.anchor.set(1, 0);
        this.countsBadgeLabel.position.set(style.width - 14, 12);
      } else {
        this.countsBadgeLabel.anchor.set(0.5);
        const padY = 2;
        const estH = fs + padY * 2;
        this.countsBadgeLabel.position.set(style.width - 4 - counts.length * fs * 0.3, style.height - estH - 4);
      }
    }
  }

  private layoutTexts(style: OrganizationNodeStyle, lod: LodLevel): void {
    if (lod === 'far') {
      this.nameText.visible = false;
      this.fullNameFallbackText.visible = false;
      this.unitCodeText.visible = false;
      this.groupText.visible = false;
      this.periodText.visible = false;
      return;
    }

    const layout = this.symbolLayout;
    this.nameText.text = layout.displayName;
    this.nameText.visible = layout.showNameText && layout.mode !== 'full-bleed';

    const unitRaw = this.org.unitCode?.trim() ?? '';
    this.unitCodeText.text = unitRaw;
    this.unitCodeText.visible = unitRaw.length > 0 && layout.mode !== 'full-bleed';

    const hasGroup = lod === 'near' && this.groupText.text.length > 0;
    const hidePeriod = style.hidePeriodOnCard === true;
    const hasPeriod = !hidePeriod && this.periodText.text.length > 0;
    this.groupText.visible = hasGroup && layout.mode !== 'full-bleed';
    this.periodText.visible = hasPeriod;

    this.fullNameFallbackText.text = layout.fullNameFallback;
    this.fullNameFallbackText.visible =
      layout.showFullNameFallback && !this.symbolSprite.visible && layout.mode !== 'full-bleed';

    if (this.isGojsVertical(style)) {
      this.layoutVerticalTexts(style, layout);
      return;
    }

    this.layoutHorizontalTexts(style, layout);
  }

  /** GoJS vertical stack: name → symbol → unit code. */
  private layoutVerticalTexts(style: OrganizationNodeStyle, layout: OrgSymbolLayout): void {
    const vm = layout.vertical;
    const m = GOJS_BODY_MARGIN;
    const maxTextW = vm?.nameMaxWidth ?? style.width - m.left - m.right;

    this.nameText.anchor.set(0, 0);
    this.unitCodeText.anchor.set(0.5, 0);
    this.groupText.anchor.set(0.5, 0);
    this.periodText.anchor.set(0.5, 0);

    if (this.nameText.visible) {
      truncatePixiText(this.nameText, maxTextW);
      this.nameText.position.set(m.left, vm?.nameY ?? m.top);
    }

    if (this.fullNameFallbackText.visible) {
      const box = layout.box;
      truncatePixiText(this.fullNameFallbackText, Math.min(192, box.width));
      this.fullNameFallbackText.anchor.set(0.5, 0);
      this.fullNameFallbackText.position.set(box.x + box.width / 2, box.y + 4);
    }

    if (this.unitCodeText.visible) {
      truncatePixiText(this.unitCodeText, maxTextW);
      const unitY = vm?.unitY ?? layout.box.y + layout.box.height + 4;
      this.unitCodeText.position.set(style.width / 2, unitY);
    }
  }

  private layoutHorizontalTexts(style: OrganizationNodeStyle, layout: OrgSymbolLayout): void {
    const box = layout.box;
    const pad = box.padding;
    const textX =
      layout.mode === 'full-bleed' || !this.symbolSprite.visible
        ? pad
        : box.x + box.width + 10;
    const menuReserve = this.hasMenuButton() ? 28 : 0;
    const rightPad =
      menuReserve + (this.tempBadge.visible && style.tempMarkerStyle !== 'hourglass' ? 22 : 10);
    const maxTextW = Math.max(24, style.width - textX - rightPad);

    this.nameText.anchor.set(0, 0);
    if (this.nameText.visible) truncatePixiText(this.nameText, maxTextW);
    if (this.unitCodeText.visible) truncatePixiText(this.unitCodeText, maxTextW);
    if (this.groupText.visible) truncatePixiText(this.groupText, maxTextW);
    if (this.periodText.visible) truncatePixiText(this.periodText, maxTextW);

    if (this.fullNameFallbackText.visible) {
      this.fullNameFallbackText.anchor.set(0, 0);
      truncatePixiText(this.fullNameFallbackText, box.width - 4);
      this.fullNameFallbackText.position.set(box.x + 2, box.y + 4);
    }

    const periodFs = style.periodFontSize ?? 10;
    const metaFs = style.metaFontSize ?? 10;
    const lines: Array<{ text: Text; fontSize: number }> = [];
    if (this.nameText.visible) {
      lines.push({ text: this.nameText, fontSize: style.nameFontSize });
    }
    if (this.unitCodeText.visible) {
      lines.push({ text: this.unitCodeText, fontSize: metaFs });
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

  private prefetchInactiveSymbol(): void {
    const inactive = getInactiveOrgSymbolUrl(this.org, this.theme);
    if (!inactive) return;
    void this.loadTexture(inactive, this.mediaRevision);
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
      this.layoutChromeBadges(style, lod);
      return;
    }

    const texture = await this.loadTexture(url, this.mediaRevision);
    if (!texture || this.destroyed) {
      this.symbolSprite.visible = false;
      this.symbolLayout = resolveOrgSymbolLayout(this.org, style, {
        lod,
        hasSymbol: false,
      });
      this.layoutTexts(style, lod);
      this.layoutChromeBadges(style, lod);
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
    this.fullNameFallbackText.visible = false;

    this.layoutChromeBadges(style, lod);
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
